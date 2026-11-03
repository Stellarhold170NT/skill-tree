# C4 Level 2 — Container

> **Level:** [C2 — Container](https://c4model.com/diagrams/container): the deployable
> runtime units inside the SkillTree system and how they talk (REST / MCP / events),
> each owning its own database. People and external systems are simplified here — see
> [`l1-context.md`](l1-context.md) for users; components of three key containers are in
> [`l3-component.md`](l3-component.md).
> **Status tagging:** boxes/relations tagged **[V1 planned]** are designed but not yet
> implemented on `main` (`rag-service` design lives on branch `agent-v1-rag-design`).
> Everything untagged exists as code at `main@49c0ee2ebd`.
> **Syntax:** PlantUML C4 (C4-PlantUML), one diagram per file (AGENTS.md §5.4). Render:
> `plantuml -tpng` or paste into <https://www.plantuml.com/plantuml>.
> Inside evidence cells `·` replaces `|`.

```plantuml
@startuml l2-container
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml

title SkillTree Platform — C2 Containers (boxes tagged [V1 planned] are designed, not yet on main)

System_Boundary(platform, "SkillTree Platform") {

  Container(harness, "skill-tree-harness (M4)", "Node.js @deepseek-ai/dsh 0.1.5-rc.3, bwrap sandbox, iptables", "Agent harness: web UI/API host :8104 -> container :3080; sessions, plugin loader (patch.yml), per-student workspace")

  Container(gateway, "api-gateway (M10)", "FastAPI + httpx, stateless", "Single REST entry :8000; forwards prefix routes to upstream APIs under /api/v1; rate limit + optional bearer token")

  Container(opencase, "opencase-service (M1)", "FastAPI + SQLAlchemy", "CASE v1.1 concept graph, packages, topological order :8101")
  ContainerDb(opencaseDb, "opencase-db", "PostgreSQL 16", "CFDocument, CFItem, CFAssociation")

  Container(quiz, "quiz-service (M2)", "FastAPI + SQLAlchemy", "QTI v3.0 item bank, test assembly, attempts :8102")
  ContainerDb(quizDb, "quiz-db", "PostgreSQL 16", "Items, tests, attempts")

  Container(classSvc, "class-service (M6)", "FastAPI + SQLAlchemy", "OneRoster subset: orgs, classes, pseudonymous users, enrollments :8103")
  ContainerDb(classDb, "class-db", "PostgreSQL 16", "Orgs, classes, users, enrollments")

  Container(analytics, "analytics-service (events)", "FastAPI + SQLAlchemy", "Caliper-aligned learning events, append-only :8104")
  ContainerDb(analyticsDb, "analytics-db", "PostgreSQL 16", "Events (append-only)")

  Container(learner, "learner-model-service (M5)", "FastAPI + SQLAlchemy", "Glicko-2 mastery, Ebbinghaus rusty states, frontier, class heatmap :8105")
  ContainerDb(learnerDb, "learner-model-db", "PostgreSQL 16", "Mastery per student and concept")

  Container(assignment, "assignment-service (M7)", "FastAPI + SQLAlchemy", "Targeted practice from Red/Rusty groups :8106")
  ContainerDb(assignmentDb, "assignment-db", "PostgreSQL 16", "Assignments")

  Container(document, "document-service (M3)", "FastAPI + SQLAlchemy", "LRMI documents, chunks, alignments, file store :8107")
  ContainerDb(documentDb, "document-db", "PostgreSQL 16", "Documents, chunks, alignments")

  Container(latexml, "latexml-service (M3 engine)", "FastAPI + LaTeXML (ar5ivist), stateless", "LaTeX to ar5iv-style HTML; container :8103, host :8110; isolated on latexml-net")

  Container(auth, "auth-service (M11)", "FastAPI + SQLAlchemy", "Accounts, JWT HS256, roles teacher/student/admin :8108")
  ContainerDb(authDb, "auth-db", "PostgreSQL 16", "Accounts, roles")

  Container(rag, "[V1 planned] rag-service", "FastAPI + SQLite FTS5", "Student notebook RAG :8109: upload, parse, structure chunk, index, ask (design on branch agent-v1-rag-design)")
  ContainerDb(ragDb, "[V1 planned] rag SQLite", "SQLite + FTS5", "docs, sections, chunks, chunks_fts, jobs")

  Container(cogneeMcp, "cognee-memory (M8)", "Cognee graph + vector, MCP server", "Per-student datasets; integrated via MCP streamable-http; currently dev host :8021")
}

System_Ext(netmind, "NetMind LLM Gateway", "OpenAI-compatible chat completions; key via env only")

Rel(harness, opencase, "agent reads CASE graph, picks next concepts", "REST OPENCASE_URL /api/v1")
Rel(harness, quiz, "agent fetches QTI items, records attempts", "REST QUIZ_URL /api/v1")
Rel(harness, cogneeMcp, "student memory ingest / ask", "MCP streamable-http :8021")
Rel(harness, netmind, "agent LLM completions", "HTTPS, env-configured")

Rel(gateway, opencase, "forwards /case/*", "HTTP /api/v1")
Rel(gateway, quiz, "forwards /quiz/*", "HTTP /api/v1")
Rel(gateway, classSvc, "forwards /class/*", "HTTP /api/v1")
Rel(gateway, analytics, "forwards /events/*", "HTTP /api/v1")
Rel(gateway, learner, "forwards /learner/*", "HTTP /api/v1")
Rel(gateway, assignment, "forwards /assignments/*", "HTTP /api/v1")
Rel(gateway, document, "forwards /documents/*", "HTTP /api/v1")
Rel(gateway, auth, "[V1 planned] JWT verification wiring", "AUTH_BASE_URL env set; no auth prefix in UPSTREAMS yet")

Rel(learner, opencase, "reads concept graph for frontier", "HTTP OPENCASE_BASE_URL")
Rel(learner, classSvc, "resolves pseudonymous students", "HTTP CLASS_BASE_URL")
Rel(assignment, learner, "targets Red/Rusty groups", "HTTP LEARNER_BASE_URL")
Rel(assignment, quiz, "pulls practice items", "HTTP QUIZ_BASE_URL")

Rel(rag, latexml, "[V1 planned] renders LaTeX uploads", "HTTP LATEXML_BASE_URL http://latexml-service:8103")
Rel(rag, document, "[V1 planned] mirrors canonical docs + chunks, best effort", "HTTP DOCUMENT_BASE_URL")
Rel(rag, ragDb, "owns", "SQLite file on volume")
Rel(rag, netmind, "[V1 planned] optional answer synthesis", "HTTPS, retry-on-empty")

Rel(opencase, opencaseDb, "owns", "TCP 5432, private net")
Rel(quiz, quizDb, "owns", "TCP 5432, private net")
Rel(classSvc, classDb, "owns", "TCP 5432, private net")
Rel(analytics, analyticsDb, "owns", "TCP 5432, private net")
Rel(learner, learnerDb, "owns", "TCP 5432, private net")
Rel(assignment, assignmentDb, "owns", "TCP 5432, private net")
Rel(document, documentDb, "owns", "TCP 5432, private net")
Rel(auth, authDb, "owns", "TCP 5432, private net")

SHOW_LEGEND()
@enduml
```

## Reading guide

- **Database per service** (no cross-DB access, no shared DB): the `deploy/` stack
  provisions one `postgres:16-alpine` per service on its own private network; app
  containers share only `platform-net` for REST. Integration is URI/REST-first;
  Caliper events are the async path.
- **Two compose stacks today**: `deploy/docker-compose.yml` (10 services) and
  `services/skill-tree-service/docker-compose.yml` (harness alone). The harness calls
  M1/M2 by service URL directly (compose env of its stack), not through the gateway.
- **latexml-service is network-isolated**: it sits only on `latexml-net`, listens on
  container port `:8103` and is published on host `:8110` — any V1 caller (planned
  `rag-service`) must join `latexml-net` and use `http://latexml-service:8103`.
- **Gateway ↔ auth is drawn as [V1 planned]**: the compose sets `AUTH_BASE_URL`, but
  gateway `UPSTREAMS` has no `auth` prefix yet — the env is currently dead (drift
  flagged in the notes below, to be wired by the auth V1 node).
- **Event-first**: the event bus is the Caliper-aligned `analytics-service`
  (append-only `POST /api/v1/events`); services integrate via APIs/events, never by
  touching another service's database.

## Container inventory (with evidence refs)

| Container | Port | Tech | DB | Status |
|---|---|---|---|---|
| skill-tree-harness (M4) | host :8104 → :3080 (+ :8105 webhook, disabled by default) | Node.js DSH 0.1.5-rc.3 + bwrap | runtime volumes (profiles/sessions/workspace) | real |
| api-gateway (M10) | :8000 | FastAPI + httpx, stateless | — | real |
| opencase-service (M1) | :8101 | FastAPI + SQLAlchemy | opencase-db (PostgreSQL 16) | real |
| quiz-service (M2) | :8102 | FastAPI + SQLAlchemy | quiz-db | real |
| class-service (M6) | :8103 | FastAPI + SQLAlchemy | class-db | real |
| analytics-service (events) | :8104 | FastAPI + SQLAlchemy | analytics-db | real |
| learner-model-service (M5) | :8105 | FastAPI + SQLAlchemy | learner-model-db | real |
| assignment-service (M7) | :8106 | FastAPI + SQLAlchemy | assignment-db | real |
| document-service (M3) | :8107 | FastAPI + SQLAlchemy | document-db + uploads volume | real |
| latexml-service (M3 engine) | :8110 → :8103 | FastAPI + LaTeXML, stateless | — (renders volume) | real |
| auth-service (M11) | :8108 | FastAPI + SQLAlchemy | auth-db | real |
| rag-service | :8109 | FastAPI + SQLite FTS5 | rag SQLite file | [V1 planned] |
| cognee-memory (M8) | :8021 (dev host) | Cognee graph + vector, MCP server | cognee-managed stores | wired via MCP client |

## Evidence (code read at `main@49c0ee2ebd`)

| # | Claim | Evidence |
|---|---|---|
| 1 | DB-per-service, services talk REST on shared net, DBs on private nets | File: deploy/docker-compose.yml · Dòng: 1-4 · Nội dung: `# Per-service databases: one Postgres instance per service (no shared DB).` / `# App containers share 'platform-net' ... NEVER via each other's databases` |
| 2 | 10 services in the deploy stack (opencase, quiz, class, analytics, learner, assignment, document, latexml, api-gateway, auth) | File: deploy/docker-compose.yml · Dòng: 22, 52, 81, 110, 139, 170, 201, 218, 232, 266 · Nội dung: `opencase-service:` … `auth-service:` service headers |
| 3 | Published ports 8101-8108 + gateway 8000 + latexml 8110→8103 | File: deploy/docker-compose.yml · Dòng: 29, 58, 87, 116, 147, 178, 210, 227, 246, 275 · Nội dung: `- "${OPENCASE_PORT:-8101}:8101"` … `- "${LATEXML_PORT:-8110}:8103"`, `- "${GATEWAY_PORT:-8000}:8000"`, `- "${AUTH_PORT:-8108}:8108"` |
| 4 | Each service owns its Postgres via DATABASE_URL (examples) | File: deploy/docker-compose.yml · Dòng: 26, 143, 270 · Nội dung: `DATABASE_URL: postgresql+psycopg://opencase:…@opencase-db:5432/opencase`; `…learner…@learner-model-db:5432/learner`; `…auth…@auth-db:5432/auth` |
| 5 | Gateway forwards 7 prefixes; forward rule appends `/api/v1` | File: services/api-gateway/app/config.py · Dòng: 9-16 · Nội dung: `UPSTREAMS = {` `case → 8101, quiz → 8102, class → 8103, events → 8104, learner → 8105, assignments → 8106, documents → 8107`}; File: services/api-gateway/app/routes.py · Dòng: 84 · Nội dung: `url = f"{upstream}/api/v1/{rest}"` |
| 6 | Gateway has rate limit + optional bearer hook (auth wiring later) | File: services/api-gateway/app/config.py · Dòng: 27, 30 · Nội dung: `AUTH_TOKEN = os.environ.get("GATEWAY_AUTH_TOKEN")`; `RATE_LIMIT_PER_MINUTE = int(os.environ.get("GATEWAY_RATE_LIMIT", "120"))` |
| 7 | Harness calls M1/M2 directly; cognee via MCP; per-student workspace | File: services/skill-tree-service/README.md · Dòng: 92-98 · Nội dung: `Agent gọi M1 opencase (OPENCASE_URL, mặc định http://opencase-service:8101)`; `Agent gọi M2 quiz (QUIZ_URL…)`; `Agent gọi cognee MCP (row mcp-cognee-memory trong plugins/patch.yml)`; `Dataset mỗi sinh viên cô lập theo workspace: runtime/workspace/<candidateId>/` |
| 8 | Harness ports + read-only plugin bind | File: services/skill-tree-service/docker-compose.yml · Dòng: 12-13, 31 · Nội dung: `- "8104:3080"`; `- "8105:3082"   # Webhook ingress (đã tắt mặc định trong patch.yml…)`; `- ./plugins:/app/plugins:ro` |
| 9 | latexml isolated on latexml-net; container listens 8103 | File: deploy/docker-compose.yml · Dòng: 227-228 · Nội dung: `- "${LATEXML_PORT:-8110}:8103"`; `networks: [latexml-net]`; File: services/latexml-service/Dockerfile · Dòng: 25, 28 · Nội dung: `EXPOSE 8103`, `CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8103"]` |
| 10 | Cross-service REST: learner → opencase + class; assignment → learner + quiz | File: deploy/docker-compose.yml · Dòng: 144-145, 175-176 · Nội dung: `OPENCASE_BASE_URL: http://opencase-service:8101`, `CLASS_BASE_URL: http://class-service:8103`, `LEARNER_BASE_URL: http://learner-model-service:8105`, `QUIZ_BASE_URL: http://quiz-service:8102`; File: services/learner-model-service/app/config.py · Dòng: 6-7; services/assignment-service/app/config.py · Dòng: 6-7 |
| 11 | Gateway ↔ auth drift: env set but no `auth` prefix in UPSTREAMS | File: deploy/docker-compose.yml · Dòng: 243 · Nội dung: `AUTH_BASE_URL: http://auth-service:8108`; đối chiếu config.py Dòng: 9-16 (chỉ 7 prefix, không có `auth`) |
| 12 | rag-service is [V1 planned]: separate FastAPI service :8109, hybrid SQLite FTS5, calls latexml + document-service | File: docs/designs/rag-service-design.md @ branch agent-v1-rag-design · §2, §9, §10 · Nội dung: `build a new lean container rag-service on port 8109 — hybrid SQLite FTS5 (BM25) …`; compose draft `LATEXML_BASE_URL: http://latexml-service:8103`; `rag-service` KHÔNG có trong deploy/docker-compose.yml @ main (danh sách 10 service ở bằng chứng #2) |
| 13 | cognee per-student datasets via MCP | File: docs/MODULES.md · Dòng: 70-73 · Nội dung: `M8. cognee-memory-gateway — Bộ nhớ/tri thức agent 🔜`, `dataset strategy: student_{sourcedId}, class_graph, class_interventions`; File: openspec/changes/v1-scope/design.md @ branch agent-v1-bootstrap · Decision 3 · Nội dung: `Cognee is integrated only through the cognee MCP server already wired in patch.yml (mcp-cognee-memory)` |
| 14 | Event-first integration (Caliper, append-only) | File: docs/MODULES.md · Dòng: 24 · Nội dung: `Event-first khi ghép — ưu tiên phát sự kiện (envelope Caliper-aligned…)`; File: services/README.md · Dòng: 15 · Nội dung: `analytics-service … Caliper-aligned learning events (append-only)` |

## Operational notes (flagged, not drawn)

- **Host-port collision risk across the two stacks**: harness publishes host
  `:8104` (→ :3080) and webhook `:8105` (→ :3082, disabled by default) while the
  `deploy/` stack publishes analytics on host `:8104` and learner-model on `:8105`.
  Running both stacks on one host collides on 8104/8105 unless ports are remapped
  (baseline fact, also recorded in the v1-scope design "Verified code baseline").
- **Dead env drift**: `AUTH_BASE_URL` in the gateway env has no matching `auth`
  prefix in `UPSTREAMS` — harmless today, must be resolved by the auth V1 node.
- **gateway upstream for rag**: the rag design adds one `UPSTREAMS` entry
  (`"rag": ("RAG_BASE_URL", "http://localhost:8109")`) plus the compose service with
  `networks: [platform-net, latexml-net]` — implemented by the rag implement node.
