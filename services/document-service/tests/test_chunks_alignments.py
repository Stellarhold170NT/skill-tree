"""Chunks + concept alignments (teaches/assesses/requires/summarizes)."""

from tests.conftest import CONCEPT, _document


def _add_chunks(client, doc_id, n=2):
    payload = {"chunks": [{"text": f"chunk-{i} noi dung"} for i in range(n)]}
    return client.post(f"/api/v1/documents/{doc_id}/chunks", json=payload)


def test_add_chunks_auto_order_and_read(client):
    doc_id = _document(client).json()["id"]
    resp = _add_chunks(client, doc_id)
    assert resp.status_code == 201
    chunks = resp.json()
    assert [c["orderIndex"] for c in chunks] == [0, 1]
    assert chunks[0]["charCount"] == len(chunks[0]["text"])

    listed = client.get(f"/api/v1/documents/{doc_id}/chunks").json()
    assert len(listed) == 2


def test_duplicate_order_index_409(client):
    doc_id = _document(client).json()["id"]
    _add_chunks(client, doc_id)
    resp = client.post(
        f"/api/v1/documents/{doc_id}/chunks",
        json={"chunks": [{"text": "x", "orderIndex": 0}]},
    )
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "DUPLICATE_ORDER_INDEX"


def test_alignment_lifecycle_and_filter(client):
    doc_id = _document(client).json()["id"]
    chunks = _add_chunks(client, doc_id).json()
    chunk_id = chunks[0]["id"]

    resp = client.post(
        f"/api/v1/chunks/{chunk_id}/alignments",
        json={"conceptUri": CONCEPT, "alignmentType": "teaches"},
    )
    assert resp.status_code == 201
    assert resp.json()["alignmentType"] == "teaches"

    # duplicate -> 409
    dup = client.post(
        f"/api/v1/chunks/{chunk_id}/alignments",
        json={"conceptUri": CONCEPT, "alignmentType": "teaches"},
    )
    assert dup.status_code == 409
    assert dup.json()["error"]["code"] == "DUPLICATE_ALIGNMENT"

    # invalid type -> 422
    bad = client.post(
        f"/api/v1/chunks/{chunk_id}/alignments",
        json={"conceptUri": CONCEPT, "alignmentType": "mentions"},
    )
    assert bad.status_code == 422
    assert bad.json()["error"]["code"] == "INVALID_ALIGNMENT_TYPE"

    # unaligned chunk invisible under teaches filter, aligned chunk visible
    only = client.get(f"/api/v1/documents/{doc_id}/chunks", params={"alignmentType": "teaches"})
    ids = [c["id"] for c in only.json()]
    assert ids == [chunk_id]

    none = client.get(f"/api/v1/documents/{doc_id}/chunks", params={"alignmentType": "assesses"})
    assert none.json() == []


def test_chunk_not_found(client):
    resp = client.get("/api/v1/chunks/missing/alignments")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "CHUNK_NOT_FOUND"


def test_chunks_cascade_on_document_delete(client):
    doc_id = _document(client).json()["id"]
    chunks = _add_chunks(client, doc_id).json()
    client.delete(f"/api/v1/documents/{doc_id}")
    resp = client.get(f"/api/v1/chunks/{chunks[0]['id']}/alignments")
    assert resp.status_code == 404
