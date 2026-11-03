# Task #6 Report — M12 roadmap-viewer-plugin (DeepSeek Harness client plugin)

> **Note:** this file previously held a report from the earlier GraphRAG-benchmark
> project (fine-tune loop + final benchmark). That content remains in git history
> (`git log --follow reports/task-6-report.md`). The skill-tree Task #6 report
> below replaces it per the taskloop contract.

**Status:** DONE_WITH_CONCERNS (code complete + merged; live demo awaiting user approval in the Harness UI)

## What was built

`plugins/roadmap-viewer/` — the M12 client plugin for the DeepSeek Harness, rendering
the M1 concept graph as a roadmap.sh-style learning path:

- **Client half** (`client.js`): one additive `shell.overlay` entry — floating
  "🗺 Roadmap" button + slide-over panel (React via `React.createElement`, no JSX).
  Renders the graph as a **topological spine** (Kahn's algorithm over
  `isPrerequisiteOf`), with per-node state: `done` (checkbox → localStorage progress),
  `next` (prerequisites satisfied, highlighted with unlock count) and `locked`
  (prerequisites pending). Graceful degraded states for wrong id / backend down.
- **Host half** (`host.js`): package-private RPC `roadmap.getGraph` → outbound fetch
  through the Host `web` service (`ctx.get('web').fetch`) with defensive result
  normalization — the browser never needs direct network reach to the services.
- All side effects (CSS via `styles.insert`, RPC via `harness.handle`, overlay entry
  via `ctx.slots.inject` + `ctx.slots.register`) belong to the plugin fiber: stop or
  update removes everything cleanly.

## Live demo (Cordis)

- Defined as dynamic plugin **rmv-1**, package **pkg-1** ("Roadmap Viewer"),
  both halves present, `node --check` clean on both sources.
- `cordis_run` returned **awaiting user approval (run-1)** — the activation sits in
  the Harness UI until the user allows it (single ✓ = this version, double ✓ =
  auto-approve future versions). Nothing further can be done from the agent side;
  the plugin activates the moment it is approved.

## Commits

- `feat(m12): add roadmap-viewer plugin (Harness client plugin for M1 graph)` —
  `plugins/roadmap-viewer/{README.md, host.js, client.js}` (fast-forward merged to
  main via the GitHub Git Data API; author
  `Nguyễn Việt Huy <Stellarhold170NT@users.noreply.github.com>`).

## Verification

- `node --check` on both JS halves (plain JS, no imports/JSX/TS).
- `cordis_inspect_self(rmv-1)` shows package pkg-1 with Host+Client halves defined
  and state `awaiting-approval` (pendingApproval run-1 / pkg-1 / mode run).
- Slot contract verified against the shipped sources: `shell.overlay` is a list slot
  (`replaceRisk: none`, additive, click-through until opted in) with registration
  `{id, order?, label?}` — the documented surface for plugin UI.

## Concerns

- Live rendering awaits the user's approval of run-1 in the UI (out of agent
  control); the panel will show a helpful error card until the M1 stack is running
  (`docker compose -f deploy/docker-compose.yml up -d`).
- Progress is a browser-local MVP (localStorage); switching to M5 mastery states is
  the documented next step (see README "Integration roadmap").
- Standing reminder: rotate the GitHub PAT used for push/merge.
