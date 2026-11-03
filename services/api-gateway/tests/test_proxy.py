"""Proxying semantics: path mapping, methods, bodies, errors."""

import json

import httpx


def test_health_and_route_table(client):
    body = client.get("/health").json()
    assert body == {"status": "ok", "service": "api-gateway", "version": "0.1.0"}

    routes = client.get("/api/v1/routes").json()["prefixes"]
    assert routes["case"]["upstream"].endswith("8101")
    assert routes["learner"]["upstream"].endswith("8105")
    assert routes["auth"]["upstream"].endswith("8108")
    assert routes["rag"]["upstream"].endswith("8109")
    assert len(routes) == 9


def test_forwards_path_method_and_query(client):
    resp = client.get("/case/documents", params={"limit": 5})
    body = resp.json()
    assert resp.status_code == 200
    assert body["echoPath"] == "/api/v1/documents"
    assert body["echoMethod"] == "GET"
    assert "limit=5" in body["echoQuery"]

    # deep path with nested ids
    deep = client.get("/learner/students/abc123/mastery").json()
    assert deep["echoPath"] == "/api/v1/students/abc123/mastery"


def test_forwards_post_body_and_headers(client):
    resp = client.post(
        "/quiz/items",
        json={"conceptUri": "http://x/CFItems/1", "question": "2+2?"},
    )
    body = resp.json()
    assert body["echoMethod"] == "POST"
    sent = json.loads(body["echoBody"])
    assert sent["conceptUri"].endswith("CFItems/1")
    assert resp.headers.get("x-upstream") == "fake"


def test_all_prefixes_map_to_api_v1(client):
    for prefix in ["case", "quiz", "class", "events", "learner", "assignments", "documents", "auth", "rag"]:
        resp = client.get(f"/{prefix}/ping")
        assert resp.status_code == 200
        assert resp.json()["echoPath"] == "/api/v1/ping"


def test_auth_prefix_reaches_auth_service(client):
    # M11 login through the gateway: /auth/auth/login → auth-service /api/v1/auth/login
    resp = client.post("/auth/auth/login", json={"username": "huy", "password": "password123"})
    body = resp.json()
    assert resp.status_code == 200
    assert body["echoPath"] == "/api/v1/auth/login"
    assert body["echoMethod"] == "POST"


def test_unknown_prefix_is_404(client):
    assert client.get("/unknown/ping").status_code == 404


def test_upstream_unreachable_502_envelope(client):
    # simulate a dead upstream: transport raises ConnectError for host :1
    def dead_handler(request):
        raise httpx.ConnectError("connection refused", request=request)

    client.app.state.upstream_client = httpx.AsyncClient(
        transport=httpx.MockTransport(dead_handler), follow_redirects=False
    )
    resp = client.get("/case/documents")
    assert resp.status_code == 502
    assert resp.json()["error"]["code"] == "UPSTREAM_UNAVAILABLE"
