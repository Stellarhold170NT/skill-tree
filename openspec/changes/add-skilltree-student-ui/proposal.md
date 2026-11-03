# Proposal: add-skilltree-student-ui

## Why

V1 requires a student-facing interface (AGENTS.md §1.3 "Giao diện phân vai —
riêng cho giáo viên và riêng cho học sinh"). Today the harness has auth-ui
(login), class-ui/teacher-ui (teacher side) and graph-dashboard, but a student
logging in has no surface: they cannot see their classes, their learning path,
their uploaded study material, or take a quick check that updates their mastery.

## What Changes

- **ADD** plugin `skilltree-student-ui` under
  `services/skill-tree-service/plugins/skilltree-student-ui/`:
  - host half (`lib/index.js`): 6 same-origin proxy routes
    (`config`, `batch`, `quiz-submit`, `mastery-update`, `rag-upload`,
    `rag-ask`) with allow-listed prefixes, JWT forwarding, payload validation,
    upload size cap and timeout;
  - client half (`client/client.js`): `shell.overlay` entry order 57 — FAB
    "🎒 Học sinh" + 4 single-purpose tabs (Tổng quan / Tài liệu / Kiểm tra
    nhanh / Cài đặt) using DESIGN.md brand tokens and the anti-slop catalog;
  - tests: `tests/smoke.mjs` (19 checks, host half) and `tests/client.mjs`
    (24 checks, client half in a fake browser) — dependency-free;
  - `README.md` per EGM (role / INPUT / OUTPUT / env / run / deps).
- **ADD** loader rows in `plugins/patch.yml` + `plugins/patch.local.yml`
  (bare-name pattern, both files kept in sync).

## Impact

- Affected specs: `student-ui` (new capability spec).
- Affected code: `services/skill-tree-service/plugins/**` (new plugin + 2 wiring
  files). No service core, no harness core, no existing plugin is modified.
- Runtime dependencies (already in V1 scope): auth-ui JWT, gateway M10 with
  M1/M2/M5/M6 upstreams, rag-service for the Tài liệu tab.
