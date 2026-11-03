"""Gateway test fixtures: fake upstreams via httpx.MockTransport."""

import os
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

os.environ.pop("GATEWAY_AUTH_TOKEN", None)
os.environ["GATEWAY_RATE_LIMIT"] = "120"

import httpx  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import create_app  # noqa: E402


def _fake_upstream_handler(request: httpx.Request) -> httpx.Response:
    """Echoes what the gateway forwarded — a stand-in for every service."""
    return httpx.Response(
        200,
        json={
            "echoPath": request.url.path,
            "echoMethod": request.method,
            "echoQuery": str(request.url.query),
            "echoBody": request.read().decode(),
        },
        headers={"x-upstream": "fake"},
    )


@pytest.fixture()
def client():
    app = create_app()
    with TestClient(app) as test_client:
        # replace the real upstream client (created in lifespan) with a mock one
        test_client.app.state.upstream_client = httpx.AsyncClient(
            transport=httpx.MockTransport(_fake_upstream_handler), follow_redirects=False
        )
        # isolate rate-limit state between tests
        from app import routes as _routes

        _routes._buckets.clear()
        yield test_client


@pytest.fixture()
def authed_client(client, monkeypatch):
    monkeypatch.setattr("app.config.AUTH_TOKEN", "secret-token")
    yield client
