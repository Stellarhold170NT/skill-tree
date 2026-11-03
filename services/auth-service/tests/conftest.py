"""Shared fixtures: isolated tmp SQLite DB."""

import os
import pathlib
import sys
import tempfile

_TMPDIR = tempfile.mkdtemp(prefix="auth-test-")
os.environ["DATABASE_URL"] = f"sqlite:///{_TMPDIR}/test.db"
os.environ["ADMIN_REGISTRATION_TOKEN"] = "bootstrap-admin-token"

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
def admin(client):
    """First registered user = platform admin (bootstrap)."""
    resp = client.post(
        "/api/v1/auth/register",
        json={"username": "root", "password": "root-secret-1"},
    )
    assert resp.status_code == 201
    return resp.json()


def _auth(token):
    return {"Authorization": f"Bearer {token}"}
