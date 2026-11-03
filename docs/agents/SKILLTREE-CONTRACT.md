# SKILLTREE-CONTRACT — Working contract for every agent on this repo

Condensed English version of the project quality contract (AGENTS.md in the
`workloop-ws` workspace, sections 1, 2, 3, 5.1-5.4, 6, 8). If this file and
AGENTS.md disagree, AGENTS.md wins — then fix this file via an OpenSpec change.

Project: SkillTree — "Applying Graph RAG to track and recommend learners".
Main repo: `Stellarhold170NT/skill-tree` (GitHub). Final approver: project owner.

## 1. V1 scope (feature-complete, not optimized)

Deliver a runnable end-to-end V1 on `skill-tree-service` (M4 DSH harness,
port 8104):

1. Register/login UI — M11 auth-service, JWT HS256, roles teacher/student,
   first registered user = admin.
2. Teacher-scoped class management — individual teacher -> their classes ->
   their students (M6 class-service, OneRoster subset; NOT school-wide SIS).
3. Role-specific interfaces — separate teacher and student experiences inside
   the DeepSeek Harness.
4. Concept-graph dashboard — M1 CASE graph rendered roadmap-style; the
   skilltree plugin is recolored to the standard brand tokens (never the old
   arbitrary palette).
5. Student document RAG pipeline — upload -> parse (latexml M3) -> structure-
   aware chunking -> index -> ask; must be fast (STAIR arxiv 2609.03874v2:
   global ToC structure retrieval, not fixed-length chunking).
6. Cognee pipeline (classroom memory core) — one isolated dataset per student
   keyed `<candidateId>`, time-evolving knowledge, integrated through cognee
   MCP inside skill-tree-service.
7. Dashboard + strict testing — every service pytest green, UI e2e smoke,
   real evidence (screenshots/logs) before any DONE.

### Minimum bar (owner directive)

- Functional parity with the `classroom-memory` reference (`openmemory-v040`:
  class knowledge ingest, per-student memory, hybrid vector+graph recall QA
  via cognee) — organized as the SkillTree architecture (services M1-M11 +
  skill-tree-service harness + plugins + gateway) per project docs 01..06.
- V1 = finish ALL 7 items before polishing. No gold-plating, no
  over-engineering, nothing outside scope; tests just enough to prove main
  behavior.
- Reviewers block ONLY on missing functionality (missing V1 item, broken API,
  fake tests, leaked token). They do NOT block on aesthetics, optimization,
  personal style, or document polish.

Platform principle: **plugin is everything** — new features/UIs for
skill-tree-service are NEW DSH plugins (pattern: atomic tools + SKILL.md +
pre-built lib + patch.yml row), never harness-core edits.

## 2. UI design rule (mandatory)

1. Match the Impeccable gallery, niche `02-kids-reading` (claude-opus-5-5):
   https://impeccable.style/gallery/?model=claude-opus-5-5&niche=02-kids-reading#02-kids-reading
   (offline copy + principles: `workloop-ws/resources/impeccable/`).
2. Anti-slop: self-review against `anti-slop-catalog.md` (62 rules: no
   purple-blue gradients, no decorative glassmorphism, no nested card stacks,
   no Inter-everywhere, WCAG AA contrast, ...). Optional detector:
   `npx impeccable detect`.
3. Colors/tokens ONLY from repo-root `DESIGN.md` (derived from
   `skilltree-brand` + `resources/logo*.svg`). Tone: student side warm and
   encouraging ("feels like a bookshop"); teacher side dense, tables/heatmap
   first.

## 3. Git commit rule (every commit)

Template (configure once):
`printf "<type>: [<code>] <title>\nscopes: <scope>\n\nbreak:\n- \nnew:\n- \nchange:\n- \n" > ~/.gitmessage && git config --global commit.template ~/.gitmessage`

Format:

```
<type>: [<code>] <title>
scopes: <scope>

break:
- (backward-incompatible changes; omit section when empty)
new:
- (new functionality)
change:
- (changes that do not affect existing flows/outputs)
```

- `type`: feat | fix | chore | refactor | docs | style | test | perf | ci | build.
- `code`: Redmine fix `RM-ddddd`; other fixes `FIX-yMMxx`; features `AAA-yMMxx`;
  perf `PERF-yMMxx` where `yMMxx` = last digit of year + month + sequence
  (e.g. 2025-04 #10 -> `50410`). Codes are globally unique across projects.
- Body describes WHAT and WHY, not HOW.
- Legacy-cleanup commits are separate (`chore: [chore-code] clean legacy
  benchmark tree ...`), never mixed with feature commits.
- Git identity: author/committer
  `Nguyen Viet Huy <Stellarhold170NT@users.noreply.github.com>`.

## 4. OpenSpec (mandatory for every change)

Fission-AI OpenSpec — all features/fixes go through the loop:

1. `openspec init` already done at bootstrap (Node >= 22.12). CLI:
   `npm i -g @fission-ai/openspec`.
2. Before coding: create `openspec/changes/<id>/` with `proposal.md`
   (why/what), `specs/<capability>/spec.md` (deltas: `### Requirement:` +
   `#### Scenario:` WHEN/THEN), `design.md` (technical decisions, if any),
   `tasks.md` (checklist).
3. `openspec validate` must be clean before merge; implement by ticking
   `tasks.md`; when done `openspec archive` folds the delta into
   `openspec/specs/`.
4. `openspec/changes/v1-scope/` is the first change — the whole V1 scope.

## 5. Elephant-Goldfish documentation (mandatory)

- Elephant (context-rich node) drafts `concepts_brief.md` / `design_draft.md`
  / module docs; a Goldfish (zero-context subagent) is pointed ONLY at the
  docs + their referenced sources and must find unstated assumptions, vague
  requirements, implementation risks, missing I/O. Fix and repeat (max 2
  rounds). Docs are APPROVED only when the goldfish can follow them.
- EVERY module ships a README with: role, INPUT (contract/API it accepts),
  OUTPUT (what it returns), env variables, how to run + test command,
  dependencies. No standard README = module not done.
- Approved docs live in `docs/designs/`; a final drift-report round compares
  docs vs current code.

## 6. C4 model (mandatory, 3 levels)

After (and while) building, keep exactly one C4 source at `docs/c4/`:

- `l1-context.md` — system in its environment (teacher/student users, Harness,
  external systems).
- `l2-container.md` — services (M1-M11 + rag-service :8109 + skill-tree
  harness + cognee) and their REST/MCP/event links; each service owns its DB.
- `l3-component.md` — internals of key containers (e.g. rag-service: ingest ->
  structure-chunk -> index -> ask; skilltree plugin: tools + client UI).

Mermaid C4 or PlantUML C4, one diagram + short description per file. Whoever
draws C4 MUST read the real code first and reconcile with `services/` and the
docker-compose files.

## 7. Working rules

- Loop: start -> work -> check (fix failures) -> report. DONE requires
  evidence (test logs, screenshots, file paths).
- taskloop status must reflect reality: IN_PROGRESS while working, terminal
  status with report when finished.
- Standards over invention: CASE v1.1 (concept graph), QTI v3.0 (questions),
  Caliper v1.2 (events), LRMI (document metadata), OneRoster v1.2 (rosters) —
  see `docs/MODULES.md` and project doc 04.
- Do not copy ClassroomMemory — reuse ideas only (cognee per-student datasets,
  mastery formulas). V1 mastery is Glicko-2 via learner-model-service (M5).
- Reports to the owner may be Vietnamese; code/READMEs are English.
- **PAT/token safety**: the GitHub token lives only in git remote/API commands.
  NEVER write it into any repo file, report, or log. If a token ever leaks,
  rotate it and notify the owner.

## 8. Deployment & experience (final V1 requirement)

- 24h experience sandbox: full stack (M1-M11 + rag-service + skill-tree
  harness :8104) with ttl 86400, NOT deleted after work — the owner uses it.
- Cloudflare quick tunnel: `cloudflared tunnel --url http://localhost:8104`;
  the final report must include tunnel URL + harness login token + 2-role
  experience guide + sandbox id + remaining TTL.
- LLM gateway: NetMind config from `skilltree-secrets/netmind.json` (baseURL,
  apiKey, models `MiniMax/MiniMax-M3`, `zai-org/GLM-5.3-Flash`) — apiKey is
  injected via env/runtime config only, never written to repo files, reports,
  or logs.
- Harness SDK: `skilltree-skills/dsh-sdk/` is the standard controller
  (auth -> open_session -> submit_prompt -> poll). Smoke/e2e nodes MUST drive
  the real harness through this SDK, not raw HTTP.
