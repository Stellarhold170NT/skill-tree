"""Shared test fixtures: isolated tmp SQLite DB + monkeypatched neighbors."""

import os
import pathlib
import sys
import tempfile

_TMPDIR = tempfile.mkdtemp(prefix="asg-test-")
os.environ["DATABASE_URL"] = f"sqlite:///{_TMPDIR}/test.db"

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402

CONCEPT = "http://opencase:8101/api/v1/case/CFItems/abc"
S_RED = "11111111111111111111111111111111"
S_RUSTY = "22222222222222222222222222222222"
S_GREEN = "33333333333333333333333333333333"
ITEM_1 = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
ITEM_2 = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"

HEATMAP = {
    "students": [S_RED, S_RUSTY, S_GREEN],
    "concepts": [CONCEPT],
    "cells": {
        S_RED: {CONCEPT: "red"},
        S_RUSTY: {CONCEPT: "rusty"},
        S_GREEN: {CONCEPT: "green"},
    },
}

ITEMS = [{"id": ITEM_1}, {"id": ITEM_2}]


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def fake_neighbors(monkeypatch):
    monkeypatch.setattr("app.service.fetch_heatmap", lambda class_id, document_id: HEATMAP)
    monkeypatch.setattr("app.service.fetch_items", lambda concept_uri: ITEMS)


@pytest.fixture()
def assignment(client, fake_neighbors):
    resp = client.post(
        "/api/v1/assignments",
        json={"title": "Ôn tập biến", "classId": "cls-1", "conceptUri": CONCEPT},
    )
    assert resp.status_code == 201
    return resp.json()
