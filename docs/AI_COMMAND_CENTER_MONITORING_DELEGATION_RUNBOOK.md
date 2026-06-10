# AI Command Center Monitoring And Delegation Runbook

This runbook defines the practical operating layer for monitoring, delegation, operations, tasks, and quality in the INSUR project.

Use it after `docs/TOP_1_PERCENT_AI_DELIVERY_SETUP.md` when the question is:

- what portal do I open?
- what operation do I run?
- what task queue owns the work?
- which agent or council should handle it?
- what quality gate proves it is complete?

## Operating Model

```text
Portal / CLI
  -> Observe status
  -> Create or inspect task
  -> Delegate to simple agent, council, tester, or human owner
  -> Validate output
  -> Record evidence
  -> Promote, retry, escalate, or reject
```

The command center is not a bypass for production approvals. It reduces repeated local approval clicks for safe repo-local work and keeps hard gates for credentials, dependency downloads, destructive commands, production writes, external SaaS writes, real CUA/browser side effects, and files outside the writable workspace.

## Portals To See

| Portal / Surface | URL / Command | Use |
|---|---|---|
| Frontend app, Docker | `http://localhost:3000` | Main operator UI and business process workspace. |
| Frontend app, Vite | `http://localhost:5173` | Local frontend development UI. |
| Backend API | `http://localhost:8000` | FastAPI service root. |
| Backend OpenAPI | `http://localhost:8000/docs` | API contract, request testing, endpoint inspection. |
| Agent platform status | `http://localhost:8000/api/v1/agent-platform/status` | Harness/OpenClaw/Paperclip/CUA/Stagehand/Playwright status. |
| Agent platform manifest | `http://localhost:8000/api/v1/agent-platform/manifest` | Machine-readable platform contract. |
| OpenClaw status | `http://localhost:8000/api/v1/openclaw/status` | Local OpenClaw-compatible task bridge status. |
| Paperclip status | `http://localhost:8000/api/v1/paperclip/status` | Artifact/context-pack status. |
| MLflow | `http://localhost:5001` | Experiment, model, run, metric, and artifact tracking. |
| NGINX gateway | `http://localhost:8080` | Local gateway in front of backend/frontend when enabled. |
| Agent supervisor report | `data/agent-supervisor/latest.json` or custom report path | Snapshot of queues, heartbeats, schedules, and task results. |
| Agent CLI dashboard | `./scripts/agent_fleet.sh supervisor` | One-shot command center view. |
| Agent watch mode | `./scripts/agent_fleet.sh supervisor-watch` | Continuous local agent monitoring. |
| Compact queue monitor | `./scripts/agent_fleet.sh watch` | Fast queue-depth and worker movement view. |
| Docker service status | `docker compose ps` | Container health and port readiness. |
| Docker logs | `docker compose logs -f backend frontend agents council_agents redis` | Runtime debugging. |
| Process test catalog | `docs/testing/PROCESS_AGENT_CRON_CATALOG.md` | Process-to-agent-to-cron coverage. |

Notes:

- Ollama is available inside Docker at `http://ollama:11434`; the compose file intentionally does not expose the container Ollama port because the host may already use `11434`.
- Adminer is referenced by older docs but is not currently exposed in the checked `docker-compose.yml`; treat it as optional until a service is re-added.

## Operations List

| Operation | Command / Surface | Owner | Success Signal |
|---|---|---|---|
| Start core app | `docker compose up -d postgres redis backend frontend` | Operator / SRE | frontend and backend reachable. |
| Start AI runtime | `docker compose up -d ollama` | Operator / AI platform | Ollama container healthy and agents can call it. |
| Start 100 simple agents | `./scripts/agent_fleet.sh start-100-kivi 100 100` | Agent platform | queue drains and heartbeats are live. |
| Start simple workers | `./scripts/agent_fleet.sh start-simple 20 0` | Agent platform | live simple-agent heartbeats. |
| Start council workers | `./scripts/agent_fleet.sh start-council 5 0` | Agent platform | live council-agent heartbeats. |
| Submit simple task | `./scripts/agent_fleet.sh submit-simple "..." engineering` | Codex / Claude / operator | returned task id appears in `done`. |
| Submit council task | `./scripts/agent_fleet.sh submit-council "..." engineering` | Codex / Claude / operator | author/reviewer/chair result exists. |
| Inspect one task | `./scripts/agent_fleet.sh task-status <task_id>` | Operator | normalized result found. |
| Add recurring schedule | `./scripts/agent_fleet.sh schedule-add <name> <seconds> <mode> "..." <dept>` | Operator / scheduler | schedule listed and later emits task ids. |
| Run scheduler | `./scripts/agent_fleet.sh schedule-run` | Scheduler | due jobs enqueue tasks. |
| List schedules | `./scripts/agent_fleet.sh schedule-list` | Operator | expected schedules visible. |
| Health gate | `./scripts/agent_fleet.sh supervisor-health` | Release owner | exit code zero. |
| Write report | `./scripts/agent_fleet.sh supervisor-report` | Operator / CI | JSON report written. |
| Frontend quality | `cd frontend && npm run lint && npm run build` | Frontend owner | lint/build pass. |
| Project doctor | `./scripts/project_doctor.sh` | Release owner | default health check passes or known blockers documented. |
| Process-test dry run | `./scripts/process_test_plan.py run --suite-id <suite> --mode full --dry-run` | Tester | generated envelope is valid. |
| Process-test execution | `./scripts/process_test_plan.py run --suite-id <suite> --mode full` | Tester / council | OpenClaw task id returned and result passes. |
| Advanced readiness | `scripts/test_advanced_agentic_os_tools.py --json` | AI platform | readiness statuses known. |
| Agent platform status | `./scripts/setup_agent_platform.py status` | AI platform | local tool readiness reported. |
| BMAD status | `./scripts/bmad.sh status` | Delivery lead | BMAD local method available. |
| Spec intake | `scripts/spec_kit.py create --bmad --text "..."` | Analyst / PM / Codex | spec workspace and BMAD handoff created. |

## Delegation Model

| Work Type | Delegate To | Pattern | When To Use |
|---|---|---|---|
| Small safe repo-local change | Codex / Claude directly | Single executor | Docs, UI copy, small code fixes, local validation. |
| Many independent small tasks | Simple OpenClaw agents | Parallel queue | 10 to 100 similar checks or summaries. |
| Risky design or governance question | Council agents | Author -> reviewer -> chair | Architecture, release, compliance, production readiness. |
| Process testing | Primary process test agent | Test catalog assignment | Department process smoke/full coverage. |
| Security/RBAC/policy validation | `security-governance-test-agent` | Specialist review | Tenant isolation, prompt injection, unsafe tool paths. |
| Data quality and lineage | `data-quality-test-agent` | Specialist test | Freshness, completeness, uniqueness, drift, lineage. |
| AI/RAG quality | `ai-evaluation-test-agent` | Evaluator | Citation quality, hallucination checks, prompt stability. |
| Resilience and observability | `resilience-observability-test-agent` | Specialist test | Latency, retry, logs, traces, metrics, correlation ids. |
| Human approval workflow | `hitl-workflow-test-agent` + operator | HITL | Approval, escalation, rollback, exception handling. |
| Browser/UI validation | Playwright first | Deterministic browser test | Screenshots, navigation, UI regressions. |
| Real CUA/Stagehand side effects | Human-gated execution | Approval-required | Only after allowlist, audit, trace retention, and rollback. |

## Task Queues

| Queue | Result Queue | Producer | Consumer | Use |
|---|---|---|---|---|
| `tasks` | `done` | OpenClaw simple mode, `submit-simple` | `agents` | Fast local execution tasks. |
| `council_tasks` | `council_done` | OpenClaw council mode, `submit-council` | `council_agents` | Reviewed multi-agent work. |
| `test_tasks` | `test_results` | Process testing catalog / test harness | `test_agents` | Process and tiered test execution. |
| Scheduler metadata | emitted into task queues | `scripts/agent_scheduler.py` | simple/council/test workers | Recurring monitoring and process tests. |
| Supervisor report | JSON file | `scripts/agent_supervisor.py` | operator / CI / release owner | Operational health evidence. |

## Quality Gates

| Quality Area | Required Signal | Gate |
|---|---|---|
| Task completion | task id, result queue, `ok=true` or accepted failure reason | No silent completion. |
| Agent liveness | fresh `agent:heartbeat:*` keys | Pending queues must have live workers. |
| Queue health | queue depth under threshold or active drain rate | Escalate if backlog grows. |
| Result quality | malformed/failed recent results below supervisor threshold | Stop and inspect failures above threshold. |
| Frontend | `npm run lint`, `npm run build` | Must pass for UI changes. |
| Backend/API | focused tests plus API catalog updates when behavior changes | Must pass or blocker documented. |
| Full project | `./scripts/project_doctor.sh` | Required before production-facing handoff. |
| Process coverage | smoke daily, full weekly per process catalog | Process not production-ready without coverage. |
| Data quality | freshness, completeness, uniqueness, referential checks, lineage, drift | Required for data/AI workflows. |
| AI quality | citations, hallucination checks, prompt stability, eval score | Required for RAG/explanation workflows. |
| Governance | RBAC, tenant isolation, approval decision, audit fields | Required for governed actions. |
| Browser automation | allowlist, trace/screenshot, audit row, rollback path | Required before real side effects. |
| Documentation | matching governance/runbook/API/UI docs updated | Required when behavior changes. |

## Daily Operator Checklist

```bash
docker compose ps
./scripts/setup_agent_platform.py status
./scripts/agent_fleet.sh supervisor
./scripts/agent_fleet.sh supervisor-health
scripts/test_advanced_agentic_os_tools.py --json
```

Review:

- backend and frontend are reachable
- Redis queues are not stuck
- agents have fresh heartbeats
- schedules are registered when expected
- recent failures are understood
- no hard-gated action was auto-executed

## Weekly Quality Checklist

```bash
./scripts/process_test_plan.py list
./scripts/process_test_plan.py export-cron --mode all
./scripts/agent_fleet.sh supervisor-report data/agent-supervisor/weekly.json
./scripts/project_doctor.sh
```

Review:

- process catalog still covers every department process
- full council process tests ran or are scheduled
- failures have owner, severity, and remediation
- data/AI quality evidence exists for AI workflows
- docs reflect current behavior

## Escalation Rules

| Condition | Action |
|---|---|
| Redis unavailable | Start Redis, then rerun supervisor. |
| Queue backlog with no workers | Start matching worker class. |
| Queue backlog with workers alive | Inspect task failures and worker logs. |
| Repeated council failure | Submit smaller task or run BMAD/spec clarification. |
| AI hallucination or unsafe output | Block promotion, run AI evaluation and governance review. |
| Missing trace/audit evidence | Treat as P2/P3 depending on workflow risk. |
| P0/P1 failure | Stop release and run council/governance review. |
| Dependency/API key/external install needed | Request explicit hard-gate approval. |

## Target Command Center UX

The frontend Operations/Governance/Reports workspace should eventually expose these widgets:

- Agent Fleet Health
- Queue Depth By Mode
- Live Heartbeats
- Scheduled Jobs
- Recent Task Results
- Failed Task Triage
- Process Test Coverage
- Quality Gate Scorecard
- AI Evaluation Scorecard
- Approval Decision Log
- Browser/CUA Session Audit
- MLflow Model Run Summary
- Incident And Escalation Board
- Release Readiness Board

Until those UI widgets are fully wired, the CLI/API surfaces above are the source of truth.

## Advanced Visibility Cockpit

The `/agent-supervisor` page now renders the live Redis report as an operations
cockpit, not only a queue viewer. The backend field is
`operations_visibility` from `GET /api/v1/agent-supervisor/report?sample=10`.

Visible sections:

- Health, execution, quality, completion, and observability scores.
- Tracking metrics: live agents, running agents, stale heartbeats, processed
  count, completed count, and recent success rate.
- Operations health checks for fleet liveness, queue drain, failure pressure,
  schedule coverage, process catalog coverage, and throughput.
- Tracing table built from recent result samples with trace/task/agent/status,
  duration, and token count.
- Reporting catalog for executive health, failure RCA, queue/SLA, process-test
  coverage, and delegation/throughput reports.
- Intelligent insights and blunt feedback for gaps such as missing schedules,
  recent failures, missing heartbeats, or agents that are alive but not moving
  work.

Top-1% operating standard: do not treat agent count as health. Trust only a
combination of fresh heartbeats, draining queues, successful recent outputs,
traceable task IDs, recurring schedules, and owner-ready reports.

## Durable Task Traces And Failure Taxonomy

Agent workers append one JSONL row per completed simple/council task to
`data/agent-supervisor/task_traces.jsonl` through `agents/agent_observability.py`.
The row stores `trace_id`, `task_id`, queue, agent, department, schedule/source,
model, status, duration, token count, prompt hash, failure category, retryable
flag, next queue, owner, and recommended action. Full prompts are not persisted
in the durable trace file; only a SHA-256 prompt hash prefix is stored.

Failure categories currently emitted:

- `none`
- `model_timeout`
- `model_not_found`
- `model_connection`
- `schema_error`
- `redis_error`
- `rate_limit`
- `unknown`

The `/agent-supervisor` cockpit reads the supervisor report fields
`trace_log`, `operations_visibility.failure_taxonomy`,
`operations_visibility.failure_owners`, and
`operations_visibility.retryable_failures`. This gives operators a durable view
of what happened after Redis result samples rotate.

