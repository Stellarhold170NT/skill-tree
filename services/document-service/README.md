# document-service

Module **M3** of the learning platform (Graph RAG for tracking and recommending
learners) — the **learning-material store**. Keeps LRMI-described documents, splits
them into text chunks, and aligns each chunk to atomic concepts from the concept
graph with an explicit relationship type. Its labeled chunks are the standard input
for the knowledge layers (Cognee M8, Open Notebook M13).

## Role in the platform

- **LRMI metadata**: every document carries `learningResourceType`,
  `educationalLevel`, `typicalLearningTime` (validated ISO-8601 duration, e.g.
  `PT12H30M`) and an optional `documentUri` pointing at the M1
  `CFDocument.identifier` it belongs to.
- **Chunks**: ordered text segments (`orderIndex`, `charCount`) — the granularity
  that gets embedded/ingested downstream.
- **Alignments**: `chunk ↔ conceptUri` (M1 `CFItem.identifier`) with
  `alignmentType ∈ {teaches, assesses, requires, summarizes}` (LRMI/LOM subset).
- **Files**: binary uploads stored on disk with SHA-256 provenance.

## Tech stack

- Python 3.11, FastAPI, pydantic v2, SQLAlchemy 2.x, python-multipart (uploads)
- SQLite by default (dev/tests), PostgreSQL via `DATABASE_URL`

## Quickstart

```bash
# local
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --port 8107 --reload     # Swagger: http://localhost:8107/docs

# docker (with own Postgres)
docker run -d -p 8107:8107 skill-tree/document-service:0.1.0
# or from the repo root: docker compose -f deploy/docker-compose.yml up -d
```

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./data/document.db` | Any SQLAlchemy URL |
| `DOCUMENT_UPLOAD_DIR` | `./data/uploads` | Where uploaded files are stored |
| `DOCUMENT_MAX_UPLOAD_BYTES` | `20971520` (20 MiB) | Upload size limit |

## API reference (prefix `/api/v1`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness probe |
| POST | `/documents` | Create with LRMI fields (`documentUri`, `typicalLearningTime`…) |
| GET | `/documents` · `/documents/{id}` | List / read |
| DELETE | `/documents/{id}` | Delete with chunks/alignments cascade |
| POST | `/documents/{id}/upload` | Multipart file upload → `{sha256, sizeBytes, …}` |
| GET | `/documents/{id}/files` | Uploaded files with provenance |
| POST | `/documents/{id}/chunks` | Add ordered chunks (auto or explicit `orderIndex`) |
| GET | `/documents/{id}/chunks?alignmentType=` | Chunks, optionally only those aligned with a type |
| POST | `/chunks/{id}/alignments` | `{conceptUri, alignmentType}` → 201 |
| GET | `/chunks/{id}/alignments` | List alignments of a chunk |

### Validation rules

- `typicalLearningTime` must be an ISO-8601 duration (`422 VALIDATION_ERROR`).
- `alignmentType` outside the four allowed values → `422 INVALID_ALIGNMENT_TYPE`.
- Duplicate `orderIndex` / duplicate (chunk, concept, type) → `409`.
- Uploads over the size limit → `413 FILE_TOO_LARGE`.
- All errors use the platform envelope: `{"error": {"code", "message", "details"}}`.

## Integration contract

- `documentUri` ← M1 `CFDocument.identifier`; `conceptUri` in alignments ← M1
  `CFItem.identifier` (URI references, no HTTP coupling).
- Consumed by M8 (Cognee: per-student knowledge graphs from taught chunks) and
  M13 (Open Notebook: RAG over `teaches` chunks).

## Running tests

```bash
pytest -q   # document CRUD + LRMI validation, uploads, chunks, alignments (tmp SQLite/uploads)
```

## Module roadmap

- Automatic chunking on upload (plain text/Markdown first; PDF via extraction).
- Auto-alignment suggestions via embeddings (teacher confirms).
- `GET /chunks?conceptUri=` reverse lookup for M8 dataset assembly.
