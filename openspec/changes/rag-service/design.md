# Design — rag-service

Authoritative design: `docs/designs/rag-service-design.md` (branch
`agent-v1-rag-design` @ `ca5fe9c`, Elephant-Goldfish APPROVED 2/2). This file records
only the implementation decisions taken while building the service.

- D1 SQLite + FTS5 external-content table with the standard A/B/D trigger pattern
  (design §4); the FTS index is maintained by triggers on `chunks`, and cascade
  deletes keep it consistent (`PRAGMA foreign_keys=ON` per connection).
- D2 Ingest is an in-process asyncio worker (`asyncio.to_thread` pipeline); job states
  queued→received→parsed→chunked→mirrored→ready|failed (design §3).
- D3 latexml kind: `POST /api/v1/render` is timed as `conversionMs` (excluded from the
  60 s ingest budget), the HTML fetch is timed as `parseMs`. Direct kinds: Markdown
  ATX headings, HTML `ltx_*` classes with h1–h6 fallback, txt as a single section.
- D4 The `docs` table carries `raw_path/raw_filename/sha256` beyond the design schema
  so `POST /documents/{id}/reingest` can re-run ingest from the stored raw file
  (required by design §3/§7 which the minimal schema did not spell out).
- D5 Path-only boost query uses the FTS5 column filter `{path} : (t1 OR t2 …)`;
  `final = bm25(8,4,1) + RAG_PATH_BOOST * bm25_path` (design §6.3).
- D6 Mirror to document-service is best-effort; `mirrorError` is recorded inside the
  `stageMs` JSON without failing the job (design §3 failure policy).
- D7 rag-service runs WITHOUT a `rag-db` container: its own SQLite file on the
  `rag-data` volume (design §2/§4 "zero extra container"); it joins `platform-net` +
  `latexml-net` so it can reach latexml-service directly (design §10).
