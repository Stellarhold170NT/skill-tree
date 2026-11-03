# v1 Delta — capability: classroom-memory (skilltree-memory plugin)

## ADDED Requirements

### Requirement: Per-student Cognee dataset isolation

The system SHALL store every student's classroom memory in an isolated Cognee
dataset named `student-<candidateId>` (candidateId = anonymous id from
class-service M6), and SHALL NOT ingest an event whose owner cannot be resolved
into any student's dataset.

#### Scenario: Ingest events for one student

- **WHEN** the agent calls `memory_ingest` with `studentId` = `hs-demo` and a
  batch of learning events carrying `candidateId`/`studentId`/`actor.id`
- **THEN** exactly one document per student dataset is created in the Cognee
  dataset `student-hs-demo`, and the tool result reports
  `ingested[].dataset == "student-hs-demo"`.

#### Scenario: Mixed-student batch is grouped per dataset

- **WHEN** `memory_ingest` receives events belonging to two different students
- **THEN** the events are grouped into two separate documents in the two
  per-student datasets, with no event appearing in the other student's dataset.

#### Scenario: Unresolvable events are reported, not guessed

- **WHEN** an event carries no student field and no `studentId` fallback is given
- **THEN** the event is returned in the tool result as `unassigned` (with index
  and reason) and is NOT written to any dataset.

### Requirement: Per-student knowledge Q&A (hybrid recall)

The system SHALL answer questions about one student's evolving knowledge using
hybrid vector+graph recall scoped strictly to that student's dataset.

#### Scenario: Ask about a student's progress

- **WHEN** the agent calls `memory_ask` with `studentId` = `hs-demo` and a
  natural-language query
- **THEN** the recall runs against dataset `student-hs-demo` only and the answer
  is returned with the resolved dataset name and search type.

### Requirement: Periodic knowledge-evolution pipeline

The system SHALL provide a periodic update pipeline (`memory_evolve`) that
consolidates recent learning events and/or a distilled note into the student's
dataset using an education-specific extraction prompt, and reports the Cognee
pipeline status afterwards.

#### Scenario: Evolve after a study session

- **WHEN** the agent calls `memory_evolve` with `studentId` and events/note
- **THEN** a dated "Knowledge evolution" document (progress digest, concepts
  touched, optional note) is ingested into the student's dataset and the result
  includes the pipeline `status`.

### Requirement: Plugin wiring follows the 2-step harness rule

The plugin SHALL be integrated into skill-tree-service only via
`plugins/skilltree-memory/` (with `lib/` committed) plus one loader row in
`plugins/patch.yml` and the synchronized row in `plugins/patch.local.yml`; it
SHALL NOT be installed through `docker exec` + `dsh plugin add`.

#### Scenario: Boot registers the tools

- **WHEN** the harness container is restarted (`docker compose restart
  skill-tree-harness`)
- **THEN** the boot log contains `[skilltree-memory]` lines announcing 3
  registered tools over the Cognee MCP endpoint.

### Requirement: No secrets in the plugin

The plugin SHALL NOT contain, read, or log any LLM API key; LLM extraction
belongs to the Cognee MCP server, whose NetMind gateway credentials are provided
via environment from `skilltree-secrets/netmind.json` at runtime only.

#### Scenario: Repository scan for keys

- **WHEN** the plugin diff is scanned for API keys/tokens
- **THEN** no credential value appears in any committed file.
