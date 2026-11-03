# Tasks — v1-cognee-plugin (skilltree-memory)

## 1. Plugin source (`services/skill-tree-service/plugins/skilltree-memory/`)

- [x] 1.1 `package.json` — `main: lib/index.js`, exports, npm test script
- [x] 1.2 `lib/dataset.js` — pure logic: sanitize/dataset naming, event field
      aliases, `groupEventsByStudent` (+ `unassigned` bucket), deterministic
      `eventsToDocument`, `summarizeEvents`, `buildEvolutionDocument`
- [x] 1.3 `lib/index.js` — host plugin: MCP JSON-RPC client (streamable-http,
      re-init retry) + 3 tools `memory_ingest` / `memory_ask` / `memory_evolve`
- [x] 1.4 `skills/skilltree-memory/SKILL.md` — when-to-use guide cho agent
- [x] 1.5 `README.md` chuẩn EGM (role, INPUT/OUTPUT, env, run, test, verify, deps)

## 2. Tests

- [x] 2.1 `test/dataset.test.mjs` — 23 node:test unit tests cho logic gom nhóm
      dataset (sanitize, isolation, aliases, grouping + fallback + unassigned,
      deterministic document, digest, evolution document)
- [x] 2.2 Chạy thật: `npm test` → 23/23 pass (node v24.22.1)
- [x] 2.3 `node --check lib/index.js lib/dataset.js` → sạch

## 3. Harness wiring (2-step rule)

- [x] 3.1 Row `- id: skilltree-memory` trong `plugins/patch.yml`
- [x] 3.2 Row đồng bộ trong `plugins/patch.local.yml` (path Windows)
- [x] 3.3 Không cài qua `docker exec` (README nhắc lại cấm)
- [x] 3.4 README service: bảng thư mục + hợp đồng cognee có tên plugin

## 4. Secrets

- [x] 4.1 Không key nào trong plugin/README/report; LLM NetMind chỉ qua env ở
      server Cognee (ghi rõ trong README + design.md)

## 5. Verification handoff

- [x] 5.1 Hướng dẫn verify thủ công trong README (restart compose → grep log →
      3 tool demo → isolation check giữa 2 học sinh)
- [ ] 5.2 (Sau merge/deploy) chạy demo 3 tool trên harness thật :8104 — để lại
      cho node deploy/smoke vì sandbox của task này không chạy được docker stack
      cognee thật (broker sự cố, xem report task)
