# Design — v1-scope (locked architecture decisions)

Status: decisions here are the V1 baseline. Later changes may amend them only
through a new OpenSpec change.

## Verified code baseline (2026-10-31, main 49c0ee2)

- `deploy/docker-compose.yml` brings up 10 services: opencase :8101, quiz
  :8102, class :8103, analytics :8104, learner-model :8105, assignment :8106,
  document :8107, latexml :8110, api-gateway :8000, auth :8108. It does NOT
  contain the harness or any rag-service.
- `services/skill-tree-service/docker-compose.yml` runs the `skill-tree-harness`
  container (DSH web), host 8104 -> container 3080. So port 8104 is used by the
  harness stack while analytics-service also listens on 8104 inside the
  `deploy/` stack (two separate compose stacks, no host-port clash when run on
  different hosts/contexts).
- `services/skill-tree-service/plugins/patch.yml` already wires: `skilltree-brand`
  (host-only rebrand, brand green #27A95F), `mcp-cognee-memory` (MCP client,
  streamable-http to a cognee-mcp-v2 server), core dsh tools, and the
  `skilltree` plugin skeleton (currently README-only placeholder).
- `services/learner-model-service/app/config.py`: `MASTERY_GREEN = 0.85`,
  `MASTERY_AMBER = 0.4` (Glicko-2 based; green=0.85 comment in source).
- `plugins/roadmap-viewer/client.js` (M12, legacy): uses an arbitrary indigo
  palette `#4136d6` — this palette is retired by V1; new UIs follow DESIGN.md.

## Decision 1 — rag-service is a new, separate service on port 8109

The student document pipeline (V1 item 5) gets its own FastAPI service
`services/rag-service/`, port 8109, added to `deploy/docker-compose.yml`.

Why separate from document-service (M3, :8107): M3 owns LRMI catalog, file
store, chunks and alignments (settled contract); the RAG pipeline owns
embedding/index/ask with its own storage and its own tuning knobs (chunking,
retrieval hops, prompt templates — see project doc 03 hyperparameters). Merging
them would couple two change rhythms. URI linkage stays: rag-service references
M3 documents/chunks by identifier, never cross-database.

Pipeline: upload -> parse (latexml M3) -> structure-aware chunking (ToC /
heading tree; STAIR arxiv 2609.03874v2 global-structure retrieval instead of
fixed-length sliding windows) -> index (vector + full-text) -> ask.
Performance is a requirement: retrieval must use global ToC structure signals.

## Decision 2 — five separate UI plugins (no monolith)

Each V1 UI capability is its own DSH plugin package under
`services/skill-tree-service/plugins/<name>/` with its own `patch.yml` row
(pattern per `plugins/README.md` and the `vai-skilltree` reference: atomic
tools + SKILL.md + pre-built lib + patch.yml; no harness-core edits):

| Plugin | V1 item | Owns |
|---|---|---|
| `skilltree-auth` | 1 | login/register cards, JWT handling, first-user=admin flow |
| `skilltree-teacher` | 2, 3 | class management, class heatmap, teaching plan, targeted intervention |
| `skilltree-student` | 3 | student workspace: my roadmap, next concept, practice entry |
| `skilltree-graph` | 4 | roadmap-style CASE graph dashboard (successor to roadmap-viewer, DESIGN.md tokens) |
| `skilltree-notebook` | 5 | student notebook: upload/parse/ask over rag-service :8109 |

Shared look & feel comes only from `skilltree-brand` (already installed) +
`DESIGN.md` tokens; plugins MUST NOT hardcode colors outside DESIGN.md.

## Decision 3 — Cognee per-student datasets, via MCP

Cognee is integrated only through the cognee MCP server already wired in
`patch.yml` (`mcp-cognee-memory`). Dataset naming convention:
`student-<candidateId>` (pseudonymous `candidateId` per OneRoster/`GLOSSARY.md`
rules — no personal data in behavior-layer datasets). Per-student ingest
(learning profile, mastery snapshots, practice traces) and hybrid vector+graph
recall run against only that dataset. This matches the `classroom-memory`
reference capability (`openmemory-v040`) reorganized into the SkillTree
service layout (AGENTS.md §1.1 minimum bar).

## Decision 4 — mastery states read from M5

Red/Amber/Green status comes from learner-model-service (M5) thresholds
(AMBER 0.4, GREEN 0.85, Glicko-2 + Ebbinghaus rusty). Plugins display only;
they never re-implement mastery math.

## Decision 5 — auth flow

api-gateway (M10, :8000) is the single entry point; auth-service (M11, :8108)
issues/verifies JWT HS256 with roles teacher/student (first user = admin).
Harness plugins attach the JWT to service calls; role checks happen in
services + plugin UI gating.

## Non-goals for V1

Glicko-2 tuning beyond current M5 implementation, IRT, scale-out, notification
service, school-wide SIS features, deep quality polish (AGENTS.md §1.1).
