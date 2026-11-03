# Proposal: v1-readmes — Standardize module READMEs (EGM §5.3)

## Why

AGENTS.md §5.3 makes an EGM-standard README mandatory for every module
(role, INPUT, OUTPUT, env vars, run command, test command + expectation,
dependencies — service + port). Seven new V1 modules landed on feature
branches with uneven README quality; `services/README.md` and
`docs/deployment.md` (main) do not mention `rag-service` (8109) or any
harness plugin. Without this change the drift-report gate cannot verify
docs ↔ code consistency for the V1 release.

## What

- Standardize/complete `README.md` for the new modules (≤ 120 lines each,
  real curl/tool examples verified against module source):
  - `services/rag-service/README.md` (+ curl upload/ask/job examples)
  - `services/skill-tree-service/plugins/skilltree-memory/README.md` (+ tool-call JSON example)
  - `services/skill-tree-service/plugins/skilltree-auth-ui/README.md` (+ curl login example)
  - `services/skill-tree-service/plugins/skilltree-class-ui/README.md` (+ curl create-class example)
  - `services/skill-tree-service/plugins/skilltree-teacher-ui/README.md` (compressed 171 → 120 lines, + curl assign/quiz example)
  - `plugins/skilltree-graph-dashboard/README.md` (+ host-RPC JSON example)
- Update `services/README.md`: `rag-service` row (8109) + "SkillTree harness
  (M4) — V1 plugins" table (5 plugins, branch provenance).
- Update `docs/deployment.md`: `rag-service` row + health check + new §11
  "SkillTree harness (M4, :8104) + plugin V1".
- Update `services/skill-tree-service/README.md`: plugin rows in the folder table.

## Impact

**Affected**: documentation only — no code, no runtime behavior, no API change.
**Conflict note**: this branch is cut from `main` per task brief; module dirs do
not exist on `main` yet, so module READMEs are add/add-conflicting with the
feature PRs (resolve by taking this standardized version — it is a superset:
branch content + examples + line-limit compliance).
**Out of scope**: `skilltree-student-ui` — no branch/PR in the repo contains it
(verified `git ls-tree -r` across all 13 remote branches on 2026-10-31); no
README is invented for a nonexistent module. It must be documented when its
implementation branch lands.
