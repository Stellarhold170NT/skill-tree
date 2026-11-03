# roadmap-viewer (M12)

DeepSeek Harness **client plugin** that renders the M1 (opencase) concept graph as a
[roadmap.sh](https://roadmap.sh)-style learning path — the visual front end of the
platform.

## What it shows

- **Linear spine** — the concept graph's topological order (Kahn's algorithm over
  `isPrerequisiteOf` edges), so the path is always a dependency-valid sequence.
- **Progress state per node** — `done` (checkbox, green), `next` (all prerequisites
  done, purple highlight + "N khái niệm sẽ mở khóa"), `locked` (dimmed). Progress is
  stored per-document in the browser (`localStorage`) as a lightweight MVP; the
  learner-model-service (M5) mastery states replace it in the roadmap below.
- **Unlock value** — each node shows how many downstream concepts it unlocks
  (the same signal M5 uses to rank recommendations).
- Graceful degraded states: wrong id / backend down → an explanatory error card with
  the exact compose command to start the stack.

## Architecture

```
browser (shell.overlay entry)                host half (DSH process)
┌──────────────────────────────┐   RPC    ┌─────────────────────────────┐
│ Panel (React.createElement)  │ ───────▶ │ harness.handle              │
│ topological spine + states   │          │ 'roadmap.getGraph'          │
└──────────────────────────────┘          │  → ctx.web.fetch(M1 /graph) │
                                          └────────────┬────────────────┘
                                                       ▼
                                          opencase-service :8101 (M1)
```

- The **client half** registers one additive `shell.overlay` entry (floating
  "🗺 Roadmap" button + slide-over panel) — it never shadows shipped UI.
- The **host half** exposes the package-private RPC `roadmap.getGraph` and performs
  the outbound fetch through the Host `web` service, so the page never needs direct
  network reach to the services (firewall/proxy friendly).
- Both halves own their side effects through `ctx.effect` / `ctx.slots.inject`, so
  stop/update/remove of the plugin leaves zero residue (CSS, RPC, overlay entry).

## Loading it into the Harness

```text
1. cordis_define  → new plugin, idPrefix "rmv", code.host = lib/index.js body,
                    code.client = client/client.js body (plain JS, React.createElement)
2. cordis_run     → approve the run card in the UI (single ✓ = this version,
                    double ✓ = auto-approve future versions)
3. Click the floating "🗺 Roadmap" button → enter M1 base URL + documentId → Load.
```

## Files

| File | Role |
|---|---|
| `lib/index.js` | Host half: `roadmap.getGraph` RPC → `ctx.web.fetch` → normalized JSON |
| `client/client.js` | Client half: overlay entry, panel, topological linearization, progress |
| `README.md` | This document |

## Integration roadmap

- Progress from **M5** mastery (`GET /api/v1/students/{sourcedId}/mastery`) instead
  of local checkboxes: green/amber/red/rusty per concept, `?asOf=` replay.
- "Next up" callout from M5's frontier recommendation (`GET /students/{id}/next`).
- Auth via M11 token (gateway forwards `Authorization`), served through the
  api-gateway (M10) instead of direct service URLs.
