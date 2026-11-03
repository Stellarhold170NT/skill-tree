# class-service

Module **M6** of the learning platform (Graph RAG for tracking and recommending
learners). Implements a pragmatic **OneRoster v1.2 subset** (orgs → courses →
classes → users → enrollments) and is the **only module allowed to hold identity**:
behavior-level services (quiz attempts, analytics events, mastery) reference people
exclusively by the opaque, pseudonymous `sourcedId` minted here.

## Role in the platform

- **Roster source of truth** for the school year: which students are in which class,
  who teaches it, and which course a class follows.
- **Mints `candidateId`**: every user row's `sourcedId` (UUIDv4 hex) is the anonymous
  identifier consumed by quiz-service (M2), analytics-service (M4),
  learner-model-service (M5), and the Cognee gateway (M8).
- Data minimization by design: a `User` row keeps a display name, optional email,
  role and org — nothing else. Personal data never leaves this service into the
  behavior layer.

## Tech stack

- Python 3.11, FastAPI, pydantic v2, SQLAlchemy 2.x
- SQLite by default (dev/tests), PostgreSQL via `DATABASE_URL`

## Quickstart

```bash
# local
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --port 8103 --reload     # Swagger: http://localhost:8103/docs

# docker (with own Postgres)
docker run -d -p 8103:8103 skill-tree/class-service:0.1.0
# or from the repo root: docker compose -f deploy/docker-compose.yml up -d
```

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./data/class.db` | Any SQLAlchemy URL (`postgresql+psycopg://...` for Postgres) |

## API reference (prefix `/api/v1`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness probe |
| POST/GET | `/orgs` | Schools / departments (`orgType`: department, school, district, local, state, national) |
| GET | `/orgs/{id}` | Read one org |
| POST/GET | `/courses` | Courses (optionally attached to an org) |
| GET | `/courses/{id}` | Read one course |
| POST/GET/DELETE | `/classes` | Class sections, filter `?courseId=`; delete cascades enrollments |
| GET | `/classes/{id}` | Read one class |
| PATCH | `/classes/{id}` | Partial update (title / term / course / org — refs validated, at least one field) |
| POST/GET | `/users` | Users (`role`: teacher, student, admin), filter `?role=` |
| GET | `/users/{id}` | Read one user (returns `sourcedId` — the platform-wide `candidateId`) |
| GET | `/users/{id}/classes` | Classes the user is enrolled in |
| POST/GET/DELETE | `/enrollments` | Enrollments (`role`: teacher, student; `primary` flag), filters `?classId=`, `?userId=` |
| GET | `/classes/{id}/students` | Student roster |
| GET | `/classes/{id}/teachers` | Teacher roster |

### Validation rules

- `role` on users must be teacher/student/admin; enrollment role must be teacher/student
  (`422 INVALID_ROLE`); admins cannot be enrolled (`422 INVALID_ROLE`).
- Referenced org/course/class/user must exist (`404 *_NOT_FOUND`).
- Duplicate (user, class, role) enrollment → `409 DUPLICATE_ENROLLMENT`.
- All errors use the platform envelope: `{"error": {"code", "message", "details"}}`.

## Integration contract

- Emits nothing; other services read `sourcedId` values from enrollment rosters.
  `quiz-service` attempts, analytics events, and mastery records all key on this id.
- OneRoster naming is preserved (`sourcedId`, org/course/class/user/enrollment) so a
  future SIS import can map 1:1 onto these rows.
- No HTTP calls to other services at request time (URI-reference principle).

## Running tests

```bash
pytest -q   # hierarchy CRUD, roster flow, anonymity + validation rules
```

## Module roadmap

- Bulk CSV/OneRoster JSON import for a whole school year.
- `userIds` typed identifiers (e.g. student code) alongside `sourcedId`.
- Read-only API tokens scoped per teacher (moves to auth-service M11 when it lands).
