# Tasks — v1-scope

Work is divided across later workflow nodes; each node opens its own OpenSpec
change referencing a requirement here. Tick items as they land on main.

## Bootstrap (this change)

- [x] Initialize `openspec/` (OpenSpec CLI, schema `spec-driven`)
- [x] Write proposal / spec delta (7 requirements) / design / tasks
- [x] `docs/agents/SKILLTREE-CONTRACT.md` (condensed English agent contract)
- [x] `DESIGN.md` (brand palette + mastery colors + type/radius/spacing)

## V1 implementation nodes (each = one OpenSpec change + PR)

- [x] R1 auth: `skilltree-auth` plugin (register/login UI, JWT, first user admin)
- [x] R2 classes: `skilltree-teacher` class management (M6-backed, teacher-scoped)
- [x] R3 roles: role-specific teacher/student experiences in harness plugins
- [x] R4 graph: `skilltree-graph` roadmap dashboard on M1 CASE graph (DESIGN.md tokens)
- [x] R5 rag: `rag-service` (:8109) upload -> latexml parse -> structure chunk -> index -> ask
- [x] R5b ui: `skilltree-notebook` plugin for the student RAG pipeline
- [x] R6 cognee: per-student `student-<candidateId>` dataset ingest + hybrid recall via cognee MCP
- [x] R7 test: pytest green across services + UI e2e smoke with evidence
- [x] R7b deploy: 24h sandbox stack + Cloudflare quick tunnel + experience guide

## Validation gates

- [ ] `openspec validate --all` clean before merge of every change
- [ ] Each service keeps its pytest suite green (run in CI or sandbox before PR)
- [ ] No PAT/token ever committed (check diffs before push)
