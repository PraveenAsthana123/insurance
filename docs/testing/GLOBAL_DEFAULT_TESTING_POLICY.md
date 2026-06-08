# Global Default Testing Policy

This policy defines the default testing stack for the repository. It is the first testing policy to apply before process-specific, department-specific, model-specific, or release-specific testing.

It applies by default to:

- frontend UI, menu, tab, visualization, and F12/browser-console checks
- backend APIs, services, repositories, migrations, and workers
- data validation, database integrity, lineage, and freshness checks
- model training, model accuracy, AI/RAG quality, explainability, and benchmarking
- load, performance, 1000-request, resilience, and observability checks
- reporting, notification, evidence, and agent assignment

## 1. Mandatory Default Gate

Every production-facing change must run the default local gate before handoff:

```bash
./scripts/project_doctor.sh
```

The default gate is the minimum acceptance bar. It does not replace focused tests for the changed area.

## 2. Required Test Areas

| Area | Default Tools | Required When |
|---|---|---|
| Default health gate | `scripts/project_doctor.sh`, `pytest`, `npm run lint`, `npm run build` | Every production-facing change. |
| Code quality and SAST | SonarQube CE, Semgrep, Ruff, ESLint, Gitleaks, Trivy | Code, dependency, config, or security-relevant changes. |
| API testing | pytest, FastAPI TestClient, httpx, Schemathesis, Karate | API route, schema, service contract, auth, or OpenAPI changes. |
| Frontend/F12 testing | Playwright, Axe, Lighthouse, browser console/network capture | UI, menu, submenu, tab, visualization, or workflow changes. |
| 1000-request/load testing | k6, Locust, wrk, hey, pytest-benchmark | Performance-sensitive endpoints, worker flows, batch jobs, and release gates. |
| Data testing | Great Expectations, Soda Core, dbt tests, Pandas validation | ETL, seed, report, KPI, lineage, or freshness changes. |
| Database testing | pytest with psycopg, pgTAP, pgbench, migration dry-run | Migrations, repositories, SQL, indexes, constraints, and DB policy changes. |
| Model/training/accuracy | MLflow, scikit-learn metrics, Evidently, RAGAS, DeepEval, G-Eval, Promptfoo, BLEU, ROUGE, SHAP, Fairlearn, Detoxify | Model, prompt, dataset, training, AI explanation, generated text, RAG answer, or benchmark changes. |
| Governance/security AI testing | OPA/Conftest, Garak, prompt-injection checks, RBAC/tenant tests | Governed workflows, AI agents, approvals, tenant boundaries, and security controls. |

Tools that are not installed are target integrations until wired. Agents must state target-vs-runnable status in reports.

## 3. Agent Assignment

The machine-readable assignment catalog is:

```text
docs/testing/DEFAULT_TESTING_AGENT_ASSIGNMENTS.json
```

| Agent | Owns |
|---|---|
| `quality-gate-agent` | Default doctor, build, lint, and repo health gate. |
| `sast-code-quality-agent` | SonarQube, Semgrep, Ruff, ESLint, secrets, dependency/container scans. |
| `api-contract-test-agent` | API contract, route, schema, auth, OpenAPI, and negative-path tests. |
| `frontend-browser-test-agent` | Main menu, submenu, tab flows, visualization states, Playwright, accessibility, F12 console/network issues. |
| `load-performance-test-agent` | k6/Locust/wrk/hey runs, 1000-request tests, latency, throughput, error-rate gates. |
| `data-quality-test-agent` | Data freshness, completeness, uniqueness, referential integrity, lineage, drift, and KPI source checks. |
| `database-test-agent` | Migration validation, SQL/repository coverage, constraints, indexes, pgTAP/pgbench targets. |
| `model-evaluation-test-agent` | Training metrics, accuracy, drift, regression benchmarks, RAGAS/DeepEval/G-Eval scoring, BLEU/ROUGE generated-text metrics, prompt evaluation, Fairlearn fairness checks, Detoxify toxicity checks, explainability. |
| `reporting-notification-agent` | Markdown/JSON reports, evidence collection, notification routing, missing-evidence checks. |
| `council-governance-review-agent` | P0/P1 failure review, weekly full gate review, promotion signoff. |

## 4. Reports

Every default test run must produce or update report evidence under:

```text
jobs/reports/testing/
```

Required report formats:

- Markdown report for human review.
- JSON report for automation and agent handoff.
- Timestamped report for audit history when the run is not trivial.
- `*_latest.md` and `*_latest.json` aliases for the newest run.

Required report fields:

- `run_id`
- timestamp with timezone
- branch and commit when available
- suite name and changed area
- assigned primary agent and council agent
- tools executed and tools skipped
- AI/RAG metrics: faithfulness, answer relevance, context precision/recall, G-Eval score, BLEU, ROUGE, hallucination rate, fairness metrics, toxicity score, and safety verdict when applicable
- runnable-vs-target status for each tool
- pass/fail status and severity
- failure list with owner, remediation, and rerun command
- evidence paths, logs, traces, screenshots, metrics, and correlation IDs when available
- notification result

## 5. Notifications

Default notification mode is local-first:

- final agent summary to the user
- Markdown/JSON reports under `jobs/reports/testing/`
- local logs when a script emits logs
- optional `./scripts/agent_fleet.sh supervisor-report <path>` when agent workers are involved

External notification is opt-in and must never require secrets in source control. Supported target environment variables are:

- `TEST_NOTIFY_WEBHOOK_URL`
- `TEST_NOTIFY_SLACK_WEBHOOK`
- `TEST_NOTIFY_EMAIL_TO`

Notification severity rules:

| Severity | Notification Requirement |
|---|---|
| P0 | Immediate local report, council review, release stop, optional external alert if configured. |
| P1 | Immediate local report, remediation owner, rerun full gate, optional external alert if configured. |
| P2 | Include in run report and next daily/weekly summary. |
| P3 | Include in audit/evidence backlog. |

## 6. Update Rules

When testing policy, tooling, or behavior changes:

1. Update this policy.
2. Update `docs/testing/DEFAULT_TESTING_AGENT_ASSIGNMENTS.json` when agent ownership, cadence, tools, reports, or notification rules change.
3. Update `docs/testing/GLOBAL_PROCESS_TESTING_POLICY.md` when per-process coverage changes.
4. Update `docs/testing/MASTER_TESTING_MATRIX.md` and `docs/testing/OPEN_SOURCE_TESTING_ECOSYSTEM.md` when a tool is added, removed, or promoted from target to runnable.
5. Update `docs/GOVERNANCE_INDEX.md` and `docs/testing/README.md` when testing governance entry points change.
6. Update `README.md` or `docs/RUN_DEBUG_RUNBOOK.md` if setup, commands, or debugging steps change.
7. Run `./scripts/project_doctor.sh` before handoff for production-facing changes.

## 7. Definition Of Done

A change is testing-complete only when:

- default health gate has passed or any failure is documented as environment-only
- focused tests for changed frontend/backend/API/data/model areas have passed
- reports exist or the final handoff explains why no persistent report was needed
- P0/P1 issues are fixed or explicitly blocked from release
- documentation and assignment catalogs are updated
