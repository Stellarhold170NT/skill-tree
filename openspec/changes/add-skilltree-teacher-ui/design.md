# Design: add-skilltree-teacher-ui


## Context


- Predecessors in this plugin family: `roadmap-viewer` (main, RPC-style dynamic
  plugin), `skilltree-auth-ui` (branch, settings-section + allow-list proxy) and
  `skilltree-class-ui` (branch, shell.overlay + webServer route proxy). The
  teacher dashboard follows the **class-ui/auth-ui pattern**: a committed npm
  package under `services/skill-tree-service/plugins/<name>/` with
  `lib/index.js` (host) + `client/client.js` (browser) + `package.json`
  (`dsh.client.platform: "web"`) + tests, loaded via a `patch.yml` row.
- API shapes verified against source (not docs):
  - M5 heatmap → `{students: [sourcedId], concepts: [uri], cells: {sid: {uri: state}}}`
    (`services/learner-model-service/app/service.py: heatmap()`).
  - M5 teaching-plan → `[{conceptUri, redCount, rustyCount, amberCount, unlocks[], reason}]`
    (`service.py: teaching_plan()`).
  - M7 assignment create/read → `{id, title, conceptUri, targetGroup, studentIds[], itemIds[], quizTestId, status, dueAt}`
    (`services/assignment-service/app/schemas.py`).
  - M4 events → `[{eventId, type, occurredAt, actorId, objectId, payload, ...}]`
    (`services/analytics-service/app/schemas.py`).
  - M6 → OneRoster `classes` / `classes/{id}/students` (`UserRead.displayName`).
  - Gateway prefixes: `class|learner|case|events|assignments`
    (`services/api-gateway/README.md`).

## Goals / non-goals


- Goals: one round-trip dashboard load (GET-only batch), one click from diagnosis
  (heatmap/plan) to intervention (M7 assignment → M2 quiz), per-student
  drill-down, a working Class Ask box, zero direct browser→service traffic.
- Non-goals: LLM/cognee-backed Class Ask (V2, M8), editing the concept graph,
  cross-class analytics, notification fan-out (M9 🔜).


## Decisions


### D1 — GET-only batch route instead of per-endpoint routes
`POST /skilltree-teacher/batch {calls[]}` fans out up to 8 validated GETs in
parallel. Rationale: the dashboard needs 5 GETs per load and the drill-down 3
more; a single validated fan-out keeps the allow-list small (prefix allow-list +
path regex + no `..`), avoids 8 same-origin round-trips, and keeps mutations on
dedicated auditable routes. *Alternative rejected: open generic proxy (class-ui
style) — wider attack surface than a fixed GET allow-list.*

### D2 — Mutations as dedicated routes
`assign` and `quiz` validate the M7 contract client-of-host side (title 1..200,
sourcedId UUID, targetGroup enum, ISO dueAt) and forward to M7 with the teacher
JWT. Rationale: only two mutations exist; dedicated routes give precise
validation errors before any upstream call.

### D3 — Class Ask as deterministic host-side answerer over live M5 data
`POST /skilltree-teacher/ask` fetches heatmap + teaching-plan + roster + graph
once, then runs a pure `answerClassAsk(question, data)`: intent detection
(green/red/rusty/summary via Vietnamese diacritic-stripped keywords) +
concept matching against M1 labels (token overlap scoring). No new service, no
fake data; the response's `source` field and the UI state plainly that this is a
V1 heuristic pending cognee M8. *Alternative rejected: shipping a dead input
box, or blocking V1 on M8.*

### D4 — RAG color tokens
Chips use tint background + dark colored text pairs (danger `#B3261E` on
`#FDECEC`, success `#167F4D` on `#E6F7EC`, amber `#7A5800` on `#FDF3D9` — all
≥ 4.5:1), rusty distinguished by a dashed border. Declared in the plugin README
as the dashboard-only extension of DESIGN.md.

### D5 — JWT consumption
Read-only consumer of `localStorage["skilltree.auth.v1"]` (same contract
auth-ui documents for other plugins). Missing token → amber banner, dashboard
still usable when the gateway runs with auth off.


## Migration plan


Single additive plugin + one `patch.yml`/`patch.local.yml` row; no data
migration, no changes to existing services or plugins.


## Open questions


- None blocking V1. Post-V1: swap the Class Ask core for the cognee M8
  `/api/v1/class/ask` endpoint when it lands (the route already returns a typed
  envelope, so the client changes only its `source` rendering).
