"""Document CRUD + LRMI fields + file uploads."""

from tests.conftest import DOC_URI, _document


def test_create_and_get_document(client):
    resp = _document(client)
    assert resp.status_code == 201
    body = resp.json()
    assert body["documentUri"] == DOC_URI
    assert body["typicalLearningTime"] == "PT12H"
    assert body["learningResourceType"] == "Text"

    got = client.get(f"/api/v1/documents/{body['id']}")
    assert got.status_code == 200
    assert got.json()["title"] == "Giáo trình Nhập môn AI"


def test_invalid_duration_422(client):
    resp = _document(client, typicalLearningTime="12 hours")
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"


def test_list_and_delete_document(client):
    body = _document(client).json()
    assert len(client.get("/api/v1/documents").json()) == 1
    assert client.delete(f"/api/v1/documents/{body['id']}").status_code == 204
    assert client.get(f"/api/v1/documents/{body['id']}").status_code == 404


def test_document_not_found(client):
    resp = client.get("/api/v1/documents/missing")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "DOCUMENT_NOT_FOUND"


def test_upload_file_and_list(client):
    doc_id = _document(client).json()["id"]
    resp = client.post(
        f"/api/v1/documents/{doc_id}/upload",
        files={"file": ("chuong-1.txt", b"Noidung chuong 1", "text/plain")},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["filename"] == "chuong-1.txt"
    assert body["sizeBytes"] == 16
    assert len(body["sha256"]) == 64

    files = client.get(f"/api/v1/documents/{doc_id}/files").json()
    assert len(files) == 1
    assert files[0]["sha256"] == body["sha256"]
