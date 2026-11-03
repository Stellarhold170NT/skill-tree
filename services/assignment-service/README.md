# assignment-service

Module **M7** of the learning platform (Graph RAG for tracking and recommending
learners). Turns mastery diagnostics into **targeted practice**: pick a concept and
a struggling group (Red / Rusty from the M5 heatmap), and the service assembles the
assignment — the affected students plus the matching quiz items — and can mint an
M2 assessment test in one call.

## Role in the platform

- **Consumer of diagnostics**: reads `GET /classes/{id}/heatmap?documentId=` from
  learner-model-service (M5) to resolve which pseudonymous students are `red` /
  `rusty` on the target `conceptUri`.
- **Consumer of the item bank**: reads `GET /items?conceptUri=` from quiz-service
  (M2) to attach every matching question.
- **Producer of work**: `POST /assignments/{id}/quiz` creates an M2 assessment test
  (`ASG-<id>` identifier) covering exactly the assignment's items; notifications
  (M9, later) fan out from the stored `studentIds`.
- Assignments are per-class and per-concept; students appear only as `sourcedId`s.

## Tech stack

- Python 3.11, FastAPI, pydantic v2, SQLAlchemy 2.x, httpx (outbound reads)
- SQLite by default (dev/tests), PostgreSQL via `DATABASE_URL`

## Quickstart

```bash
# local
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --port 8106 --reload     # Swagger: http://localhost:8106/docs

# docker (with own Postgres)
docker run -d -p 8106:8106 skill-tree/assignment-service:0.1.0
# or from the repo root: docker compose -f deploy/docker-compose.yml up -d
```

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./data/assignment.db` | Any SQLAlchemy URL |
| `LEARNER_BASE_URL` | `http://localhost:8105` | M5 base URL (heatmap) |
| `QUIZ_BASE_URL` | `http://localhost:8102` | M2 base URL (item bank + tests) |

## API reference (prefix `/api/v1`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness probe |
| POST | `/assignments` | `{title, classId, conceptUri, targetGroup: red\|rusty\|red_rusty, dueAt?}` → resolves students (M5) + items (M2) |
| GET | `/assignments` | List, filter `?classId=` |
| GET/PATCH/DELETE | `/assignments/{id}` | Read / update (`status`: draft\|published\|closed) / delete |
| POST | `/assignments/{id}/quiz` | Generate the M2 test → `{quizTestId, quizIdentifier, itemIds, studentIds}` (once per assignment) |

### Validation rules

- `targetGroup` must be `red`, `rusty` or `red_rusty` (`422 INVALID_TARGET_GROUP`).
- M5 or M2 unreachable → `503 HEATMAP_UNAVAILABLE` / `503 ITEMS_UNAVAILABLE`.
- Quiz generation twice → `409 QUIZ_ALREADY_GENERATED`; no items → `422 NO_ITEMS`.
- All errors use the platform envelope: `{"error": {"code", "message", "details"}}`.

## Integration contract

- `conceptUri` ← M1 `CFItem.identifier`; `studentIds` ← M6 `sourcedId`s (via M5).
- Reads neighbor state over HTTP at creation time only; the stored snapshot
  (`studentIds`, `itemIds`) stays stable afterwards — an assignment reflects the
  moment it was made, not a live view.

## Running tests

```bash
pytest -q   # creation, group filtering, quiz generation, lifecycle (neighbors monkeypatched)
```

## Module roadmap

- `GET /students/{sourcedId}/assignments` — per-student worklist.
- Due-date reminders as events to the notification service (M9).
- Difficulty ladder within an assignment (easy → hard by IRT difficulty).
