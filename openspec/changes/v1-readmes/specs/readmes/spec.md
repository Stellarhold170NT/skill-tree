# v1-readmes — Spec delta

## ADDED Requirements

### Requirement: EGM-standard README for every new V1 module

Every new V1 module (rag-service, harness plugins) SHALL ship a `README.md`
containing: a role paragraph, INPUT (API/event/token received), OUTPUT
(endpoint/UI/file returned), an environment-variable table, a run command, a
test command with the expected result, and dependencies (service + port);
each README SHALL be ≤ 120 lines and SHALL contain at least one real curl or
tool-call example verified against module source.

#### Scenario: rag-service README documents the ingest and ask flows

- **WHEN** a reader opens `services/rag-service/README.md`
- **THEN** it states the port 8109, lists `POST /api/v1/documents/upload`,
  `POST /api/v1/ask`, `GET /api/v1/jobs/{id}`, the env var table
  (`RAG_PORT`…`RAG_LLM_TIMEOUT_S`), run (`uvicorn app.main:app --port 8109`)
  and test (`pytest -q`) commands, latexml (M3) + document-service (M9)
  dependencies, and a curl upload/ask example

#### Scenario: teacher-ui README respects the line limit

- **WHEN** `services/skill-tree-service/plugins/skilltree-teacher-ui/README.md`
  is counted
- **THEN** it has ≤ 120 lines while keeping role/INPUT/OUTPUT/env/run/test/
  dependencies sections and the assign→quiz curl example

#### Scenario: tool plugin README shows a real tool call

- **WHEN** a reader opens `services/skill-tree-service/plugins/skilltree-memory/README.md`
- **THEN** it contains concrete `memory_ingest` / `memory_ask` argument JSON
  whose keys match the tool `inputSchema` in `lib/index.js`

### Requirement: Platform docs reference the new modules

`services/README.md` and `docs/deployment.md` SHALL list `rag-service`
(port 8109) and the V1 harness plugins with their dependencies and ports.

#### Scenario: services README lists rag-service and plugins

- **WHEN** `services/README.md` is read on the branch
- **THEN** the module table contains a `rag-service` row (port 8109) and a
  "SkillTree harness (M4) — V1 plugins" table naming the 5 plugins with their
  feature branches

#### Scenario: deployment guide includes harness section

- **WHEN** `docs/deployment.md` is read on the branch
- **THEN** it contains a `rag-service` row, a health check for :8109, and
  section "11. SkillTree harness (M4, :8104) + plugin V1" with the plugin
  dependency table and the 2-step (no `docker exec`) plugin rule
