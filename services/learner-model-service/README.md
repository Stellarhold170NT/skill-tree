# learner-model-service

Module **M5** of the learning platform (Graph RAG for tracking and recommending
learners) — the **heart of the system**. Maintains per-student, per-concept mastery
with an industry-standard rating model instead of hand-made heuristics, detects
forgetting, and recommends what to learn/teach next.

## Role in the platform

- **Glicko-2**: each (student, concept) pair is a "player". An attempt is one rating
  period against a fixed reference opponent (rating 1500 / RD 350 = unknown item
  difficulty), so no item calibration is required to start. Correct → win, wrong → loss.
- **Mastery mapping**: `mastery = sigmoid((rating − 1500) / 173.7178)`, thresholds
  documented in `app/config.py` (green ≥ 0.85 — roughly two consistent wins from a
  cold start, red < 0.4).
- **Ebbinghaus decay (Rusty)**: retention `R(t) = exp(−Δt/S)` with stability
  `S = 3 + 7 × reviewCount` days. A green/amber concept whose retention drops below
  0.7 is reported **rusty** — computed at read time, the rating itself is never
  silently decayed.
- **Frontier**: a concept is *ready* when every transitive prerequisite is green and
  the concept itself is not green/rusty. `GET /next` ranks the ready set by
  **unlock value** (number of concepts it unlocks, from the M1 prerequisite DAG),
  then by mastery — the zone of proximal development.
- **Class views**: RAG heatmap (students × concepts) and a **contrastive teaching
  plan** ("teach X first: N students red, it unlocks Y and Z").

## Tech stack

- Python 3.11, FastAPI, pydantic v2, SQLAlchemy 2.x, httpx (outbound reads)
- SQLite by default (dev/tests), PostgreSQL via `DATABASE_URL`

## Quickstart

```bash
# local
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --port 8105 --reload     # Swagger: http://localhost:8105/docs

# docker (with own Postgres)
docker run -d -p 8105:8105 skill-tree/learner-model-service:0.1.0
# or from the repo root: docker compose -f deploy/docker-compose.yml up -d
```

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./data/learner-model.db` | Any SQLAlchemy URL |
| `OPENCASE_BASE_URL` | `http://localhost:8101` | M1 base URL for prerequisite graphs |
| `CLASS_BASE_URL` | `http://localhost:8103` | M6 base URL for class rosters |

## API reference (prefix `/api/v1`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness probe |
| POST | `/students/{id}/update` | Apply one attempt `{conceptUri, isCorrect, occurredAt?}` → updated mastery record |
| POST | `/students/{id}/update/bulk` | Apply a batch in order → `{updated, mastery}` |
| GET | `/students/{id}/mastery` | All records `{conceptUri, rating, ratingDeviation, mastery, state, reviewCount}`; optional `?asOf=` replays decay |
| GET | `/students/{id}/next?documentId=` | Frontier recommendation + explanation + alternatives |
| GET | `/classes/{id}/heatmap?documentId=` | `{students[], concepts[], cells{student: {concept: state}}}` |
| GET | `/classes/{id}/teaching-plan?documentId=&topN=` | Ranked plan with contrastive reasons |

### States

`red` (< 0.4) · `amber` (0.4–0.85) · `green` (≥ 0.85) · `rusty` (green/amber whose
retention fell below 0.7) · `none` (no attempts yet, heatmap only).

### Validation rules

- Prerequisite graph / roster unavailable → `503 GRAPH_UNAVAILABLE` / `503 ROSTER_UNAVAILABLE`.
- All errors use the platform envelope: `{"error": {"code", "message", "details"}}`.

## Integration contract

- Reads the M1 graph (`GET /api/v1/documents/{id}/graph`) and the M6 roster
  (`GET /api/v1/classes/{id}/students`) over HTTP — **never** their databases.
- Consumes attempt outcomes (from quiz-service M2, directly today, via the event
  bus M0/M4 later). `conceptUri` ← M1 `CFItem.identifier`; student ids ← M6 `sourcedId`.
- Idempotency: repeated identical attempts still move the rating (each is evidence);
  consumers should not retry blindly.

## Running tests

```bash
pytest -q   # glicko math properties, state machine + decay, frontier/heatmap/plan (graph & roster monkeypatched)
```

## Module roadmap

- Item-difficulty-aware matches (use quiz-service IRT estimates when available).
- IRT transition for adaptive selection; keep Glicko-2 as the reporting scale.
- Event-driven updates (subscribe to M4 instead of direct POSTs).
