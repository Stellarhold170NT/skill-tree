# ADR-0001: Service decomposition per 1EdTech standards with lean self-built core services

- Status: Accepted
- Date: 2026-10-31
- Context: Roadmap/Graph RAG learning platform must be assembled from independently
  developed modules (see `docs/MODULES.md`). Existing reference stacks (OAT/TAO,
  1EdTech OpenCASE full platform) are heavy monoliths; ClassroomMemory validates the
  learning logic but uses an ad-hoc curriculum JSON format.

## Decision

1. Decompose the platform into independently deployable microservices (M0–M13),
   each owning its database, communicating by REST `/api/v1` + URI references and
   (later) a Caliper-aligned event bus.
2. The two "asset" modules are self-built lean services instead of adopting
   TAO/OpenCASE: `opencase-service` (CASE v1.1 subset: CFDocument/CFItem/CFAssociation)
   and `quiz-service` (QTI v3.0 subset: choice items, match_correct scoring).
   Rationale: we need exactly the graph + scoring surfaces, in Python, as composable
   blocks; full TAO/OpenCASE would drag a monolith + identity stack into the assembly.
3. Cross-service references use opaque URIs (`conceptUri` = CFItem identifier,
   `candidateId` = OneRoster sourcedId). No cross-database access, no request-time
   HTTP back-references.
4. Learner modeling upgrades the PoC formula `w += 0.35(1-w)` to Glicko-2 +
   Ebbinghaus decay in a dedicated `learner-model-service`; the CASE/QTI formats are
   the stable interface so this can happen without touching other modules.

## Consequences

- Modules can be developed in parallel against the interface tables in `MODULES.md`.
- We accept a documented minimal QTI/CASE subset now (extensible later) instead of
  full-spec engines; full interoperability (e.g. QTI packages from TAO) remains a
  future import path.
- A future ADR must fix the event-bus technology (NATS vs RabbitMQ) before M4/M5/M8
  assembly.
