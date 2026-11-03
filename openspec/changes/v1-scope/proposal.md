# Proposal: v1-scope — SkillTree V1 End-to-End

## Why

The project needs a demoable, end-to-end V1 of the SkillTree platform ("Applying
Graph RAG to track and recommend learners") running on `skill-tree-service`
(M4 DSH harness, port 8104). The core data services (M1-M11) already exist in
`services/` with pytest coverage, but there is no V1 scope agreement, no design
token source (`DESIGN.md`), and no agent-facing contract document in the repo.
This change bootstraps the V1 effort: it fixes the scope, the locked
architecture decisions, and the working agreements every later change must
follow (OpenSpec loop, EGM documentation, C4 diagrams, commit rule, design
tokens).

## What Changes

- Add `openspec/` (initialized with OpenSpec CLI, schema `spec-driven`) and this
  first change `v1-scope` describing the complete V1 scope as spec deltas.
- Add `docs/agents/SKILLTREE-CONTRACT.md` — the condensed English working
  contract for every agent working on this repo (V1 scope, UI rule, commit
  rule, OpenSpec, EGM, C4, PAT safety).
- Add `DESIGN.md` at repo root — the single source of truth for UI design
  tokens (palette from `skilltree-brand` + `resources/logo*.svg`, mastery
  Red/Amber/Green, type, radius, spacing) with anti-slop rules.

## Scope: the 7 V1 capabilities (from AGENTS.md §1)

1. Register / login UI (M11 auth-service, JWT HS256, roles teacher/student,
   first registered user = admin).
2. Teacher-scoped class management (M6 class-service; individual-teacher scale,
   not school-wide SIS).
3. Role-specific interfaces (separate teacher and student experiences inside
   the DeepSeek Harness).
4. Concept-graph dashboard (M1 CASE graph rendered roadmap-style; skilltree
   plugin re-colored to the standard brand tokens — no arbitrary legacy palette).
5. Student document RAG pipeline (Gemini-Notebook-style: upload -> parse via
   latexml M3 -> structure-aware chunking -> index -> ask; must be fast,
   STAIR-style global ToC structure retrieval instead of fixed-length chunks).
6. Cognee pipeline (classroom memory core): per-student isolated dataset keyed
   by `<candidateId>`, time-evolving knowledge, integrated via cognee MCP in
   skill-tree-service.
7. Dashboard + strict testing (every service pytest green, UI e2e smoke, real
   evidence — screenshots/logs — before DONE).

## Minimum Bar (AGENTS.md §1.1, direct owner directive)

- V1 must reach functional parity with the `classroom-memory` reference
  (`openmemory-v040`: class knowledge ingest, per-student memory, hybrid
  vector+graph recall QA through cognee) — reorganized as the SkillTree
  architecture (services M1-M11 + skill-tree-service harness + plugins +
  gateway) per project docs 01..06.
- V1 is feature-complete, not quality-optimized: no gold-plating, no
  over-engineering, no features outside this scope; tests just enough to prove
  main behavior (no high-coverage demand).
- Reviewers block only on missing functionality (missing V1 item, broken API,
  fake tests, leaked tokens) — not on aesthetics, optimization, or style.

## Impact

- Affected specs: new capability `v1` (this change defines it).
- Affected code: none yet (this change is documentation + process bootstrap);
  later changes implement each requirement above as separate OpenSpec changes.
