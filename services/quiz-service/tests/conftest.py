"""Shared test fixtures: isolated tmp SQLite DB per pytest run, fresh schema per test."""

import os
import pathlib
import sys
import tempfile

# Configure environment BEFORE importing the app package.
_TMPDIR = tempfile.mkdtemp(prefix="quiz-test-")
os.environ["DATABASE_URL"] = f"sqlite:///{_TMPDIR}/test.db"

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def sample_item(client):
    """Two-choice item about Python numeric types, linked to a concept URI."""
    resp = client.post(
        "/api/v1/items",
        json={
            "title": "Numeric types",
            "prompt": "What is the type of `5 / 2` in Python 3?",
            "choices": [
                {"identifier": "A", "text": "int"},
                {"identifier": "B", "text": "float"},
            ],
            "correctResponse": ["B"],
            "conceptUri": "http://testserver/case/CFItems/abc123",
        },
    )
    assert resp.status_code == 201
    return resp.json()
