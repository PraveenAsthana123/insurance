# Insur Analytics Dashboard

A full-stack enterprise analytics platform for Beverages (BEV) companies.
Covers 11 functional departments with real-time KPIs, ML-powered forecasting, and
AI-driven explanations via Ollama/RAG.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (React + Vite)                  │
│  Left Sidebar Navigation  │  Main Content Area (white bg)   │
└───────────────┬─────────────────────────────────────────────┘
                │ REST / JSON
┌───────────────▼─────────────────────────────────────────────┐
│              FastAPI Backend  (port 8000)                    │
│  Routers → Services → Repositories → PostgreSQL             │
│  Celery Workers (Redis broker) for async ML jobs            │
│  MLflow (host port 5001 → container 5000) for experiments   │
│  Ollama (port 11434) for RAG / AI natural-language answers  │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite, native CSS variables, left-sidebar layout |
| Backend | FastAPI (Python 3.11), Pydantic v2, SQLAlchemy (async) |
| Database | PostgreSQL 15 |
| Cache / Queue | Redis 7, Celery 5 |
| ML Platform | MLflow 2, scikit-learn, XGBoost, SHAP |
| AI / RAG | Ollama (llama3), LangChain |
| Containerisation | Docker + Docker Compose |
| CI/CD | GitHub Actions |

---

## 11 Department Modules

| # | Department | Key Features |
|---|-----------|-------------|
| 1 | **Sales & Revenue** | Revenue trends, sales velocity, territory performance |
| 2 | **Marketing & Trade Spend** | Campaign ROI, trade promotion effectiveness, attribution |
| 3 | **Supply Chain & Logistics** | Inventory turns, fill rate, lead time, OTIF |
| 4 | **Demand Forecasting** | ML-powered SKU-level forecasts, MAPE/RMSE tracking |
| 5 | **Retail & Channel Analytics** | POS data, shelf analytics, planogram compliance |
| 6 | **Product & Innovation** | NPD pipeline, SKU rationalization, launch tracking |
| 7 | **Finance & P&L** | Gross margin, trade spend waterfall, EBITDA bridge |
| 8 | **Customer & Shopper** | Segmentation, basket analysis, loyalty analytics |
| 9 | **Quality & Compliance** | Defect rates, recall tracking, regulatory compliance |
| 10 | **HR & Workforce** | Headcount, attrition, productivity metrics |
| 11 | **Executive Scorecard** | Consolidated KPIs, AI narrative summaries, alerts |

---

## Quick Start (Docker Compose)

### Prerequisites
- Docker >= 24 and Docker Compose >= 2.20
- 8 GB RAM minimum (16 GB recommended for Ollama)

```bash
# 1. Clone the repository
git clone <repo-url>
cd insur

# 2. Set up environment
cp .env.template .env
# Edit .env — at minimum set POSTGRES_PASSWORD and KAGGLE credentials

# 3. Start all services
docker compose up -d

# 4. Apply database migrations
docker compose exec backend python -m backend.database

# 5. Open the dashboard
open http://localhost:3000
```

### Service URLs

| Service | URL |
|---------|-----|
| Frontend (Docker) | http://localhost:3000 |
| Frontend (local Vite dev) | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| MLflow UI | http://localhost:5001 |
| Flower (Celery monitor) | http://localhost:5555 |

---

## GitHub Copilot CLI

GitHub Copilot CLI is available as optional developer tooling. It is not part of the production application runtime. Authenticate before first use:

```bash
copilot --version
copilot login
copilot -i "inspect this repo and summarize pending validation work"
copilot -p "explain the project_doctor failure" --allow-tool="shell(./scripts/project_doctor.sh)"
```

Use narrow permissions for repo work. Avoid `--allow-all` or `--yolo` unless you intentionally want a fully trusted local session. Existing repository guidance for Copilot lives in `.github/copilot-instructions.md`.

## Archon Developer Workflow Harness

Archon CLI is available as an optional developer harness for repeatable AI coding workflows. It is not part of the production application runtime. Repo-local workflows live in `.archon/`:

```bash
archon --version
archon workflow list
archon workflow run insur-project-doctor-fix "fix the current project_doctor failure"
archon workflow run insur-api-change-governance "add or change an API endpoint"
```

Use Archon workflows only with the governance requirements in `docs/GOVERNANCE_INDEX.md`, `docs/APPROVAL_GOVERNANCE.md`, and `docs/AGENT_TOOL_SELECTION_MATRIX.md`. Safe local approval automation is documented in `docs/APPROVAL_GOVERNANCE.md` and `docs/CODEX_APPROVAL_CRON_POLICY.md`; it can be dry-run with `python3 scripts/archon_auto_approve_safe.py --dry-run`, scheduled with `scripts/install_codex_approval_cron.sh`, and API-based approve/submit/next routing is available at `POST /api/v1/agent-platform/approval-broker/decide`.

## BMAD And Dark Factory Governance

BMAD is available locally as planning and review methodology, not production runtime infrastructure. The AI-assisted delivery flow from Idea -> BMAD Analyst PRD -> BMAD Architect system design -> BMAD Scrum stories -> Archon workflow -> coding agent -> Playwright testing -> opt-in DeepEval -> target Temporal approval -> deployment -> target OpenTelemetry monitoring is documented in `docs/DARK_FACTORY_OPERATING_MODEL.md`, with practical recipes in `docs/BMAD_RECIPES.md`. OpenHands, DeepEval, Temporal, and full OpenTelemetry are target/operator-gated unless separately wired and validated.

## Development Setup (without Docker)

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

---

## Project Structure

```
insur/
├── backend/
│   ├── core/          # Config, auth, middleware, encryption, logging
│   ├── repositories/  # All SQL — one file per table group
│   ├── schemas/       # Pydantic request/response models
│   ├── services/      # Business logic (class-based, injected)
│   ├── routers/       # FastAPI route handlers (HTTP-only)
│   ├── migrations/    # Numbered SQL migration scripts
│   ├── tests/         # Pytest test suite
│   └── main.py        # App entry point
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # One page per department module
│   │   ├── hooks/       # Custom React hooks
│   │   ├── services/    # API client
│   │   └── utils/       # Formatters, validators, error tracker
│   └── index.html
├── data/
│   └── kaggle/        # Raw Kaggle datasets (git-ignored)
├── scripts/           # Data ingestion, maintenance utilities
├── docs/              # Architecture and developer guides
├── .env.template      # Environment variable reference
├── docker-compose.yml
└── README.md
```

---

## Contributing

See [docs/CODE_GUIDELINES.md](docs/CODE_GUIDELINES.md) for branching strategy,
commit conventions, and the PR checklist.

Approval gates are documented in [docs/APPROVAL_GOVERNANCE.md](docs/APPROVAL_GOVERNANCE.md). CODEOWNERS and branch protection should require review before merge; CI runs the governance diff check for required doc updates.

All PRs must pass:
- `ruff check` + `black --check`
- `pytest --cov=backend --cov-fail-under=80`
- `npm run validate` (frontend build + lint)
- GitHub Actions CI pipeline

### Agent platform architecture

Global agent architecture policy is documented in [docs/GLOBAL_AGENT_ARCHITECTURE_POLICY.md](docs/GLOBAL_AGENT_ARCHITECTURE_POLICY.md). Interview-ready platform explanation is in [docs/AGENT_PLATFORM_INTERVIEW_GUIDE.md](docs/AGENT_PLATFORM_INTERVIEW_GUIDE.md), with diagrams in [docs/diagrams/agent-platform-architecture.md](docs/diagrams/agent-platform-architecture.md). The local agent supervisor runbook is [docs/AGENT_SUPERVISOR_RUNBOOK.md](docs/AGENT_SUPERVISOR_RUNBOOK.md). Unified tool setup for Harness Agent, OpenClaw, Paperclip, PoliysAI, CUA, Stagehand, Playwright, and the opt-in Pydantic AI typed council is documented in [docs/AGENT_PLATFORM_SETUP.md](docs/AGENT_PLATFORM_SETUP.md). Cross-project service access policy is documented in [docs/global-services/GLOBAL_AGENT_SERVICE_POLICY.md](docs/global-services/GLOBAL_AGENT_SERVICE_POLICY.md), approval workflow in [docs/global-services/GLOBAL_AGENT_APPROVAL_POLICY.md](docs/global-services/GLOBAL_AGENT_APPROVAL_POLICY.md), Claude/Codex handoff in [docs/global-services/CLAUDE_CODEX_HANDOFF_POLICY.md](docs/global-services/CLAUDE_CODEX_HANDOFF_POLICY.md), MCP monitoring in [docs/global-services/MCP_MONITORING_POLICY.md](docs/global-services/MCP_MONITORING_POLICY.md), with a machine-readable manifest at [docs/global-services/agent-service-manifest.json](docs/global-services/agent-service-manifest.json). These files cover gateway, authentication, routing, websocket/session management, concurrency, event broadcasting, orchestration, runtime, tools, workflows, memory, RAG, governance, MCP, security, guardrails, observability, fallback, deployment layers, agent heartbeats, scheduled jobs, task inspection, and operational health checks.

### Testing ecosystem

The complete open-source testing ecosystem map is maintained at [docs/testing/OPEN_SOURCE_TESTING_ECOSYSTEM.md](docs/testing/OPEN_SOURCE_TESTING_ECOSYSTEM.md). The enterprise AI-native testing pyramid and top 1% stack are maintained at [docs/testing/ENTERPRISE_AI_TESTING_LANDSCAPE.md](docs/testing/ENTERPRISE_AI_TESTING_LANDSCAPE.md). The global per-department process/subprocess testing policy is maintained at [docs/testing/GLOBAL_PROCESS_TESTING_POLICY.md](docs/testing/GLOBAL_PROCESS_TESTING_POLICY.md), with generated agent/cron assignments in [docs/testing/PROCESS_AGENT_CRON_CATALOG.md](docs/testing/PROCESS_AGENT_CRON_CATALOG.md). It covers functional, browser, API, DB, data, ML, performance, security, accessibility, AI/LLM, observability, chaos, workflow, event streaming, governance, cloud-native, and resilience testing tools, with repo status for each category.

---

## Screenshots

The Sales flagship deep-dive ships with 16 captured screenshots demonstrating
live end-to-end behavior — dashboard → department overview → manager hub →
forecast → explain drawer → revenue tree → simulation waterfall → admin
workflows → data-flow graph → role selector. A second gallery covers the
other departments (marketing, supply chain, contact center, telehealth).

- [docs/screenshots/sales/](docs/screenshots/sales/) — 14 Sales flagship captures (dashboard, overview, 10-tab manager hub, forecast empty + generated, explain drawer, revenue drilldown, simulation empty + waterfall, admin workflows, data flow, sidebar expanded, admin AI use cases, role selectors for manager + team-member)
- [docs/screenshots/depts/](docs/screenshots/depts/) — cross-dept overview captures (marketing, supply chain, contact center, telehealth)

### Flagship demo walkthrough

For a narrated 3-scenario walkthrough of the Sales flagship (revenue-drop
investigation, 8-week forecast + confidence, promo ROI simulation with RBAC
gating) see [docs/demo/sales-walkthrough.md](docs/demo/sales-walkthrough.md).

### Architecture diagrams

Mermaid diagrams covering the full Sales flow (rendered inline on GitHub):

- [docs/diagrams/sales-architecture.md](docs/diagrams/sales-architecture.md) — C4-lite container view
- [docs/diagrams/sales-forecast-sequence.md](docs/diagrams/sales-forecast-sequence.md) — Prophet fit + predict sequence
- [docs/diagrams/sales-rag-sequence.md](docs/diagrams/sales-rag-sequence.md) — AI Explain RAG hybrid retrieval sequence
- [docs/diagrams/sales-rbac-flow.md](docs/diagrams/sales-rbac-flow.md) — Demo-mode RBAC enforcement sequence

### Implementation status

A living "Implemented vs Planned" snapshot is maintained at
[docs/STATUS.md](docs/STATUS.md). After Sales Phases α–θ, the Sales flagship
is end-to-end complete (data, forecast, simulation, frontend, RAG,
observability, RBAC, docs); Supply Chain is next.
