# Project Requirements And Change History

This document records what the project is supposed to be, what changed over time, and what the current code supports. Update this file whenever a task changes architecture, API behavior, UI policy, security posture, or deployment flow.

## Beginning Requirement

Build a full-stack BEV analytics platform with:

- React dashboard frontend
- FastAPI backend
- PostgreSQL database
- Redis/Celery worker support
- ML forecasting and model catalog APIs
- AI/RAG explanations through Ollama
- department, manager, admin, and process views
- Docker Compose local environment
- testable command-line setup

## Current Requirement

The project is now expected to support production-grade foundations:

- layered backend architecture
- documented API input/process/output contracts
- frontend API tracing and F12 debuggability
- data freshness and service status UI
- UI global policy for React/Next.js migration readiness
- backend global policy for DDD, service boundaries, testing, security, observability, and documentation
- default project doctor command
- CI baseline for frontend and backend checks
- database viewer for local debugging

## Recent Changes

- Added `scripts/project_doctor.sh` for one-command validation.
- Added frontend production API tracing through `apiFetch` and `trace.js`.
- Added UI global policy in `docs/UI_GLOBAL_POLICY.md`.
- Added backend/API/system design policy in `docs/BACKEND_GLOBAL_POLICY.md`.
- Added generated API catalog in `docs/API_ENDPOINT_CATALOG.md` and `docs/API_CATALOG.json`.
- Added generated backend file inventory in `docs/BACKEND_FILE_INVENTORY.md` and `docs/BACKEND_FILE_INVENTORY.json`.
- Added docstrings to model route/schema/service/repository files.
- Added Adminer database viewer to Docker Compose.

## Requirement Change Rule

Every future change must update at least one of these files when relevant:

- `README.md`: setup, run, debug, and major project context
- `AGENTS.md`: agent/codex/cloud task context and operating rules
- `docs/PROJECT_REQUIREMENTS.md`: requirement history and scope changes
- `docs/API_ENDPOINT_CATALOG.md`: API behavior changes
- `docs/BACKEND_FILE_INVENTORY.md`: backend file responsibility changes
- `docs/UI_GLOBAL_POLICY.md`: frontend policy changes
- `docs/BACKEND_GLOBAL_POLICY.md`: backend policy changes

## Acceptance Baseline

Default local acceptance command:

```bash
./scripts/project_doctor.sh
```

Expected result:

- frontend build passes
- frontend lint passes
- backend tests pass excluding opt-in eval tests
- failures are zero
