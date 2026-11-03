# Spec Delta — Teacher Class Management UI (skilltree-class-ui)

## ADDED Requirements

### Requirement: Teacher class panel in the harness

The system SHALL provide a teacher-facing panel inside the DeepSeek Harness
(shell.overlay entry `skilltree-class-ui`) that manages personal classes
through class-service (M6) reached via the api-gateway (M10) `/class/` prefix.

#### Scenario: Teacher sees their classes with head-count

- **WHEN** the teacher opens the "Lớp học" panel with a reachable gateway
- **THEN** the panel lists the class catalog with title, course, term and the
  number of enrolled students per class.

#### Scenario: Teacher creates a class

- **WHEN** the teacher submits the create form (title required, term/course
  optional)
- **THEN** M6 persists the class (`POST /api/v1/classes` → 201) and the list
  refreshes showing the new class with its `sourcedId`.

### Requirement: Teacher edits a class

The system SHALL let the teacher edit a class's metadata (title, term) from
the class detail view, persisted through the M6 endpoint
`PATCH /api/v1/classes/{id}` (partial update; referenced course/org ids are
validated server-side; the update requires at least one field).

#### Scenario: Rename a class

- **WHEN** the teacher opens a class, clicks "Sửa thông tin lớp", edits the
  title (and optionally the term) and submits
- **THEN** the panel sends `PATCH /class/classes/{id}` through the proxy,
  M6 returns the updated class (200), and the detail header and class list
  show the new values.

#### Scenario: Invalid reference is rejected gracefully

- **WHEN** an update references a course that does not exist
- **THEN** M6 answers `404 COURSE_NOT_FOUND` and the panel shows the error
  without corrupting the class record.

### Requirement: Anonymous student enrollment

The system SHALL let the teacher enroll anonymous student identities: look up
existing students (`role=student`) or create a new anonymous student
(`POST /api/v1/users`), then enroll them in the class
(`POST /api/v1/enrollments`).

#### Scenario: Enroll an existing student

- **WHEN** the teacher searches the student pool and clicks "Ghi danh"
- **THEN** the enrollment is created and the roster shows the student with
  their `sourcedId` (candidateId).

#### Scenario: Duplicate enrollment is rejected gracefully

- **WHEN** the teacher enrolls a student who already has that role in the class
- **THEN** M6 answers `409 DUPLICATE_ENROLLMENT` and the panel shows
  "Học sinh đã ở trong lớp với vai trò này." without corrupting the roster.

#### Scenario: Un-enroll a student

- **WHEN** the teacher clicks "Hủy ghi danh" on a roster row
- **THEN** the matching enrollment (`DELETE /api/v1/enrollments/{id}`) is
  removed and the roster refreshes.

### Requirement: Service traffic stays host-mediated

The browser half SHALL NOT call service or gateway addresses directly; all M6
traffic SHALL go through the host-half same-origin route `POST /classui/proxy`,
which validates the request and forwards it to `{baseUrl}/class/{rest}`.

#### Scenario: Cross-origin request is rejected

- **WHEN** a request with a foreign `Origin` header reaches `/classui/proxy`
- **THEN** the host answers `403 untrusted origin` and forwards nothing.

#### Scenario: Teacher token is forwarded

- **WHEN** the teacher has saved a token in the panel
- **THEN** each proxied request carries `Authorization: Bearer <token>` and
  the token is never logged or persisted server-side.

### Requirement: Design tokens and anti-slop

The panel SHALL use only DESIGN.md tokens (leaf-green brand ramp, deep-teal
ink, neutral surfaces) and pass the anti-slop rules (no gradients, no
glassmorphism, no nested-card stacking, WCAG AA contrast, no motion slop).

#### Scenario: Visual self-review

- **WHEN** the panel styles are reviewed against
  `anti-slop-catalog.md` and DESIGN.md
- **THEN** every color resolves to a documented token and no catalog rule is
  violated.
