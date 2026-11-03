# Tasks — rag-service

## 1. OpenSpec

- [x] proposal.md / design.md / specs/rag-service/spec.md / tasks.md
      (`openspec validate rag-service --strict` → "Change 'rag-service' is valid", CLI @fission-ai/openspec, Node v24.22.1)

## 2. Service scaffold

- [x] app/config.py — env per design §9
- [x] app/database.py — SQLite + FTS5 external content + triggers
- [x] app/models.py — docs/sections/chunks/jobs (+ raw_path/raw_filename/sha256 for reingest, decision D4)
- [x] app/schemas.py — CamelModel + AskRequest
- [x] app/service.py — new_id / BusinessError / lookups
- [x] app/routes.py — /api/v1 router + error envelope + health
- [x] app/main.py — factory (+ captures the event loop for thread-safe ingest scheduling)

## 3. Pipeline

- [x] app/chunker.py — structure-aware chunking (md / ltx-html / h-fallback / txt)
- [x] app/latexml_client.py — render (conversionMs) + fetch html (parseMs)
- [x] app/ingest.py — worker + job states + stage timings
- [x] app/search.py — bm25(8,4,1) + path boost + citations
- [x] app/mirror.py — best-effort document-service mirror
- [x] app/llm.py — optional answer mode with retry-on-empty + fallback

## 4. API surface

- [x] POST /documents/upload (202 job)
- [x] GET /jobs/{id}
- [x] GET /documents, GET /documents/{id}, DELETE /documents/{id}
- [x] POST /documents/{id}/reingest
- [x] POST /ask (retrieve + answer)
- [x] GET /metrics

## 5. Quality

- [x] pytest suite ≥ 10 tests — 26 tests, all green (`pytest -q` → "26 passed"):
      upload/ready, chunk positions under headings, FTS5 body search, path boost,
      citation fields, LLM degrade 200 + llmError, LLM success (mock),
      404 JOB/DOCUMENT, 422 UNSUPPORTED/EMPTY_QUESTION/VALIDATION, 413 TOO_LARGE,
      reingest, delete cascade (FTS rows gone), metrics p50/p95, chunker units
      (md tree, ltx_html with bibliography dropped, long-section split, tiny merge, empty raise)
- [x] bench/bench.py + real latency evidence — 300,344 chars ≈ 100 pages:
      INGEST BUDGET 533.3 ms (limit 60000) · ASK p50 16.9 ms / p95 29.7 ms / max 60.1 ms (limit 3000)
- [x] README.md (role/INPUT/OUTPUT/env/run/test/deps)
- [x] Dockerfile EXPOSE 8109 + .dockerignore — `docker build` OK
      (image skill-tree/rag-service:0.1.0, container health 200 {"status":"ok"})

## 6. Deployment

- [x] gateway UPSTREAMS rag → 8109 (api-gateway pytest 10/10 after updating route-table test 7→8)
- [x] compose rag-service + rag-data + gateway RAG_BASE_URL (`docker compose config` clean, no rag-db container per design §2/§4)
- [x] deploy/.env.example RAG_PORT
