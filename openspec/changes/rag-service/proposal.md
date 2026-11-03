# Proposal: add rag-service (8109)

## Why

V1 goal #5 (AGENTS.md §1) requires a Notebook-style RAG pipeline for student-uploaded
study material (`upload → parse → structure-aware chunk → index → Q&A`) that is fast.
Today the platform has no parse→chunk→index path: document-service stores only LRMI
metadata + hand-posted chunks, latexml-service renders LaTeX→HTML but nothing consumes
it for retrieval, and api-gateway has no `rag` upstream. The approved design
(`docs/designs/rag-service-design.md`, branch `agent-v1-rag-design` @ `ca5fe9c`,
Goldfish APPROVED 2/2) selects a lean SQLite FTS5 + STAIR structure-aware service.

## What changes

- NEW `services/rag-service/` — FastAPI + SQLAlchemy + SQLite FTS5 on port 8109:
  - `POST /api/v1/documents/upload` (multipart; latexml for .tex/.tar.gz/.zip with
    Markdown/text/HTML fallbacks; 202 + async ingest job)
  - structure-aware chunking (ltx_section → leaf section + heading path; long sections
    split on paragraphs; tiny sections merged)
  - `POST /api/v1/ask` — bm25(8,4,1) + RAG_PATH_BOOST * path-only BM25; citations are
    section paths; LLM answer mode optional with graceful degradation (HTTP 200 +
    `mode:"retrieve"` + `llmError`)
  - `GET /api/v1/jobs/{id}`, `/documents`, `/documents/{id}`, `DELETE`,
    `/documents/{id}/reingest`, `/api/v1/metrics`
- NEW OpenSpec change docs (this directory).
- CHANGE `services/api-gateway/app/config.py` — UPSTREAMS += rag → 8109.
- CHANGE `deploy/docker-compose.yml` — rag-service container (platform-net +
  latexml-net, rag-data volume) + `RAG_BASE_URL` for api-gateway.
- CHANGE `deploy/.env.example` — RAG_PORT.

## Impact

- Affected specs: new `rag-service` spec.
- Affected code: services/rag-service (new), services/api-gateway, deploy/.
- No existing API changes; the gateway gains a pure additive upstream.
