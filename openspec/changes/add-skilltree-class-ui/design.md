# Design — add-skilltree-class-ui

## Decisions

1. **Static DSH plugin, `secret`-plugin packaging.** `package.json`
   (`dsh.client.platform: "web"`, `exports: {".", "./client"}`) +
   `lib/index.js` (host half) + `client/client.js` (client half, no build
   step). Registered in `patch.yml` by bare name and symlinked into the web
   profile `node_modules` in `entrypoint.sh` so the client-modules registry
   composes the client bundle — exactly how `secret` ships. (Chosen over the
   repo-root `roadmap-viewer` style, which targets dynamic `cordis_define`
   loading; the brief's commit scope is `skill-tree-service,plugins` and the
   UI must survive `docker compose restart`.)
2. **One generic same-origin proxy route, not per-endpoint RPCs.**
   `POST /classui/proxy {baseUrl, token?, method, path, body?}` validates
   (http/https only, method in GET/POST/PATCH/DELETE, OneRoster
   rest-path regex, 64 KB body cap, same-origin check like `secret`) and
   forwards to `{baseUrl}/class/{rest}` — the M10 gateway contract that maps
   `/class/{rest}` → M6 `/api/v1/{rest}`. Rationale: 10+ M6 endpoints would
   need 10+ RPCs; the panel passes paths it already renders. Principle of
   least privilege is preserved by the prefix lock (`/class/` only) and
   method whitelist. `PATCH` (added when M6 grew `PATCH /classes/{id}`) takes
   a JSON object body under the same rules as `POST`.
3. **Host-side outbound fetch via `globalThis.fetch`** (Node ≥ 20, available in
   the hardened harness) instead of the `web` service, because the write
   methods need JSON bodies and arbitrary headers — `web.fetch({url})` as used
   by roadmap-viewer is GET-shaped and its request schema is not documented in
   this repo. The `webServer` service is declared as a hard dependency
   (`inject`), matching `secret`.
4. **Token stays client-side.** The panel stores `{baseUrl, token}` in
   `localStorage` (`skilltree.classui.settings`) and sends it per-request; the
   host attaches `Authorization: Bearer <token>` and never logs or persists
   it. When auth-ui lands it can prefill the same key.
5. **DESIGN.md tokens, inline style objects** (no CSS files, no build). All
   hex values come from DESIGN.md (`--st-*` ramp); primary buttons use
   `--st-boot #167F4D` (white text 5.03:1 AA) instead of `--st-primary-500`
   (3.03:1, large-UI-only). Teacher tone: dense tables, Vietnamese copy,
   `candidateId` rendered in mono so roster↔Cognee dataset mapping is visible.

## Data flow

client (`shell.overlay` panel) → same-origin `POST /classui/proxy` →
host validates + attaches token → `{baseUrl}/class/{rest}` (M10) →
M6 `/api/v1/{rest}` → normalized `{ok, status, data|error}` back to the panel.

## Risks / mitigations

- **M6 down** → host returns `{ok:false, status:0, error:"upstream unreachable:…"}`;
  panel shows the exact `docker compose` command to start the stack.
- **Duplicate enrollment** → M6 `409 DUPLICATE_ENROLLMENT` surfaced as
  "Học sinh đã ở trong lớp với vai trò này."
- **Shared workspace race** — none: the plugin owns only its own directory;
  `patch.yml`/`entrypoint.sh` edits are single-row insertions.
