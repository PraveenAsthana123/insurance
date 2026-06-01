# HOLY Beverage — Operations — Monitoring AI

> Per-dept monitoring view for the 4 recurring cron jobs (§65 + §64.20)
> plus on-demand ML pipeline runs plus dispatched agent tasks.
> Persona: **Ops Manager**. Focus: **process-anomaly detection + workflow ML accuracy**.
> Composes with global §38 audit + §47 3-probe + §57.6 canonical fields.

## 1. What's monitored

| Category | Source | Cadence | Audit row location |
|---|---|---|---|
| Data refresh | `holy.refresh_data_artifacts` | hourly | `data/eval/cron/data_refresh/<run_id>/manifest.json` |
| Model retrain | `holy.retrain_models` | daily | `data/eval/cron/retrain/<run_id>/manifest.json` |
| Accuracy drift | `holy.eval_accuracy_drift` | every 4h | `data/eval/cron/accuracy/<run_id>/manifest.json` |
| Analysis rollup | `holy.analysis_rollup` | daily | `data/eval/cron/analysis/<run_id>/manifest.json` |
| ML pipeline | `holy.run_structured_lifecycle` / `holy.run_rag_lifecycle` | on-demand | `data/eval/<dept>/<pipeline>/<run_id>/manifest.json` |
| Test fan-out | `holy.dispatch_test_fanout` | per tier (§65.8) | `data/eval/test/<dept>/<tier>/<run_id>/` |
| Agent tasks | Redis `agent_tasks` / `council_tasks` queues | streamed | Worker stdout + agent_results list |

## 2. Health metrics per job (§47 3-probe contract)

| Probe | What | Threshold | If fails |
|---|---|---|---|
| **Startup** | Cron task imports + Celery registered | name present in `celery_app.tasks` | release-blocker (§43 drill) |
| **Liveness** | Last successful run within N × cadence | N=2 (e.g. hourly → 2h) | page on-call (P2) |
| **Readiness** | Per-dept run completed within last cadence + no error | NULL | suppress related dashboards (§47.8) |

## 3. Drift gates (§64.21 RAI compliance)

| Metric | Gate | Action on breach |
|---|---|---|
| Accuracy delta vs baseline | < 5% | Re-train trigger logged + ai-strategy notified |
| Drift PSI (Population Stability Index) | < 0.2 | flag dept dashboard amber |
| Fairness disparate impact | ≥ 0.8 | page ai-reviewer (P1) |
| Equal-opportunity gap | < 5% | page ai-reviewer (P1) |
| Cost per run | budget × 1.5 | page finance (§41.1) |

## 4. Frontend surface

Tab: `/holy/operations/monitoring`

Tiles (per role-dashboard archetype §64.37):
- **Manager view** — 4 cron-job tiles (last run timestamp + status + duration + cost)
- **ai-reviewer view** — drift trend per model + fairness gate state per pipeline
- **ai-strategy view** — re-train budget burn-down + accuracy deltas vs target
- **devops view** — Celery queue depth + worker pool utilisation + 5xx rate
- **engineer view** — failed-run log tail + manifest.json inspector

## 5. Backend API

| Endpoint | Returns |
|---|---|
| `GET /api/v1/holy/monitoring/operations` | Per-job last-run summary + health status |
| `GET /api/v1/holy/monitoring/operations/jobs/<job>/runs?limit=20` | Recent runs with manifest summaries |
| `GET /api/v1/holy/monitoring/operations/jobs/<job>/runs/<run_id>` | Full manifest of a single run |
| `GET /api/v1/holy/monitoring/_global` | Cross-dept rollup (executive view) |

## 6. Alerting

| Alert | Trigger | Channel |
|---|---|---|
| Job missed cadence | last_run > 2 × schedule | PagerDuty (P2) |
| Job error rate spike | > 10% errors over 1h window | Slack #operations-ops |
| Drift PSI > 0.2 | accuracy gate breach | Slack #operations-ai-reviewer |
| Cost > 1.5× budget | finops gate | Slack #finops |

## 7. Drill (release blocker)

`tests/drills/drill_monitoring_ai.py` — 8 steps with ≥ 2 negative:

1. (+) `/api/v1/holy/monitoring/operations` returns 200 + job list
2. (+) Job entries carry `task`, `last_run`, `status`, `cadence_seconds`
3. (+) Cross-dept rollup endpoint returns all 19 depts
4. (+) Per-run manifest endpoint returns parsed JSON
5. (-) **NEGATIVE** unknown dept → 404 not 500 (no leakage)
6. (-) **NEGATIVE** unknown job → 404 + helpful error
7. (+) HOLY_MONITORING_AI.md exists for every dept (this file)
8. (+) `holy.refresh_data_artifacts` + `retrain_models` + `eval_accuracy_drift` + `analysis_rollup` all registered

## 8. Related artifacts

- [`HOLY_DT_STRATEGY.md`](./HOLY_DT_STRATEGY.md) — the 4P automation backlog these jobs support
- [`HOLY_DATA_MGMT.md`](./HOLY_DATA_MGMT.md) — the input data contracts each refresh job validates
- [`HOLY_INCIDENT_MGMT.md`](./HOLY_INCIDENT_MGMT.md) — escalation path when monitoring alerts fire
- [`HOLY_SECURITY.md`](./HOLY_SECURITY.md) — sibling security observability tab

---

## The brutal rule

> A cron job without monitoring is a job that fails silently. The 4 cron
> jobs deployed in commit `2bc6e8f` (§65 + §64.20) MUST surface here per
> dept by release, or they're not in production — they're just running.
