# quiz-service

Module **M2** of the learning platform (Graph RAG for tracking and recommending
learners). A **QTI v3.0 question bank**: stores assessment items, generates/imports
QTI 3.0 XML for choice interactions, assembles assessment tests, records scored
attempts per candidate, and exposes per-candidate outcomes.

## Role in the platform

- **Item bank** for multiple-choice questions; each item may link to a course concept
  via `conceptUri` — the `identifier` URI of a CFItem owned by `opencase-service` (M1).
- **Scoring**: `match_correct` semantics (order-insensitive exact match), `score`
  1.0/0.0 per attempt — the clean input for the future learner-model module (M5,
  Glicko-2) and adaptive item selection.
- **Outcomes**: per-candidate aggregation, grouped by `conceptUri` — ready to feed
  class heatmaps and targeted interventions (M5/M7).
- Students appear only as pseudonymous `candidateId` (later sourced from the
  OneRoster-based class service, M6). **No personal data is stored here.**

## Tech stack

- Python 3.11, FastAPI, pydantic v2, SQLAlchemy 2.x (stdlib `xml.etree` for QTI)
- SQLite by default (dev/tests), PostgreSQL via `DATABASE_URL`

## Quickstart

```bash
# local
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --port 8102 --reload     # Swagger: http://localhost:8102/docs

# docker (with own Postgres)
docker run -d -p 8102:8102 skill-tree/quiz-service:0.1.0
# or from the repo root: docker compose -f deploy/docker-compose.yml up -d
```

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./data/quiz.db` | Any SQLAlchemy URL (`postgresql+psycopg://...` for Postgres) |

## API reference (prefix `/api/v1`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness probe |
| POST | `/items` | Create item (auto `identifier` + QTI XML generation) |
| POST | `/items/import-qti` | Import raw QTI XML (supported subset) |
| GET | `/items` | List with filters: `conceptUri`, `interactionType`, `q`, `limit`, `offset` |
| GET/PATCH/DELETE | `/items/{id}` | Read / update (regenerates XML) / delete (cascades attempts) |
| GET | `/items/{id}/qti` | Raw QTI 3.0 XML (`application/xml`) |
| POST/GET | `/tests` | Assemble tests: `{identifier, title, sections: [{title, itemIds}]}` |
| GET/DELETE | `/tests/{id}` | Read (sections resolved with items) / delete |
| POST | `/attempts` | Score one response → `{isCorrect, score}` |
| POST | `/attempts/bulk` | Score a batch atomically → `{scored, correct, ratio, attempts}` |
| GET | `/candidates/{id}/outcomes` | Attempts + summary incl. `byConcept` ratios |
| GET | `/candidates/{id}/history` | Attempt history (ascending time) |

### Validation rules

- `correctResponse` must reference existing choice identifiers (`422 INVALID_CORRECT_RESPONSE`).
- Choice identifiers must be unique; `single_choice` has exactly one correct response.
- QTI import outside the supported subset → `422 PARSE_ERROR`; duplicate identifier → `409`.
- All errors use the platform envelope: `{"error": {"code", "message", "details"}}`.

## QTI support (subset)

Generated/imported shape: `qti-assessment-item` with `qti-response-declaration`
(`RESPONSE`, identifier base-type, single/multiple cardinality),
`qti-correct-response`, `qti-outcome-declaration` (`SCORE`),
`qti-item-body` with one `qti-p` prompt + one `qti-choice-interaction`
(single/multiple choice), and `qti-response-processing`
`rptemplates/match_correct`. Extending the parser is additive: add element handling
in `app/qti.py`, keep the return contract.

## Integration contract

- `conceptUri` → opencase-service `CFItem.identifier` URI (opaque, no HTTP back-reference).
- `candidateId` → pseudonymous external id (OneRoster `sourcedId` later, M6).
- Future: publish `AssessmentItemResponseSubmitted` Caliper events to the platform
  event bus (M0/M4); CAT item selection lives in a later module, not here.

## Running tests

```bash
pytest -q   # items CRUD + QTI round-trip + scoring/outcomes behavior
```

## Module roadmap

- IRT parameter estimation from attempt history (difficulty/discrimination currently
  accepted as metadata).
- CAT item selection (targeted difficulty ladder) as a separate endpoint.
- Section branching rules (`qti-branch-rule`) for adaptive tests.
