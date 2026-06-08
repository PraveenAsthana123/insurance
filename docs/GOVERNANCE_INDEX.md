# Governance Index

This is the single entry point for project governance, architecture, testing, API contracts, agent policy, UI policy, and run/debug operations.

## Use This First

| Need | Read |
|---|---|
| Current project scope and requirement history | `docs/PROJECT_REQUIREMENTS.md` |
| Current implementation status | `docs/STATUS.md` |
| Run/debug locally | `docs/RUN_DEBUG_RUNBOOK.md`, `docs/ADVANCED_AGENTIC_STACK_SETUP.md` |
| Default health check | `scripts/project_doctor.sh` |
| Claude/Codex operating rules | `AGENTS.md`, `CLAUDE.md`, `docs/CLAUDE_AUTONOMY_APPROVAL_POLICY.md` |
| Approval workflow and gates | `docs/USER_APPROVAL_POLICY.md`, `docs/NO_APPROVAL_AUTONOMY_POLICY.md`, `docs/CODEX_APPROVAL_CRON_POLICY.md`, `docs/CODEX_APPROVAL_CRON_RUN_PLAN.md`, `docs/CODEX_APPROVAL_ADVANCED_POLICY.md`, `docs/APPROVAL_GOVERNANCE.md`, `.archon/approval-policy.yaml` |
| Tenant + idempotency header contracts | `docs/TENANT_ID_IDEMPOTENCY_CONTRACT.md` |
| Save every user input to database | `docs/GLOBAL_INPUT_PERSISTENCE_POLICY.md` |
| Default testing, agent assignment, reports, notifications | `docs/testing/GLOBAL_DEFAULT_TESTING_POLICY.md`, `docs/testing/DEFAULT_TESTING_AGENT_ASSIGNMENTS.json` |

## Universal Policies

| Policy | Purpose |
|---|---|
| `docs/BACKEND_UNIVERSAL_PROJECT_POLICY.md` | Check, test, review, and align any backend project. Mandatory for Claude/Codex. |
| `docs/DESIGN_METHODOLOGY_POLICY.md` | Domain-driven, model-driven, output-evaluation-first, governance-AI-driven, and test-driven design. |
| `docs/BACKEND_GLOBAL_POLICY.md` | Repo-specific backend layering, API, database, service, observability, testing, and AI governance rules. |
| `docs/GLOBAL_INPUT_PERSISTENCE_POLICY.md` | Mandatory policy for saving meaningful user inputs to `user_input_events` with tenant, audit, redaction, and downstream lineage. |
| `docs/UI_GLOBAL_POLICY.md` | React/Next.js frontend policy: lazy loading, freshness, status, SEO, accessibility, debugability. |
| `docs/USER_APPROVAL_POLICY.md` | User standing all-approval policy for safe repo-local work; tool/platform approval only for hard gates. |
| `docs/NO_APPROVAL_AUTONOMY_POLICY.md` | Agent autonomy policy: do safe repo-local work without asking; preserve only hard tool/platform gates. |
| `docs/CLAUDE_AUTONOMY_APPROVAL_POLICY.md` | Claude-specific safe local autonomy and approval policy. |
| `docs/CODEX_APPROVAL_CRON_POLICY.md` | Scheduled safe local approval policy for Codex/Archon workflow gates. |
| `docs/CODEX_APPROVAL_CRON_RUN_PLAN.md` | Operational checklist for installing and running the Codex approval cron job. |
| `docs/CODEX_APPROVAL_ADVANCED_POLICY.md` | Continuous safe local approval watcher policy for active Codex/Archon workflows. |

## Architecture Maps

| Document | Purpose |
|---|---|
| `docs/LAYERED_ARCHITECTURE_MAP.md` | User, application, model, service, infra, orchestration, trust/governance layers. |
| `docs/INSURANCE_IMPLEMENTATION_PLAN.md` | Insurance verticalization plan for claims, underwriting, customer-service, and fraud/SIU across frontend, API, data, ML/RAG, observability, and governance. |
| `docs/DEPARTMENT_AI_STRATEGY_PROCESS_AUDIT_2026-06-08.md` | Department/process AI strategy, pain, ROI, dollar impact, data availability, AI lever, B2B/B2C/B2E, transactional/analytical/decision AI, and demo scenario audit. |
| `docs/architecture/ENTERPRISE_AI_REFERENCE_ARCHITECTURE.md` | Enterprise AI reference architecture. |
| `docs/architecture/DEPARTMENT_OPERATING_SYSTEM.md` | Department operating system model. |
| `docs/architecture/DEPARTMENT_OS_BLUEPRINT.md` | Department OS blueprint. |
| `docs/PRODUCTION_AGENT_PLATFORM_ARCHITECTURE.md` | Production agent tooling blueprint and enterprise Dark Factory architecture: workflow engines, agent/control/execution/runtime planes, observability, trust/governance, AutoGen, CrewAI, LangGraph, Temporal, OpenClaw, OpenTelemetry, OPA, Kafka, Istio/Kiali, RDF/OWL, graph DB, ontology, simulation. |
| `docs/ENTERPRISE_INTEGRATION_OPERATIONS_MATRIX.md` | Integration matrix for circuit breakers, service discovery, gateways, load balancing, DB viewer, gRPC, Redis, Memcached, Ollama/Kivi, operations, and thresholds. |
| `docs/GLOBAL_AGENT_ARCHITECTURE_POLICY.md` | Reusable global agent architecture policy: layers, runtime, tools, memory, security, governance, observability, MCP, policy engine. |
| `docs/AGENT_PLATFORM_INTERVIEW_GUIDE.md` | Interview-ready explanation of the multi-agent platform, business problem, architecture, security, observability, and challenges. |
| `docs/diagrams/agent-platform-architecture.md` | Mermaid diagrams for layered agent platform, runtime, tool governance, memory/RAG, and observability flows. |

## API And Backend Inventory

| Document | Purpose |
|---|---|
| `docs/API_ENDPOINT_CATALOG.md` | Human-readable API input/process/output/security/tracing catalog. |
| `docs/API_CATALOG.json` | Machine-readable API contract catalog generated from FastAPI. |
| `docs/API_ASSISTANT_MESSAGE_CATALOG.json` | API catalog in assistant message/output_text JSON format. |
| `docs/BANKING_TAB_ALIGNMENT.md` | Banking-style process detail tab, sub-tab, component, and blueprint data-source alignment map. |
| `docs/BACKEND_FILE_INVENTORY.md` | Backend Python file inventory with layer, gist, classes, functions, flow notes. |
| `docs/BACKEND_FILE_INVENTORY.json` | Machine-readable backend file inventory. |
| `docs/MODEL_CATALOG_FLOW.md` | Model catalog/`ml_models` rationale and flow chain. |
| `docs/GLOBAL_INPUT_PERSISTENCE_POLICY.md` | Canonical input-event persistence contract and `user_input_events` database table. |

## Agent And Council Governance

| Document | Purpose |
|---|---|
| `docs/AGENT_COUNCIL_ARCHITECTURE.md` | Council-of-agents, hybrid/hexagonal architecture, OpenClaw/Piperclip/Harness placeholders. |
| `docs/AGENT_FILE_INVENTORY.md` | Agent file responsibilities and flow. |
| `docs/AGENT_HARNESS_GUIDE.md` | Run/debug agent and council workers, including OpenClaw and Paperclip local adapter flows. |
| `docs/AGENT_SUPERVISOR_RUNBOOK.md` | Monitor/supervise all local agents, queues, schedules, process tests, health gates, reports, and task status. |
| `docs/AGENT_PLATFORM_SETUP.md` | Unified setup/status for Harness Agent, OpenClaw, Paperclip, PoliysAI, CUA, Stagehand, Playwright, policy gates, and commands. |
| `docs/AGENT_MODEL_ROUTING_POLICY.md` | Default OpenClaw/Ollama model routing and profile policy for local agent automation. |
| `docs/ADVANCED_AGENTIC_OS_TOOLING_PLAN.md` | Advanced Agentic OS catalog and adoption plan for Superpowers, NeMo Guardrails, Letta/Mem0, Semantic Kernel, GraphRAG/Neo4j, HITL, reflection, lineage, RDF/OWL, Purview, and evaluators. |
| `docs/SPEC_KIT_RUNBOOK.md` | Spec Kit intake layer for structured specs, acceptance criteria, BMAD handoff, and optional OpenClaw routing. |
| `docs/KT_BMAD_SPACE_RUNBOOK.md` | KT + BMAD kickoff workspace for short tasks, voice transcripts, BMAD handoff, and optional OpenClaw submission. |
| `docs/ADVANCED_AGENTIC_STACK_SETUP.md` | Advanced local setup for BMAD, Archon, approval watcher, OpenClaw, and agent fleet readiness. |
| `docs/TOP_1_PERCENT_AI_DELIVERY_SETUP.md` | Top-tier AI delivery setup blueprint: features, value, use cases, readiness, install priorities, and commands. |
| `docs/AI_COMMAND_CENTER_MONITORING_DELEGATION_RUNBOOK.md` | Command-center runbook for monitoring portals, delegation, operations, task queues, quality gates, and escalation. |
| `docs/VOICE_TEXT_AUTOMATION_RUNBOOK.md` | Voice/transcribed-text automation, planning, scheduling, cron, Ollama, and OpenClaw execution. |
| `docs/DARK_FACTORY_OPERATING_MODEL.md` | AI-assisted delivery operating model tying BMAD, Archon, coding agents, local agent-platform adapters, CI, security, monitoring, and human approvals together. |
| `docs/BMAD_RECIPES.md` | Project-specific BMAD recipes, including the full AI Dark Factory flow from idea to monitoring. |
| `docs/global-services/GLOBAL_AGENT_SERVICE_POLICY.md` | Global policy for other projects to access agent services, Ollama/Kivi, OpenClaw, Paperclip, governance, and monitoring. |
| `docs/global-services/GLOBAL_AGENT_APPROVAL_POLICY.md` | Approval agent, next-agent approval, reviewer/search/code/advisor/error/memory/MCP agent workflow. |
| `docs/global-services/CLAUDE_CODEX_HANDOFF_POLICY.md` | Claude/Codex coordination and handoff requirements. |
| `docs/global-services/MCP_MONITORING_POLICY.md` | MCP server monitoring, integration gates, and future connector candidates. |
| `docs/global-services/MISSING_GLOBAL_POLICIES_CHECKLIST.md` | Remaining global policies to create for production hardening. |
| `docs/global-services/agent-service-manifest.json` | Machine-readable service manifest for cross-project integration. |
| `docs/AGENT_TOOL_SELECTION_MATRIX.md` | Tool selection matrix for Hermes Agent, OpenClaw, Kilo Code, Descript, Archon, Copilot, and similar tools. |
| `docs/APPROVAL_GOVERNANCE.md` | Human approval model for Archon gates, CODEOWNERS, CI governance checks, and deployment approval. |
| `docs/NO_APPROVAL_AUTONOMY_POLICY.md` | Minimum-interruption policy for coding agents and local validation work. |
| `docs/CODEX_APPROVAL_CRON_POLICY.md` | Cron policy and installer for safe local approval scans. |
| `docs/CODEX_APPROVAL_CRON_RUN_PLAN.md` | Run plan and evidence checklist for safe local approval scans. |
| `docs/CODEX_APPROVAL_ADVANCED_POLICY.md` | Advanced watcher mode for minimizing repeated local approval clicks. |
| `docs/AGENTIC_BROWSER_WIRING_STATUS.md` | Honest status of Stagehand, Browser Use, Open Operator, OpenClaude, Playwright, Paperclip/Piperclip, Istio, Circuit Breaker. |

## Testing Governance

| Document | Purpose |
|---|---|
| `docs/testing/MASTER_TESTING_MATRIX.md` | Broad testing tool catalog and AI/agentic testing matrix. |
| `docs/testing/GLOBAL_DEFAULT_TESTING_POLICY.md` | Default repo-wide testing gate, tool stack, agent assignment, reporting, notification, and update policy. |
| `docs/testing/DEFAULT_TESTING_AGENT_ASSIGNMENTS.json` | Machine-readable default testing agent, cadence, report, and notification catalog. |
| `docs/testing/OPEN_SOURCE_TESTING_ECOSYSTEM.md` | Complete open-source testing ecosystem with current repo status and adoption order. |
| `docs/testing/ENTERPRISE_AI_TESTING_LANDSCAPE.md` | Enterprise AI-native testing pyramid, architecture, missed gaps, and final recommended stack. |
| `docs/testing/GLOBAL_PROCESS_TESTING_POLICY.md` | Global policy for process/subprocess testing, agent assignment, cron scheduling, evidence, and promotion gates. |
| `docs/testing/PROCESS_AGENT_CRON_CATALOG.md` | Generated per-process testing agent and cron summary. |
| `docs/testing/PROCESS_TESTING_DIAGRAMS.md` | Graphs, flowcharts, pipeline, cron scheduling, and agent assignment diagrams for process testing. |
| `docs/testing/README.md` | Testing docs entry point. |
| `backend/tests/` | Backend unit/service/API tests. |
| `frontend/e2e/` | Frontend Playwright E2E tests. |

## Runbooks And Debugging

| Document | Purpose |
|---|---|
| `docs/RUN_DEBUG_RUNBOOK.md` | Docker, backend, frontend, database, API, logs, F12 trace debugging. |
| `scripts/project_doctor.sh` | One-command local validation. |
| `docker-compose.yml` | Local stack: Postgres, Redis, Ollama, MLflow, backend, frontend, workers, agents, Adminer. |

## Mandatory Update Rules

When behavior changes, update the matching docs:

| Change Type | Required Docs |
|---|---|
| Setup/run/debug changes | `README.md`, `docs/RUN_DEBUG_RUNBOOK.md`, `AGENTS.md` if agent-facing |
| Backend/API change | `docs/API_ENDPOINT_CATALOG.md`, `docs/API_CATALOG.json`, `docs/BACKEND_FILE_INVENTORY.md` |
| User input persistence or capture behavior | `docs/GLOBAL_INPUT_PERSISTENCE_POLICY.md`, `docs/BACKEND_GLOBAL_POLICY.md`, `docs/UI_GLOBAL_POLICY.md`, API catalog + backend inventory when endpoints/files are added |
| Service/database/model change | `docs/BACKEND_FILE_INVENTORY.md`, `docs/MODEL_CATALOG_FLOW.md` if model-related, migrations docs if schema changes |
| Frontend behavior change | `docs/UI_GLOBAL_POLICY.md` if policy changes, README if setup changes |
| Agent/council/browser automation change | `docs/AGENT_COUNCIL_ARCHITECTURE.md`, `docs/AGENTIC_BROWSER_WIRING_STATUS.md`, `docs/AGENT_HARNESS_GUIDE.md` |
| Tool adoption | `docs/AGENT_TOOL_SELECTION_MATRIX.md`, security notes, README |
| Requirement/scope change | `docs/PROJECT_REQUIREMENTS.md`, `docs/STATUS.md` |

## Validation Gate

Default local gate:

```bash
./scripts/project_doctor.sh
```

Expected baseline:

- frontend build passes
- frontend lint passes
- backend tests pass excluding opt-in evals
- failures are zero

Opt-in AI/RAG eval tests require local Ollama/model availability and are not part of the default gate.
