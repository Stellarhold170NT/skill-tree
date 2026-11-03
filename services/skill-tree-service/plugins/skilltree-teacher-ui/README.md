# skilltree-teacher-ui


DeepSeek Harness **plugin** for the SkillTree platform (module M12 family — UI
plugins) providing the V1 **teacher dashboard** (AGENTS.md V1 goals 3–4; features
from `skilltree-skills/01-muc-tieu-do-an.md` "Góc nhìn Giáo viên"): class RAG
heatmap, contrastive teaching plan, one-click targeted intervention, per-student
drill-down and the Class Ask flow — table-first, high information density.


## Role in the platform


- Registers one additive `shell.overlay` entry — floating **"📊 Bảng GV"** button →
  slide-over dashboard. It never shadows shipped UI (same pattern as
  `skilltree-auth-ui` / `skilltree-class-ui`).
- **Class selector + documentId** → one GET-only batch through the host half:
  - M5 `GET /api/v1/classes/{id}/heatmap?documentId=` → `{students[], concepts[], cells{sid: {uri: red|amber|green|rusty|none}}}`
  - M5 `GET /api/v1/classes/{id}/teaching-plan?documentId=&topN=5` → ranked plan with contrastive `reason`
  - M6 `GET /api/v1/classes` + `GET /api/v1/classes/{id}/students` → classes and pseudonymous roster names
  - M1 `GET /api/v1/documents/{id}/graph` → concept labels (CASE `humanCodingScheme` + `fullStatement`)
- **Heatmap** `[students × concepts]` with RAG chips (Đỏ/Vàng/Xanh/Rusty/—),
  WCAG AA pairs on tint backgrounds; clicking a student opens the **drill-down**.
- **Teaching Plan** table: red/rusty/amber counts, unlock value, the M5
  contrastive reason ("teach X first, it unlocks Y"), and a **"Giao ôn tập"**
  action per row.
- **Targeted intervention (M7)**: `POST /api/v1/assignments`
  `{title, classId, conceptUri, targetGroup: red|rusty|red_rusty, dueAt?}` → the
  service resolves the struggling group (M5) + matching quiz items (M2); then
  **"Tạo đề kiểm tra M2"** → `POST /api/v1/assignments/{id}/quiz`.
- **Drill-down**: M5 `GET /students/{id}/mastery` (state, mastery %, rating ± RD,
  review count), M5 `GET /students/{id}/next?documentId=` (frontier recommendation
  with explanation), M4 `GET /events?actorId={sid}&limit=20` (recent learning history).
- **Class Ask**: free-text question → deterministic V1 answerer over live data
  (see "Class Ask (V1 heuristic)" below).


## Architecture


```
browser (shell.overlay "Bảng GV")           host half (DSH process, M4 :8104)
┌──────────────────────────────────┐        ┌───────────────────────────────────────┐
│ client/client.js                 │ fetch  │ lib/index.js — same-origin routes:    │
│ heatmap · plan · assign · drill  │ ─────▶ │  GET  /skilltree-teacher/config       │
│ drill-down · Class Ask           │        │  POST /skilltree-teacher/batch        │
│ JWT from localStorage            │        │  POST /skilltree-teacher/assign       │
│ (skilltree.auth.v1, auth-ui)     │        │  POST /skilltree-teacher/quiz         │
└──────────────────────────────────┘        │  POST /skilltree-teacher/ask          │
                                            └──────────────────┬────────────────────┘
                                                               ▼
                                             api-gateway (M10) :8000 — prefixes
                                             class/learner/case/events/assignments
                                                               ▼
                                             M6 :8103 · M5 :8105 · M1 :8101 ·
                                             M4 :8104 · M7 :8106
```


- The browser never addresses services directly; the host half forwards only
  fixed allow-lists (GET-only prefixes for `batch`, dedicated routes for the M7
  mutations). The teacher JWT arrives as `Authorization` and is forwarded
  verbatim — never logged, never persisted server-side.
- POSTs must be same-origin; bodies capped at 16 KiB; upstream timeout 10 s;
  platform error envelope `{"error": {code, message, details}}` passes through.


## INPUT / OUTPUT contract


- **INPUT (HTTP, mounted by the host half):**
  - `GET  /skilltree-teacher/config` → `{gatewayBaseUrl, prefixes, upstream}`
  - `POST /skilltree-teacher/batch`  body `{calls: [{id, prefix, path, query?}]}` (1..8, GET-only,
    prefixes `class|learner|case|events`) → `{ok, results: [{id, ok, status, data?, error?}]}`
  - `POST /skilltree-teacher/assign` body `{title, classId, conceptUri, targetGroup, dueAt?}` → M7 AssignmentRead
  - `POST /skilltree-teacher/quiz`   body `{assignmentId}` → `{quizTestId, quizIdentifier, itemIds, studentIds}`
  - `POST /skilltree-teacher/ask`    body `{question, classId, documentId}` → `{ok, answer, evidence, source}`
  - Every POST may carry an optional `__baseUrl` (http/https only) to override
    the gateway per call — stripped before forwarding.
- **OUTPUT:** gateway JSON passes through unchanged, including error envelopes
  (`502 UPSTREAM_UNAVAILABLE` when the gateway is unreachable, `422 INVALID_TARGET_GROUP`,
  `409 QUIZ_ALREADY_GENERATED`, …) — surfaced verbatim in the dashboard banners.


## Class Ask (V1 heuristic)


There is **no Class Ask backend yet** (`class/ask` of the cognee gateway M8 is
🔜 in `docs/MODULES.md`). To keep the V1 feature-complete without inventing a
service, the host half answers from **live M5 data**: it fetches heatmap +
teaching-plan (+ M1 labels, M6 roster), detects intent
(nắm vững/green · yếu/red · rusty/quên · tổng quan) and keyword-matches the
concept, then composes a Vietnamese answer with counts and names.
`source` in every response marks this: *"learner-model (M5): heatmap +
teaching-plan — V1 heuristic, upgradeable to cognee (M8)"*.


## Environment variables


| Var | Default | Purpose |
|---|---|---|
| `SKILLTREE_GATEWAY_URL` | `http://localhost:8000` | M10 gateway base used by the host-half proxy. Set `http://api-gateway:8000` when the harness runs inside the compose `platform-net`. The dashboard "Gateway override" field overrides it per browser. |


## Design tokens (DESIGN.md)


Brand palette reused verbatim from `skilltree-class-ui` / `skilltree-brand`
(leaf green `#27A95F`, boot `#167F4D`, ink `#1C3632`, neutral ramp). Dashboard-only
RAG semantic tints (declared here as the single source for them):
`amberTint #FDF3D9` + `amberText #7A5800` (6.1:1 AA) for the amber/rusty states.
Anti-slop: no gradients, no glassmorphism, no nested-card stacking, no motion
slop; table-first density; system-ui font stack.


## How to load it (ghép patch.yml)


1. This directory lives under `services/skill-tree-service/plugins/`; both
   `plugins/patch.yml` (docker, bare name → entrypoint symlinks the package into
   the profile so the Settings tab composes the client half) and
   `plugins/patch.local.yml` (Windows path) carry the row:
   ```yaml
   - id: skilltree-teacher-ui
     name: 'skilltree-teacher-ui'
   ```
2. `docker compose -f services/skill-tree-service/docker-compose.yml up -d --build`
   (or `run-local.ps1`) — then restart the harness.
3. Open the Harness web UI → floating **"📊 Bảng GV"** button (bottom-right) →
   pick a class (M6), paste the M1 `documentId`, press **"Tải dashboard"**.


## How to test


```bash
# 1. syntax check (plain JS, no build step)
node --check lib/index.js
node --check client/client.js


# 2. host-half proxy behavior (no services needed — fake webServer + fake gateway)
node tests/smoke.mjs          # 29 checks: config, batch passthrough + allow-list,
                              # traversal/oversize/origin/method discipline, token
                              # forwarding, assign/quiz contracts, Class Ask on
                              # live-shaped fixtures, dead-gateway 502, units


# 3. client-half behavior (fake browser env — real component handlers, no build step)
node tests/client.mjs         # 29 checks: dashboard batch + Authorization header,
                              # heatmap/plan render, drill-down (mastery/next/events),
                              # assign → M7 contract → quiz generation, Class Ask,
                              # settings persistence, degraded gateway banner


# 4. end-to-end with the real stack:
#   docker compose -f deploy/docker-compose.yml up -d   (M1/M4/M5/M6/M7 + gateway)
#   then in the dashboard: select class + documentId → Tải dashboard
```


## Dependencies


- Host half: Node ≥ 18 (`fetch`, `AbortSignal.timeout`), harness service `webServer`.
- Client half: harness module loader + React (`require("react")`), slot service,
  `localStorage` keys `skilltree.auth.v1` (auth-ui JWT) and
  `skilltree.teacherui.settings` (class/document/gateway override).
- Platform contracts: M5 learner-model, M6 class-service, M1 opencase, M4
  analytics, M7 assignment-service (see `docs/MODULES.md`) behind M10 api-gateway.
