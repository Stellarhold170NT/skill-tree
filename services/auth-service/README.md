# auth-service

Module **M11** of the learning platform (Graph RAG for tracking and recommending
learners) — the **identity provider**. Issues and verifies HS256 JWTs for the
platform: humans log in here, every other component trusts the token. Behavioral
layers never see personal data — they keep only the pseudonymous `sourcedId`.

## Role in the platform

- **Accounts**: username + PBKDF2-SHA256 password hash (100k iterations, per-user
  salt). `role ∈ student | teacher | admin` maps to access policies (teachers act
  within their classes, students on their own data).
- **Bootstrap**: the **first registered user becomes admin**; after that, registering
  a `teacher`/`admin` role requires the shared `X-Admin-Token`
  (`ADMIN_REGISTRATION_TOKEN` env) — otherwise the request silently stays `student`.
- **Tokens**: compact HS256 JWT implemented on the stdlib (`hmac`/`hashlib`) —
  no extra dependencies. Payload: `{sub, username, role, iat, exp}`; TTL default 1h.
- **Verification**: `POST /auth/verify` validates signature + expiry and returns the
  identity — this is the endpoint the api-gateway (M10) will delegate to.

## Tech stack

- Python 3.11, FastAPI, pydantic v2, SQLAlchemy 2.x
- SQLite by default (dev/tests), PostgreSQL via `DATABASE_URL`

## Quickstart

```bash
# local
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --port 8108 --reload     # Swagger: http://localhost:8108/docs

# docker (with own Postgres)
docker run -d -p 8108:8108 skill-tree/auth-service:0.1.0
# or from the repo root: docker compose -f deploy/docker-compose.yml up -d
```

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./data/auth.db` | Any SQLAlchemy URL |
| `AUTH_SECRET` | `dev-secret-change-me` | **Set a strong secret in production** — signs all JWTs |
| `AUTH_TOKEN_TTL` | `3600` | Access-token lifetime (seconds) |
| `ADMIN_REGISTRATION_TOKEN` | *(empty)* | Shared token required to register teacher/admin roles |

## API reference (prefix `/api/v1`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness probe |
| POST | `/auth/register` | `{username, password, role?}` → token + user (first user = admin) |
| POST | `/auth/login` | `{username, password}` → `{accessToken, tokenType, expiresIn, user}` |
| POST | `/auth/verify` | Bearer token → `{sub, username, role, exp}` or 401 |
| GET | `/users/me` | Bearer token → the account record |

### Validation rules

- Username 3–100 chars; password ≥ 8 chars → `422 VALIDATION_ERROR`.
- Duplicate username → `409 USERNAME_TAKEN`; wrong credentials → `401 BAD_CREDENTIALS`.
- Any token problem (malformed / bad signature / expired / unknown subject) →
  `401 UNAUTHORIZED` with the reason in `message`.
- All errors use the platform envelope: `{"error": {"code", "message", "details"}}`.

## Integration contract

- Tokens are opaque to every other service: they either call `POST /auth/verify`
  (gateway pattern) or share `AUTH_SECRET` and verify locally.
- `User.sourcedId` optionally links the account to the anonymous learner identity
  issued by class-service (M6) — the ONLY cross-reference identity data keeps.
- Password hashes never leave this service; no personal data in behavioral layers
  (docs/MODULES.md principle 7).

## Running tests

```bash
pytest -q   # registration/bootstrap/role gating, login, JWT tamper + expiry + /users/me
```

## Module roadmap

- Refresh tokens + logout revocation list.
- OIDC federation (Google/Microsoft EDU) for school accounts.
- Per-class authorization claims signed into the token (teachers of class X).
