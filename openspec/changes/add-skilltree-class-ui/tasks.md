# Tasks — add-skilltree-class-ui

- [x] Study M6 API surface from source (`services/class-service/app/routes.py`,
      `schemas.py`, README) and M10 gateway mapping (`/class/{rest}` → `/api/v1/{rest}`)
- [x] Plugin skeleton: `package.json` (dsh.client.platform web, exports client)
- [x] Host half `lib/index.js`: `/classui/proxy` route (validation, same-origin,
      token attach, error-envelope normalization)
- [x] Client half `client/client.js`: overlay FAB + panel (class list, create,
      detail, roster, enroll/lookup, create-and-enroll, un-enroll, delete)
- [x] DESIGN.md tokens only; anti-slop self-review (no gradients/glass/nested
      cards; AA contrast; no motion slop)
- [x] `patch.yml` registration row + `entrypoint.sh` client-bundle symlink
- [x] README.md (role/INPUT/OUTPUT/env/run/test/deps + known gaps)
- [x] OpenSpec change (proposal/design/tasks/spec delta)
- [x] Syntax gates: `node --check` both halves
- [x] End-to-end smoke committed as
      `plugins/skilltree-class-ui/tests/smoke.mjs` (real M6 :8103 + gateway
      shim :8000 + real `apply()` handler) — 25/25 checks passed
      (create/**edit via PATCH**/enroll/duplicate 409/roster/un-enroll/delete/
      token attach/upstream-down/cross-origin/unsupported-method/path-traversal)
- [x] Resolve prior-run concerns: add class EDIT — M6 `ClassUpdate` schema +
      `PATCH /classes/{id}` route (TDD: 4 new pytest cases RED→GREEN, suite
      18/18), proxy whitelist + JSON body for `PATCH`, panel edit form
      (title/term) wired to the endpoint, READMEs + this delta updated
- [x] `openspec validate` — clean (`✓ change/add-skilltree-class-ui`, 1 passed,
      0 failed; OpenSpec CLI 1.16.0, Node v22.14.0)
- [ ] Archive change after merge
