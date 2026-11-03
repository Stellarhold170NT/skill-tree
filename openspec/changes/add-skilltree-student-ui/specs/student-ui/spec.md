# student-ui — Student Dashboard Capability

## ADDED Requirements

### Requirement: Student sees their classes and identity pseudonymously

The student dashboard SHALL resolve the logged-in student's classes from M6
class-service using the sourcedId stored in Cài đặt, without exposing real
names as identity keys.

#### Scenario: Overview loads classes for a valid sourcedId
- **WHEN** the student opens the "🎒 Học sinh" panel with a valid sourcedId
  and a student JWT from auth-ui
- **THEN** the host issues a GET-only batch to M6
  (`/users/{id}`, `/users/{id}/classes`) with the forwarded JWT
- **AND** the Tổng quan tab lists each class title with a "đang học" badge
- **AND** the greeting shows the M6 display name

#### Scenario: Missing sourcedId shows guidance, not an error
- **WHEN** no sourcedId has been entered
- **THEN** the panel shows a warm notice directing the student to the Cài đặt
  tab and issues no upstream call

### Requirement: The concept graph renders as a readable learning spine

The dashboard SHALL linearize the M1 concept graph of the selected subject
into a topologically ordered spine (Kahn over `isPrerequisiteOf` edges) and
combine it with M5 mastery states.

#### Scenario: Next concept is highlighted
- **WHEN** M5 returns a next-concept recommendation and mastery rows
- **THEN** the recommended node carries the "Học ngay" badge and a brand
  highlight border, mastery percentage renders on known nodes
- **AND** the spine order follows prerequisites (prereq before concept)

#### Scenario: Cycle in the graph degrades visibly
- **WHEN** the M1 graph contains a prerequisite cycle
- **THEN** unvisited nodes are appended after the topo-ordered ones and the
  spine still renders (no blank screen, no crash)

### Requirement: Students upload study material and follow ingest progress

The Tài liệu tab SHALL upload a file through the host's multipart passthrough
route to rag-service and poll the job until `ready` or `failed`.

#### Scenario: Upload reaches rag-service byte-identical
- **WHEN** the student picks a file within the size cap and presses "Nạp tài
  liệu"
- **THEN** the host forwards the exact multipart bytes with the original
  boundary and `Authorization` header to rag-service
  `POST /documents/upload`
- **AND** the returned `jobId` starts a 1.5 s polling loop rendering the
  pipeline steps `queued → received → parsed → chunked → mirrored → ready`

#### Scenario: Oversized upload is rejected before any upstream call
- **WHEN** the file exceeds `SKILLTREE_STUDENT_RAG_UPLOAD_MB` (default 20)
- **THEN** the host answers 413 and no upstream request is made

#### Scenario: Q&A answers cite the source section
- **WHEN** the student asks a question (mode `answer` or `retrieve`)
- **THEN** the answer (if any) renders above citations showing
  `sectionPath` joined with " › ", the snippet and the match score

### Requirement: Quick checks update the learner model

The Kiểm tra nhanh tab SHALL load M2 items for the selected concept, submit
bulk attempts to M2, and push per-concept correctness to M5 so mastery and
the next recommendation move.

#### Scenario: Submitting a quiz updates mastery
- **WHEN** the student answers and presses "Nộp bài"
- **THEN** the host posts `{candidateId, responses[]}` to M2
  `POST /quiz/attempts/bulk`
- **AND** scored attempts with a `conceptUri` are posted to M5
  `POST /learner/students/{id}/update/bulk` as `{conceptUri, isCorrect}`
- **AND** the result line shows "Kết quả: đúng X/Y" with encouraging copy

#### Scenario: The answer key is never rendered
- **WHEN** quiz items (which include `correctResponse`) are displayed
- **THEN** the rendered tree contains no answer-key marker and no
  correctResponse-based highlighting before submission

### Requirement: Host routes validate input and are safe by default

The plugin host half SHALL enforce same-origin on writes, forward the student
JWT verbatim, cap JSON bodies at 16 KiB, reject non-allow-listed batch
prefixes and malformed paths, and bound upstream calls (30 s timeout for
uploads).

#### Scenario: Disallowed prefix is refused without an upstream call
- **WHEN** a batch call targets a prefix outside `class, learner, case, quiz,
  rag`
- **THEN** the per-call result is `INVALID_CALL: prefix not allowed` and no
  upstream request happens

#### Scenario: Cross-origin write is refused
- **WHEN** a POST arrives with a non-matching `Origin` header
- **THEN** the host answers 403 `UNTRUSTED_ORIGIN`

#### Scenario: Gateway outage degrades per call
- **WHEN** the api-gateway is unreachable
- **THEN** batch returns per-call `status: 502` results instead of crashing,
  and the UI shows the error state
