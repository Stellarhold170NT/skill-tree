# skilltree-memory — classroom memory plugin (Cognee per-student datasets)

Host-side DSH plugin of **skill-tree-service (M4)** implementing the V1 classroom
memory requirement (AGENTS.md §1.6, minimum bar §1.1 "memory per student + hybrid
recall via cognee"): it turns learning events into ONE isolated Cognee dataset per
student and answers questions grounded in that student's evolving knowledge.

## Role

```
agent (skill-tree-service harness)
  -> tools memory_ingest / memory_ask / memory_evolve   (this plugin)
  -> Cognee MCP server (HTTP JSON-RPC, streamable-http)  (row `mcp-cognee-memory` in plugins/patch.yml)
  -> per-student datasets:  student-<candidateId>        (candidateId = class-service M6)
```

The plugin itself stores nothing and calls no LLM: chunking / entity extraction /
hybrid vector+graph recall all happen inside the Cognee MCP server.

## Registered model tools (3)

| Tool | INPUT | OUTPUT | Behaviour |
|---|---|---|---|
| `memory_ingest` | `studentId` (fallback), `events` (JSON array string, Caliper v1.2 tuples or plain progress records) and/or `text`, `background?`, `self_improvement?` | `{ ingested: [{dataset, events, result}], unassigned: [{index, reason}] }` | Groups events per student (lib/dataset.js) and ingests ONE document per student dataset. Events with no resolvable student (and no fallback) are returned in `unassigned` — never silently dropped, never ingested into a wrong dataset. |
| `memory_ask` | `studentId` (required), `query` (required), `search_type?` (hybrid\|rag\|graph\|graph_cot\|summaries\|chunks\|code\|temporal), `top_k?` (1–50) | `{ dataset, search_type, answer }` | Hybrid vector+graph recall scoped strictly to `student-<candidateId>` — answers never mix other students' data. |
| `memory_evolve` | `studentId` (required), `events?` (JSON array string since last run) and/or `note?`, `background?` | `{ dataset, events_in_batch, concepts_touched, result, status }` | Periodic knowledge-evolution pipeline: builds a dated progress digest (+ optional note) and re-ingests it with an education-specific extraction prompt (Concept, MasteryLevel, StruggleArea, ReviewEvent), then reports the Cognee pipeline status. Call it on a regular cadence (e.g. after each study session). |

Dataset naming (`lib/dataset.js`, unit-tested): `sanitizeStudentId` lowers the
candidateId and keeps only `[a-z0-9._-]` (everything else becomes `-`, separators
collapsed, 64-char cap) so one student always maps to one stable dataset
(`student-<id>`) and path-ish ids cannot survive (`../../etc` is defanged).

Tool-call example (arguments the agent passes; the Cognee MCP hop is transparent):

```json
{"name": "memory_ingest", "arguments": {"studentId": "hs-demo", "events": "[{\"candidateId\":\"hs-demo\",\"action\":\"mastered\",\"object\":\"loops\",\"timestamp\":\"2026-10-31T09:05:00Z\"}]"}}
{"name": "memory_ask", "arguments": {"studentId": "hs-demo", "query": "em đã nắm khái niệm nào?", "search_type": "hybrid", "top_k": 10}}
```

## INPUT / OUTPUT contract

- **INPUT**: tool arguments only. The plugin reads no files, no DB, no other
  service. `candidateId` values come from the caller (agent), whose source is
  class-service (M6) per the project contract.
- **OUTPUT**: JSON strings rendered as text cards (same convention as
  `${GITEA_REPO_MEMORY}`). Errors throw with a `skilltree-memory`-prefixed message;
  MCP-unreachable / HTTP errors are surfaced verbatim so the agent can retry.

## Environment variables

| Variable | Default | Meaning |
|---|---|---|
| `SKILLTREE_MEMORY_MCP_URL` | `http://${DEV_HOST}:8021/mcp` | Cognee MCP endpoint. Must match the `mcp-cognee-memory` row in `plugins/patch.yml` (single dev server today: cognee-mcp-v2 :8021). |

Plugin row config (patch.yml) overrides in order `config.url` → env → default; `config.clientName` (default `skilltree-memory`) and `config.timeoutMs` (default 120000) are also accepted.

**LLM (NetMind) — NOT configured here, on purpose.** Entity extraction runs
inside the Cognee MCP server, whose LLM gateway is NetMind. The cognee-mcp
deployment loads `baseURL` / `apiKey` / models (`MiniMax/MiniMax-M3`,
`zai-org/GLM-5.3-Flash`) from `skilltree-secrets/netmind.json` **as environment
variables at runtime only**. No key may ever be written into this repo, this
plugin, or any report (AGENTS.md §6.3/§6.8).

## How to run (integration — 2-step rule, never `docker exec`)

1. Source already lives at `services/skill-tree-service/plugins/skilltree-memory/`
   (committed with `lib/` pre-built — plugins installed via git are not built).
2. Row already added to `plugins/patch.yml` **and** `plugins/patch.local.yml`:
   ```yaml
   - id: skilltree-memory
     name: '/app/plugins/skilltree-memory/lib/index.js'   # patch.local.yml: local-only override, not committed
   ```
3. `cd services/skill-tree-service && docker compose restart skill-tree-harness`

**Forbidden**: installing via `dsh plugin add` + `docker exec` (lands in a ghost
`/root/.dsh` tree the runtime never loads) — see service README.

## How to test

```bash
# Unit tests of the grouping/normalization logic (node >= 18, no deps needed):
cd services/skill-tree-service/plugins/skilltree-memory
npm test                      # -> node --test "test/**/*.test.mjs"   (23 passing)

# Syntax check of the host half (@deepseek-ai/dsh-tools resolves only inside the harness image on NODE_PATH):
node --check lib/index.js && node --check lib/dataset.js
```

## Manual verification (real Cognee MCP, on the deployment host)

1. `docker compose restart skill-tree-harness`
2. Boot log shows the plugin registering its tools:
   ```bash
   docker logs skill-tree-harness 2>&1 | grep -E 'skilltree-memory'
   # expect: [skilltree-memory] registering 3 classroom-memory tools over Cognee MCP (http://${DEV_HOST}:8021/mcp)
   #         [skilltree-memory] 3 tools registered (memory_ingest, memory_ask, memory_evolve — datasets student-<candidateId>)
   #         [plugin] skilltree-memory ... loaded
   ```
3. In the harness UI (http://localhost:8104), ask the agent:
   - “memory_ingest các sự kiện học của candidateId=hs-demo: attempted recursion 09:00, mastered loops 09:05” →
     result JSON has `ingested[0].dataset == "student-hs-demo"`.
   - “memory_ask studentId=hs-demo: em đã nắm khái niệm nào?” → `dataset == "student-hs-demo"`, answer cites loops/recursion.
   - “memory_evolve studentId=hs-demo” (sau buổi học) → `status` non-empty.
4. Cross-student isolation: ingest events for a second `candidateId`, then
   `memory_ask` for the first — the answer must not reference the other
   student's events (different cognee datasets).

## Dependencies

- Runtime: `@deepseek-ai/dsh-tools` (provided by the DSH core inside the harness
  image — peer dependency, not bundled), Node ≥ 22 (harness image), reachable
  Cognee MCP server.
- Tests: Node ≥ 18 built-in `node:test` — zero npm dependencies.

## Skills

- `skills/skilltree-memory/SKILL.md` — which tool to call when, dataset conventions and
  verification tips (auto-discovered by the harness, no restart needed).
