# skilltree-graph-dashboard

DeepSeek Harness **plugin** (host + client halves) — the main concept-graph
dashboard of SkillTree V1: pick a subject, read its CASE concept graph as a
vertical spine, and click any concept for its detail, related materials and the
student's memory strength.

## Role (one sentence)

Turn the M1 (opencase) concept graph into a readable dashboard that joins three
services on one screen: graph structure (M1), aligned documents (M9) and mastery
(M5).

## INPUT (what it consumes)

| Source | Endpoint (called from the Host half) | Used for |
|---|---|---|
| M1 opencase-service `:8101` | `GET /api/v1/documents?limit=200` | subject picker (CFDocument `id` + `identifier` + `title`) |
| M1 opencase-service `:8101` | `GET /api/v1/documents/{id}/graph` | nodes/edges (`identifier`, `fullStatement`, `humanCodingScheme`; edges `isPrerequisiteOf` via `sourceIdentifier`/`targetIdentifier`) |
| M9 document-service `:8107` | `GET /api/v1/documents?limit=200` → `GET /api/v1/documents/{m9Id}/chunks` | chunks + LRMI `alignments[].conceptUri` → related materials per concept |
| M5 learner-model-service `:8105` | `GET /api/v1/students/{id}/mastery[?asOf=]` | `MasteryRead`: `mastery`, `state` (`green|amber|red|rusty`), `rating`, `ratingDeviation`, `reviewCount` |

**M1↔M9 join key**: document-service links its rows to M1 through
`Document.documentUri` (the M1 `CFDocument.identifier`) — the two services keep
separate primary keys. `skilltree.getMaterials` therefore resolves the M9 row by
`documentUri` first and falls back to the raw `documentId` when the caller
already holds an M9 id. (Verified against `services/document-service/app/models.py`
line 26 and `service.get_document`, which looks up by M9 id only.)

The browser never talks to services directly: it calls package-private RPCs and
the Host half performs the outbound fetch through the Host `web` service.

### RPC contract (POST same-origin route → { ok, data } | { ok, error })

- `skilltree.listSubjects { baseUrl }`
- `skilltree.getGraph { baseUrl, documentId }`
- `skilltree.getMaterials { baseUrl, documentId, documentUri? }`
- `skilltree.getMastery { baseUrl, studentId, asOf? }`

Example (client half → host RPC; the host half does the outbound fetch):

```json
{"method": "skilltree.getGraph", "args": {"baseUrl": "http://localhost:8101", "documentId": "<m1-document-id>"}}
```

## OUTPUT (what it renders)

- Floating `shell.overlay` entry (order 51, additive — never shadows shipped UI):
  "🌳 Dashboard" button + slide-over panel.
- Vertical spine of concepts in Kahn topological order (dependency-valid).
- Per-node state:
  - with M5 mastery: `green` / `amber` / `red` / `rusty` (dot + AA chip), mastery %;
  - without a student id: structural `next` (no prerequisites) / `locked`.
- Click a node → detail card: full statement, coding scheme, prerequisites,
  unlock count, M5 block (mastery %, Glicko rating ± RD, review count) and
  related M9 chunks (alignment type + text excerpt).
- Graceful degraded states: M9/M5 failures never blank the graph (soft deps);
  M1 failures show an explanatory error with the compose hint.

## Environment / configuration

No env vars. Service base URLs default to `http://localhost:8101|8107|8105` and
are editable in the panel ("Nâng cao" section). When running through the
gateway, point them at `http://localhost:8000` routes as configured.

## Design tokens

All colors/typography/radii come from `DESIGN.md` (`--st-*` variables, declared
on `.gd-root`; branch `agent-v1-bootstrap` / PR #6). No colors outside the
system. Mastery pairs follow the AA table in DESIGN.md §2.

## How to run (load into the Harness)

```text
1. cordis_define  → new plugin, idPrefix "stgd",
                    code.host   = lib/index.js body,
                    code.client = client/client.js body (plain JS, React.createElement)
2. cordis_run     → approve the run card in the UI
3. Click "🌳 Dashboard" → pick a subject → "Tải dashboard" → click a node.
```

## How to test

```bash
node --check lib/index.js     # syntax
node --check client/client.js   # syntax
node smoke.cjs            # pure-logic + token checks (no harness needed)
```

`smoke.cjs` verifies: topological order + prereq/unlock maps, mastery indexing,
display-state mapping (M5 states vs structural fallback), materials filtering by
`conceptUri`, token purity (no legacy `#4136d6`, `--st-*` present), that the
host half wires all four RPC names **and resolves the M9 document by
`documentUri`** (M1↔M9 join key), and that the client passes the selected
subject identifier through.

## Dependencies

- Pattern reference: `plugins/roadmap-viewer/` (same host RPC + overlay panel
  structure; this plugin adds subject picking, node detail and service joins).
- DESIGN.md (repo root, branch `agent-v1-bootstrap`) — token source of truth.
- Backend services M1/M9/M5 running (see `deploy/docker-compose.yml`).
