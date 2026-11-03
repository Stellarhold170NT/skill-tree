"""Shared test fixtures: isolated tmp SQLite DB + upload dir."""

import os
import pathlib
import sys
import tempfile

_TMPDIR = tempfile.mkdtemp(prefix="doc-test-")
os.environ["DATABASE_URL"] = f"sqlite:///{_TMPDIR}/test.db"
os.environ["DOCUMENT_UPLOAD_DIR"] = os.path.join(_TMPDIR, "uploads")

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402

DOC_URI = "http://opencase:8101/api/v1/case/CFDocuments/doc-1"
CONCEPT = "http://opencase:8101/api/v1/case/CFItems/abc"


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as test_client:
        yield test_client


def _document(client, **overrides):
    body = {"title": "Giáo trình Nhập môn AI", "documentUri": DOC_URI, "typicalLearningTime": "PT12H"}
    body.update(overrides)
    return client.post("/api/v1/documents", json=body)
