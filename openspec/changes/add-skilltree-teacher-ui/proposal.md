# Proposal: add-skilltree-teacher-ui


## Why


V1 goal 3 (AGENTS.md) requires a **role-specific teacher UI** inside the DeepSeek
Harness, and the project doc `01-muc-tieu-do-an.md` ("Góc nhìn Giáo viên") defines
five teacher features: Class Heatmap, Graph-Reasoned Teaching Plan, One-Click
Targeted Intervention, Class Roster & Student Drill-Down, and the Class Ask flow.
The data backends already exist (M5 learner-model heatmap/teaching-plan/next,
M7 assignment-service, M4 analytics events, M6 class roster, M1 concept graph,
all behind the M10 api-gateway), but there is no UI that exposes them — the
teacher currently has no way to see class mastery or act on it.


## What


- New DSH plugin `skilltree-teacher-ui` under
  `services/skill-tree-service/plugins/skilltree-teacher-ui/`
  (`package.json` + `lib/index.js` host half + `client/client.js` client half,
  no build step, `lib/` committed).
- Host half mounts 5 same-origin routes (`config`, GET-only `batch` fan-out with
  prefix allow-list, `assign`, `quiz`, `ask`) that proxy the M10 gateway with the
  teacher JWT forwarded verbatim; 16 KiB body cap, 10 s upstream timeout,
  same-origin-only POSTs, platform error envelope preserved.
- Client half registers one additive `shell.overlay` entry ("📊 Bảng GV") with:
  class selector + documentId → RAG heatmap `[students × concepts]`, contrastive
  teaching-plan table with per-row "Giao ôn tập" (→ M7 assignment + M2 quiz
  generation), per-student drill-down (mastery + next recommendation + event
  history), and a Class Ask box.
- Class Ask has no backend yet (cognee gateway M8 is 🔜): the host half answers
  deterministically from live M5 heatmap + teaching-plan (+ M1 labels, M6
  roster) and labels the source as a V1 heuristic upgradeable to M8.
- `plugins/patch.yml` + `plugins/patch.local.yml` gain one loader row
  (`skilltree-teacher-ui`), kept in sync.
- Design tokens follow DESIGN.md (brand leaf green + deep teal ink) with
  dashboard-only RAG tints declared in the plugin README; anti-slop catalog
  respected (no gradients/glassmorphism/nested cards, WCAG AA, table-first).


## Risks / trade-offs


- The Class Ask matcher is keyword-based, not LLM/cognee-backed — accepted for
  V1 feature-completeness and explicitly labeled in the UI and API response.
- Branching from `main` while `agent-v1-auth-ui` / `agent-v1-class-ui` are still
  separate branches: the JWT-storage key contract (`skilltree.auth.v1`) is
  duplicated as a read-only consumer here, so the plugins compose independently
  and the auth header degrades gracefully (banner, gateway auth-off still usable).
