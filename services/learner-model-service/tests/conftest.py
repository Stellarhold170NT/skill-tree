"""Shared test fixtures: isolated tmp SQLite DB per pytest run, fresh schema per test."""

import os
import pathlib
import sys
import tempfile
from datetime import datetime, timezone

_TMPDIR = tempfile.mkdtemp(prefix="lm-test-")
os.environ["DATABASE_URL"] = f"sqlite:///{_TMPDIR}/test.db"

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402

STUDENT = "a1b2c3d4e5f60718293a4b5c6d7e8f90"
A = "http://opencase:8101/api/v1/case/CFItems/aaa"
B = "http://opencase:8101/api/v1/case/CFItems/bbb"
C = "http://opencase:8101/api/v1/case/CFItems/ccc"
D = "http://opencase:8101/api/v1/case/CFItems/ddd"

# A -> B -> C prerequisites, D isolated
GRAPH = {
    "nodes": [{"identifier": uri} for uri in (A, B, C, D)],
    "edges": [
        {"source": "a", "target": "b", "type": "isPrerequisiteOf", "sourceIdentifier": A, "targetIdentifier": B},
        {"source": "b", "target": "c", "type": "isPrerequisiteOf", "sourceIdentifier": B, "targetIdentifier": C},
    ],
}


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def fake_graph(monkeypatch):
    monkeypatch.setattr("app.service.fetch_document_graph", lambda document_id: GRAPH)


@pytest.fixture()
def fake_roster(monkeypatch):
    students = [{"sourcedId": STUDENT}, {"sourcedId": "ffffffffffffffffffffffffffffffff"}]
    monkeypatch.setattr("app.service.fetch_class_students", lambda class_id: students)
