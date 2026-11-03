"""Ingest pipeline: upload → job lifecycle → section tree → reingest → delete."""

from tests.conftest import SAMPLE_MD


def test_upload_markdown_reaches_ready(client, upload, wait_ready):
    body = upload("notes.md", SAMPLE_MD, title="Democracies notes", uploader_id="stu-1")
    assert body["statusUrl"] == f"/api/v1/jobs/{body['jobId']}"
    job = wait_ready(body["jobId"])
    assert job["status"] == "ready"
    assert job["docId"] == body["docId"]
    stage = job["stageMs"]
    assert "chunkMs" in stage and "indexMs" in stage
    assert "conversionMs" not in stage  # markdown ingest never calls latexml

    detail = client.get(f"/api/v1/documents/{body['docId']}").json()
    assert detail["title"] == "Democracies notes"
    assert detail["sourceKind"] == "markdown"
    assert len(detail["sections"]) >= 5  # ToC tree stored
    paths = [s["path"] for s in detail["sections"]]
    assert "Democracies > Electoral Systems" in paths
    assert "Democracies > Institutions within Democracy > Courts" in paths


def test_chunks_positioned_under_right_headings(client, upload, wait_ready):
    body = upload("notes.md", SAMPLE_MD)
    wait_ready(body["jobId"])
    detail = client.get(f"/api/v1/documents/{body['docId']}").json()
    # 6 sections (Chapter 2 has no own body → section row without chunks), 5 chunks.
    assert len(detail["sections"]) == 6
    assert detail["chunks"] == 5
    markets = next(s for s in detail["sections"] if s["path"].endswith("Markets"))
    assert markets["level"] == 2
    chapter2 = next(s for s in detail["sections"] if s["path"].startswith("Chapter 2"))
    assert chapter2["level"] == 1


def test_txt_document_single_section(client, upload, wait_ready):
    body = upload("readme.txt", "plain text about plurality voting and courts.")
    wait_ready(body["jobId"])
    detail = client.get(f"/api/v1/documents/{body['docId']}").json()
    assert len(detail["sections"]) == 1
    assert detail["sections"][0]["title"] == "Document"


def test_reingest_reindexes(client, upload, wait_ready):
    body = upload("notes.md", SAMPLE_MD)
    wait_ready(body["jobId"])
    first = client.get(f"/api/v1/documents/{body['docId']}").json()
    resp = client.post(f"/api/v1/documents/{body['docId']}/reingest")
    assert resp.status_code == 202
    job = wait_ready(resp.json()["jobId"])
    assert job["status"] == "ready"
    second = client.get(f"/api/v1/documents/{body['docId']}").json()
    assert second["chunks"] == first["chunks"] == 5

    def shape(doc):
        return [(s["level"], s["title"], s["path"], s["orderIdx"]) for s in doc["sections"]]

    assert shape(second) == shape(first)  # same ToC, fresh ids after reindex


def test_delete_document_cascades(client, upload, wait_ready):
    body = upload("notes.md", SAMPLE_MD)
    wait_ready(body["jobId"])
    doc_id = body["docId"]
    assert client.delete(f"/api/v1/documents/{doc_id}").status_code == 204
    gone = client.get(f"/api/v1/documents/{doc_id}")
    assert gone.status_code == 404
    assert gone.json()["error"]["code"] == "DOCUMENT_NOT_FOUND"
    # FTS rows are gone too: asking still 200 but yields no citations
    resp = client.post("/api/v1/ask", json={"question": "plurality voting"})
    assert resp.status_code == 200
    assert resp.json()["citations"] == []


def test_documents_list_and_char_count(client, upload, wait_ready):
    body = upload("notes.md", SAMPLE_MD, uploader_id="stu-9")
    wait_ready(body["jobId"])
    docs = client.get("/api/v1/documents?uploaderId=stu-9").json()
    assert [d["id"] for d in docs] == [body["docId"]]
    mine = docs[0]
    assert mine["charCount"] > 0
    assert mine["chunks"] == 5
    assert mine["sourceKind"] == "markdown"
