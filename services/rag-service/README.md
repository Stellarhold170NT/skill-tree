# rag-service (port 8109)

Student-notebook RAG: upload study material → parse (latexml M3 for LaTeX sources,
direct parsers for Markdown/text/HTML) → structure-aware chunking (STAIR: ToC leaf
sections with heading paths) → SQLite FTS5 (BM25) index → `/ask` with section-path
citations and optional LLM synthesis. Design of record:
`docs/designs/rag-service-design.md` (branch `agent-v1-rag-design` @ `ca5fe9c`).

## Role in the platform

- Consumes: latexml-service (M3 engine) render API when the upload is LaTeX-family.
- Mirrors (best effort): canonical Document + chunks into document-service (M9).
- Serves: skill-tree harness plugins (student "Notebook" UI) via api-gateway `/rag/*`.

## INPUT

- `POST /api/v1/documents/upload` — multipart: `file` (.md/.txt/.html/.htm/.tex/.tar.gz/.tgz/.zip,
  ≤ `RAG_MAX_UPLOAD_MB`), optional form `title`, `uploaderId` (pseudonymous sourcedId).
- `POST /api/v1/ask` — `{"question", "documentIds"?, "uploaderId"?, "topK"?, "mode"?}`
  with `mode` = `retrieve` (default) | `answer`.

Example (service on :8109):

```bash
# upload a note, then follow the ingest job to ready
curl -s -F "file=@./kinh-te-vi-mo.md" -F "uploaderId=stu-anon-001" \
  localhost:8109/api/v1/documents/upload      # 202 {"jobId","statusUrl","docId"}
curl -s localhost:8109/api/v1/jobs/<jobId>    # {"status":"ready","stageMs":{...}}

# section-path citations; mode:"answer" needs LLM_* env (falls back to retrieve on LLM failure)
curl -s -X POST localhost:8109/api/v1/ask -H 'Content-Type: application/json' \
  -d '{"question":"cầu tiến công bằng là gì?","uploaderId":"stu-anon-001","topK":3}'
```

## OUTPUT

- Upload → 202 `{"jobId","statusUrl","docId"}`; poll `GET /api/v1/jobs/{jobId}`
  (status queued→received→parsed→chunked→mirrored→ready|failed + `stageMs` per stage;
  `conversionMs` (latexml render) is measured separately and excluded from the 60 s
  ingest budget per design §8).
- `GET /api/v1/documents` / `GET /api/v1/documents/{id}` (doc + ToC section tree).
- `POST /api/v1/ask` → 200 `{"mode","question","timings":{"retrieveMs","generateMs"?},
  "citations":[{chunkId,documentId,sectionPath,heading,snippet,score,sourceUrl?}],
  "answer"?, "llmError"?}` — LLM problems never change the HTTP status (design §3):
  `mode:"answer"` with a failing/unconfigured LLM returns 200 + `mode:"retrieve"` +
  `llmError` in `llm-not-configured|llm-unavailable|llm-timeout|llm-empty-after-retry`.
- `DELETE /api/v1/documents/{id}` (cascades local chunks/sections/FTS rows; the
  document-service mirror copy is kept — explicit separate action by design §11.3),
  `POST /api/v1/documents/{id}/reingest` (re-runs ingest from the stored raw file;
  502 `LATEXML_UNAVAILABLE` when latexml is down for a latexml-kind doc),
  `GET /api/v1/metrics` (counters + rolling p50/p95/max, last 1000 samples).
- Errors: `{"error":{"code","message","details"}}` (platform envelope). Codes:
  `DOCUMENT_TOO_LARGE` (413), `UNSUPPORTED_TYPE`/`EMPTY_QUESTION`/`PARSE_FAILED`/
  `EMPTY_DOCUMENT` (422), `JOB_NOT_FOUND`/`DOCUMENT_NOT_FOUND` (404),
  `LATEXML_UNAVAILABLE` (502, reingest pre-check), `VALIDATION_ERROR` (422).

## Environment variables

| Var | Default | Purpose |
|---|---|---|
| RAG_PORT | 8109 | listen port (compose host mapping) |
| RAG_DB_PATH | ./data/rag.db | SQLite file (volume-mounted in compose) |
| RAG_UPLOAD_DIR | ./data/uploads | raw file store (reingest source) |
| RAG_MAX_UPLOAD_MB | 20 | upload guard |
| RAG_MAX_SECTION_CHARS | 8000 | long-section split threshold (paragraph boundaries) |
| RAG_MIN_SECTION_CHARS | 200 | tiny-section merge threshold |
| RAG_TOPK | 5 | default ask top-k |
| RAG_PATH_BOOST | 0.5 | weight of path-only BM25 in the structure boost |
| LATEXML_BASE_URL | http://localhost:8110 | latexml base (compose: http://latexml-service:8103) |
| LATEXML_TIMEOUT_S | 900 | latexml render timeout |
| DOCUMENT_BASE_URL | http://localhost:8107 | document-service mirror target |
| LLM_ENDPOINT / LLM_API_KEY / LLM_MODEL | unset | optional ask-time LLM (NetMind); unset ⇒ answer mode degrades to retrieve |
| RAG_LLM_TIMEOUT_S | 30 | LLM call timeout |

Secrets are env-only; nothing is hard-coded or committed (AGENTS.md §8.3).

## Run

```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8109   # RAG_DB_PATH/RAG_UPLOAD_DIR writable
```

## Test

```bash
pip install -r requirements.txt -r requirements-dev.txt
pytest -q
# latency evidence (service running):
python bench/bench.py http://localhost:8109
```

## Dependencies

- fastapi, uvicorn, sqlalchemy, pydantic, httpx, python-multipart, beautifulsoup4 (HTML parsing).
- SQLite ≥ 3.9 with FTS5 (stdlib sqlite3 in python:3.11 images — verified 3.46.1).
- latexml-service for .tex/.tar.gz/.zip uploads (graceful PARSE_FAILED/LATEXML_UNAVAILABLE
  job failure when down; .md/.txt/.html never depend on it).
- document-service for the best-effort mirror (failure recorded in `stageMs.mirrorError`).
- Concurrency: single uvicorn worker per instance (SQLite single-writer; ingest jobs are
  in-process asyncio tasks — design §11.2).

## Known V1 limits

- BM25 is lexical: Vietnamese questions match exact terms (with diacritics); semantic
  recall is M8/Cognee's role (design §11.1).
- A single paragraph longer than `RAG_MAX_SECTION_CHARS` stays one chunk (split points
  are paragraph boundaries only — design §5 rule 3).
