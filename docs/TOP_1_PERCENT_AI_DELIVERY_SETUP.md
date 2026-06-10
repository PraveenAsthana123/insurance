# Top 1 Percent AI Delivery Setup

This is the practical setup blueprint for a top-tier local AI delivery system in this repository. It ties together BMAD, Spec Kit/OpenSpec-style intake, GSD/Ralph loops, agentic orchestration, browser automation, approval policy, monitoring, and the AI Dark Factory operating model.

It is not permission to install every external tool. Tools move through readiness gates: `use now`, `pilot`, `candidate`, `future gated`.

## Executive Standard

```text
Spec intake
  -> BMAD planning
  -> GSD/Ralph execution loop
  -> Pneumatic workflow engine
  -> Agentic orchestration
  -> Browser/test automation
  -> Approval/governance
  -> Monitoring/evals
  -> Feedback into next spec
```

## Current Local Readiness

Generated from `scripts/test_advanced_agentic_os_tools.py --json` on 2026-06-05.

| Layer | Status | What this means |
|---|---|---|
| Spec Kit | PASS | Repo-local `scripts/spec_kit.py`, KT/BMAD workspace, and runbook are available. |
| BMAD | PASS | Local BMAD 6.8.0 install is present under `_bmad/`; `scripts/bmad.sh status` works. |
| LangGraph | PARTIAL | Candidate only; package is not installed in the active check. |
| OpenAI Agents SDK | PARTIAL | Candidate only; distribution is not installed in the active check. |
| AutoGen | MISSING | Candidate not installed. |
| CrewAI | MISSING | Candidate not installed. |
| Agentic OS | PASS | Control map, Ollama, and OpenClaw-compatible local status are present. |
| Mem0 + Letta | MISSING | Candidate memory layer; needs retention/tenant/PII policy before install. |
| GraphRAG + Neo4j | PASS | `neo4j` package import works and graph/DB UI references exist; backend graph store still needs explicit wiring for production use. |
| LangSmith + Phoenix | PARTIAL | LangSmith package exists; Phoenix and LangSmith key are missing. Prefer self-host posture where possible. |
| NeMo Guardrails | PARTIAL | Local guardrails service exists; NeMo package/global endpoint not wired. |
| AgentOps | PARTIAL | Service scaffolding exists; SDK/API key missing. |
| AI Command Center | PASS | Supervisor, console, and runbooks exist. |
| Enterprise Decision OS | GATED | Future layer; local approval/governance evidence exists, production signoff required. |
| Autonomous Enterprise OS | GATED | Future target only; autonomy remains bounded by approval policy. |

## Install / Setup Priority

### Use Now

| Feature | Setup Command / Doc | Value |
|---|---|---|
| Spec Kit intake | `scripts/spec_kit.py create --bmad --text "..."` | Converts vague work into structured specs and acceptance criteria. |
| KT + BMAD workspace | `scripts/kt_bmad_space.py create --text "..."` | Creates a kickoff workspace for voice/text tasks and BMAD handoff. |
| BMAD method | `scripts/bmad.sh status` | Planning, PRD, architecture, story, review, and readiness checklist discipline. |
| Agent platform status | `./scripts/setup_agent_platform.py status` | Shows Harness/OpenClaw/Paperclip/CUA/Stagehand/Playwright readiness. |
| Agent fleet | `./scripts/agent_fleet.sh platform-status` | Local worker/council execution visibility. |
| Approval policy | `docs/NO_APPROVAL_AUTONOMY_POLICY.md` | Reduces approval noise while preserving hard gates. |
| Project validation | `npm run lint`, `npm run build`, `./scripts/project_doctor.sh` | Baseline quality gate before handoff. |

### Pilot Next

| Feature | Setup Direction | Value |
|---|---|---|
| LangGraph | Add only after one workflow graph is designed and tested. | Durable, inspectable agent graphs for multi-step work. |
| OpenAI Agents SDK | Pilot for typed tool orchestration where OpenAI APIs are explicitly selected. | Strong managed-agent API path. |
| AutoGen / CrewAI | Pilot against existing local council before defaulting. | Multi-agent conversation/role patterns. |
| NeMo Guardrails | Layer behind auth/RBAC/HITL, never as authorization. | Response/prompt safety controls. |
| Letta + Mem0 | Install only after memory retention and PII deletion policy. | Cross-session agent memory. |
| Phoenix / Langfuse / OpenLIT | Prefer self-host tracing where possible. | Observability, traces, eval datasets. |
| Stagehand / CUA | Keep dry-run until allowlist, trace retention, approval, and audit exist. | Browser automation for operator workflows. |
| Playwright | Use deterministic UI validation first. | Reliable browser tests and screenshots. |

### Future Gated

| Feature | Gate |
|---|---|
| Enterprise Decision OS | Enterprise signoff, audit model, escalation path, production approval gates. |
| Autonomous Enterprise OS | Proven bounded autonomy, evals, rollback, monitoring, security review. |
| Microsoft Purview | Azure tenant, credentials, data boundary review. |
| Temporal / Argo / enterprise workflow engines | Operational ownership, deployment model, workflow versioning, recovery plan. |

## Top 1 Percent Feature Setup

| Capability | Feature Setup | Business Value |
|---|---|---|
| Spec-driven delivery | Spec Kit + OpenSpec-style contracts + BMAD | Fewer vague tasks; clearer acceptance criteria. |
| GSD execution | Ralph loop: plan, act, inspect, improve | Keeps work moving in small validated increments. |
| Pneumatic workflow | Trigger -> intake -> plan -> execute -> review -> approve -> monitor | Repeatable delivery pipeline. |
| Hierarchical orchestration | Manager agent assigns to specialist agents | Efficient division of work. |
| Hub-and-spoke | Central orchestrator routes to tools and agents | Clear control point and audit trail. |
| Council of agents | Author/reviewer/security/test/chair roles | Better decisions and fewer blind spots. |
| Mesh agents | Parallel independent research/checks only | Speed for independent tasks without blocking. |
| Harness Agent | Worker fleet + scheduler + supervisor | Local execution and visibility. |
| OpenClaw-compatible bridge | API/Redis task submission | Local agent/council work routing. |
| Computer-using agent | Dry-run first; real actions gated | Future browser/computer automation. |
| Stagehand | Candidate browser workflow adapter | Higher-level browser automation. |
| Playwright | Deterministic tests/screenshots | Reliable UI validation. |
| GraphRAG + Neo4j | Graph schema + ingestion + query API | Relationship-aware retrieval and explanations. |
| Memory | Letta/Mem0 only after retention policy | Persistent agent context. |
| Guardrails | NeMo/local guardrails behind policy | Safer AI outputs. |
| Observability | Phoenix/Langfuse/OpenLIT/AgentOps candidates | Traces, cost, performance, failure visibility. |
| Approval broker | Auto-approve safe local work, gate high risk | Fewer clicks without unsafe autonomy. |
| Dark Factory | End-to-end automated delivery model | Idea-to-monitoring system with governance. |

## Use Cases This Helps

| Use Case | Best Setup |
|---|---|
| Convert voice/text idea into implementation task | Voice transcript -> Spec Kit -> BMAD -> Archon/OpenClaw task. |
| Build a frontend workflow safely | Spec Kit -> BMAD UI story -> code agent -> Playwright screenshot/build. |
| Fix project failures | Archon workflow -> project doctor -> coding agent -> lint/build/test. |
| Run 100 local workers | `agent_fleet.sh start-100-kivi` plus supervisor health checks. |
| Route complex work through council | OpenClaw council mode + reviewer/test/security roles. |
| Browser validation | Playwright deterministic test first; Stagehand/CUA only after hard gates. |
| Agent memory pilot | Letta/Mem0 candidate with tenant/PII retention policy. |
| Enterprise audit trail | Approval broker + audit rows + transaction history + HITL. |
| Process automation | Pneumatic workflow: trigger, assign, execute, validate, monitor. |
| Data/AI governance | GraphRAG/Neo4j + lineage + guardrails + evals. |


## Monitoring And Delegation

Use `docs/AI_COMMAND_CENTER_MONITORING_DELEGATION_RUNBOOK.md` as the operating runbook for:

- portals to open
- operational commands to run
- task queues to inspect
- delegation patterns
- agent/test/council ownership
- quality gates
- daily and weekly checklists
- escalation rules

## Default Execution Flow

```text
1. Capture request
2. Create Spec Kit item
3. Convert to BMAD PRD/story/checklist
4. Choose orchestration pattern:
   - simple local task
   - hub-and-spoke
   - council review
   - mesh/parallel research
5. Execute through local agent/harness where useful
6. Validate with lint/build/tests/project doctor
7. Apply approval policy:
   - safe local work proceeds
   - hard gates require human/platform approval
8. Write report and update docs
9. Feed findings back into next spec
```

## Commands

```bash
# Readiness
scripts/test_advanced_agentic_os_tools.py --json
scripts/advanced_agentic_os_tools.py ladder --verbose

# Spec and BMAD
scripts/spec_kit.py create --bmad --text "Build a governed workflow for X"
scripts/kt_bmad_space.py create --text "Kick off X"
scripts/bmad.sh status

# Agent platform
./scripts/setup_agent_platform.py status
./scripts/agent_fleet.sh platform-status
./scripts/agent_fleet.sh supervisor-health

# Advanced stack
scripts/setup_advanced_agentic_stack.sh status
scripts/setup_advanced_agentic_stack.sh setup
scripts/setup_advanced_agentic_stack.sh smoke

# Frontend validation
cd frontend
npm run lint
npm run build
```

## Hard Gates

These still require explicit approval or operator setup:

- dependency downloads and installs
- credentials and API keys
- production deploys or production data changes
- destructive commands
- files outside writable workspace
- external SaaS writes
- real CUA/browser side effects
- GitHub admin/auth/merge/release operations

## Recommendation

Do not install every framework immediately. The highest-value next move is:

```text
Spec Kit + BMAD + Approval Broker + Agent Fleet + Playwright + Phoenix/Langfuse-style local observability
```

Then pilot LangGraph, OpenAI Agents SDK, AutoGen, CrewAI, Letta/Mem0, and NeMo Guardrails one at a time with parity tests against the existing local OpenClaw/council baseline.
