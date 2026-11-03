# Design — v1-readmes

## D1. Single branch from main (per task brief)

Branch `agent-v1-readmes` is cut from `main @ 49c0ee2e` (per brief
`briefs/d_readmes--ec90537a.md`). Module sources live on feature branches
(`agent-v1-rag-service`, `agent-v1-cognee-plugin`, `agent-v1-auth-ui`,
`agent-v1-class-ui`, `agent-v1-teacher-ui`, `agent-v1-graph`); this change
only carries READMEs + shared docs, never module code. Consequence: add/add
README conflicts with feature PRs are expected and intentional — the
standardized README (branch content + verified examples + ≤120-line limit)
is the version to keep.

## D2. README standard checked per module (EGM §5.3 + brief)

Checklist applied to every README: role paragraph · INPUT (API/event/token) ·
OUTPUT (endpoint/UI/file) · env var table · run command · test command with
expected result · dependencies (service + port) · ≤ 120 lines · at least one
real curl or tool-call example. Examples were verified against module source
(routes.py / lib/index.js) and platform contracts (gateway `UPSTREAMS`,
M6 `ClassCreate` camelCase schema), not invented.

## D3. Compression, not deletion (teacher-ui)

`skilltree-teacher-ui` README was 171 lines with all sections present. It was
compressed to 120 by tightening prose and merging the ASCII architecture
diagram; every section and the test expectations (29 + 29 checks) were kept.

## D4. skilltree-student-ui excluded — truth over brief

The brief lists 7 modules; `skilltree-student-ui` does not exist in any of the
13 remote branches or open PRs (checked 2026-10-31). Writing its README would
mean inventing endpoints. Decision: skip it, record the gap in the report and
in `services/README.md` provenance (branch column) so the follow-up node can
amend it.

## D5. Docs additions are additive

`services/README.md`, `docs/deployment.md`, `services/skill-tree-service/README.md`
only gain rows/sections; no existing line is rewritten, so merge conflicts with
the bootstrap/hygiene PRs are limited to adjacent-line context.
