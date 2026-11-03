# C4 Level 3 — Component

> **Level:** [C3 — Component](https://c4model.com/diagrams/component): the inside of
> the three most important containers — the **agent harness** (the main interaction
> surface), the planned **rag-service** (student notebook RAG pipeline), and the planned
> **skilltree-teacher-ui plugin** (teacher role UI). Parent containers are in
> [`l2-container.md`](l2-container.md); users in [`l1-context.md`](l1-context.md).
> **Status tagging:** the harness is real code at `main@49c0ee2ebd`; `rag-service` and
> `skilltree-teacher-ui` are **[V1 planned]** (design sources cited per row). Elements
> suffixed `(see L2)` are external to this zoom level.
> **Syntax:** PlantUML C4 (C4-PlantUML), one diagram per file (AGENTS.md §5.4). Render:
> `plantuml -tpng` or paste into <https://www.plantuml.com/plantuml>.
> Inside evidence cells `·` replaces `|`.

```plantuml
@startuml l3-component
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Component.puml

title C3 Components — harness (real) + rag-service and skilltree-teacher-ui ([V1 planned])

System_Boundary(harnessB, "skill-tree-harness (M4) — real code, main@49c0ee2") {
  Component(webui, "DSH web UI/API", "node :3080 (host :8104)", "Session UI + control API, token-gated (stable launch token)")
  Component(agentrt, "Agent runtime + sandbox", "bwrap, iptables, node user 1000", "Runs agent turns isolated; firewall blocks metadata endpoints and LAN scan")
  Component(loader, "Plugin loader", "plugins/patch.yml", "Insert and patch rows; plugins bound read-only; custom skill dirs")
  Component(mcpclient, "MCP client (mcp-cognee-memory)", "@deepseek-ai/dsh-mcp-client", "streamable-http to cognee MCP :8021")
  Component(bizTools, "[V1 planned] skilltree business plugin", "plugin pattern: lib/index.js + client/", "Atomic tools: opencase_next_concepts, quiz_adaptive, cognee_ask (skeleton today)")
  Component(brand, "skilltree-brand plugin", "theme token lib", "Green #27A95F rebrand + logo; legacy indigo #4136d6 retired by DESIGN.md")
  Component(sdk, "dsh_web_sdk (out-of-band)", "Python async SDK", "open_session / submit_prompt / poll_session for e2e control")
}

System_Boundary(ragB, "[V1 planned] rag-service — design on branch agent-v1-rag-design") {
  Component(ragApi, "REST API", "FastAPI /api/v1", "upload (202 + jobId), jobs, documents CRUD, reingest, ask, metrics, health")
  Component(ingest, "Ingest worker", "asyncio in-process", "store raw (sha256) -> parse -> chunk -> mirror -> index; job states; no LLM at ingest")
  Component(parsers, "Parsers", "latexml client + direct readers", ".tex/.tar.gz/.zip via latexml render; .md/.txt/.html direct")
  Component(chunker, "Structure chunker", "ToC tree builder (STAIR-inspired)", "ltx_section / h1-h6 headings -> sections; MAX/MIN section chars; paragraph split")
  Component(mirror, "document-service mirror", "REST client", "best-effort canonical copy of Document + chunks; failure recorded, not fatal")
  Component(retrieval, "Retrieval", "SQLite FTS5 BM25", "bm25(heading 8, path 4, body 1) + section-path boost; section-path citations")
  Component(answer, "Answer mode", "optional LLM synthesis", "NetMind chat with retry-on-empty; falls back to retrieval payload")
  ComponentDb(ragStore, "SQLite store", "SQLite + FTS5", "docs, sections, chunks, chunks_fts (external content), jobs")
}

System_Boundary(uiB, "[V1 planned] skilltree-teacher-ui — DSH client plugin (pattern per roadmap-viewer)") {
  Component(views, "Views", "React (React.createElement)", "Class dashboard: classes, roster, Red/Amber/Green heatmap, concept graph, assignments")
  Component(state, "State", "component state + cache", "per-view data cache and selection state")
  Component(apiClient, "API client", "client-half RPC wrapper", "typed calls from UI to host half")
  Component(hostRpc, "Host RPC half", "harness.handle methods", "package-private RPC, e.g. skilltree.getClassHeatmap")
  Component(fetcher, "Outbound fetcher", "ctx.web.fetch", "server-side fetch to api-gateway :8000 (page never calls services directly)")
}

System_Ext(gatewayExt, "api-gateway :8000", "single REST entry (see L2)")
System_Ext(opencaseExt, "opencase-service :8101", "CASE concept graph (see L2)")
System_Ext(quizExt, "quiz-service :8102", "QTI item bank (see L2)")
System_Ext(cogneeExt, "cognee-memory MCP :8021", "per-student memory (see L2)")
System_Ext(docExt, "document-service :8107", "LRMI canonical store (see L2)")
System_Ext(latexmlExt, "latexml-service :8103 container", "LaTeX rendering (see L2)")
System_Ext(netmindExt, "NetMind LLM Gateway", "chat completions (see L2)")

Rel(webui, agentrt, "serves UI, drives agent turns", "in-process")
Rel(loader, bizTools, "loads row skilltree", "patch.yml - insert:")
Rel(loader, brand, "loads row skilltree-brand", "patch.yml - insert:")
Rel(loader, mcpclient, "loads row mcp-cognee-memory", "patch.yml - insert:")
Rel(mcpclient, cogneeExt, "MCP calls", "streamable-http")
Rel(bizTools, opencaseExt, "opencase_next_concepts", "REST /api/v1")
Rel(bizTools, quizExt, "quiz_adaptive", "REST /api/v1")
Rel(sdk, webui, "open_session / submit_prompt / poll", "HTTPS DSH_BASE_URL")

Rel(ragApi, ingest, "enqueues ingest job", "202 jobId + statusUrl")
Rel(ingest, parsers, "parse uploaded source", "in-process")
Rel(parsers, latexmlExt, "render LaTeX family", "HTTP POST /api/v1/render")
Rel(parsers, chunker, "parsed HTML / markdown", "in-process")
Rel(chunker, ragStore, "writes sections + chunks + fts", "SQL")
Rel(ingest, mirror, "mirror canonical data", "best effort")
Rel(mirror, docExt, "POST documents + chunks", "REST /api/v1")
Rel(ragApi, retrieval, "ask -> top-k citations", "in-process")
Rel(retrieval, ragStore, "MATCH + bm25 rank", "SQL")
Rel(ragApi, answer, "mode = answer", "optional")
Rel(answer, netmindExt, "chat completion", "HTTPS, retry-on-empty")

Rel(views, state, "reads and writes view state", "in-browser")
Rel(views, apiClient, "requests data", "in-browser")
Rel(apiClient, hostRpc, "package-private RPC", "host.call")
Rel(hostRpc, fetcher, "RPC handler fetches", "ctx.web.fetch")
Rel(fetcher, gatewayExt, "REST /api/v1", "HTTP :8000")

SHOW_LEGEND()
@enduml
```

## Reading guide

- **Harness decomposition is the code truth today**: web UI/API on `:3080`, a hardened
  agent runtime (bwrap sandbox + iptables), the `patch.yml` plugin loader (rows for
  `skilltree-brand`, `mcp-cognee-memory`, core tools, skills dirs) and the
  out-of-band `dsh_web_sdk` for e2e control. The business plugin row is still the
  skeleton with three planned atomic tools.
- **rag-service decomposition is the approved design**, not code yet: async ingest
  worker (no LLM at ingest), structure-aware chunking (ToC leaf sections with heading
  path), FTS5 BM25 with column weights, section-path citations, optional LLM answer
  with retry-on-empty and graceful fallback.
- **skilltree-teacher-ui follows the proven plugin pattern** already shipped by
  `plugins/roadmap-viewer`: client half renders views (browser, `shell.overlay`), host
  half owns a package-private RPC and performs outbound fetches so the browser page
  never needs direct network reach to the services. Red/Amber/Green display values are
  read from M5 (AMBER 0.4, GREEN 0.85) — plugins display only, never re-implement
  mastery math.

## Evidence (code read at `main@49c0ee2ebd` + committed designs)

| # | Claim | Evidence |
|---|---|---|
| 1 | Harness internals: DSH web UI/API :3080 ← host :8104; bwrap sandbox; iptables; plugins bind read-only | File: services/skill-tree-service/README.md · Dòng: 21-24 · Nội dung: `DSH web UI/API :3080 ◄── host :8104`, `bwrap sandbox — agent chạy user node(1000), cap-drop ALL`, `iptables firewall — chặn metadata endpoint + LAN scan`, `plugins/ (bind :ro) — patch.yml = loader entries`; File: services/skill-tree-service/docker-compose.yml · Dòng: 12, 31 |
| 2 | Plugin loader rows: skilltree-brand, mcp-cognee-memory, skills dirs | File: services/skill-tree-service/plugins/patch.yml · Dòng: 25-26, 30-35, 53-56 · Nội dung: `- id: skilltree-brand`; `- id: mcp-cognee-memory` … `url: http://${DEV_HOST}:8021/mcp`; `customSkillDirs: ['/app/plugins/skilltree/skills']` |
| 3 | Planned atomic tools of the business plugin | File: services/skill-tree-service/plugins/skilltree/README.md · Dòng: 1, 10-12 · Nội dung: `plugin nghiệp vụ đồ án (SKELETON, chưa code)`; tool rows `opencase_next_concepts`, `quiz_adaptive`, `cognee_ask` |
| 4 | Brand green #27A95F wired; legacy #4136d6 retired | File: openspec/changes/v1-scope/design.md @ branch agent-v1-bootstrap · Verified baseline + Decision 2 · Nội dung: `skilltree-brand (host-only rebrand, brand green #27A95F)`; `plugins/roadmap-viewer/client.js (M12, legacy): uses an arbitrary indigo palette #4136d6 — this palette is retired by V1` |
| 5 | dsh_web_sdk controls the harness out-of-band (DSH_BASE_URL, DshClient) | File: services/skill-tree-service/sdk/README.md · Dòng: 58, 73 · Nội dung: `export DSH_BASE_URL="http://<host>:<port>"   # URL web UI của server`; `async with DshClient() as client:            # đọc DSH_BASE_URL/DSH_TOKEN` |
| 6 | teacher-ui pattern proven by roadmap-viewer: client `shell.overlay` + host RPC + ctx.web.fetch → service | File: plugins/roadmap-viewer/README.md · Dòng: 23-35, 55 · Nội dung: `browser (shell.overlay entry) … host half (DSH process) … 'roadmap.getGraph' → ctx.web.fetch(M1 /graph) → opencase-service :8101`; `The client half registers one additive shell.overlay entry`; `The host half exposes the package-private RPC … performs the outbound fetch through the Host web service` |
| 7 | Five planned UI plugins (teacher among them), each its own plugin package | File: openspec/changes/v1-scope/design.md @ branch agent-v1-bootstrap · Decision 2 · Nội dung: `skilltree-auth` (login/register, JWT), `skilltree-teacher` (class management, class heatmap, teaching plan, targeted intervention), `skilltree-student`, `skilltree-graph`, `skilltree-notebook` |
| 8 | Mastery Red/Amber/Green read from M5 (AMBER 0.4, GREEN 0.85) | File: services/learner-model-service/app/config.py · Dòng: 14-15 · Nội dung: `MASTERY_GREEN = 0.85`, `MASTERY_AMBER = 0.4`; File: openspec/changes/v1-scope/design.md @ branch agent-v1-bootstrap · Decision 4 · Nội dung: `Plugins display only; they never re-implement mastery math` |
| 9 | rag-service pipeline: upload → parse (latexml) → structure chunk → index → ask; no LLM at ingest; async worker + job states | File: docs/designs/rag-service-design.md @ branch agent-v1-rag-design · §3 · Nội dung: `ingest worker (asyncio, in-process) 1. store raw file (sha256…) 2. parse … 3. structure chunk … 4. mirror … 5. index into SQLite FTS5` |
| 10 | rag retrieval: FTS5 bm25 column weights 8/4/1 + section-path boost + citations; optional answer mode with retry-on-empty | File: docs/designs/rag-service-design.md @ branch agent-v1-rag-design · §6 · Nội dung: `bm25(chunks_fts, 8.0, 4.0, 1.0) — column weights heading=8, path=4, body=1`; `mandatory robustness: retry-on-empty … then fallback to the retrieval payload` |
| 11 | rag storage: docs / sections / chunks / chunks_fts (external content) / jobs | File: docs/designs/rag-service-design.md @ branch agent-v1-rag-design · §4 · Nội dung: `CREATE TABLE docs …`, `CREATE TABLE sections …`, `CREATE VIRTUAL TABLE chunks_fts USING fts5(heading, path, body, content='chunks' …)` |
| 12 | rag API surface: upload 202 job, jobs, documents CRUD, reingest, ask, metrics, health | File: docs/designs/rag-service-design.md @ branch agent-v1-rag-design · §7 · Nội dung: `POST /api/v1/documents/upload … 202 {"jobId","statusUrl"}`, `POST /api/v1/ask …`, `GET /api/v1/metrics` |
