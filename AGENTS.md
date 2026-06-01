# Agent Context

This file is for Codex, Claude, and other coding agents working in this repository.

## Documentation Source Of Truth

Start every project-wide check from `docs/GOVERNANCE_INDEX.md`. It integrates backend, frontend, API, testing, agent/council, runbook, and governance policies.

## Project Summary

Insur Analytics Dashboard is a full-stack analytics platform with:

- React/Vite frontend
- FastAPI backend
- PostgreSQL database
- Redis/Celery workers
- ML forecasting/model catalog services
- Ollama-backed RAG explanations
- Docker Compose local stack
- generated API and backend inventory docs

## Required Agent Behavior

When an agent changes code, it must update relevant docs:

- setup/run/debug changes -> `README.md`
- requirement/scope changes -> `docs/PROJECT_REQUIREMENTS.md`
- frontend policy changes -> `docs/UI_GLOBAL_POLICY.md`
- backend/API/system-design changes -> `docs/BACKEND_GLOBAL_POLICY.md`
- API behavior changes -> `docs/API_ENDPOINT_CATALOG.md` and `docs/API_CATALOG.json`
- backend file responsibility changes -> `docs/BACKEND_FILE_INVENTORY.md` and `.json`

## Validation

Run the default health check before handing back production-facing changes:

```bash
./scripts/project_doctor.sh
```

Opt-in AI/RAG evals require local Ollama and are not part of default doctor checks.

## Architecture Boundaries

- Routers are HTTP only.
- Services own business logic and logs/traces.
- Repositories own SQL only.
- Schemas define API input/output contracts.
- Workers orchestrate async work through services.
- Frontend must use shared API binding and tracing.

## Agent/Council Architecture Docs

- `docs/AGENT_COUNCIL_ARCHITECTURE.md`
- `docs/AGENT_FILE_INVENTORY.md`
- `docs/AGENT_HARNESS_GUIDE.md`


## Additional Production Docs

- `docs/API_ASSISTANT_MESSAGE_CATALOG.json`
- `docs/MODEL_CATALOG_FLOW.md`
- `docs/LAYERED_ARCHITECTURE_MAP.md`
- `docs/RUN_DEBUG_RUNBOOK.md`


## Universal Backend Policy

For backend review, backend implementation, project checks, project testing, or architecture alignment, all agents must follow:

- `docs/BACKEND_UNIVERSAL_PROJECT_POLICY.md`

This policy is mandatory for Claude, Codex, and any automation agent.

## Design Methodology Policy

For model-driven, output-evaluation-first, governance-AI-driven, test-driven, and domain-driven design, follow:

- `docs/DESIGN_METHODOLOGY_POLICY.md`

## Agent Tool Selection

Before adding Hermes Agent, OpenClaw, Kilo Code, Descript, or similar tools, follow:

- `docs/AGENT_TOOL_SELECTION_MATRIX.md`

## Agentic Browser Wiring Status

Before claiming Stagehand, Browser Use, Open Operator, Playwright agentic automation, OpenClaude CUA, Piperclip/Paperclip, Istio, or circuit breakers are production-wired, verify:

- `docs/AGENTIC_BROWSER_WIRING_STATUS.md`
