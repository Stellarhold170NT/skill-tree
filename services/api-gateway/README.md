# api-gateway

Module **M10** of the learning platform (Graph RAG for tracking and recommending
learners) — the **single entry point**. Clients (the DeepSeek Harness UI, Roadmap
Viewer plugin, external tools) talk only to the gateway; it forwards to the
services behind it and never leaks their addresses into client code.

## Role in the platform

- **Routing**: `/{prefix}/{rest}` → `{upstream}/{rest}`. Services serve their APIs
  under `/api/v1/...`, so `GET /case/documents` reaches opencase-service's
  `GET /api/v1/documents`. Prefix table:

  | Prefix | Service | Default upstream |
  |---|---|---|
  | `case` | M1 opencase | `http://localhost:8101` |
  | `quiz` | M2 quiz | `http://localhost:8102` |
  | `class` | M6 class | `http://localhost:8103` |
  | `events` | M4 analytics | `http://localhost:8104` |
  | `learner` | M5 learner-model | `http://localhost:8105` |
  | `assignments` | M7 assignment | `http://localhost:8106` |
  | `documents` | M3 document | `http://localhost:8107` |
  | `auth` | M11 auth-service | `http://localhost:8108` |

  `GET /api/v1/routes` returns the live table (discovery for the UI).
- **Rate limiting**: in-memory token bucket per client IP (dev-grade; a Redis
  bucket is the production upgrade). Over-limit → `429 RATE_LIMITED`.
- **Auth hook**: when `GATEWAY_AUTH_TOKEN` is set, every proxied request must carry
  `Authorization: Bearer <token>` (health + route table exempt). Unset → auth off.
  Superseded by the JWT flow of M11 auth-service — the `auth` prefix stays
  token-free so login/register can issue the JWT in the first place.
- **Error envelope**: upstream unreachable → `502 UPSTREAM_UNAVAILABLE`; all errors
  follow the platform envelope `{"error": {"code", "message", "details"}}`.

## Tech stack

- Python 3.11, FastAPI, httpx (async streaming proxy) — **stateless, no DB**.

## Quickstart

```bash
# local (start the services first, or point the env vars elsewhere)
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --port 8000 --reload   # route table: http://localhost:8000/api/v1/routes

# docker (compose wires the service names automatically)
# from the repo root: docker compose -f deploy/docker-compose.yml up -d api-gateway
```

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `CASE_BASE_URL` … `DOCUMENT_BASE_URL` | `http://localhost:810N` | Upstream base per prefix (compose sets service names) |
| `AUTH_BASE_URL` | `http://localhost:8108` | Upstream for the `auth` prefix (M11 auth-service) |
| `GATEWAY_AUTH_TOKEN` | *(unset — auth off)* | Static bearer token required on proxied calls |
| `GATEWAY_RATE_LIMIT` | `120` | Requests per minute per client IP |
| `GATEWAY_TIMEOUT_S` | `10` | Upstream timeout |

## API reference

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Gateway liveness |
| GET | `/api/v1/routes` | Prefix → upstream table |
| ANY | `/{prefix}/{rest:path}` | Proxy to the mapped service |

### Notes

- Hop-by-hop headers are stripped both ways; request/response bodies stream through.
- 404s for unknown prefixes and 422 validation errors use the platform envelope.
- The gateway is the one component exempt from the `/api/v1` prefix rule
  (docs/MODULES.md principle 3).

## Running tests

```bash
pytest -q   # proxying (path/method/body/query), rate limit, auth hook — upstream faked via httpx.MockTransport
```

## Module roadmap

- JWT verification via M11 auth-service (JWKS or shared secret), role-based routes.
- Redis-backed distributed rate limiting + per-API-key quotas.
- Circuit breaker per upstream with health-aware routing.
