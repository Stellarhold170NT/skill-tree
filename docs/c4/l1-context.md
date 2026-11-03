# C4 Level 1 — System Context

> **Level:** [C1 — System Context](https://c4model.com/diagrams/system-context): the
> SkillTree system in its environment — the people who use it and the external systems
> it depends on. Next zoom levels: [`l2-container.md`](l2-container.md),
> [`l3-component.md`](l3-component.md).
> **Syntax:** PlantUML C4 (C4-PlantUML stdlib), one diagram per file (AGENTS.md §5.4).
> Render: run `plantuml -tpng` on the block below, or paste it into
> <https://www.plantuml.com/plantuml>.
> **Ground truth:** drawn from real code at `main@49c0ee2ebd`; every element has an
> evidence row at the bottom. Inside evidence cells the `·` character replaces the
> `|` character so markdown tables stay valid.

```plantuml
@startuml l1-context
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml

title SkillTree Platform — C1 System Context (V1)

Person(teacher, "Teacher (GV)", "Owns classes; authors CASE concept graph, QTI quizzes, assignments; reads class heatmap and teaching plan")
Person(student, "Student (HS)", "Learns: roadmap progress, adaptive quizzes, notebook RAG Q&A over own uploads")
Person(admin, "Admin / Platform owner", "First registered user; operates accounts, roles and deployment")

System(skilltree, "SkillTree Platform", "Graph RAG learning platform: standards-based microservices + DeepSeek-Harness agent UI on :8104 + single REST entry on :8000")

System_Ext(netmind, "NetMind LLM Gateway", "OpenAI-compatible chat completions (MiniMax-M3, GLM-5.3-Flash); embeddings endpoint is blocked")
System_Ext(cogneeMcp, "Cognee MCP Server", "Graph RAG memory (graph + vector) over MCP streamable-http; one dataset per student; currently dev host :8021")

Rel(teacher, skilltree, "Teaches and monitors classes", "HTTPS :8104 (Harness UI)")
Rel(student, skilltree, "Learns and asks questions", "HTTPS :8104 (Harness UI)")
Rel(admin, skilltree, "Registers users, operates deployment", "HTTPS :8104 / :8000")
Rel(skilltree, netmind, "Agent reasoning, practice generation, answer synthesis", "HTTPS chat completions, key via env only")
Rel(skilltree, cogneeMcp, "Per-student memory ingest / ask", "MCP streamable-http :8021")

SHOW_LEGEND()
@enduml
```

## Reading guide

- The single system box is the whole SkillTree deployment; it is decomposed into
  containers in [`l2-container.md`](l2-container.md).
- All human interaction happens through the **DeepSeek Harness web UI** published on
  host port `:8104` (container `:3080`). Programmatic clients either call the
  **api-gateway** on `:8000` or control the harness out-of-band with `dsh_web_sdk`.
- **Cloudflare tunnel** (`cloudflared tunnel --url http://localhost:8104`) is only an
  access channel to the same harness UI — deliberately not a box in this model.
- **NetMind LLM Gateway** is the only LLM path; the API key is injected via
  environment at runtime and must never be committed (`LLM_API_KEY` in
  `.env.example` is a placeholder value, not a real credential).
- **Cognee MCP** is the classroom-memory brain: one isolated dataset per student
  (`student-<candidateId>` naming per the V1 baseline), integrated only through the
  MCP client row already present in the harness `patch.yml`.

## Evidence (code read at `main@49c0ee2ebd`)

| # | Claim | Evidence |
|---|---|---|
| 1 | Harness web UI/API: host :8104 → container :3080; browser + SDK clients | File: services/skill-tree-service/docker-compose.yml · Dòng: 12 · Nội dung: `- "8104:3080"   # Web UI + API (SDK dsh_web_sdk trỏ DSH_BASE_URL vào đây)` |
| 2 | Harness is the main interaction surface (DSH web UI/API ← host :8104) | File: services/skill-tree-service/README.md · Dòng: 21 · Nội dung: `│  ├─ DSH web UI/API :3080   │◄── host :8104  (SDK dsh_web_sdk / browser)` |
| 3 | Roles teacher/student/admin; first registered user becomes admin | File: services/auth-service/README.md · Dòng: 11, 13, 53 · Nội dung: `role ∈ student · teacher · admin maps to access policies`; `the first registered user becomes admin`; `first user = admin` |
| 4 | Single REST entry :8000; prefix routing into upstream `/api/v1` | File: services/api-gateway/app/routes.py · Dòng: 4-5, 84 · Nội dung: `GET /case/documents` → `GET http://opencase:8101/api/v1/documents`; `url = f"{upstream}/api/v1/{rest}"` |
| 5 | NetMind LLM gateway, GLM-5.3-Flash, key via env only | File: .env.example · Dòng: 2-6 · Nội dung: `LLM_PROVIDER=openai`, `LLM_ENDPOINT=https://${LLM_GATEWAY}/gateway/v1`, dòng `LLM_API_KEY=` chỉ là placeholder (giá trị giả), `LLM_MODEL=zai-org/GLM-5.3-Flash` |
| 6 | Cognee MCP wired in harness via MCP client, streamable-http :8021 | File: services/skill-tree-service/plugins/patch.yml · Dòng: 30-35 · Nội dung: `- id: mcp-cognee-memory`, `transport: streamable-http`, `url: http://${DEV_HOST}:8021/mcp` |
| 7 | Per-student dataset convention `student-<candidateId>` | File: openspec/changes/v1-scope/design.md @ branch agent-v1-bootstrap (PR #6) · Decision 3 · Nội dung: `Dataset naming convention: student-<candidateId> (pseudonymous candidateId ...)` |
| 8 | Cloudflare tunnel = remote access channel for the harness UI | File: workspace AGENTS.md · §8.2 · Nội dung: `cloudflared tunnel --url http://localhost:8104 (quick tunnel, không cần account) → trả về URL *.trycloudflare.com trong report` |
