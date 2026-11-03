# Tasks: add-skilltree-student-ui

## 1. Plugin skeleton

- [x] 1.1 Create `services/skill-tree-service/plugins/skilltree-student-ui/package.json` (dsh client platform web, inject `@deepseek-ai/dsh-client-ui-slots`, exports `.` → `lib/index.js`, `./client` → `client/client.js`)
- [x] 1.2 Host half `lib/index.js`: routes config / batch / quiz-submit / mastery-update / rag-upload / rag-ask with validation + JWT forwarding
- [x] 1.3 Client half `client/client.js`: `shell.overlay` order 57, FAB + 4 tabs, DESIGN.md tokens, anti-slop rules

## 2. Verification (TDD)

- [x] 2.1 `tests/smoke.mjs` — 19 checks: config, batch fan-out + JWT, prefix/path guards, quiz/mastery/ask shapes + invalid inputs, multipart passthrough, 413 cap, cross-origin 403, GET→405, dead-gateway 502, builder units (ALL PASS)
- [x] 2.2 `tests/client.mjs` — 24 checks: pure helpers (linearize/nodeState/builders/citation/progress) + behavior flows C8–C11 (overview batch, quiz submit → M2+M5 bodies, ask citations, upload FormData + polling to ready) (ALL PASS)
- [x] 2.3 `node --check` clean on `lib/index.js`, `client/client.js`, both test files

## 3. Documentation

- [x] 3.1 `README.md` (EGM: role, INPUT, OUTPUT, env vars, wiring, run/test, dependencies, V1 limitations)

## 4. Wiring

- [x] 4.1 Add bare-name row to `plugins/patch.yml` (docker)
- [x] 4.2 Add bare-name row to `plugins/patch.local.yml` (local Windows run)

## 5. Delivery

- [x] 5.1 Commit on branch `agent-v1-student-ui` (feat: [STUD-61007], scopes: skill-tree-service,plugins)
- [x] 5.2 Push branch + open PR against main
- [x] 5.3 Task report with evidence at `reports/c_student_ui--ec90537a.md`
