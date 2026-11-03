# v1 Capability Specification — SkillTree V1 (delta)

## ADDED Requirements

### Requirement: Register and Login UI

The system SHALL provide a register/login interface inside the DeepSeek
Harness backed by `auth-service` (M11, JWT HS256), with roles
`teacher`/`student`, and the first registered user SHALL become `admin`.

#### Scenario: First registration becomes admin

- **WHEN** the very first user registers through the auth UI
- **THEN** the account is created with role `admin` and receives a valid JWT.

#### Scenario: Teacher and student login

- **WHEN** an existing teacher or student submits correct credentials
- **THEN** the UI opens the role-specific workspace with a valid JWT.

#### Scenario: Wrong credentials rejected

- **WHEN** a user submits wrong credentials
- **THEN** the UI shows an error and no JWT is issued.

### Requirement: Teacher-Scoped Class Management

The system SHALL let an individual teacher manage their own classes (list,
create, enroll students) using `class-service` (M6, OneRoster v1.2 subset) as
the catalog source of truth, scoped so a teacher sees only their own classes.

#### Scenario: Teacher creates and enrolls

- **WHEN** a logged-in teacher creates a class and enrolls students in it
- **THEN** the class and enrollments are persisted in class-service and
  visible only to that teacher.

#### Scenario: Cross-teacher isolation

- **WHEN** another teacher lists their classes
- **THEN** classes owned by other teachers do not appear.

### Requirement: Role-Specific Interfaces

The system SHALL provide a separate teacher experience and a separate student
experience inside the DeepSeek Harness, implemented as DSH plugins.

#### Scenario: Teacher view

- **WHEN** a teacher logs in
- **THEN** the interface prioritizes information density (tables, class
  heatmap, teaching plan) per the teacher tone rules.

#### Scenario: Student view

- **WHEN** a student logs in
- **THEN** the interface uses the warm, encouraging "feels like a bookshop"
  tone and never exposes other students' data.

### Requirement: Concept-Graph Dashboard

The system SHALL render the M1 opencase-service CASE concept graph as a
roadmap-style dashboard in a DSH plugin, recolored to the standard brand
tokens defined in `DESIGN.md` (the arbitrary legacy palette MUST NOT be kept).

#### Scenario: Graph renders as roadmap

- **WHEN** a user opens the graph dashboard for a CFDocument
- **THEN** concepts and prerequisite edges render as a roadmap-style tree with
  per-concept mastery status (Red/Amber/Green).

#### Scenario: Brand-harmonized colors

- **WHEN** any plugin UI renders
- **THEN** colors come only from the `DESIGN.md` token set derived from the
  brand assets.

### Requirement: Student Document RAG Pipeline

The system SHALL provide a per-student document pipeline (Gemini-Notebook
style): upload -> parse (latexml M3) -> structure-aware chunking -> index ->
ask, and the retrieval SHALL exploit global document structure (ToC, STAIR
arxiv 2609.03874v2) rather than fixed-length chunk retrieval only.

#### Scenario: Upload to ask round-trip

- **WHEN** a student uploads a course document and asks a question about it
- **THEN** the pipeline parses, chunks with structure, indexes, and returns an
  answer grounded in the uploaded document.

#### Scenario: Structure-aware retrieval

- **WHEN** retrieval runs on a structured document
- **THEN** candidates are selected using global ToC structure signals, not
  only cosine similarity over fixed-length chunks.

### Requirement: Cognee Per-Student Classroom Memory

The system SHALL integrate Cognee via MCP inside skill-tree-service with one
isolated dataset per student keyed by `<candidateId>`, storing the learning
profile, mastery snapshots, and practice traces, with knowledge evolving over
time.

#### Scenario: Per-student dataset isolation

- **WHEN** the system ingests learning events for a student
- **THEN** they are written only to that student's `<candidateId>` dataset and
  no other student's dataset is readable from it.

#### Scenario: Evolving knowledge recall

- **WHEN** a student (or their teacher) asks a memory question later
- **THEN** hybrid vector+graph recall through cognee returns answers reflecting
  the stored progress up to that time.

### Requirement: Dashboard and Strict Testing

The system SHALL keep every service's pytest suite green, provide a UI e2e
smoke test, and require real evidence (screenshots/logs) before any DONE
report.

#### Scenario: Services green

- **WHEN** the full pytest suite runs for `services/`
- **THEN** all tests pass.

#### Scenario: UI e2e smoke

- **WHEN** the e2e smoke suite runs against the harness UI
- **THEN** login, class view, graph view, and notebook ask flows complete
  successfully with recorded evidence.
