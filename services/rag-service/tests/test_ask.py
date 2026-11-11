"""/ask: hybrid BM25 + path boost, citation payload, LLM answer degradation."""

from .conftest import SAMPLE_MD


def _seed(client, upload, wait_ready):
    body = upload("notes.md", SAMPLE_MD, title="Civics")
    wait_ready(body["jobId"])
    return body["docId"]


def test_ask_returns_citation_fields(client, upload, wait_ready):
    _seed(client, upload, wait_ready)
    resp = client.post("/api/v1/ask", json={"question": "What is a plurality voting system?"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["mode"] == "retrieve"
    assert data["timings"]["retrieveMs"] > 0
    citation = data["citations"][0]
    assert citation["chunkId"] and citation["documentId"]
    assert citation["sectionPath"] == "Democracies > Electoral Systems"
    assert citation["heading"] == "Electoral Systems"
    assert "plurality" in citation["snippet"].lower()
    assert citation["score"] != 0


def test_fts5_search_matches_body_terms(client, upload, wait_ready):
    _seed(client, upload, wait_ready)
    resp = client.post(
        "/api/v1/ask", json={"question": "inflation purchasing power"}
    )
    data = resp.json()
    assert data["citations"], "expected a Markets hit"
    assert data["citations"][0]["sectionPath"].endswith("Markets")
    assert "inflation" in data["citations"][0]["snippet"].lower()


def test_path_boost_ranks_matching_section_first(client, upload, wait_ready):
    _seed(client, upload, wait_ready)
    # "courts" appears in the Institutions body AND in the Courts leaf path;
    # "institutions" appears in the ancestor path. The boosted chunk must win.
    resp = client.post("/api/v1/ask", json={"question": "courts institutions"})
    top = resp.json()["citations"][0]
    assert top["sectionPath"] == "Democracies > Institutions within Democracy > Courts"


def test_ask_empty_question_422(client):
    resp = client.post("/api/v1/ask", json={"question": "   "})
    assert resp.status_code == 422
    error = resp.json()["error"]
    assert error["code"] == "EMPTY_QUESTION"
    assert error["message"] and "details" in error


def test_ask_document_filter(client, upload, wait_ready):
    doc1 = _seed(client, upload, wait_ready)
    other = upload("other.md", "# Other topic\n\nFully unrelated text about pottery kilns.")
    wait_ready(other["jobId"])

    resp = client.post(
        "/api/v1/ask", json={"question": "plurality voting", "documentIds": [doc1]}
    )
    citations = resp.json()["citations"]
    assert citations
    assert all(c["documentId"] == doc1 for c in citations)


def test_answer_mode_llm_not_configured_degrades_200(client, upload, wait_ready):
    _seed(client, upload, wait_ready)
    resp = client.post(
        "/api/v1/ask", json={"question": "plurality voting", "mode": "answer"}
    )
    assert resp.status_code == 200  # LLM problems are never HTTP errors (design §3)
    data = resp.json()
    assert data["mode"] == "retrieve"
    assert data["llmError"] == "llm-not-configured"
    assert data["citations"]
    assert "generateMs" in data["timings"]


def test_answer_mode_llm_success(client, upload, wait_ready, monkeypatch):
    _seed(client, upload, wait_ready)

    def fake_synthesize(question, contexts):
        return "Plurality voting awards the seat to the most-voted candidate.", None

    monkeypatch.setattr("app.llm.synthesize", fake_synthesize)
    resp = client.post(
        "/api/v1/ask", json={"question": "plurality voting", "mode": "answer"}
    )
    data = resp.json()
    assert resp.status_code == 200
    assert data["mode"] == "answer"
    assert data["answer"].startswith("Plurality")
    assert data["citations"]
