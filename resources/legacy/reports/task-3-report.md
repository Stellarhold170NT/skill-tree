# Task #3 Report — M3 document-service (LRMI + chunks + alignments)

> **Note:** this file previously held a report from the earlier GraphRAG-benchmark
> project (Ingest/Cognify pipeline). That content remains in git history
> (`git log --follow reports/task-3-report.md`). The skill-tree Task #3 report
> below replaces it per the taskloop contract.

**Status:** DONE · **Branch:** agent-core-services · **Main:** 1a58261a7e (fast-forward merge of 8075fb40ef)

## What was built

`services/document-service/` (port **8107**) — learning-material store, standard input
for Cognee (M8) and Open Notebook (M13):

- **Documents** with LRMI metadata: `learningResourceType`, `educationalLevel`,
  `typicalLearningTime` (validated ISO-8601 duration, e.g. `PT12H`), optional
  `documentUri` → M1 `CFDocument.identifier`.
- **Chunks**: ordered text segments (`orderIndex` unique per document, `charCount`),
  auto-incrementing batch order, cascade delete with their document.
- **Alignments**: chunk ↔ `conceptUri` (M1 `CFItem.identifier`) with
  `alignmentType ∈ teaches|assesses|requires|summarizes`; duplicates → 409, unknown
  type → 422; `GET /documents/{id}/chunks?alignmentType=` filter for downstream
  knowledge assembly.
- **Files**: multipart upload with SHA-256 provenance, 20 MiB limit, per-document
  storage directory.
- Interface standards respected: `/api/v1` prefix, error envelope
  `{"error":{code,message,details}}`, `GET /api/v1/health`, UUIDv4-hex ids, ISO-8601
  UTC, camelCase, own SQLite/Postgres DB (`document-db` stack).

## Commits

- `8075fb40ef` feat(core): add document-service (M3) with LRMI metadata, chunks, alignments
  (16 service files + 5 resolved index files; author
  `Nguyễn Việt Huy <Stellarhold170NT@users.noreply.github.com>`)
- Merge `1a58261a7e` fast-forwarded onto `main` via the GitHub Git Data API after the
  agent branch was rebuilt from main's tree (conflict with the concurrently-merged
  `latexml-service` commit resolved by integrating both sides).

## Tests

```
docker run --rm -v /workspace:/code -w /code/services/document-service py-test pytest -q
→ 10 passed (document CRUD + LRMI validation, upload provenance, chunk ordering,
  duplicate guards, alignment lifecycle + filter, cascade delete, 404 envelope)
```

Cumulative repo suite: **89 tests / 8 services** (M1 15, M2 17, M6 14, M4 8, M5 17,
M7 8, M3 10, latexml ~30 from its own commit).

## Docs / deploy integration

- `deploy/docker-compose.yml`: `document-db` + `document-service` (8107, own
  `document-net` + `platform-net`), keeps the concurrently-added `latexml-service`
  (8110) stack; `deploy/.env.example` gains `DOCUMENT_PORT/DOCUMENT_DB_PASSWORD`.
- `services/README.md`: module index rows for M3 + latexml; health-check loop
  8101–8110; test loop includes `document`.
- `docs/MODULES.md`: M3 marked ✅ with built interface + latexml render-engine pointer.
- `docs/deployment.md`: 7 core services + stateless latexml row, updated architecture
  diagram (platform-net for API calls, per-service DB networks).

## Concerns

- The repo still carries legacy files from the earlier benchmark project at the root
  (`src/skilltree/`, `corpora/`, `openmemory-v040/`, old `reports/*`) — cleanup is
  out of scope for Task #3; suggest a dedicated `chore: remove legacy benchmark tree`
  commit before the thesis defense.
- Automatic chunking on upload (text/PDF) is roadmap work — chunks are added via API
  for now.
- The `latexml-service` commit on main had dropped the M4/M5/M6 rows from
  `services/README.md`; the resolved version restores all rows.
- Reminder (standing): the GitHub PAT used for push/merge must be rotated by the owner
  — it is present in chat history and must never be committed to the repo.
