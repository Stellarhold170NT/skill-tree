# rag-service — V1 Design (STAIR structure-aware retrieval, hybrid SQLite FTS5)

- **Status**: DRAFT for Elephant-Goldfish review (this document is the Elephant draft; a
  zero-context Goldfish must be able to re-derive the implementation from this file alone).
- **Author role**: implement node `skilltree-v1--a_rag_design` (Elephant), repo
  `Stellarhold170NT/skill-tree` @ main `49c0ee2ebd`.
- **Date**: 2026-10-31
- **Scope**: V1 only. This is a *design* deliverable — the implement node builds
  `services/rag-service/` from it. No production code changes in this commit.
- **Source-of-truth note (deviation record)**: the task brief referenced a
  `skilltree-skills/rag-options.md` that does not exist in the workspace (searched all
  `.md` files). The three options below were reconstructed from the brief's own
  recommendation line, `docs/MODULES.md` §2 (M13 Open Notebook), `reports/lightrag-*.md`
  (measured LightRAG experiments in this repo) and the STAIR paper. If
  `rag-options.md` surfaces later with different options, re-run the comparison in §2.

---

## 0. Problem statement

V1 goal #5 (AGENTS.md §1): a Notebook-style RAG pipeline for **student-uploaded study
material**: `upload → parse (latexml M3) → structure-aware chunk → index → Q&A`,
and the pipeline **must be fast**. `docs/MODULES.md` planned this role as
"M13 `open-notebook` — Reuse Open Notebook" (File: docs/MODULES.md | Dòng: 76-77 |
Nội dung: "#### M13. `open-notebook` — Hỏi đáp tài liệu 🔜 / - Reuse Open Notebook
(RAG vector + full-text, SurrealDB) qua REST API. Không tự viết lại."), but V1 needs a
lean, gateway-compatible service now; M13 reuse is re-evaluated in §2.

Today the platform has **no** parse→chunk→index path at all:

- `document-service` only stores LRMI metadata + raw uploads + hand-posted chunks:
  File: services/document-service/README.md | Dòng: (Module roadmap) | Nội dung:
  "- Automatic chunking on upload (plain text/Markdown first; PDF via extraction)." is
  listed as *future work*. Its chunk model has no section structure:
  File: services/document-service/app/models.py | Dòng: 40-50 | Nội dung:
  `class Chunk` fields = `document_id, order_index, text, char_count, created_at` only.
- `latexml-service` renders LaTeX → ar5iv-style HTML (stateless, ~2 min/paper:
  File: services/latexml-service/README.md | Dòng: 22-23 | Nội dung: "a paper
  conversion typically takes ~2 minutes (outer timeout: `RENDER_TIMEOUT_S`)").
- `api-gateway` has **no** upstream for RAG: File: services/api-gateway/app/config.py |
  Dòng: 9-18 | Nội dung: `UPSTREAMS = { case→8101, quiz→8102, class→8103,
  events→8104, learner→8105, assignments→8106, documents→8107 }` — no `rag` entry.

**Decision (fixed by the brief, confirmed by evidence): build a new lean container
`rag-service` on port 8109** — hybrid SQLite FTS5 (BM25) retrieval over
**structure-aware chunks** (heading/ToC path per STAIR), no embedding requirement in
V1, no LLM in the ingest path, optional LLM synthesis at ask time.

## 1. Design goals / non-goals

Goals (V1):

1. G1 — One API to upload a study document and get a searchable, cite-able index
   (`/api/v1/documents/upload`, `/api/v1/ask`).
2. G2 — Ingest processing (fetch parsed content → chunk → index) ≤ **60 s per 100
   pages**, measured and reported per stage (§8).
3. G3 — Retrieval-only `/ask` p95 ≤ **3 s**, measured (§8).
4. G4 — Citations are **section paths** (STAIR ToC entries), not byte offsets:
   "Chapter 4.2 → Institutions within Democracy → Electoral Systems & Political Parties".
5. G5 — Follow platform conventions: `/api/v1` prefix, error envelope
   `{"error":{"code","message","details"}}` (File: services/README.md | Dòng: 37 |
   Nội dung: "- Errors: `{\"error\": {\"code\", \"message\", \"details\"}}`"), camelCase
   JSON, UUIDv4 hex ids, ISO-8601 UTC (File: services/README.md | Dòng: 39).
6. G6 — Own database only; integrate with document-service / latexml-service via REST
   (MODULES.md principle 1-2).
7. G7 — LLM optional and configured by env only (never committed):
   `LLM_ENDPOINT` / `LLM_API_KEY` / `LLM_MODEL` (same names the repo already uses,
   File: .env.example | Dòng: 4-6).

Non-goals (V1): embeddings/vector search (§2 evidence: gateway blocks `/v1/embeddings`);
PDF/DOCX parsing (latexml is LaTeX-source-only; see §5 input policy); knowledge-graph
construction (that is M8 Cognee's role); multi-node scaling; per-student ACL enforcement
(uploader is recorded, enforcement comes with M11 wiring later).

## 2. Options compared (3) and decision

Citations inside table cells use `·` instead of `|` so the table stays parseable.

| # | Option | Ingest cost (measured in this repo / paper) | Query cost | Extra infra | Embedding | Fit with existing modules |
|---|--------|---------------------------------------------|-----------|-------------|-----------|---------------------------|
| A | **Reuse Open Notebook** (MODULES.md M13, SurrealDB vector+BM25) | Source processing + embeddings run in a worker; vector mode **requires** a configured embedding model (File: open-notebook docs/3-USER-GUIDE/search.md · "vector search … requires `default_embedding_model` configured") | ms-level, both modes | SurrealDB v2 container + separate worker process (File: github.com/lfnovo/open-notebook docs/7-DEVELOPMENT/architecture.md · "SurrealDB (v2): documents, graph edges, full-text (BM25) and vector search in one database") | yes (vector mode) | Own container + own DB; our gateway blocks embeddings (below); UI-first product, we need an API-first module |
| B | **LightRAG graph service** (entity/relation extraction at ingest) | **34 min for 86 pages**, 306/420 LLM calls, empty-response 29% (File: reports/lightrag-vs-cognee.md · Dòng: 4-5 · "ingest 34 phút, 306/420 LLM calls (empty-response 29% ingest / 14% query)") | naive query 7-11.5 s, hybrid p50 44.5 s (same file · Dòng: 22) | + KV/vector/graph stores; LLM at ingest mandatory | no (embeddings must be self-hosted), LLM-heavy | Graph is thin on our corpus (1.1 edge/node); strong for multi-hop — but multi-hop is **M8 Cognee's** role |
| C | **lean rag-service: SQLite FTS5 + STAIR structure-aware chunking** | Chunk+index of a 100-page text ≈ seconds (pure CPU, no LLM, no embedding); the only slow stage is latexml conversion (~2 min/paper, async, measured separately) | BM25 over FTS5: milliseconds; p95 ≤ 3 s trivially reachable incl. HTTP overhead | SQLite file + volume only | **none required** | Consumes latexml (M3) output and mirrors canonical records into document-service (M3) — exactly the modules the brief names |

Supporting evidence for rejecting embedding-dependent options in V1:

- File: reports/lightrag-smoke-summary.md | Dòng: 26-28 | Nội dung: "Gateway
  NetMind/Viettel CHẶN hẳn `/v1/embeddings` (403 \"team not allowed\") … Mọi RAG
  framework dùng gateway này PHẢI tự host embedding. Đã verify: BAAI/bge-small-en-v1.5
  (dim 384) chạy tốt local, ~900 texts / 90s trên 2 CPU."
- Same constraint recorded in-repo: File: docs/adr/0001-local-embedding-stack.md |
  Dòng: 1-4 | Nội dung: "… an OpenAI-compatible LLM gateway (Viettel NetMind,
  GLM-5.3-Flash) whose `/embeddings` endpoint hangs — verified by direct request."
- STAIR motivates structure over vectors for this corpus shape: File:
  arxiv.org/abs/2609.03874v2 (§ Abstract) | Nội dung: "Current retrievers chunk long
  context into length-based manageable chunks - in the process throwing away rich and
  informative semantic global structure in the corpus." … "STAIR achieves a high
  Recall@1 score of 82.6% on SearchTome as compared to DSI (76.9%) … beats other strong
  baselines such as BM25 (59.5%), DPR (68.7%) and out-of-the-box Mistral (13.8%)."
  Note: STAIR's *model* is a fine-tuned generative retriever (DSI-style) — out of V1
  scope (needs training + GPU). **We adopt its structural insight**: the retrieval unit
  is a section (ToC leaf) with its heading path, and the ToC is first-class data.

**Decision: Option C for V1.** LightRAG stays a V2 augmentation (its measured strengths —
fast build vs cognee, cheap naive queries — matter for the classroom-memory graph, not
for document QA, and it cannot beat ms-level FTS5 on latency). Open Notebook remains the
UX reference for the student notebook UI; its SurrealDB stack is not adopted because the
extra container + worker + embedding requirement contradict G2/G6 for one demo-scale
service. MODULES.md M13 wording should be updated at the implement node's docs commit
("M13 = rag-service (V1), Open Notebook = reference only").

## 3. Architecture & data flow

```
 student / harness plugin
        │  multipart upload (.tex/.tar.gz/.zip/.md/.txt/.html)
        ▼
 POST /api/v1/documents/upload          ──► 202 {jobId, statusUrl}      (job queued)
        │                                     rag-service (port 8109, own SQLite)
        ▼
 ingest worker (asyncio, in-process)
   1. store raw file (sha256, size, content_type)          [jobs.stage=received]
   2. parse:
      LaTeX-family (.tex/.tar.gz/.zip) ──► POST latexml /api/v1/render
                                           → {renderId, htmlUrl}          [stage=parsed]
                                           (conversionMs measured; ~2 min/paper,
                                            async — does NOT count toward the 60 s budget)
      .md/.txt/.html ──────────────────► direct read                       [stage=parsed]
   3. structure chunk: headings → ToC tree → sections (+ paragraph splits) [stage=chunked]
   4. mirror canonical Document + chunks into document-service (best effort) [stage=mirrored]
   5. index into SQLite FTS5 (external-content, BM25)                       [stage=ready]

 GET /api/v1/ask {question, documentIds?, topK?, mode?}
   → FTS5 BM25 (column-weighted: title > headings > body)
   → section-path boost (question tokens matching ancestor titles)
   → top-k chunks + citations (sectionPath, headings, docId, chunkId, sourceUrl)
   mode="answer": + optional LLM synthesis (NetMind env), retry-on-empty,
                  fallback to retrieval result on LLM failure
```

Failure policies:

- latexml unavailable/timeout → job fails with `PARSE_FAILED` /
  `LATEXML_UNAVAILABLE`; raw file is kept so re-ingest is possible
  (`POST /api/v1/documents/{id}/reingest`).
- document-service mirror failure → **does not fail ingest**; job records
  `mirrorError` (canonical store is re-mirrable at any time; index is the serving path).
- LLM failure at ask time → HTTP **200** (not an error status): the payload degrades to
  `mode:"retrieve"` and `llmError` carries the machine reason (`llm-not-configured`,
  `llm-unavailable`, `llm-timeout`, `llm-empty-after-retry`). Retrieval results are
  always returned; the LLM only upgrades the answer. HTTP 503/504 are **never** used
  for LLM problems — the API contract in §7 reflects exactly this.

## 4. Data model (rag-service's own SQLite, file per G6)

```sql
-- metadata
CREATE TABLE docs (
  id            TEXT PRIMARY KEY,            -- uuid4 hex
  title         TEXT NOT NULL,
  uploader_id   TEXT,                        -- candidateId (M6 sourcedId) if known
  source_kind   TEXT NOT NULL,               -- 'latexml' | 'text' | 'markdown' | 'html'
  source_url    TEXT,                        -- latexml htmlUrl when source_kind='latexml'
  render_id     TEXT,                        -- latexml renderId
  doc_service_id TEXT,                       -- mirrored Document.id in document-service
  char_count    INTEGER NOT NULL,
  created_at    TEXT NOT NULL                -- ISO-8601 UTC
);

-- STAIR ToC tree: one row per section node (the retrieval unit is the leaf)
CREATE TABLE sections (
  id         TEXT PRIMARY KEY,               -- uuid4 hex
  doc_id     TEXT NOT NULL REFERENCES docs(id) ON DELETE CASCADE,
  parent_id  TEXT REFERENCES sections(id),
  level      INTEGER NOT NULL,               -- 1..6
  title      TEXT NOT NULL,
  path       TEXT NOT NULL,                  -- '4 > Institutions within Democracy > Electoral Systems'
  order_idx  INTEGER NOT NULL
);
CREATE INDEX idx_sections_doc ON sections(doc_id, order_idx);

-- chunks: FTS5 external-content table, bm25 rank with column weights
CREATE TABLE chunks (
  id          TEXT PRIMARY KEY,              -- uuid4 hex
  doc_id      TEXT NOT NULL REFERENCES docs(id) ON DELETE CASCADE,
  section_id  TEXT NOT NULL REFERENCES sections(id),
  part        INTEGER NOT NULL DEFAULT 0,    -- split index inside a long section
  heading     TEXT NOT NULL,                 -- leaf section title
  path        TEXT NOT NULL,                 -- full section path (boosted column)
  body        TEXT NOT NULL,
  char_count  INTEGER NOT NULL
);
CREATE VIRTUAL TABLE chunks_fts USING fts5(
  heading, path, body, content='chunks', content_rowid='rowid'
);
-- triggers keep chunks_fts in sync (A/B/D standard FTS5 external-content pattern)

CREATE TABLE jobs (
  id          TEXT PRIMARY KEY,
  doc_id      TEXT,                          -- set once the doc row exists
  status      TEXT NOT NULL,                 -- queued|received|parsed|chunked|mirrored|ready|failed
  stage_ms    TEXT,                          -- JSON {parseMs, conversionMs, chunkMs, mirrorMs, indexMs}
  error       TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
```

Why SQLite + FTS5 (V1): zero extra container; built-in BM25; external-content tables
index multi-MB corpora in seconds; matches repo precedent for embedded state
(File: docs/adr/0001-embedded-storage.md | Dòng: 8-10 | Nội dung: "**Embedded stack**
(SQLite + LanceDB + Ladybug/Kuzu) thay vì server DB (Neo4j/Postgres). — Lý do: 1 process
duy nhất, không cần concurrent access"). Single-writer (asyncio worker) keeps SQLite
safe. If V2 needs concurrency, the same schema ports to Postgres `tsvector` — the
index is derived data, rebuildable from `chunks`.

## 5. Structure-aware chunking (the STAIR adaptation)

Input policy (V1):

| Kind | Accepted inputs | Parser |
|------|-----------------|--------|
| `latexml` | `.tex`, `.tar.gz`, `.zip` (same shapes latexml accepts — File: services/latexml-service/app/extraction.py · Dòng: 14-19 · "Accepts the shapes arXiv's `/e-print` endpoint produces": tar tree, gzip of a single `.tex`, plain `.tex`) | latexml `POST /api/v1/render` → fetch `htmlUrl` HTML |
| `text` | `.txt` | direct |
| `markdown` | `.md` | ATX headings `#..######` → ToC tree |
| `html` | `.html` | same HTML parser as latexml output |

Chunking rules (identical shape for all kinds — build a ToC tree first, then cut):

1. Build the section tree from heading boundaries. For LaTeX-rendered HTML the markers
   are LaTeXML's own classes, which are already vendored in this repo:
   File: services/latexml-service/static/css/ar5iv.0.9.1.min.css | Dòng: (selectors,
   verified by grep) | Nội dung: `.ltx_section`, `.ltx_subsection`, `.ltx_title_section`,
   `.ltx_para`, `.ltx_abstract` — i.e. the HTML exposes exactly the STAIR ToC
   (section → subsection → …). Generic HTML falls back to `h1..h6`.
2. A **leaf section** (ToC leaf in STAIR terms) is the default retrieval unit; its
   `path` is `parent titles > … > leaf title` and `heading` is the leaf title.
3. If a section body > `RAG_MAX_SECTION_CHARS` (default 8000), split on paragraph
   boundaries (`ltx_para` / blank lines) into `part = 0,1,2…`; every part keeps the
   same section `path` (citation stays stable) and the split never crosses a section
   boundary.
4. Sections shorter than `RAG_MIN_SECTION_CHARS` (default 200, excluding headings) are
   merged into their parent's body instead of becoming index rows — avoids noisy
   one-line sections polluting BM25.
5. Non-content blocks are dropped: `ltx_bibliography`, `ltx_appendix` (configurable),
   scripts/styles; abstracts are indexed like normal sections (title "Abstract").
6. All chunks of a doc are stored and mirrored to document-service in document order
   (`order_index` ascending), so M8/Cognee can later consume aligned chunks unchanged:
   File: services/document-service/app/service.py | Dòng: 49 | Nội dung:
   `def add_chunks(db, document, chunks_in)` accepts ordered chunks with optional
   explicit `orderIndex` (409 on duplicates — we send no explicit index, we use the
   auto-increment branch, File: services/document-service/app/service.py | Dòng: 54-59).

## 6. Retrieval & /ask design

1. Query sanitation: strip FTS5 operators, keep word characters + diacritics
   (Vietnamese questions must work against English corpora — the lexical layer is
   multilingual by nature for exact terms; semantic gap is accepted in V1, see §11).
2. `chunks_fts MATCH ?` with `bm25(chunks_fts, 8.0, 4.0, 1.0)` — column weights
   heading=8, path=4, body=1 (headings are short and high-precision).
3. Structure boost (STAIR-inspired, cheap) with a **fixed, committed constant**: run a
   second `chunks_fts MATCH` with the same sanitized query terms against the `path`
   column only, and merge per chunk id:
   `final = bm25(query, weights 8/4/1) + RAG_PATH_BOOST * bm25_path_only`.
   Both bm25 terms are negative when matched and `0` when a chunk does not match, so
   the bonus only pulls chunks whose section path contains question terms upward
   (more negative = better in FTS5 ranking). `RAG_PATH_BOOST` default **0.5**,
   env-tunable (§9). The merge happens in the service over two SQL queries — no extra
   LLM call.
4. Re-rank **to section granularity** for display: chunks grouped by section; the
   answer payload returns per-section best chunk (top `topK`, default 5), each with
   `score`, `sectionPath`, `heading`, `snippet` (body excerpt, 320 chars), `chunkId`,
   `documentId`, `sourceUrl` (latexml render URL when present) — the citation format
   required by G4.
5. `mode:"answer"` (optional): one LLM call to the NetMind-compatible gateway with the
   top-k snippets + section paths in the prompt; strict "answer only from context, cite
   section paths" instruction; `temperature=0`. Mandatory robustness: **retry-on-empty**
   (GLM-5.3-Flash returns empty content 14-29% of calls under load — File:
   reports/lightrag-vs-cognee.md | Dòng: 5 | Nội dung: "empty-response 29% ingest /
   14% query" ; same lesson in docs/adr/0001-embedded-storage.md line 20), 1 retry,
   then fallback to the retrieval payload with HTTP 200 and `llmError` set (§3). Key/name come only from env
   (`LLM_ENDPOINT`, `LLM_API_KEY`, `LLM_MODEL`, timeout `RAG_LLM_TIMEOUT_S`); the
   deployment layer injects them from `skilltree-secrets/netmind.json` — **never
   hard-coded or committed** (AGENTS.md §8.3).

## 7. API contract (prefix `/api/v1`, camelCase, platform envelope)

Shared: errors always
`{"error": {"code": "<MACHINE_CODE>", "message": "...", "details": {...}}}`; health
`GET /api/v1/health` → `{"status","service":"rag-service","version"}`.

| Method & path | Request | Response | Errors |
|---|---|---|---|
| `POST /api/v1/documents/upload` | multipart `file` (+ optional `title`, `uploaderId`) | 202 `{"jobId","statusUrl":"/api/v1/jobs/{jobId}"}` | 413 `DOCUMENT_TOO_LARGE`; 422 `UNSUPPORTED_TYPE` |
| `GET /api/v1/jobs/{jobId}` | — | `{"jobId","status","stageMs":{...},"docId?","error?"}` | 404 `JOB_NOT_FOUND` |
| `GET /api/v1/documents` | `?uploaderId=&limit=&offset=` | `[{"id","title","sourceKind","charCount","sections","chunks","createdAt","sourceUrl?"}]` | — |
| `GET /api/v1/documents/{id}` | — | doc + section tree (ToC) | 404 `DOCUMENT_NOT_FOUND` |
| `DELETE /api/v1/documents/{id}` | — | 204 (cascade chunks/sections/fts rows; keeps the document-service copy — deletion of the mirror is a separate explicit call) | 404 |
| `POST /api/v1/documents/{id}/reingest` | — | 202 same as upload (re-runs from stored raw file) | 404; 502 `LATEXML_UNAVAILABLE` |
| `POST /api/v1/ask` | `{"question","documentIds"?,"uploaderId"?,"topK"?,"mode"?: "retrieve"\|"answer"}` | `{"mode","question","timings":{"retrieveMs","generateMs"?},"citations":[{"chunkId","documentId","sectionPath","heading","snippet","score","sourceUrl"?}], "answer"?}` | 422 `EMPTY_QUESTION` only. LLM problems are **not** HTTP errors: `mode:"answer"` with an unconfigured or failing LLM returns **200** with `mode:"retrieve"` + `llmError` reason (§3, §6.5) |
| `GET /api/v1/metrics` | — | counters + rolling p50/p95 (last 1000) for `ask.retrieveMs`, `ask.generateMs`, ingest stage durations | — |

Error codes: `DOCUMENT_TOO_LARGE` (413), `UNSUPPORTED_TYPE` (422), `EMPTY_QUESTION`
(422), `PARSE_FAILED` (422), `EMPTY_DOCUMENT` (422 — parser produced zero sections),
`DOCUMENT_NOT_FOUND` / `JOB_NOT_FOUND` (404), `LATEXML_UNAVAILABLE` (502),
`INDEX_FAILED` (500). `LLM_UNAVAILABLE` / `LLM_TIMEOUT` are **not** HTTP statuses —
they exist only as `llmError` reason values on a 200 `mode:"retrieve"` response.

Upload limit: `RAG_MAX_UPLOAD_MB` default **20** (matches document-service:
File: services/document-service/app/config.py | Dòng: 7 | Nội dung:
`MAX_UPLOAD_BYTES = … "DOCUMENT_MAX_UPLOAD_BYTES", str(20 * 1024 * 1024)`); latexml
accepts up to 100 MB so the smaller cap is the service-side guard.

## 8. Latency budgets & how they are measured (G2/G3)

- **Ingest ≤ 60 s / 100 pages** — budget covers rag-service processing *after content
  is available*: fetch parse output + chunk + index + mirror. The latexml conversion
  stage is **measured separately** (`stageMs.conversionMs`) and excluded, because it is
  a shared platform engine with its own budget (~2 min/paper evidence in §0; brief
  goal is the RAG pipeline's own speed). For `.md/.txt/.html` the whole ingest is
  inside the budget. Measurement: `jobs.stage_ms` JSON per stage + total; the implement
  node's evidence must include a real run: 100-page corpus →
  `indexMs + chunkMs + fetchMs ≤ 60000 ms` pasted in the report.
- **/ask p95 ≤ 3 s** — retrieval-only mode. Measurement: `timings.retrieveMs` in every
  response + `/api/v1/metrics` rolling p95; the implement node runs a 20-iteration
  sequential bench against a real indexed corpus and pastes the p50/p95 numbers.
- Bench sketch (implement node commits it as `services/rag-service/bench/bench.py`):
  sequential N=20 `POST /ask` (mode retrieve) → report p50/p95/max + upload a 100-page
  doc once and print `stageMs`. Both numbers land in the node report as evidence.

## 9. Configuration (12-factor, no secrets in files)

| Env var | Default | Purpose |
|---|---|---|
| `RAG_PORT` | `8109` | Listen port (host mapping in compose) |
| `RAG_DB_PATH` | `./data/rag.db` | SQLite file (volume-mounted) |
| `RAG_UPLOAD_DIR` | `./data/uploads` | Raw file store (reingest source) |
| `RAG_MAX_UPLOAD_MB` | `20` | Upload guard |
| `RAG_MAX_SECTION_CHARS` | `8000` | Section split threshold |
| `RAG_MIN_SECTION_CHARS` | `200` | Merge-threshold for tiny sections |
| `RAG_TOPK` | `5` | Default top-k |
| `RAG_PATH_BOOST` | `0.5` | Weight multiplying the path-only BM25 score in the structure boost (§6.3) |
| `LATEXML_BASE_URL` | `http://localhost:8110` | latexml base. **In compose use `http://latexml-service:8103`** — the container listens on 8103 (File: services/latexml-service/Dockerfile · Dòng: 25, 28 · `EXPOSE 8103` / `CMD ["uvicorn", …, "--port", "8103"]`; compose maps host 8110:8103, File: deploy/docker-compose.yml · Dòng: 227) |
| `LATEXML_TIMEOUT_S` | `900` | Matches latexml `RENDER_TIMEOUT_S` default |
| `DOCUMENT_BASE_URL` | `http://localhost:8107` | document-service mirror target |
| `LLM_ENDPOINT` / `LLM_API_KEY` / `LLM_MODEL` | unset | Optional ask-time LLM (NetMind). Unset ⇒ `/ask` mode `answer` **does not fail**: returns the retrieval result with `llmError:"llm-not-configured"` and HTTP 200 (graceful degradation) |
| `RAG_LLM_TIMEOUT_S` | `30` | LLM call timeout |

## 10. Deployment changes (compose + gateway) — exact diffs for the implement node

1. `services/api-gateway/app/config.py` — add one UPSTREAMS entry:
   `"rag": ("RAG_BASE_URL", "http://localhost:8109"),` (dict at lines 9-18). Gateway
   route table, rate-limit and bearer hook then apply automatically
   (File: services/api-gateway/app/main.py | Dòng: 45-56 — routes are generated from
   `config.UPSTREAMS`; File: services/api-gateway/app/routes.py | Dòng: 84 | Nội dung:
   `url = f"{upstream}/api/v1/{rest}"`).
2. `deploy/docker-compose.yml` — add:

```yaml
  rag-service:
    build: ../services/rag-service
    image: skill-tree/rag-service:0.1.0
    environment:
      LATEXML_BASE_URL: http://latexml-service:8103
      DOCUMENT_BASE_URL: http://document-service:8107
      RAG_DB_PATH: /srv/app/data/rag.db
      RAG_UPLOAD_DIR: /srv/app/data/uploads
    volumes:
      - rag-data:/srv/app/data
    ports:
      - "${RAG_PORT:-8109}:8109"
    networks: [platform-net, latexml-net]   # latexml is ONLY on latexml-net
    restart: unless-stopped
```

plus `rag-data:` under `volumes:`; and `RAG_BASE_URL: http://rag-service:8109` in the
`api-gateway` environment block (File: deploy/docker-compose.yml | Dòng: 232-244).

- **Network rationale (evidence)**: latexml-service is isolated from the platform:
  File: deploy/docker-compose.yml | Dòng: 228 | Nội dung: `networks: [latexml-net]` —
  so rag-service must join `latexml-net` to reach it directly. (The gateway cannot
  proxy it today: its forwarder hard-codes `/api/v1/{rest}` and latexml's render
  artifacts are served at `/renders/...` outside `/api/v1`, File:
  services/latexml-service/app/routes.py | Dòng: 120.)
- **Pre-existing drift to flag, not fix here**: compose sets
  `AUTH_BASE_URL: http://auth-service:8108` (File: deploy/docker-compose.yml | Dòng:
  243) but gateway `UPSTREAMS` has no `auth` prefix — harmless dead env today; the
  auth node should either add the prefix or drop the env.
- OpenSpec (AGENTS.md §5.2): `openspec/` is **not bootstrapped** in the repo at
  `49c0ee2ebd` (directory absent). This design is written spec-ready (requirements in
  §1/§7/§8 with WHEN/THEN scenarios below) so the implement node can create
  `openspec/changes/add-rag-service/` from it once bootstrap lands.

#### Scenario: upload a LaTeX archive
WHEN a student uploads `notes.tar.gz` to `POST /rag/documents/upload` (via gateway)
THEN the gateway forwards to `rag-service:8109/api/v1/documents/upload`, the service
returns 202 with `jobId`, and polling `GET /rag/jobs/{jobId}` ends at
`status:"ready"` with a `docId`; `GET /rag/documents/{docId}` exposes the section tree.

#### Scenario: ask returns section-path citations
WHEN `POST /rag/ask {"question":"What is the plurality voting system?"}`
THEN the response lists `citations[]` each with a non-empty `sectionPath`
(e.g. `4 > Democracies > Electoral Systems`), `snippet`, `chunkId`, `documentId`, and
`timings.retrieveMs` is recorded in `/rag/metrics`.

#### Scenario: ingest budget holds without latexml
WHEN a 100-page `.md` file is uploaded
THEN `GET /jobs/{id}` reports every `stageMs` component and their sum ≤ 60000 ms.

## 11. Open questions for the Goldfish (attack list)

1. Vietnamese queries vs English corpus: lexical FTS5 matches exact terms only — is
   the accepted quality floor defined? (Current answer: V1 accepts it; M8/Cognee
   covers semantic recall; optional fastembed bridge listed as V2 — ADR-0001-local-
   embedding-stack already validated bge-small locally.)
2. Concurrency: single uvicorn worker assumed. What happens with 2 replicas? (Answer
   for V1: document single-replica constraint in README; SQLite accepts it, mirror
   calls are idempotent by doc title + sha256 dedupe.)
3. Should `DELETE /documents/{id}` cascade to the document-service mirror? (Current
   answer: no — explicit separate action, avoids surprising deletes of canonical data.)
4. Is mirroring chunks to document-service required for V1 demo, or optional? (Current
   answer: implemented best-effort; Cognee M8 will need it, so keep it on.)
5. `answer` mode prompt: exact template + empty-retry semantics need an implement-node
   decision recorded in the module README.

## 12. Implementation checklist (tasks.md equivalent)

1. [ ] Scaffold `services/rag-service/` (FastAPI + pydantic v2, port 8109, health, error envelope).
2. [ ] SQLite schema (§4) + FTS5 triggers + migrations on startup.
3. [ ] Ingest worker + job states (§3), raw-file store, sha256 dedupe.
4. [ ] latexml client (render → fetch htmlUrl) + direct parsers (md/txt/html).
5. [ ] Structure chunker (§5) with unit tests on a fixture HTML with `ltx_section` classes.
6. [ ] FTS5 search + section boost + citation payload (§6).
7. [ ] document-service mirror client (best-effort, `mirrorError` recording).
8. [ ] Optional LLM answer mode with retry-on-empty + fallback (§6.5).
9. [ ] `/metrics` + `bench/bench.py`; run budgets, paste evidence into node report.
10. [ ] Compose service + gateway `rag` upstream (§10); `pytest` green; module README (EGM: role/INPUT/OUTPUT/env/run/test/deps).

## 13. References

- STAIR: arXiv:2609.03874v2 — ToC-as-retrieval-unit; Recall@1 82.6 vs DSI 76.9, BM25
  59.5, DPR 68.7; hallucination < 0.05%; SearchTome (18 books / 6 domains).
- LightRAG (HKUDS) — measured in-repo: reports/lightrag-vs-cognee.md,
  reports/lightrag-smoke-summary.md.
- Open Notebook (lfnovo) — SurrealDB single-store (BM25 + vector + graph), worker-based
  processing: docs/7-DEVELOPMENT/architecture.md, docs/3-USER-GUIDE/search.md.
- Repo: docs/MODULES.md (M8/M13 roles, URI contract), services/README.md (shared
  contract), docs/adr/0001-embedded-storage.md, docs/adr/0001-local-embedding-stack.md,
  deploy/docker-compose.yml, services/{api-gateway,document-service,latexml-service}/.
