# SkillTree

SkillTree turns course syllabi into an interactive prerequisite skill graph. It guides students step-by-step through their personalized learning path and gives instructors real-time visibility into class-wide mastery.

## Key Features

- **Prerequisite Skill Graph (DAG)**: Maps courses, learning outcomes (CLOs), and competencies into structured directed acyclic graphs.
- **Interactive Learning Workbench**: Integrates structured lessons, video lectures, and LaTeX-rendered mathematical publications.
- **Teacher Analytics & Heatmap**: Visualizes class-wide mastery levels, knowledge decay, and bottlenecks across every learning node.
- **Classroom Memory (Cognee)**: Ingests documents, extracts knowledge, and maintains evolving per-student context via Graph RAG.
- **OneRoster & IMS CASE Standard Compliant**: Built on standardized competency and class management schemas.

## Architecture

The system runs as modular microservices behind a unified API gateway:

- **API Gateway**: Reverse proxy and routing (`:8000`).
- **OpenCASE Service**: Competency frameworks and prerequisite DAGs (`:8100`).
- **Class Management Service**: Classes, enrollments, and OneRoster data (`:8106`).
- **Learner Model Service**: Mastery tracking and Glicko-2 competency ratings (`:8105`).
- **Analytics Service**: Class-wide heatmaps and progression metrics (`:8104`).
- **Document & LaTeX Services**: Course material ingestion and LaTeX-to-HTML rendering (`:8102`, `:8103`).
- **RAG & Cognee Services**: Graph-based memory retrieval and QA (`:8109`, `:8021`).
- **Agent Harness (DSH)**: Web-based interactive LMS workspace and plugins (`:8114`).

## Quick Start

```bash
git clone https://github.com/Stellarhold170NT/skill-tree.git
cd skill-tree
cp deploy/.env.example deploy/.env
docker compose -f deploy/docker-compose.yml up -d
```

Access the web interface at `http://localhost:8114/`.

## Documentation

- [Design & Architecture](DESIGN.md)
- [Module Map](docs/MODULES.md)
- [Deployment Guide](docs/deployment.md)
- [Evaluation Harness](docs/eval-harness.md)
- [Operations Runbook](docs/run-final-handover.md)
