# rag-service Specification (delta)

## ADDED Requirements

### Requirement: Health endpoint

The service SHALL expose `GET /api/v1/health` returning
`{"status","service":"rag-service","version"}`.

#### Scenario: health check

- **WHEN** `GET /api/v1/health`
- **THEN** HTTP 200 with `service == "rag-service"`

### Requirement: Document upload starts async ingest

`POST /api/v1/documents/upload` (multipart `file`, optional `title`, `uploaderId`)
SHALL accept .md/.txt/.html/.htm/.tex/.tar.gz/.tgz/.zip up to `RAG_MAX_UPLOAD_MB`,
store the raw file, create a job, and return HTTP 202 `{"jobId","statusUrl"}`.

#### Scenario: upload markdown

- **WHEN** a student uploads notes.md
- **THEN** HTTP 202 with jobId + statusUrl, and polling `GET /api/v1/jobs/{jobId}`
  reaches status "ready" with a docId

#### Scenario: unsupported type rejected

- **WHEN** the uploaded filename ends with .pdf
- **THEN** HTTP 422 with error code "UNSUPPORTED_TYPE"

#### Scenario: oversized upload rejected

- **WHEN** the upload exceeds `RAG_MAX_UPLOAD_MB`
- **THEN** HTTP 413 with error code "DOCUMENT_TOO_LARGE"

### Requirement: Structure-aware chunking

The ingest pipeline SHALL build a ToC tree from heading markers (ATX for Markdown,
`ltx_*` classes for latexml HTML with an h1–h6 fallback), split sections longer than
`RAG_MAX_SECTION_CHARS` on paragraph boundaries keeping the same section path, and
merge sections shorter than `RAG_MIN_SECTION_CHARS` into their parent.

#### Scenario: chunks land under the right heading

- **WHEN** a Markdown document defines "## Electoral Systems" under "# Democracies"
- **THEN** the stored chunk containing plurality voting text has sectionPath
  "Democracies > Electoral Systems"

#### Scenario: long section split keeps citation stable

- **WHEN** a section body exceeds `RAG_MAX_SECTION_CHARS`
- **THEN** it is stored as multiple chunks with the same section path and increasing
  part index

### Requirement: Hybrid BM25 retrieval with section-path boost

`POST /api/v1/ask` SHALL score chunks with `bm25(chunks_fts, 8.0, 4.0, 1.0)` plus
`RAG_PATH_BOOST * bm25(path-only match)`, and return the top-K sections with citations
(chunkId, documentId, sectionPath, heading, snippet, score, sourceUrl?) plus
`timings.retrieveMs`.

#### Scenario: ask returns section-path citations

- **WHEN** the question mentions terms found in a section body
- **THEN** citations[0] carries non-empty sectionPath + snippet + chunkId +
  documentId, and timings.retrieveMs is recorded

#### Scenario: path boost ranks matching section first

- **WHEN** the question terms appear both in a body and in an ancestor heading path
- **THEN** the chunk whose section path matches ranks above body-only matches

#### Scenario: empty question rejected

- **WHEN** question is empty or whitespace
- **THEN** HTTP 422 with error code "EMPTY_QUESTION"

### Requirement: LLM answer mode degrades gracefully

With `mode:"answer"`, the service SHALL attempt one LLM synthesis (retry once on
empty) using env-only credentials; on any LLM failure it SHALL return HTTP 200 with
`mode:"retrieve"` + `llmError` reason and the retrieval citations.

#### Scenario: LLM not configured

- **WHEN** LLM_ENDPOINT is unset and mode is "answer"
- **THEN** HTTP 200, mode "retrieve", llmError "llm-not-configured", citations present

#### Scenario: LLM success

- **WHEN** the LLM returns content
- **THEN** HTTP 200, mode "answer", answer text present, timings.generateMs recorded

### Requirement: Job + document lifecycle

`GET /api/v1/jobs/{jobId}` SHALL expose status, stageMs and error (404 envelope when
unknown). `GET /api/v1/documents` lists docs; `GET /api/v1/documents/{id}` returns the
section tree; `DELETE /api/v1/documents/{id}` cascades chunks/sections/FTS rows;
`POST /api/v1/documents/{id}/reingest` re-runs ingest from the stored raw file.

#### Scenario: unknown job

- **WHEN** GET /api/v1/jobs/does-not-exist
- **THEN** HTTP 404 with error code "JOB_NOT_FOUND"

#### Scenario: delete cascades

- **WHEN** DELETE /api/v1/documents/{id} returns 204
- **THEN** GET /api/v1/documents/{id} is 404 "DOCUMENT_NOT_FOUND"

### Requirement: Latency metrics

`GET /api/v1/metrics` SHALL report counters and rolling p50/p95/max over the last 1000
samples for ask retrieval, LLM generation and ingest stage durations.

#### Scenario: metrics after usage

- **WHEN** at least one upload + ask happened
- **THEN** /metrics reports askTotal ≥ 1 and askRetrieveMs.count ≥ 1 with p50/p95 fields

### Requirement: Gateway upstream

api-gateway SHALL forward `/rag/*` to rag-service:8109 (UPSTREAMS entry +
RAG_BASE_URL).

#### Scenario: gateway route table includes rag

- **WHEN** GET /api/v1/routes on the gateway
- **THEN** prefixes contains "rag"
