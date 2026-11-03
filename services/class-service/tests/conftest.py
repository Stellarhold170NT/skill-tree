"""Shared test fixtures: isolated tmp SQLite DB per pytest run, fresh schema per test."""

import os
import pathlib
import sys
import tempfile

_TMPDIR = tempfile.mkdtemp(prefix="class-test-")
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
def school(client):
    resp = client.post("/api/v1/orgs", json={"name": "THPT Chu Van An", "orgType": "school"})
    assert resp.status_code == 201
    return resp.json()


@pytest.fixture()
def course(client, school):
    resp = client.post(
        "/api/v1/courses", json={"title": "Tin học 10", "orgSourcedId": school["sourcedId"]}
    )
    assert resp.status_code == 201
    return resp.json()


@pytest.fixture()
def class_10a(client, school, course):
    resp = client.post(
        "/api/v1/classes",
        json={
            "title": "10A1",
            "courseSourcedId": course["sourcedId"],
            "orgSourcedId": school["sourcedId"],
            "term": "2026-spring",
        },
    )
    assert resp.status_code == 201
    return resp.json()


@pytest.fixture()
def teacher(client, school):
    resp = client.post(
        "/api/v1/users",
        json={"displayName": "Cô Lan", "role": "teacher", "orgSourcedId": school["sourcedId"]},
    )
    assert resp.status_code == 201
    return resp.json()


def _student(client, school, name):
    resp = client.post(
        "/api/v1/users",
        json={"displayName": name, "role": "student", "orgSourcedId": school["sourcedId"]},
    )
    assert resp.status_code == 201
    return resp.json()
