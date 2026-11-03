# Task #5 Report — M11 auth-service (JWT HS256, roles)

**Status:** DONE · **Main:** see commits below

## What was built

`services/auth-service/` (port **8108**) — the platform identity provider:

- **Accounts**: `User {id, username, password_hash, role, sourcedId?, createdAt}`;
  PBKDF2-SHA256 (100k iterations, per-user salt). Roles `student | teacher | admin`.
- **Bootstrap + role gating**: the first registered account becomes `admin`; later
  non-student registrations require the shared `X-Admin-Token`
  (`ADMIN_REGISTRATION_TOKEN`), otherwise they are silently demoted to `student`.
- **JWT**: compact HS256 implemented on the stdlib (no pyjwt dependency) —
  `{sub, username, role, iat, exp}`, TTL configurable; constant-time signature
  comparison; payload `alg` confusion and expiry both rejected with distinct
  messages; tampered payload → signature mismatch → 401.
- **Endpoints**: `POST /auth/register`, `POST /auth/login`, `POST /auth/verify`,
  `GET /users/me` (+ `/health`). 409 `USERNAME_TAKEN`, 401 `BAD_CREDENTIALS` /
  `UNAUTHORIZED`, 422 envelope validation — platform error envelope throughout.
- Standards: `/api/v1` prefix, `GET /api/v1/health`, UUIDv4-hex ids, ISO-8601 UTC,
  camelCase, own DB (`auth-db` stack).

## Commits

- `feat(platform): add auth-service (M11) with JWT HS256 + roles` — 17 files + shared
  docs/compose (fast-forward merged to main; author
  `Nguyễn Việt Huy <Stellarhold170NT@users.noreply.github.com>`).

## Tests

```
docker run --rm -v /workspace:/code -w /code/services/auth-service py-test pytest -q
→ 9 passed (first-user bootstrap, role demotion without X-Admin-Token, teacher with
  token, duplicate 409, weak password 422, login ok/bad/missing, verify ok / garbage /
  tampered signature / expired token, /users/me roundtrip + unknown subject)
```

## Docs / deploy integration

- `deploy/docker-compose.yml`: `auth-db` + `auth-service` (8108, `auth-net` +
  `platform-net`); `api-gateway` (from Task #4) on the same compose.
- `.env.example`: `AUTH_PORT`, `AUTH_TOKEN_TTL`, `AUTH_SECRET`,
  `ADMIN_REGISTRATION_TOKEN`, `AUTH_DB_PASSWORD`.
- `services/README.md` + `docs/deployment.md` + `docs/MODULES.md` updated (M11 ✅).

## Concerns

- `AUTH_SECRET` defaults to a dev value — **must** be overridden in any shared
  environment (called out in README + `.env.example`).
- Refresh tokens / revocation and OIDC federation are roadmap items.
- Standing reminder: rotate the GitHub PAT used for push/merge; never commit it.
