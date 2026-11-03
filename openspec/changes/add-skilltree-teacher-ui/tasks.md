# Tasks: add-skilltree-teacher-ui


## 1. Plugin package


- [x] 1.1 `package.json` — name `skilltree-teacher-ui`, `main: lib/index.js`,
      `dsh.client` platform web, exports `./lib` + `./client`
- [x] 1.2 Host half `lib/index.js` — `config` route, GET-only `batch` fan-out
      (prefix allow-list class/learner/case/events, path+query regex, max 8 calls,
      parallel, per-call result envelope), `assign` + `quiz` M7 routes with
      contract validation, `ask` Class Ask core (live M5 fetch + deterministic
      answerer), same-origin / 16 KiB / 405 / 502 discipline, verbatim
      Authorization forwarding, `SKILLTREE_GATEWAY_URL` + per-call `__baseUrl`
- [x] 1.3 Client half `client/client.js` — `shell.overlay` "📊 Bảng GV" entry,
      settings persistence (`skilltree.teacherui.settings`), JWT read
      (`skilltree.auth.v1`), dashboard batch, RAG heatmap table with legend,
      teaching-plan table + assign form + M2 quiz generation, per-student
      drill-down (mastery / next / events), Class Ask box, degraded-gateway
      banner, DESIGN.md tokens + anti-slop inline styles
- [x] 1.4 `README.md` — role, architecture diagram, INPUT/OUTPUT contract, Class
      Ask V1 note, env vars, design tokens, load steps, test commands, dependencies


## 2. Harness wiring


- [x] 2.1 `plugins/patch.yml` — loader row `- id: skilltree-teacher-ui` (bare
      name, Settings tab composes the client half)
- [x] 2.2 `plugins/patch.local.yml` — same row with the Windows path (2 files kept
      in sync per the loader rule)


## 3. Tests


- [x] 3.1 `tests/smoke.mjs` — 29 checks: config, batch passthrough (wire paths +
      token), allow-list + traversal rejection, assign/quiz contracts (body,
      token, `__baseUrl` stripping, invalid inputs), Class Ask on live-shaped
      fixtures (green intent answer + evidence + source), transport discipline
      (403/405/oversize/dead-gateway), pure units (normalizeText, matchConcept,
      answerClassAsk intents)
- [x] 3.2 `tests/client.mjs` — 29 checks: pure helpers (stateChip AA pairs,
      conceptShort, batch builders), dashboard load (batch shape + Authorization
      header), heatmap/plan render, drill-down batch + render, assign → M7
      contract → quiz, Class Ask, settings persistence, degraded banner
- [x] 3.3 `node --check` on both halves + both test files (clean)
- [x] 3.4 Run `node tests/smoke.mjs` → ALL SMOKE CHECKS PASSED (output captured
      in the task report)
- [x] 3.5 Run `node tests/client.mjs` → ALL CLIENT CHECKS PASSED (output captured
      in the task report)


## 4. OpenSpec + commit


- [x] 4.1 `openspec/changes/add-skilltree-teacher-ui/` — proposal.md, design.md
      (D1–D5 decisions), specs/teacher-ui/spec.md (6 requirements + 10 scenarios),
      tasks.md
- [x] 4.2 Commit `feat: [TEAC-61006] add skilltree-teacher-ui plugin (teacher
      dashboard: heatmap, teaching plan, targeted assignment, drill-down, class ask)`
      with scopes + break/new/change body, author Nguyễn Việt Huy
- [x] 4.3 Push branch `agent-v1-teacher-ui` + open PR into `main`
