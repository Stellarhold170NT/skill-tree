"""Error envelope + lifecycle errors (platform contract)."""

from tests.conftest import SAMPLE_MD


def test_health(client):
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["service"] == "rag-service"
    assert body["version"]


def test_unsupported_type_422(client, upload):
    resp = client.post(
        "/api/v1/documents/upload",
        files={"file": ("lecture.pdf", b"%PDF-1.4 fake")},
    )
    assert resp.status_code == 422
    error = resp.json()["error"]
    assert error["code"] == "UNSUPPORTED_TYPE"
    assert ".md" in error["details"]["supported"]


def test_upload_too_large_413(client, upload):
    big = b"a" * int(1.2 * 1024 * 1024)  # conftest sets RAG_MAX_UPLOAD_MB=1
    resp = client.post(
        "/api/v1/documents/upload",
        files={"file": ("big.md", big)},
    )
    assert resp.status_code == 413
    error = resp.json()["error"]
    assert error["code"] == "DOCUMENT_TOO_LARGE"
    assert "1MB" in error["message"]


def test_job_not_found_404(client):
    resp = client.get("/api/v1/jobs/does-not-exist")
    assert resp.status_code == 404
    error = resp.json()["error"]
    assert error["code"] == "JOB_NOT_FOUND"
    assert "details" in error


def test_document_not_found_404(client):
    resp = client.get("/api/v1/documents/nope")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "DOCUMENT_NOT_FOUND"


def test_validation_error_422(client):
    # topK below the ge=1 bound → FastAPI validation → platform envelope
    resp = client.post("/api/v1/ask", json={"question": "courts", "topK": 0})
    assert resp.status_code == 422
    error = resp.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert error["details"]["errors"]


def test_reingest_missing_document_404(client):
    resp = client.post("/api/v1/documents/nope/reingest")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "DOCUMENT_NOT_FOUND"
