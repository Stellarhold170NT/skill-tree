# Services — Core Data Modules

This directory hosts the independently deployable microservices that serve as the
**data-standards building blocks** of the learning platform (Graph RAG for tracking and
recommending learners). Each module owns its database, exposes a versioned REST API
(`/api/v1`), and is integrated later via URI references + the platform event bus —
never by direct database access. Full decomposition and interface contracts:
[`docs/MODULES.md`](../docs/MODULES.md) · Deployment guide: [`docs/deployment.md`](../docs/deployment.md).

| Module | Service | Standard | Port | Status |
|--------|---------|----------|------|--------|
| M1 | [`opencase-service/`](opencase-service/) — course & concept-graph management | 1EdTech CASE v1.1 | 8101 | ✅ built (FastAPI + SQLAlchemy, pytest) |
| M2 | [`quiz-service/`](quiz-service/) — question bank, test assembly, scoring | 1EdTech QTI v3.0 | 8102 | ✅ built (FastAPI + SQLAlchemy, pytest) |
| M6 | [`class-service/`](class-service/) — orgs, classes, pseudonymous user ids, enrollments | IMS OneRoster v1.2 (subset) | 8103 | ✅ built (FastAPI + SQLAlchemy, pytest) |
| M4 | [`analytics-service/`](analytics-service/) — Caliper-aligned learning events (append-only) | IMS Caliper 1.2 (aligned) | 8104 | ✅ built (FastAPI + SQLAlchemy, pytest) |
| M5 | [`learner-model-service/`](learner-model-service/) — Glicko-2 mastery, Ebbinghaus rusty states, frontier recommendations, class heatmap + teaching plan | custom (Glicko-2 / Ebbinghaus) | 8105 | ✅ built (FastAPI + SQLAlchemy, pytest) |
| M7 | [`assignment-service/`](assignment-service/) — targeted practice from Red/Rusty groups, quiz generation | custom | 8106 | ✅ built (FastAPI + SQLAlchemy, pytest) |
| M3 | [`document-service/`](document-service/) — LRMI documents, chunks, concept alignments, file store | LRMI (W3C/Schema.org) + LOM subset | 8107 | ✅ built (FastAPI + SQLAlchemy, pytest) |
| M3 engine | [`latexml-service/`](latexml-service/) — LaTeX → arxiv-style HTML rendering (arXiv's pipeline) | LaTeXML (ar5ivist) | 8110 | ✅ built (FastAPI, stateless, pytest) |
| M10 | [`api-gateway/`](api-gateway/) — single entry point, routing, rate limit, auth hook | custom | 8000 | ✅ built (FastAPI + httpx, stateless, pytest) |
| M11 | [`auth-service/`](auth-service/) — accounts, JWT (HS256) issue/verify, roles | custom (JWT HS256) | 8108 | ✅ built (FastAPI + SQLAlchemy, pytest) |
| — | [`rag-service/`](rag-service/) — student-notebook RAG: upload → parse (latexml M3) → structure-aware chunking (STAIR) → SQLite FTS5 (BM25) → `/ask` with section-path citations | custom (FTS5 + STAIR-style chunking) | 8109 | ✅ built (FastAPI + SQLite FTS5, pytest) — branch `agent-v1-rag-service` |

Up next (see `docs/MODULES.md`): M8 cognee-memory-gateway / M13 open-notebook (reuse Cognee / Open Notebook).

## SkillTree harness (M4, :8104) — V1 plugins

The agent harness lives in [`skill-tree-service/`](skill-tree-service/) (mini-DSH, port 8104).
V1 feature plugins, each with its own EGM-standard README (role / INPUT / OUTPUT / env / run / test / deps):

| Plugin | Kind | Vai trò | Nguồn (branch) |
|---|---|---|---|
| [`skilltree-auth-ui/`](skill-tree-service/plugins/skilltree-auth-ui/) | UI | Đăng nhập / tạo tài khoản, JWT → M11 (qua M10) | `agent-v1-auth-ui` |
| [`skilltree-class-ui/`](skill-tree-service/plugins/skilltree-class-ui/) | UI | Quản lý lớp cá nhân giáo viên → M6 (qua M10) | `agent-v1-class-ui` |
| [`skilltree-teacher-ui/`](skill-tree-service/plugins/skilltree-teacher-ui/) | UI | Heatmap RAG + kế hoạch dạy + giao ôn tập → M5/M6/M1/M4/M7 | `agent-v1-teacher-ui` |
| [`skilltree-memory/`](skill-tree-service/plugins/skilltree-memory/) | Tools | Classroom memory Cognee per-student (`student-<candidateId>`) | `agent-v1-cognee-plugin` |
| `skilltree-graph-dashboard` | UI | Dashboard đồ thị khái niệm CASE → M1/M9/M5 | `agent-v1-graph` (repo root `plugins/`) |

Plugins are wired via `plugins/patch.yml` (+ `patch.local.yml`) — 2-step rule, see
[`skill-tree-service/README.md`](skill-tree-service/README.md), mục "Ghép plugin mới".

## Bring the whole stack up

```bash
cd deploy
cp .env.example .env
docker compose up -d --build
for p in 8101 8102 8103 8104 8105 8106 8107 8108; do curl -s localhost:$p/api/v1/health; echo; done
curl -s localhost:8000/health; echo   # api-gateway (no /api/v1 prefix by design)
```

## Shared integration contract (all modules)

- Errors: `{"error": {"code", "message", "details"}}`
- Health: `GET /api/v1/health` → `{"status","service","version"}`
- IDs: UUIDv4 hex · timestamps: ISO-8601 UTC · JSON fields: camelCase
- `opencase-service` items are referenced elsewhere by their `identifier` URI
  (`conceptUri` in quiz items, learner model, assignments).
- No personal data in behavioral tables: students appear as pseudonymous
  `sourcedId`s issued by `class-service` (M6, OneRoster subset).

## Run tests

```bash
for s in opencase quiz class analytics learner-model assignment document latexml auth; do
  (cd services/$s-service && pip install -r requirements.txt -r requirements-dev.txt && pytest -q)
done
```
