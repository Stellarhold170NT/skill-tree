# add-skilltree-teacher-ui — Spec Delta


## ADDED Requirements


### Requirement: Teacher dashboard shell entry


The plugin SHALL register one additive `shell.overlay` entry (floating
"📊 Bảng GV" button → slide-over panel) without shadowing any shipped UI slot.

#### Scenario: Open the teacher dashboard
- **WHEN** the teacher clicks the floating "📊 Bảng GV" button
- **THEN** the dashboard panel opens with a class selector (M6), a documentId
  input (M1) and a "Tải dashboard" action
- **AND** closing the panel removes only this plugin's DOM (no residue)


### Requirement: Class RAG heatmap


The plugin SHALL render the M5 heatmap as a `[students × concepts]` table with
Red/Amber/Green/Rusty/none chips using WCAG AA tint pairs, student display names
resolved from the M6 roster, and concept short labels from the M1 graph.

#### Scenario: Load the dashboard
- **WHEN** the teacher selects a class, enters a documentId and presses
  "Tải dashboard"
- **THEN** the host half fans out the GET-only batch (classes, heatmap,
  teaching-plan, roster, graph) in one wire round-trip with the
  `Authorization` header forwarded verbatim
- **AND** the heatmap renders one row per student and one column per concept
  with the M5 state of each cell

#### Scenario: Gateway unreachable
- **WHEN** the M5/M6/M1 upstreams cannot be reached (502)
- **THEN** the dashboard shows an error banner naming the failed result keys and
  the exact compose command to start the stack
- **AND** previously rendered content is not silently replaced by fake data


### Requirement: Contrastive teaching plan + targeted intervention


The plugin SHALL render the M5 teaching plan as a ranked table (concept, red /
rusty / amber counts, unlock value, contrastive reason) with a per-row
"Giao ôn tập" action that creates an M7 assignment for the Red/Rusty group and
can generate the M2 quiz test.

#### Scenario: Assign review to the struggling group
- **WHEN** the teacher presses "Giao ôn tập" on a plan row, keeps the auto-filled
  title and target group `red_rusty`, and submits
- **THEN** the host half validates the M7 contract and forwards
  `POST {gateway}/assignments/assignments` with the teacher JWT
- **AND** the dashboard shows the created assignment (student count, item count)

#### Scenario: Generate the quiz test
- **WHEN** the teacher presses "Tạo đề kiểm tra M2" on a created assignment
- **THEN** the host half forwards `POST {gateway}/assignments/assignments/{id}/quiz`
- **AND** the dashboard surfaces the returned `quizTestId` / `quizIdentifier`
- **AND** generating twice surfaces the M7 `409 QUIZ_ALREADY_GENERATED` envelope


### Requirement: Per-student drill-down


The plugin SHALL open a per-student drill-down (click on a roster/heatmap name)
combining M5 mastery records, the M5 next-concept recommendation with its
explanation, and the M4 event history (20 most recent).

#### Scenario: Inspect one student
- **WHEN** the teacher clicks a student name in the heatmap
- **THEN** the drill-down shows the mastery table (state chip, mastery %,
  rating ± RD, review count), the "Học tiếp theo" recommendation with the M5
  explanation, and the recent event list (type, object, correct/incorrect)
- **AND** the drill batch uses only the allow-listed prefixes
  (`learner`, `events`) with `actorId`/`documentId` query params


### Requirement: Class Ask flow


The plugin SHALL provide a Class Ask box that answers natural-language class
questions from live M5 data (heatmap + teaching-plan + M1 labels + M6 roster)
through a deterministic host-side matcher, and SHALL label every answer's source
as the V1 heuristic (upgradeable to cognee M8).

#### Scenario: Ask who mastered a concept
- **WHEN** the teacher asks "Ai đã nắm vững đệ quy?" for the loaded class
- **THEN** the host half fetches live heatmap/plan/roster/graph once and returns
  an answer naming the green students (display names) and counts per state
- **AND** the response includes `evidence.conceptUri` matching the matched M1 concept

#### Scenario: Question matches no concept
- **WHEN** no graph concept keyword-matches the question
- **THEN** the answer lists the concepts available in the document instead of
  inventing data


### Requirement: Transport discipline


The host half SHALL enforce: same-origin POSTs only (403 otherwise), 16 KiB body
cap (400 otherwise), 405 on wrong methods, GET-only allow-listed prefixes for the
batch route (rejecting `..` traversal and unknown prefixes), 10 s upstream
timeout with `502 UPSTREAM_UNAVAILABLE` envelope, and verbatim (never re-prefixed,
never logged) Authorization forwarding.

#### Scenario: Cross-origin request rejected
- **WHEN** a POST arrives with a foreign `Origin` header
- **THEN** the route answers `403 UNTRUSTED_ORIGIN` without contacting the gateway

#### Scenario: Token forwarded once
- **WHEN** the client sends `Authorization: Bearer <jwt>` on any host route
- **THEN** the upstream request carries exactly one `Authorization: Bearer <jwt>`
  header (no double `Bearer Bearer`)
