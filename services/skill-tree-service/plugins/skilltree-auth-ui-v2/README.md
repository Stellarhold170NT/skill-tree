# skilltree-auth-ui

DeepSeek Harness **plugin** for the SkillTree platform (module M12 family — UI
plugins) providing the V1 **login / register** experience (AGENTS.md V1 goal 1).
It talks to **auth-service (M11)** through the **api-gateway (M10)** — the single
entry point — and keeps the issued JWT in the browser.

## Role in the platform

- Registers a `settings.section` slot entry (**"Tài khoản"**) in the Harness web UI.
- Logged-out view: **Đăng nhập** (username/password) and **Tạo tài khoản**
  (username, password ≥ 8 chars, confirm, role).
- **Two-role design**: `student` needs nothing extra; `teacher`/`admin` require an
  admin token (sent as `X-Admin-Token`). The form states the platform rule from
  auth-service: the **first registered account becomes admin** without a token.
- Logged-in view: username, role badge, expiry, **Kiểm tra phiên** (re-verify),
  **Đăng xuất** (clears storage).
- JWT contract: `{accessToken, tokenType, expiresAt, user}` stored in
  `localStorage["skilltree.auth.v1"]`; every auth call sends
  `Authorization: Bearer <token>`. On reload the token is re-verified via
  `POST /api/v1/auth/verify`; invalid/expired tokens are cleared automatically.
  Other SkillTree plugins may read the same key to attach the header.

## Architecture

```
browser (settings.section "Tài khoản")        host half (DSH process)
┌───────────────────────────────────┐         ┌──────────────────────────────────┐
│ client/client.js                  │  fetch  │ lib/index.js — same-origin proxy │
│ login/register/verify forms       │ ──────▶ │ /skilltree-auth/{login,register, │
│ localStorage JWT + Authorization  │         │  verify,config} → allow-list only│
└───────────────────────────────────┘         └───────────────┬──────────────────┘
                                                              ▼
                                            api-gateway (M10) :8000  /auth/{rest}
                                                              ▼
                                            auth-service (M11) :8108  /api/v1/auth/*
```

- The client never sees M11/M10 addresses by default; the host half forwards
  only the fixed allow-list (`login`, `register`, `verify`) — no open proxy.
- POSTs must be same-origin; bodies are capped at 16 KiB; tokens are never logged.
- The gateway routes `/{prefix}/{rest}` → `{upstream}/api/v1/{rest}`; the `auth`
  prefix (added in this change) maps to `AUTH_BASE_URL` (default `http://localhost:8108`).

## INPUT / OUTPUT contract

- **INPUT (HTTP, mounted by the host half):**
  - `GET  /skilltree-auth/config` → `{gatewayBaseUrl, gatewayPrefix, upstream}`
  - `POST /skilltree-auth/login`    body `{username, password}`
  - `POST /skilltree-auth/register` body `{username, password, role}` + optional header `X-Admin-Token`
  - `POST /skilltree-auth/verify`   header `Authorization: Bearer <jwt>`
  - Any of the three POSTs may carry an extra `__baseUrl` field (http/https only)
    to override the gateway for that call — it is stripped before forwarding.
- **OUTPUT:** the M11 JSON responses pass through unchanged, including the
  platform error envelope `{"error": {"code", "message", "details"}}`
  (`400 BAD_REQUEST`, `401 BAD_CREDENTIALS/UNAUTHORIZED`, `409 USERNAME_TAKEN`,
  `502 UPSTREAM_UNAVAILABLE` when the gateway is down).

Example (host route mounted by the harness at :8104 — M11/M10 stay behind it):

```bash
curl -s -X POST http://localhost:8104/skilltree-auth/login \
  -H 'Content-Type: application/json' -d '{"username":"gv01","password":"secret123"}'
# → {"accessToken":"<jwt>","tokenType":"bearer","expiresAt":"…","user":{"username":"gv01","role":"teacher"}}
```

## Environment variables

| Var | Default | Purpose |
|---|---|---|
| `SKILLTREE_GATEWAY_URL` | `http://localhost:8000` | M10 gateway base used by the host-half proxy. Set `http://api-gateway:8000` when the harness runs inside the compose `platform-net`. The UI "Cấu hình nâng cao" field overrides it per browser. |

## How to load it (ghép patch.yml)

1. This directory is already under `services/skill-tree-service/plugins/` and
   `plugins/patch.yml` has the row:
   ```yaml
   - id: skilltree-auth-ui
     name: '/app/plugins/skilltree-auth-ui/lib/index.js'
   ```
2. `docker compose -f services/skill-tree-service/docker-compose.yml up -d --build`
   (or restart the harness) — the loader mounts `lib/index.js` (host half) and
   composes `client/client.js` (web platform, `dsh.client.platform: "web"`).
3. Open the Harness web UI → **Settings → Tài khoản**.

## How to test

```bash
# 1. syntax check (plain JS, no build step)
node --check lib/index.js
node --check client/client.js

# 2. client-half behavior (fake browser env — real component handlers, no build step)
node tests/client.mjs         # 6 checks: login stores JWT, verify-on-reload sends Authorization,
                              # student register sends no token header, teacher register sends
                              # X-Admin-Token, empty token blocked client-side, 401 clears storage

# 3. host-half proxy behavior (no services needed — fake harness webServer + fake gateway)
node tests/smoke.mjs          # 8 checks: config, 502 envelope, passthrough, header forwarding,
                              # __baseUrl stripping, cross-origin 403, 405, bad __baseUrl

# 4. end-to-end with REAL M11 + M10 (start them first):
cd ../../../auth-service  && DATABASE_URL=sqlite:///./data/auth.db python -m uvicorn app.main:app --port 8108 &
cd ../../../api-gateway   && AUTH_BASE_URL=http://127.0.0.1:8108 python -m uvicorn app.main:app --port 8000 &
node tests/e2e.mjs            # 7 checks: first-user-is-admin, student default, wrong admin
                              # token → student, 409 duplicate, verify JWT, login, 401
```

UI manual steps + expected logs are in the task report
(`reports/b_auth_ui--cbcc929b.md`).

## Dependencies

- Host half: Node ≥ 18 (`fetch`, `AbortSignal.timeout`), harness service `webServer`.
- Client half: harness module loader + React (`require("react")`), slot service.
- Platform: M11 auth-service contract (`/api/v1/auth/*`) and M10 gateway with the
  `auth` prefix (this change).
