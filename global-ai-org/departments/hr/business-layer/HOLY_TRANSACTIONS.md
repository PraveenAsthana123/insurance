# HOLY Beverage — Hr — Transactional History

> Per operator 2026-05-23 — every dept maintains a unified chronological
> feed of every meaningful event. Focus: **Attrition predictions + resume parsing + skill-gap analyses**.
> Composes with global §38 audit + §41.3 tenant isolation + §47.6 SOC2
> CC6.2 + §57.5 5-question runbook + §57.6 canonical fields + §64.

## 1. Event taxonomy

Every transactional row carries the §57.6 canonical envelope:
`event_id` · `tenant_id` · `request_id` · `actor` · `timestamp` ·
`event_type` · `dept` · `latency_ms` · `outcome` · `payload`.

Five event sources unified per dept:

| Source | Event type prefix | Storage | Retention |
|---|---|---|---|
| Cron jobs (§65.8.5 + §66) | `cron.*` | `data/eval/cron/<job>/<run_id>/manifest.json` | 90 days (rolling) |
| ML lifecycle runs (§64.20) | `ml.*` | `data/eval/<dept>/<pipeline>/<run_id>/manifest.json` | 365 days |
| Simulation runs (§64.34) | `sim.*` | `data/eval/sim/<dept>/<process>/<sim_id>/events.jsonl` | 30 days |
| Test runs (§65.8) | `test.*` | Redis `test_results` list (capped 1000) | 7 days |
| Decision audit (§38.3) | `decision.*` | Postgres `decision_audit` table | 7 years (regulated), 1 year hot (else) |

## 2. Cron transaction shape

```json
{
  "event_id": "evt-cron-<run_id>",
  "event_type": "cron.refresh_data_artifacts",
  "request_id": "<run_id>",
  "tenant_id": "default",
  "actor": "celery-worker",
  "dept": "hr",
  "timestamp": "2026-05-24T17:00:00Z",
  "latency_ms": 18230,
  "outcome": "ok",
  "payload": {
    "n_depts_processed": 19,
    "max_minutes": 30,
    "status": "ok"
  }
}
```

## 3. ML lifecycle transaction shape

```json
{
  "event_id": "evt-ml-<run_id>",
  "event_type": "ml.run_structured_lifecycle",
  "request_id": "<run_id>",
  "tenant_id": "default",
  "actor": "celery-worker",
  "dept": "hr",
  "timestamp": "<derived from run_id epoch prefix>",
  "latency_ms": 5690,
  "outcome": "ok",
  "payload": {
    "pipeline": "churn_reference",
    "task": "classification",
    "n_rows": 7043,
    "metrics": {"accuracy": 0.83, "f1": 0.71},
    "best_model": "XGBClassifier"
  }
}
```

## 4. Decision transaction shape (§38.3 + §48)

Every AI decision MUST surface here:

```json
{
  "event_id": "evt-dec-<request_id>",
  "event_type": "decision.lead_score",
  "request_id": "<request_id>",
  "tenant_id": "<tenant>",
  "actor": "lead-scoring-agent",
  "dept": "hr",
  "timestamp": "<ISO-8601>",
  "latency_ms": 142,
  "outcome": "auto" | "review" | "reject",
  "payload": {
    "model_version": "lead_scoring_v17",
    "prompt_version": null,
    "confidence": 0.87,
    "input_hash": "<sha256>",
    "rules_applied": ["min_revenue_check"],
    "guardrails_triggered": [],
    "human_override": false,
    "explanation_url": "/api/v1/holy/explain?prediction_id=<id>"
  }
}
```

## 5. API contract

| Endpoint | Returns |
|---|---|
| `GET /api/v1/holy/transactions/hr` | Most recent N events across all sources, newest first |
| `GET /api/v1/holy/transactions/hr?source=cron` | Filtered to cron events only |
| `GET /api/v1/holy/transactions/hr?since_epoch=<ts>` | Events since a unix timestamp |
| `GET /api/v1/holy/transactions/hr?event_type=ml.*` | Wildcard event-type filter |
| `GET /api/v1/holy/transactions/hr/{event_id}` | Full single-event detail |
| `GET /api/v1/holy/transactions/_global` | Cross-dept summary + per-dept counts |

Defaults: `limit=50`, max `limit=500`. PII fields redacted unless caller
passes `?include_pii=1` AND the request lands an audit row (per §38.3 +
§47.6 SOC2 CC6.2).

## 6. Query patterns (operator-driven)

Per global §57.5 5-question runbook — every incident answer is one
query away:

| Question | Query |
|---|---|
| WHAT broke? | `event_type=*` filter to most-recent failures |
| WHEN did it break? | `since_epoch=<T>` window |
| WHO triggered it? | `actor=` filter |
| WHY did it break? | event_id → payload.explanation_url → §48 SHAP |
| HOW to roll back? | event_type=`cron.*` or `ml.*` → re-run with prior args |

## 7. Drill (release blocker)

`tests/drills/drill_transactions.py` — 10 steps with ≥ 3 negative:

1. (+) `/api/v1/holy/transactions/hr` returns 200 + chronological feed
2. (+) Every event carries §57.6 canonical envelope keys
3. (+) Events sorted newest first by timestamp
4. (-) **NEGATIVE** unknown dept → 404, not 500, no info leak
5. (-) **NEGATIVE** bogus event_type filter → empty list (not 500)
6. (-) **NEGATIVE** PII fields redacted unless include_pii=1
7. (+) `_global` rollup returns per-dept counts for all 19 depts
8. (+) Limit cap enforced (cap=500; limit=1000 rejected with 400)
9. (+) `since_epoch` filter actually filters (rows older are excluded)
10. (+) Per-event detail endpoint returns full payload + audit chain

## 8. Compose-footer (§49)

- [`HOLY_MONITORING_AI.md`](./HOLY_MONITORING_AI.md) — sibling per-job health view (this is the row-level expansion)
- [`HOLY_DATA_MGMT.md`](./HOLY_DATA_MGMT.md) — input contracts every cron txn validates
- [`HOLY_PROCESS_MGMT.md`](./HOLY_PROCESS_MGMT.md) — process catalog that owns each event_type prefix
- [`HOLY_INCIDENT_MGMT.md`](./HOLY_INCIDENT_MGMT.md) — L1/L2/L3 escalation using these events
- [`HOLY_SECURITY.md`](./HOLY_SECURITY.md) — PII-redaction surface for this feed
- [`HOLY_MASTER_DATA.md`](./HOLY_MASTER_DATA.md) — every event's payload references master-data entity IDs
- [`HOLY_SIMULATION.md`](./HOLY_SIMULATION.md) — sim run events feed into this same stream
