# opencase-service

Module **M1** of the learning platform (Graph RAG for tracking and recommending
learners). Implements a pragmatic subset of **1EdTech CASE v1.1** (Competencies and
Academic Standards Exchange): the course concept graph lives here as a digital asset
built once by the faculty board, then reused by thousands of students across semesters.

## Role in the platform

- **Source of truth** for course/syllabus structure: `CFDocument` (one course),
  `CFItem` (atomic concept node), `CFAssociation` (directed graph edge).
- `isPrerequisiteOf` edges form the **prerequisite DAG** that drives concept unlocking
  (`check-prerequisites`), safe learning order (`topological-order`), and the future
  Roadmap Viewer (M12) + learner model (M5).
- `isPartOf` groups concepts into chapters/sections (taxonomy); `exactMatchOf` /
  `related` link equivalent concepts across frameworks.
- Other modules reference concepts **by the item `identifier` URI** — e.g. quiz
  items (M2) carry it as `conceptUri`. This service never calls other services.

## Tech stack

- Python 3.11, FastAPI, pydantic v2, SQLAlchemy 2.x
- SQLite by default (dev/tests), PostgreSQL via `DATABASE_URL` (deploy/docker-compose.yml)

## Quickstart

```bash
# local
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --port 8101 --reload     # Swagger: http://localhost:8101/docs

# docker (with own Postgres)
docker run -d -p 8101:8101 skill-tree/opencase-service:0.1.0
# or from the repo root: docker compose -f deploy/docker-compose.yml up -d
```

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./data/opencase.db` | Any SQLAlchemy URL (`postgresql+psycopg://...` for Postgres) |
| `CASE_BASE_URI` | `http://localhost:8101/api/v1/case` | Prefix used when minting `identifier` URIs. Set to the public URL in production — identifiers are immutable once issued |

## API reference (prefix `/api/v1`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness probe |
| POST/GET | `/documents` | Create / list course frameworks |
| GET/PATCH/DELETE | `/documents/{id}` | Read / update / delete (cascades items + associations) |
| POST/GET | `/documents/{id}/items` | Create / list concept nodes |
| GET/PATCH/DELETE | `/items/{id}` | Read / update / delete (removes referencing associations) |
| POST/GET | `/documents/{id}/associations` | Create / list graph edges (validated) |
| GET/DELETE | `/associations/{id}` | Read / delete one edge |
| GET | `/documents/{id}/package` | CASE JSON-LD export (`@context` + CFDocument + CFItems + CFAssociations) |
| GET | `/documents/{id}/graph` | `{nodes, edges}` for the Roadmap Viewer |
| GET | `/documents/{id}/topological-order` | Dependency-safe learning order (prerequisites first) |
| POST | `/documents/{id}/check-prerequisites` | `{targetItemId, masteredItemIds}` → `{unlocked, missingPrerequisites, masteredCount}` |

### Validation rules

- `associationType` must be one of the CASE types: `isPartOf, isChildOf, isPeerOf,
  isPrerequisiteOf, exactMatchOf, related, replacedBy, isTranslationOf, exemplar,
  hasSkillLevel`.
- `isPrerequisiteOf` edges are cycle-checked server side — a closing edge gets
  `409 CYCLE_DETECTED`, a self-edge gets `422 SELF_REFERENCE`.
- All errors use the platform envelope: `{"error": {"code", "message", "details"}}`.

## Integration contract

- `quiz-service` items store this service's `CFItem.identifier` as `conceptUri`.
- The learner model (M5) and Roadmap Viewer (M12) consume `/graph` and
  `/check-prerequisites`; mastery thresholds stay outside this service.
- Concept references are opaque URIs — consumers must not parse them, and this
  service does not resolve inbound URIs via HTTP.

## Running tests

```bash
pytest -q   # documents CRUD, items CRUD, graph/cycle/prereq/package behavior
```

## Module roadmap

- CASE package **import** (mirror of the existing export) for round-tripping with
  external CASE servers.
- Framework versioning (draft → published revisions without breaking item URIs).
- Optional LRMI alignment fields on items (teaches/assesses links).
