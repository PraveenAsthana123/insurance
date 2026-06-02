# Advanced Agentic Tool — Single Command for Full Parallel Stack

Per operator 2026-06-01 (final cluster of directives):
> "what else tool can be setup to run parallel ..and code writing, approval,
>  scheduling, monitoring, using 100 agent ...auto approve"
> "create advance tool to do that"
> "dangerously approve"

This doc + [scripts/setup_advanced_agentic_stack_v2.sh](../scripts/setup_advanced_agentic_stack_v2.sh)
is the single-command answer.

## What it provisions

| Capability | Module | Wired by |
|---|---|---|
| **Parallel orchestration** | [agent-orchestration](../infra/orchestration/) — LangGraph DAG | `backend/orchestration/langgraph_workflow.py` |
| **Durable scheduling** | [agent-orchestration](../infra/orchestration/) — Temporal | `backend/orchestration/temporal_worker.py` |
| **Auto-approve policy** | [policy-engine](../infra/policy/) — OPA + Rego | `infra/policy/policies/approval.rego` |
| **Monitoring 100 agents** | [observability](../infra/observability/) — OTel + Jaeger + Phoenix + Prom + Grafana | `infra/observability/docker-compose.observability.yml` |
| **100-agent fleet** | existing in docker-compose | `agents:` service `--scale 100` |
| **Council pattern** | existing | `council_agents:` service |
| **Auto-approve watcher** | existing (Codex parallel session) | `scripts/install_codex_approval_advanced.sh` |
| **Voice → automation** | existing | `scripts/automation_job_runner.py` |

## Single command — standard mode

```bash
bash scripts/setup_advanced_agentic_stack_v2.sh
```

Runs through 7 steps:
1. Prerequisite check (docker / python / curl / jq)
2. Verify 3 new modules installed (auto-installs if missing)
3. Approval policy mode (standard vs DANGER_MODE)
4. OPA policy unit tests (8 tests; positive + negative)
5. Build docker-compose overlay command
6. Emit status URLs
7. Recap of operator-facing capabilities

## Single command — DANGER mode

```bash
DANGER_MODE=true bash scripts/setup_advanced_agentic_stack_v2.sh
```

Loads [infra/policy/policies/data.danger.json](../infra/policy/policies/data.danger.json)
overlay that broadens auto-allow to include:
- `docker_compose_up/down/restart`
- `pytest_all`, `playwright_test`
- `ruff_fix`, `black_format`
- `git_add`, `git_commit`, `git_diff_apply`
- `redis_flush_dev`, `postgres_truncate_dev`
- `kaggle_download`, `ollama_pull`, `pip_install_dev`

**§42 hard gates remain LOCKED** regardless of DANGER_MODE:
- `git_push_force_main`, `git_push_force_master`
- `rm_rf_home`, `rm_rf_etc`, `rm_rf_usr`
- `drop_production_db`, `truncate_production_table`
- `npm_publish`, `pip_upload`, `cargo_publish`
- `docker_push_hub` (production)
- `modify_billing`, `modify_auth_provider`, `modify_secret_store`
- External messaging (PR comments on other repos, Slack global, email)
- `modify_production_cron`, `modify_production_dns`
- `delete_branch_main`, `delete_branch_master`

## Boot the actual services

After running setup_advanced_agentic_stack_v2.sh, run the emitted compose command:

```bash
docker compose \
    -f docker-compose.yml \
    -f infra/policy/docker-compose.opa.yml \
    -f infra/observability/docker-compose.observability.yml \
    -f infra/orchestration/docker-compose.temporal.yml \
    up -d
```

## UIs

| UI | URL | What it shows |
|---|---|---|
| Frontend | http://localhost:3000 | Main app |
| Backend Swagger | http://localhost:8000/docs | API explorer |
| OPA | http://localhost:8181 | Policy engine |
| Jaeger | http://localhost:16686 | Distributed traces |
| Prometheus | http://localhost:9090 | Metrics |
| Grafana | http://localhost:3001 | Dashboards |
| Phoenix | http://localhost:6006 | LLM trace + eval viewer |
| Temporal UI | http://localhost:8233 | Workflow execution |

## Composes with global policies

- §42 operational autonomy (DANGER_MODE bounded by §42 hard-gate list)
- §43 drill testing (OPA unit tests + smoke verify)
- §47 architecture (4-layer LB → API → orchestration → agents)
- §47.6 SOC2 CC7.2 anomaly detection (Grafana alerts)
- §57.6 canonical fields (request_id propagates through OTel baggage)
- §64.40 10-layer agentic stack (LangGraph implements layers 3-5)
- §64.43 #2 council + #8 DAG patterns (LangGraph reviewer + workflow)
- §69 approval minimization (broad-allow now in Rego, not just settings.json)
- §72 global production-readiness templates (this tool USES modules 11-13)

## Verify

```bash
bash scripts/setup_advanced_agentic_stack_v2.sh
# Expected: 7 ═══ steps; all green ✓; emits compose command
```

## Composes with operator's existing parallel-session work

Codex (parallel session 2026-06-01) set up:
- `docs/CLAUDE_AUTONOMY_APPROVAL_POLICY.md`
- `docs/NO_APPROVAL_AUTONOMY_POLICY.md`
- `scripts/archon_auto_approve_safe.py` (cron every 5 min)
- `scripts/setup_claude_autonomy.sh`
- `scripts/install_codex_approval_advanced.sh`
- Voice/text automation runner

This advanced tool DOES NOT REPLACE those — it adds a higher-level
orchestration + policy-as-code + monitoring layer ON TOP. Both coexist
without cron conflict.

## Operator approval bundle

Per "all approved" + "use global approval policy for next and approval":
- Standard mode (no DANGER_MODE) auto-runs without per-action confirmation
- DANGER_MODE expands the safe-actions list
- §42 hard-gate list remains the inviolable boundary
- Drill `tests/drills/drill_insurance_dept_artifacts.py` step 17 confirms
  presence of nginx/cdn/k6/adapters/compliance/ADR artifacts
