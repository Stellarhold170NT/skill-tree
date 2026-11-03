# analytics-service

Module **M4** of the learning platform (Graph RAG for tracking and recommending
learners). An **append-only learning-event store** aligned with the Caliper
Analytics envelope: every observable learning action (assessment submit, resource
view, tool use) lands here as an immutable, idempotent event.

## Role in the platform

- **System of record for behavior**: quiz-service (M2) submissions, document views,
  and tool usage arrive as events keyed by the anonymous `candidateId` (from M6) and
  `conceptUri` (from M1).
- **Forgetting-model input**: `GET /concepts/{uri}/last-interaction` provides the Δt
  that the learner-model (M5) feeds into the Ebbinghaus retention curve.
- Later this service becomes the default sink of the event bus (M0); until the bus
  exists, producers POST directly (the envelope and idempotency contract stay the
  same, so the switch is transparent).

## Tech stack

- Python 3.11, FastAPI, pydantic v2, SQLAlchemy 2.x
- SQLite by default (dev/tests), PostgreSQL via `DATABASE_URL`

## Quickstart

```bash
# local
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --port 8104 --reload     # Swagger: http://localhost:8104/docs

# docker (with own Postgres)
docker run -d -p 8104:8104 skill-tree/analytics-service:0.1.0
# or from the repo root: docker compose -f deploy/docker-compose.yml up -d
```

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./data/analytics.db` | Any SQLAlchemy URL (`postgresql+psycopg://...` for Postgres) |

## API reference (prefix `/api/v1`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness probe |
| POST | `/events` | Append one event (201); duplicate `eventId` → 409 |
| POST | `/events/batch` | Append a batch atomically → `{accepted, eventIds}` |
| GET | `/events` | Query: `actorId`, `objectId`, `type`, `since`, `until`, `limit`, `offset` (time-ascending) |
| GET | `/concepts/{conceptUri}/last-interaction` | `{lastInteractionAt, lastEventType, eventCount}` — Δt for the forgetting model |

### Event envelope

```json
{
  "eventId": "uuid4-hex (optional, generated when omitted)",
  "type": "AssessmentItemSubmitted | ResourceViewed | ToolUsed | NavigationEvent",
  "occurredAt": "2026-01-15T09:30:00Z (optional, defaults to now)",
  "actor":   {"id": "<candidateId>", "type": "Person"},
  "object":  {"id": "<conceptUri>",  "type": "Concept"},
  "payload": {"itemId": "...", "isCorrect": true, "score": 1.0},
  "producer": "quiz-service"
}
```

### Validation rules

- `type` must be one of the platform Caliper profile names (`422 UNKNOWN_EVENT_TYPE`).
- Events are **append-only**: no update/delete endpoints exist at all.
- Batches are atomic — a single duplicate or invalid event aborts the whole batch.
- All errors use the platform envelope: `{"error": {"code", "message", "details"}}`.

## Integration contract

- Consumes: nothing. Produces: queryable event history.
- `learner-model-service` (M5) polls `last-interaction` for decay; a future event bus
  (M0) replaces polling with push without changing this API.
- No personal data: actors are pseudonymous `candidateId`s only.

## Running tests

```bash
pytest -q   # append, idempotency, batch atomicity, filters, last-interaction
```

## Module roadmap

- Pluggable sinks (forward events to Cognee M8 mastery-trace ingestion).
- Retention/partitioning policy for long histories.
- Read-side projections (daily per-class activity counters).
