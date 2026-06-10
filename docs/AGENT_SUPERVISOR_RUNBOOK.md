# Agent Supervisor Runbook

This runbook defines the local supervisor layer for the INSUR agent fleet. It monitors all Redis-backed agents, task queues, schedules, process-test coverage, and recent task results.

## What Is Set Up

| Layer | Local implementation | Purpose |
|---|---|---|
| Agent workers | `agents`, `council_agents` Docker Compose services | Execute simple and council tasks. |
| Queue system | Redis lists: `tasks`, `done`, `council_tasks`, `council_done`, `test_tasks`, `test_results` | Store pending and completed work. |
| Heartbeats | `agent:heartbeat:*` Redis keys | Show live agent identity, type, state, processed count, and age. |
| Scheduler | `scripts/agent_scheduler.py` | Creates interval jobs and enqueues due tasks. |
| Supervisor | `scripts/agent_supervisor.py` | Reads queues, heartbeats, schedules, recent results, and process-test catalog. |
| Operator CLI | `scripts/agent_fleet.sh` | Single command surface for starting, submitting, scheduling, monitoring, and stopping agents. |

## Start The Local Stack

Start dependencies:

```bash
docker compose up -d redis ollama
```

Start 100 simple agents and seed 100 tasks:

```bash
./scripts/agent_fleet.sh start-simple 100 100
```

Start council agents for review/governance tasks:

```bash
./scripts/agent_fleet.sh start-council 5 20
```

Start backend, Redis/Ollama, simple agents, and council agents together:

```bash
./scripts/agent_fleet.sh start-all
```

## Submit Tasks From Codex Or Claude

Simple execution task:

```bash
./scripts/agent_fleet.sh submit-simple "Create an incident triage checklist" operations
```

Council review task:

```bash
./scripts/agent_fleet.sh submit-council "Review the release readiness plan" engineering
```

The commands submit through the OpenClaw-compatible API and enqueue into Redis for workers.

## Monitor All Agents

One-shot operational view:

```bash
./scripts/agent_fleet.sh supervisor
```

Continuous supervisor view:

```bash
./scripts/agent_fleet.sh supervisor-watch
```

Classic compact queue monitor:

```bash
./scripts/agent_fleet.sh status
./scripts/agent_fleet.sh watch
```

## Check One Task

After task submission, use the returned `task_id`:

```bash
./scripts/agent_fleet.sh task-status <task_id>
```

The supervisor scans completed result queues and prints the normalized JSON result with queue name and result index.

## Schedule Recurring Jobs

Add a recurring council job every five minutes:

```bash
./scripts/agent_fleet.sh schedule-add sales-pulse 300 council "Review sales forecast anomalies" sales
```

Run scheduler loop:

```bash
./scripts/agent_fleet.sh schedule-run
```

List runtime schedules:

```bash
./scripts/agent_fleet.sh schedule-list
./scripts/agent_supervisor.py schedules
```

The global per-process cron catalog is documented in `docs/testing/PROCESS_AGENT_CRON_CATALOG.md` and read by the supervisor for coverage visibility.

## Advanced Monitoring, Tracking, And Delegation Readiness

The supervisor now emits a read-only `advanced_agent_features` block in both CLI and API reports. It does not auto-route, retry, or mutate queues; it turns live Redis state into operator-safe recommendations.

CLI:

```bash
./scripts/agent_fleet.sh supervisor-advanced
python3 scripts/agent_supervisor.py advanced
```

API:

```bash
curl -sS http://localhost:8000/api/v1/agent-supervisor/report?sample=10 \
  | jq .advanced_agent_features
```

The block includes:

- `readiness_score` and `status` for advanced agent readiness.
- `monitoring_features_present` for queue, heartbeat, schedule, trace, and failure visibility already wired.
- `missing_advanced_features` for capability-aware routing, dead-letter/retry backoff, SLA monitoring, agent capability registry, task lineage, metrics export, and owner escalation.
- `capability_registry` mapping simple, council, and test queues to agent kinds and recommended task types.
- `delegation_plan` showing whether workers should drain, matching workers should be started, or smoke tasks/schedules should be added.
- `tracking_controls` for live agents, stale agents, processed total, pending total, recent failures, durable traces, and retryable failures.

Use this as the current Harness-Agent-style control-plane report. Do not treat it as autonomous orchestration until task lineage, scored routing, retry/dead-letter queues, SLA counters, and approval-gated escalation are implemented.

## Health Gate

Run a supervisor health check:

```bash
./scripts/agent_fleet.sh supervisor-health
```

Default failure conditions:

- Redis is unavailable.
- More than 50 pending items exist in a queue and no live heartbeats are present.
- More than 3 recent sampled results are failed or malformed.

Use this in CI, cron, or local release checks before promoting an agent run.

## JSON Report

Write the latest supervisor report:

```bash
./scripts/agent_fleet.sh supervisor-report
```

Custom path:

```bash
./scripts/agent_fleet.sh supervisor-report data/agent-supervisor/release-check.json
```

Report includes:

- generated timestamp
- queue depths
- live heartbeats by agent kind
- schedule list
- process-test catalog summary
- recent task result samples
- recent failure count
- operational recommendations

## Debug Checklist

| Symptom | Check | Command |
|---|---|---|
| Tasks not moving | No live workers or Redis URL mismatch | `./scripts/agent_fleet.sh supervisor` |
| Agents started but no heartbeat | Worker import/runtime failure | `docker compose logs -f agents council_agents` |
| Council task pending | No `council_agents` worker or Ollama/model failure | `docker compose logs -f council_agents ollama` |
| Schedule not firing | Scheduler loop not running | `./scripts/agent_fleet.sh schedule-run` |
| High failures | Inspect task and logs | `./scripts/agent_fleet.sh task-status <task_id>` |
| Redis unavailable | Container down or URL wrong | `docker compose ps redis` |

## Production Direction

This local supervisor is intentionally lightweight. For production, preserve the same contract and move execution to:

- Kubernetes deployments for agent workers.
- Prometheus metrics and Grafana dashboards.
- OpenTelemetry traces per task and tool call.
- Kafka/RabbitMQ for durable event streaming.
- Temporal/LangGraph for durable workflow state.
- OPA/Kyverno for policy enforcement.
- Istio/Kiali when deployed to Kubernetes.
- Dead-letter queues and retry backoff for failed work.
