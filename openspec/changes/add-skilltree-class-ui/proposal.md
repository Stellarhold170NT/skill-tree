# Proposal — add-skilltree-class-ui

## Why

V1 goal #2 (AGENTS.md) requires personal teacher class management: a teacher
manages **their own** classes and their students, with class-service (M6,
OneRoster v1.2 subset) as the catalog source of truth. OpenSpec `v1-scope`
requirement R2 ("Teacher-Scoped Class Management") has no implementation yet —
there is no UI anywhere in the platform for a teacher to create a class or
enroll the anonymous student identities M6 mints.

## What

New DSH plugin `skilltree-class-ui` (teacher-facing UI in the M4 harness):

- `shell.overlay` entry: floating "🏫 Lớp học" button + management panel.
- Class list with course/term/head-count; create class; **edit class metadata
  (title / term) via `PATCH /api/v1/classes/{id}`**; delete class.
- Class detail: roster table (display name, email, `candidateId`/`sourcedId`),
  enroll an existing anonymous student (lookup + filter), create-and-enroll a
  new anonymous student, un-enroll a student.
- All M6 traffic forwarded through api-gateway (M10) `/class/{rest}` mapping by
  a host-half same-origin route `POST /classui/proxy`; optional teacher JWT
  (from auth-ui / M11) attached as `Authorization: Bearer` per request.

The class-edit endpoint itself (`PATCH /api/v1/classes/{id}`) is **part of this
change**: M6 previously exposed no update verb for classes (verified in
`routes.py` at the time), so this change adds it to M6 (schema + route +
tests) and wires the panel to it. The proxy whitelist gains `PATCH` (JSON
object body, same rules as `POST`).

Non-goals (tracked as gaps): per-teacher scoping (M6 has no teacher-scoped
tokens yet — single-teacher deployment assumption of V1, see M6 README
roadmap).

## Impact

- Plugin files under `services/skill-tree-service/plugins/skilltree-class-ui/`
  + one registration row in `plugins/patch.yml` + one client-bundle symlink
  line in `entrypoint.sh` (same pattern as the `secret` plugin).
- class-service (M6): new `ClassUpdate` schema, new `PATCH /classes/{id}`
  route, new tests — additive, no API break (existing responses unchanged).
- No new dependencies.
