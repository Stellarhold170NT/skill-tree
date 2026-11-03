# Design: add-skilltree-student-ui

## Context

SkillTree V1 runs as DSH plugins on skill-tree-service (M4). Existing UI
plugins (auth-ui, class-ui, teacher-ui, graph-dashboard) established the
pattern: host half registers `webServer` routes; client half registers a
`shell.overlay` slot entry; both halves ship as one plugin loaded via
`patch.yml`. Slot orders in use: roadmap-viewer 50, graph-dashboard 51,
class-ui 55, teacher-ui 56, auth-ui 65 → student-ui takes **57**.

## Goals / Non-Goals

- Goals: student sees classes + concept spine + next-concept highlight; can
  upload study material and watch ingest progress; can ask the material
  questions with section-path citations; can take a quick quiz whose results
  update M5 mastery. Everything through validated same-origin host routes.
- Non-Goals: teacher flows, identity mapping UI (V1 uses typed sourcedId),
  Glicko-2 tuning (M5 internal), e2e browser automation (covered by the two
  Node test suites emulating both halves).

## Decisions

1. **Proxy surface = 6 routes, not 1 generic proxy.** A generic
   `/proxy/{upstream}/{path}` would let the page reach anything; instead each
   write action gets a dedicated route with strict payload validation
   (UUID candidateId, choice-id regex, conceptUri scheme, ISO occurredAt,
   question length, topK bounds). The only generic surface is `batch`, a
   **GET-only** fan-out (max 8 calls) restricted to `class, learner, case,
   quiz, rag` prefixes with a path whitelist regex — enough for all read
   screens, useless for writes.
2. **JWT forwarded verbatim, never stored server-side.** The client reads the
   auth-ui localStorage contract (`skilltree.auth.v1`) and sends
   `Authorization: Bearer …`; the host forwards it unchanged. No token
   logging, no server-side session.
3. **Multipart passthrough for uploads.** The upload route reads the raw body
   (bounded by `SKILLTREE_STUDENT_RAG_UPLOAD_MB`, default 20 MiB → 413 over)
   and re-sends the exact bytes + original `content-type` (boundary preserved)
   to rag-service with a 30 s timeout. No parsing/repacking — FormData shape
   stays rag-service's contract.
4. **Answer key never rendered.** M2 `ItemRead.correctResponse` is used only
   server-side by M2 scoring; the student quiz UI renders choices and, after
   submission, right/wrong verdicts — never the key. Test C9b asserts no
   "Đáp án đúng"/correctResponse marker in the rendered tree.
5. **Spine from M1 graph + M5 mastery.** Kahn topological order over
   `isPrerequisiteOf` edges (cycle fallback appends unvisited nodes so the
   graph degrades visible instead of disappearing). Node state priority:
   next (M5 recommendation) > mastery state (green/amber/red/rusty) >
   ready/locked from prereq count. Mastery % shown per node.
6. **Anti-slop compliance.** Inline style objects with DESIGN.md tokens only;
   Georgia serif for student-facing headings; flat surfaces (no gradient/
   glass/glow); radius 4/8/12/999; AA-checked pairs (e.g. boot #167F4D with
   white text 5.03:1, muted #6B7280 on white 4.83:1); encouraging Vietnamese
   copy; one purpose per tab.
7. **Testing without a browser.** `tests/smoke.mjs` boots the real host half
   against a fake harness `webServer` + fake gateway over real HTTP sockets;
   `tests/client.mjs` loads the real client half in a fake browser
   (`window`, `localStorage`, `FormData`, captured `__ModuleLoader__`) with a
   minimal React hook emulation (per-component hook stores) and drives real
   event handlers end to end.

## Risks / Trade-offs

- *[sourcedId typed by hand]* → V1 accepts it (pseudonymous M6 id); validated
  as UUID-ish before quiz/mastery writes; README documents it.
- *[upload route ignores client gateway override]* → multipart body cannot
  carry a JSON `__baseUrl`; env value is authoritative (documented).
- *[batch allow-list may need new prefixes]* → single constant
  `READ_PREFIXES` + config route exposes it; additive change.

## Migration Plan

Additive only: new plugin directory + 2 loader rows. Rollback = remove rows
(or `disabled: true`), restart M4.
