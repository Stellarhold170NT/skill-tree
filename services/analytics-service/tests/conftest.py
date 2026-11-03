"""Shared test fixtures: isolated tmp SQLite DB per pytest run, fresh schema per test."""

import os
import pathlib
import sys
import tempfile
from datetime import datetime, timedelta, timezone

_TMPDIR = tempfile.mkdtemp(prefix="analytics-test-")
os.environ["DATABASE_URL"] = f"sqlite:///{_TMPDIR}/test.db"

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402

CONCEPT = "http://opencase:8101/api/v1/case/CFItems/abc123"
STUDENT = "5f0c1a2b3d4e5f60718293a4b5c6d7e8"


def _event(
    event_type="AssessmentItemSubmitted",
    actor=STUDENT,
    object_id=CONCEPT,
    occurred_at=None,
    event_id=None,
    payload=None,
):
    body = {
        "type": event_type,
        "actor": {"id": actor, "type": "Person"},
        "object": {"id": object_id, "type": "Concept"},
        "producer": "quiz-service",
    }
    if occurred_at:
        body["occurredAt"] = occurred_at
    if event_id:
        body["eventId"] = event_id
    if payload:
        body["payload"] = payload
    return body


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as test_client:
        yield test_client
