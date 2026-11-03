# skilltree-class-ui (M6 UI)

DeepSeek Harness **plugin** that gives an individual teacher a management surface
for their own classes: create classes, edit class metadata, enroll / un-enroll
anonymous student identities, inspect rosters — backed by **class-service (M6,
OneRoster v1.2 subset)** and reached only through the **api-gateway (M10)**.

## Role in the platform

- Implements the "Quản lý lớp học cấp cá nhân giáo viên" capability (AGENTS.md
  V1 goal #2, OpenSpec `v1-scope` requirement R2). It is intentionally NOT a
  school-scale SIS: one teacher → their classes → their students.
- Honors M6's data-minimization contract: the UI surfaces each student's
  `sourcedId` (the platform-wide anonymous `candidateId`) next to the display
  name, and never edits behavior data.
- Teacher JWT comes from the auth UI (M11, `POST /auth/login`). Until the
  auth-ui plugin lands, the token is pasted into the panel's connection card
  and stored browser-side only (`localStorage`, key
  `skilltree.classui.settings`).

## Architecture

```
browser (shell.overlay entry)                    host half (DSH process, M4)
┌────────────────────────────────┐   same-origin │ ┌──────────────────────────────┐
│ FAB "🏫 Lớp học" + Panel       │ ────────────▶ │ POST /classui/proxy          │
│ React.createElement, no build  │               │ validate + Bearer attach     │
└────────────────────────────────┘               └──────────────┬───────────────┘
                                                                ▼
                                          api-gateway (M10) :8000  /class/{rest}
                                                                ▼
                                          class-service (M6) :8103  /api/v1/{rest}
```

- The **client half** registers one additive `shell.overlay` slot (id
  `skilltree-class-ui`, order 55 — stacks above the roadmap-viewer FAB) and
  speaks only to the same-origin `/classui/proxy` route.
- The **host half** validates `{baseUrl, token?, method, path, body?}` (methods
  `GET|POST|PATCH|DELETE`, OneRoster-shaped rest path, 64 KB body cap, same-origin
  check) and forwards to `{baseUrl}/class/{rest}`, attaching
  `Authorization: Bearer <token>` when the teacher provided one. Tokens are
  never logged or persisted server-side.
- Both halves own their side effects through the cordis services
  (`webServer.register` / `slots.inject`), so plugin stop/update leaves no
  residue.

## INPUT (what the plugin consumes)

| Thing | Source | Notes |
|---|---|---|
| M6 REST (OneRoster subset) | `GET/POST/DELETE /api/v1/classes`, `PATCH /api/v1/classes/{id}`, `/users`, `/enrollments`, `GET /api/v1/courses`, `GET /api/v1/classes/{id}/students` | via gateway prefix `/class/` |
| Gateway base URL | teacher-entered, default `http://localhost:8000` | persisted in `localStorage` |
| Teacher JWT | auth-ui / M11 `POST /auth/login` | optional; forwarded per-request |

## OUTPUT

- Teacher panel UI: class list (title, course, term, head-count), create
  class, edit class metadata (title / term via `PATCH`), delete class, class
  detail (roster with `candidateId`), enroll an
  existing anonymous student, create-and-enroll a new anonymous student,
  un-enroll a student.
- Errors surface M6's platform envelope (`{"error": {code, message, details}}`)
  as human-readable messages (e.g. `DUPLICATE_ENROLLMENT`).

Example (teacher JWT attached; gateway prefix `/class/` → M6 OneRoster subset):

```bash
curl -s -X POST http://localhost:8000/class/classes \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer <teacher-jwt>' \
  -d '{"title":"Toán 10A1","courseSourcedId":"<course-id>","term":"HK1 2026"}'
# → 201 {"sourcedId":"cls-…","title":"Toán 10A1",…}   (enroll: POST /class/enrollments {userSourcedId,classSourcedId,role})
```

## Environment variables

None. The gateway/service addresses are teacher-supplied at runtime; the host
half adds no configuration of its own.

## Run (install into the harness)

The plugin ships pre-built (no npm build). It is wired in
`services/skill-tree-service/plugins/patch.yml` and symlinked for the client
bundle in `services/skill-tree-service/entrypoint.sh`:

```bash
# from the repo root, harness stack only
docker compose -f services/skill-tree-service/docker-compose.yml up -d --force-recreate skill-tree-harness
# full platform (gateway + M6 + harness)
docker compose -f deploy/docker-compose.yml up -d
```

Then open the harness UI (port 8104 / tunnel), click the floating
**“🏫 Lớp học”** button, set the gateway URL, paste the teacher token, and
manage classes.

## Test

```bash
node --input-type=module --check < services/skill-tree-service/plugins/skilltree-class-ui/lib/index.js
node --check services/skill-tree-service/plugins/skilltree-class-ui/client/client.js
# end-to-end smoke (real M6 :8103 + gateway shim :8000 + real host route):
node services/skill-tree-service/plugins/skilltree-class-ui/tests/smoke.mjs
#   exercises create class -> PATCH (edit title/term) -> enroll -> duplicate 409
#   -> roster -> un-enroll -> token attach -> upstream-down -> cross-origin 403
#   -> unsupported method -> path traversal -> delete class (25 checks)
```

## Dependencies

- Host: DSH `webServer` service (declared via `inject`), Node ≥ 20 global fetch.
- Client: DSH web shell `slots` service + `shell.overlay` slot, React provided
  by the platform module loader (`window.__ModuleLoader__`).
- Upstream: api-gateway (M10) → class-service (M6); auth-service (M11) for the
  teacher token.

## Known gaps (V1 scope, tracked in OpenSpec)

- **No per-teacher scoping**: M6 has no teacher-scoped tokens yet, so the
  listing shows the whole class catalog (single-teacher deployment assumption
  of V1). Teacher-scoped filtering lands with M6 auth (see M6 README roadmap).
