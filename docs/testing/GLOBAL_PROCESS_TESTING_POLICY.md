# Global Process Testing Policy

This policy defines how every department, process, and subprocess in the project must be tested, assigned to agents, scheduled, reviewed, and monitored.

It applies to:

- backend APIs and services
- frontend workflows
- data and ML pipelines
- RAG and AI explanations
- OpenClaw tasks
- Paperclip context packs
- 100-agent worker harnesses
- human approval and governance workflows
- each seeded department process in `backend/seeds/processes.json`

## 1. Mandatory Principle

Every business process must have:

- one test suite id
- one primary testing agent
- one council/governance review agent
- daily smoke test schedule
- weekly full test schedule
- subprocess test plan
- evidence requirements
- pass/fail criteria
- owner and escalation path

No process can be called production-ready unless it has automated or scheduled coverage for its critical subprocesses.

## 2. Source Of Truth

| Artifact | Purpose |
|---|---|
| `backend/seeds/departments.json` | Department list. |
| `backend/seeds/processes.json` | Business process list. |
| `docs/testing/PROCESS_AGENT_CRON_CATALOG.json` | Machine-readable agent and cron assignment for every process. |
| `docs/testing/PROCESS_AGENT_CRON_CATALOG.md` | Human-readable department summary. |
| `scripts/process_test_plan.py` | CLI to list suites, export cron, and submit process tests into OpenClaw. |
| `docs/testing/PROCESS_TESTING_DIAGRAMS.md` | Graphs, flowcharts, pipeline, cron scheduling, and agent assignment diagrams. |
| `docs/testing/ENTERPRISE_AI_TESTING_LANDSCAPE.md` | Enterprise testing architecture and top 1% testing stack. |
| `docs/testing/OPEN_SOURCE_TESTING_ECOSYSTEM.md` | Complete OSS testing tool ecosystem and repo status. |

## 3. Required Test Layers Per Process

Each process must be tested across these subprocess layers:

| Subprocess Layer | Required Checks | Assigned Agent |
|---|---|---|
| Input contract validation | Schema, required fields, nulls, ranges, invalid inputs, boundary values | `api-contract-test-agent` |
| Service business logic | Deterministic rules, KPI calculations, happy paths, negative paths | `functional-test-agent` |
| Data quality and lineage | Freshness, completeness, uniqueness, referential checks, lineage, drift | `data-quality-test-agent` |
| AI quality and explainability | RAG quality, hallucination checks, citations, prompt stability, SHAP/LIME where applicable | `ai-evaluation-test-agent` |
| Security/governance/RBAC | RBAC/ABAC, policy-denied paths, prompt injection, tenant isolation, audit fields | `security-governance-test-agent` |
| Performance/resilience/observability | Latency, throughput, retries, circuit breaker, logs, traces, metrics, correlation IDs | `resilience-observability-test-agent` |
| Human workflow and approval | Approval, escalation, exception handling, rollback, runbook evidence | `hitl-workflow-test-agent` |

## 4. Agent Assignment Model

The catalog assigns a `primary_agent` from the process name and department domain.

| Agent | Owns |
|---|---|
| `ai-ml-test-agent` | Forecasting, prediction, sensing, drift, AI/ML-heavy processes. |
| `governance-test-agent` | Compliance, audit, risk, ESG, data governance. |
| `quality-test-agent` | Defect, validation, quality, complaint analysis. |
| `logistics-process-test-agent` | Route, shipment, tracking, freight, network flows. |
| `supply-procurement-test-agent` | Inventory, replenishment, stock, supplier, vendor, contract flows. |
| `operations-test-agent` | Manufacturing, batch, yield, capacity, maintenance, equipment flows. |
| `customer-analytics-test-agent` | Customer segmentation, churn, CLV, personalization, campaigns. |
| `finance-test-agent` | Revenue, profitability, spend, cashflow. |
| `process-test-agent` | General fallback. |
| `council-governance-review-agent` | Reviews full weekly runs and high-risk failures. |

## 5. Cron And Scheduling Policy

Each process has two schedules:

| Mode | Frequency | OpenClaw Mode | Purpose |
|---|---|---|---|
| `smoke` | Daily | `simple` | Fast check for API/data/AI contract drift. |
| `full` | Weekly | `council` | Full enterprise validation across functional, data, AI, governance, resilience, and human workflow checks. |

Cron entries are generated from `docs/testing/PROCESS_AGENT_CRON_CATALOG.json`.

Commands:

```bash
./scripts/process_test_plan.py list
./scripts/process_test_plan.py list --dept sales
./scripts/process_test_plan.py export-cron --mode smoke
./scripts/process_test_plan.py export-cron --mode full --dept supply-chain
./scripts/process_test_plan.py run --suite-id sales__baseline-forecasting --mode full --dry-run
```

Install generated cron entries manually after review:

```bash
./scripts/process_test_plan.py export-cron --mode all > /tmp/insur-process-tests.cron
crontab /tmp/insur-process-tests.cron
```

Before installing cron, ensure:

- backend is reachable at `API_URL`
- OpenClaw bridge is mounted
- Redis is running
- agent workers/council workers are running
- `logs/` directory exists if cron output redirection is used

## 6. Setup Procedure

1. Start dependencies:

```bash
docker compose up -d redis backend
```

2. Start local agent workers:

```bash
./scripts/agent_fleet.sh start-simple 20 0
./scripts/agent_fleet.sh start-council 5 0
```

3. Validate OpenClaw and Paperclip:

```bash
curl http://localhost:8000/api/v1/openclaw/status
curl http://localhost:8000/api/v1/paperclip/status
```

4. Review test catalog:

```bash
./scripts/process_test_plan.py list
```

5. Dry-run a process test:

```bash
./scripts/process_test_plan.py run --suite-id sales__baseline-forecasting --mode full --dry-run
```

6. Submit one process test:

```bash
./scripts/process_test_plan.py run --suite-id sales__baseline-forecasting --mode full
```

7. Monitor workers:

```bash
./scripts/agent_fleet.sh watch
```

8. Export/install cron only after the dry run succeeds.

## 7. Evidence Required From Every Test Run

Every process test run must produce or reference:

- `suite_id`
- department and process name
- mode: `smoke` or `full`
- agent id / role
- task id from OpenClaw
- input contracts checked
- subprocess layers covered
- pass/fail status
- failed checks and remediation notes
- logs/traces/correlation IDs when available
- AI quality/evaluation scores where applicable
- governance decision and audit fields
- artifacts or Paperclip context ids when used

## 8. Failure Severity

| Severity | Definition | Required Action |
|---|---|---|
| P0 | Security breach, tenant leakage, unsafe autonomous action, data corruption | Stop release, notify owner, run governance review. |
| P1 | Broken process API, critical KPI incorrect, AI hallucination in governed workflow | Block release, assign remediation, rerun full suite. |
| P2 | Performance regression, missing trace, flaky subprocess test | Fix before production promotion. |
| P3 | Documentation/evidence gap | Fix before audit signoff. |

## 9. Promotion Gates

A process can move to production only when:

- daily smoke test passes for 3 consecutive runs
- weekly full test passes at least once
- no open P0/P1 failures
- RBAC/governance negative tests pass
- data quality checks pass or accepted exceptions are documented
- AI/RAG checks pass when AI is involved
- observability evidence exists
- human workflow/approval checks pass when process has human approval points

## 10. Department Coverage Summary

Current generated catalog covers 53 processes:

| Department | Process Count |
|---|---:|
| customer | 5 |
| finance | 4 |
| governance | 5 |
| logistics | 4 |
| maintenance | 4 |
| manufacturing | 4 |
| procurement | 4 |
| quality | 4 |
| retail | 4 |
| sales | 10 |
| supply-chain | 5 |

The detailed per-process schedule is in `docs/testing/PROCESS_AGENT_CRON_CATALOG.json`.

## 11. Mandatory Update Rule

When a department/process is added, removed, or renamed:

1. update `backend/seeds/processes.json`
2. regenerate `docs/testing/PROCESS_AGENT_CRON_CATALOG.json`
3. update `docs/testing/PROCESS_AGENT_CRON_CATALOG.md`
4. run `./scripts/process_test_plan.py list`
5. run `./scripts/project_doctor.sh`
6. update this policy if new subprocess layers or agent roles are needed

## 12. Current Limitations

This policy and catalog are now created, but not every target testing framework is installed. Current runnable path submits process test work into the local OpenClaw/agent harness. Tools such as OPA, Kafka, Temporal, OpenTelemetry, Istio, Kiali, RAGAS full gate, Promptfoo, k6, and Great Expectations remain target integrations unless separately wired.
