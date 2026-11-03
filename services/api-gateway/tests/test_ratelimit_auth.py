"""Rate limiting + optional static-token auth hook (until M11 JWT)."""

IP = {"X-Forwarded-For": "10.9.9.9"}


def test_rate_limit_429_envelope(client, monkeypatch):
    monkeypatch.setattr("app.config.RATE_LIMIT_PER_MINUTE", 3)
    for _ in range(3):
        assert client.get("/case/documents", headers=IP).status_code == 200
    resp = client.get("/case/documents", headers=IP)
    assert resp.status_code == 429
    assert resp.json()["error"]["code"] == "RATE_LIMITED"


def test_auth_required_when_token_configured(authed_client):
    # no token -> 401
    resp = authed_client.get("/case/documents")
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "UNAUTHORIZED"

    # wrong token -> 401
    resp = authed_client.get("/case/documents", headers={"Authorization": "Bearer nope"})
    assert resp.status_code == 401

    # correct token -> proxied
    resp = authed_client.get("/case/documents", headers={"Authorization": "Bearer secret-token"})
    assert resp.status_code == 200


def test_health_exempt_from_auth(authed_client):
    assert authed_client.get("/health").status_code == 200


def test_auth_disabled_by_default(client):
    assert client.get("/case/documents").status_code == 200
