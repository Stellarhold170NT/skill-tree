"""Registration, login, first-user bootstrap, role gating."""

from .conftest import _auth


def test_first_user_becomes_admin_then_others_student(client):
    first = client.post(
        "/api/v1/auth/register", json={"username": "root", "password": "root-secret-1"}
    ).json()
    assert first["user"]["role"] == "admin"

    second = client.post(
        "/api/v1/auth/register", json={"username": "huy", "password": "huy-secret-1"}
    ).json()
    assert second["user"]["role"] == "student"


def test_teacher_role_requires_admin_token(client, admin):
    resp = client.post(
        "/api/v1/auth/register",
        json={"username": "teacher1", "password": "teach-secret-1", "role": "teacher"},
    )
    assert resp.json()["user"]["role"] == "student"  # no token -> demoted to student

    resp = client.post(
        "/api/v1/auth/register",
        json={"username": "teacher2", "password": "teach-secret-1", "role": "teacher"},
        headers={"X-Admin-Token": "bootstrap-admin-token"},
    )
    assert resp.json()["user"]["role"] == "teacher"


def test_duplicate_username_409_and_weak_password_422(client, admin):
    resp = client.post("/api/v1/auth/register", json={"username": "root", "password": "root-secret-1"})
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "USERNAME_TAKEN"

    resp = client.post("/api/v1/auth/register", json={"username": "shorty", "password": "short"})
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"


def test_login_success_and_bad_credentials(client, admin):
    ok = client.post("/api/v1/auth/login", json={"username": "root", "password": "root-secret-1"})
    assert ok.status_code == 200
    body = ok.json()
    assert body["tokenType"] == "Bearer"
    assert body["expiresIn"] > 0
    assert body["user"]["username"] == "root"

    bad = client.post("/api/v1/auth/login", json={"username": "root", "password": "wrong-pass"})
    assert bad.status_code == 401
    assert bad.json()["error"]["code"] == "BAD_CREDENTIALS"

    missing = client.post("/api/v1/auth/login", json={"username": "ghost", "password": "whatever-1"})
    assert missing.status_code == 401
