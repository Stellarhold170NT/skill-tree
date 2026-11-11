"""JWT verification: structure, signature, expiry, /users/me."""

import json

from app import security
from .conftest import _auth


def test_verify_ok(client, admin):
    resp = client.post("/api/v1/auth/verify", headers=_auth(admin["accessToken"]))
    assert resp.status_code == 200
    body = resp.json()
    assert body["username"] == "root"
    assert body["role"] == "admin"
    assert body["sub"] == admin["user"]["id"]


def test_verify_rejects_missing_and_garbage(client, admin):
    assert client.post("/api/v1/auth/verify").status_code == 401

    resp = client.post("/api/v1/auth/verify", headers=_auth("not-a-jwt"))
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "UNAUTHORIZED"


def test_verify_rejects_tampered_signature(client, admin):
    header, payload, signature = admin["accessToken"].split(".")
    # flip the role inside the payload, keep the old signature
    payload_obj = json.loads(security._b64url_decode(payload))
    payload_obj["role"] = "admin" if payload_obj["role"] != "admin" else "student"
    forged = f"{header}.{security._b64url_encode(json.dumps(payload_obj).encode())}.{signature}"
    resp = client.post("/api/v1/auth/verify", headers=_auth(forged))
    assert resp.status_code == 401


def test_verify_rejects_expired_token(client, admin):
    token, _ = security.issue_token(admin["user"]["id"], "root", "admin", ttl=-10)
    resp = client.post("/api/v1/auth/verify", headers=_auth(token))
    assert resp.status_code == 401
    assert "expired" in resp.json()["error"]["message"]


def test_users_me_roundtrip_and_missing_subject(client, admin):
    me = client.get("/api/v1/users/me", headers=_auth(admin["accessToken"]))
    assert me.status_code == 200
    assert me.json()["username"] == "root"
    assert me.json()["sourcedId"] is None

    # valid signature but unknown subject
    token, _ = security.issue_token("missing-user-id", "ghost", "student")
    resp = client.get("/api/v1/users/me", headers=_auth(token))
    assert resp.status_code == 401
