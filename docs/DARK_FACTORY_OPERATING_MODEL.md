# Dark Factory Operating Model

The dark factory is the repo's AI-assisted delivery operating model. It is not a standalone product, backend runtime, or permission to run autonomous production changes. It coordinates existing developer tools under explicit approval, audit, validation, and documentation gates.

## Role Boundaries

| Layer | Tooling | Responsibility | Boundary |
|---|---|---|---|
| Planning and specification | BMAD | PRD, story, acceptance criteria, review checklists, recurring AI task structure | No production runtime access. No direct deploy authority. |
| Workflow orchestration | Archon | Repeatable developer workflows with approval pauses before implementation and handoff | Local developer harness only. No bypass of CI, CODEOWNERS, or project doctor. |
| Coding assistance | Codex, Claude, GitHub Copilot CLI | Repo-aware implementation, review, test repair, and documentation updates | Must follow AGENTS.md, governance docs, and least-privilege tool approvals. |
| Runtime integration surfaces | Harness Agent, OpenClaw, Paperclip, CUA, Stagehand, Playwright | Local agent/platform adapters, browser automation, audit readback, and task routing | Must remain behind RBAC, tenant headers, dry-run/allowlist gates, and service boundaries. |
| Governance and release | CODEOWNERS, GitHub Actions, deployment environments | Human approval, CI checks, docs drift checks, production deployment review | Merge and deployment approval stay with humans. |

## Approved Flow

1. Define intent with BMAD artifacts or an equivalent issue/spec.
2. Run an Archon workflow when the change benefits from repeatable issue, implementation, and validation steps.
3. Pause at the Archon implementation approval gate before code changes.
4. Implement through normal repo boundaries: routers are HTTP-only, services own logic, repositories own SQL, schemas own contracts.
5. Update the required docs listed in `docs/GOVERNANCE_INDEX.md`.
6. Run focused drills plus `./scripts/project_doctor.sh`.
7. Pause at Archon final handoff when used.
8. Use PR, CODEOWNERS, CI, and deployment environment approvals for merge and release.


## BMAD AI Dark Factory Full Flow

This is the canonical target flow for BMAD inside the AI Dark Factory. It is an operating model, not proof that every tool is production-wired today.

```text
Idea
  -> BMAD Analyst Agent
  -> PRD
  -> BMAD Architect Agent
  -> System Design
  -> BMAD Scrum Agent
  -> Stories
  -> Archon Workflow
  -> OpenHands Coding
  -> Playwright Testing
  -> DeepEval Validation
  -> Temporal Approval Workflow
  -> Deployment
  -> OpenTelemetry Monitoring
```

| Stage | Repo artifact or command | Current status | Gate |
|---|---|---|---|
| Idea | Issue, prompt, stakeholder note, or `bmad-product-brief` | Working manual input | Human owns scope and priority. |
| BMAD Analyst Agent | `_bmad/`, `.claude/skills/bmad-agent-analyst`, `bmad-create-prd` | Installed methodology/scaffold | No runtime access or deployment authority. |
| PRD | `docs/PROJECT_REQUIREMENTS.md`, feature PRD, acceptance criteria | Working doc artifact | Requirement/scope changes must update governance docs. |
| BMAD Architect Agent | `bmad-agent-architect`, `bmad-create-architecture` | Installed methodology/scaffold | Must respect router/service/repository/schema boundaries. |
| System Design | Architecture notes, API contracts, data flow, RBAC/tenant/idempotency plan | Working doc artifact | Backend/API changes update catalog and inventory docs. |
| BMAD Scrum Agent | `bmad-create-epics-and-stories`, `bmad-create-story`, `bmad-sprint-planning` | Installed methodology/scaffold | Stories must include tests, docs, and rollback expectations. |
| Stories | Backlog items, Archon workflow input, PR checklist | Working manual artifact | Operator selects the next story. |
| Archon Workflow | `archon workflow run insur-project-doctor-fix ...`, `archon workflow run insur-api-change-governance ...` | Working local developer harness | Approval gates stay local and do not bypass CI/CODEOWNERS. |
| OpenHands Coding | Candidate developer harness | Target only, not wired | If adopted, it must stay sandboxed and outside production runtime. |
| Current coding substitute | Codex, Claude, GitHub Copilot CLI | Working developer tooling | Must follow AGENTS.md, docs, sandbox approvals, and focused validation. |
| Playwright Testing | Frontend E2E and local browser/CUA adapters | Working local where configured | Real browser/CUA execution remains allowlist and audit gated. |
| DeepEval Validation | AI/RAG eval target in testing docs | Target or opt-in only | Not part of default `project_doctor`; requires explicit local model/eval setup. |
| Temporal Approval Workflow | Production-grade approval orchestrator target | Target only, not wired | Current substitute is Archon gates, approval broker, CODEOWNERS, and deployment environments. |
| Deployment | GitHub environment/manual release path | Operator-gated | No autonomous production deployment. |
| OpenTelemetry Monitoring | OTel/OpenLit/Langfuse/Phoenix target stack | Target or partial only | Current substitute is structured logs, correlation IDs, audit logs, and supervisor runbooks. |

### Working Local Substitute

Until OpenHands, DeepEval, Temporal, and full OpenTelemetry are intentionally wired, use this local chain:

```bash
./scripts/bmad.sh status
archon workflow run insur-project-doctor-fix "describe the issue"
python3 scripts/archon_auto_approve_safe.py --watch --approve
curl -X POST http://127.0.0.1:8001/api/v1/agent-platform/approval-broker/decide
./scripts/project_doctor.sh
```

The approval broker can classify safe `approve`, `submit`, and `next` requests and can submit safe next tasks into OpenClaw-compatible routing. It must return human approval or denial for production, secrets, destructive actions, GitHub administration, real browser/CUA, database migration, and external SaaS-write requests.

### No-Claim Rule

Do not describe a stage as "wired", "production-ready", or "automated" unless the relevant setup, wiring, API catalog, tests, and runbook prove it. If a tool is installed but not integrated, mark it as scaffolded or target-only. If a tool requires credentials, production infrastructure, or admin settings, mark it as operator-gated.

## Enterprise Expansion Path

The local Dark Factory can grow into the enterprise flow below, but each added tool must pass the adoption rule in `docs/AGENT_TOOL_SELECTION_MATRIX.md` and the production gates in `docs/PRODUCTION_AGENT_PLATFORM_ARCHITECTURE.md`.

```text
Idea / Ticket
  -> BMAD
  -> PRD + User Stories + Acceptance Criteria
  -> Archon
  -> Planner Agent
  -> Developer Agent / OpenHands / Cline
  -> Code Commit / Git Worktree
  -> Playwright + Unit Tests
  -> SonarQube + Semgrep + Trivy
  -> DeepEval / LangSmith Validation
  -> GitHub PR
  -> Harness / GitHub Actions
  -> Kubernetes Deployment
  -> Istio + Kiali + OpenTelemetry Monitoring
```

Current default remains local and conservative: BMAD, Archon, Codex/Claude/Copilot, focused tests, approval broker, CODEOWNERS, GitHub Actions, and `project_doctor`. Enterprise additions such as OpenHands/Cline, SonarQube, Semgrep, Trivy, DeepEval, LangSmith, Harness, Kubernetes, Istio, Kiali, and full OpenTelemetry are not default until the repo has configuration, credentials policy, tests, and runbooks for them.

## Required Controls

- Human approval before destructive actions, external deploys, broad CLI permissions, or production data access.
- No raw production database credentials in AI tools or local workflow files.
- No repo-local secrets. User-local secret files such as `~/.archon/.env` must stay outside git and use restrictive permissions.
- RBAC and tenant headers on agent-platform APIs.
- Audit readback for CUA and admin automation.
- Dry-run or allowlist gates for browser and CUA execution.
- Governance diff checks for API, backend, frontend, agent, and tool changes.
- `./scripts/project_doctor.sh` before handing back production-facing changes.

## Non-Goals

- No autonomous production writes.
- No direct database bypass around service/repository boundaries.
- No unapproved browser automation against sensitive systems.
- No broad `--allow-all` or `--yolo` coding sessions for sensitive changes.
- No claim that candidate tools are production-wired until their status is verified in the relevant setup and wiring docs.

## Current Status

BMAD is installed locally as methodology and skill scaffolding. Archon is installed locally as a developer workflow harness with BEV workflows under `.archon/`. Harness Agent, OpenClaw, Paperclip, CUA, Stagehand, and Playwright are tracked in `docs/AGENT_PLATFORM_SETUP.md` and `docs/AGENTIC_BROWSER_WIRING_STATUS.md`.
