# HOLY Beverage — Finance — Automated Pipelines
> Per operator 2026-05-23 — every process documented as a 5-phase
> automated pipeline: **Input → Data Process → Model → Output → Final Report**.
> Composes with global §38 audit + §40 decision system + §47 C4 L3 +
> §57.5 5-question runbook + §59 MDD + §64.20 ML lifecycle types + §66.

## 1. Pipeline catalog

This dept publishes **3 automated pipelines**. Each carries the canonical 5-phase view below + an audit row per phase boundary (per §38).

| # | Process | Lifecycle Type | Persona |
|---|---|---|---|
| 1 | Fraud Detection | Anomaly + ML | Dept manager + AI reviewer |
| 2 | Cash Flow Forecast | Time-Series | Dept manager + AI reviewer |
| 3 | Month-End Close | Process Automation | Dept manager + AI reviewer |

## 2. 5-Phase canonical structure

Every pipeline below follows this shape; every phase emits an audit
row keyed by `request_id` per §38.3:

```
Phase 1 INPUT     → Phase 2 DATA PROCESS → Phase 3 MODEL
Phase 5 REPORT   ← Phase 4 OUTPUT       ←
```

## 3.1 — Fraud Detection

**Lifecycle type:** Anomaly + ML  
**Audit prefix:** `pipeline.finance.fraud_detection`

| Phase | What | Audit-row outcome |
|---|---|---|
| 1 Input | Transaction stream (Kafka topic) — amount, merchant, location, velocity | `outcome=data_received` |
| 2 Data Process | Velocity features per card; rule layer first (hard blocks); ML risk score; LLM narrative classifier | `outcome=features_built` + n_features |
| 3 Model | Isolation Forest + XGBoost ensemble; rule engine; cost-sensitive eval | `outcome=trained_or_inferred` + model_v |
| 4 Output | Risk score + decision tier (auto-approve / human review / reject) | `outcome=auto|review|reject` per §40 |
| 5 Report | Fraud analyst console: queue of review-tier txns + investigation tooling | `outcome=report_published` + visible_to[] |

## 3.2 — Cash Flow Forecast

**Lifecycle type:** Time-Series  
**Audit prefix:** `pipeline.finance.cash_flow_forecast`

| Phase | What | Audit-row outcome |
|---|---|---|
| 1 Input | AR/AP ledger + bank balances + invoice schedule | `outcome=data_received` |
| 2 Data Process | Categorize transactions; aggregate to weekly; handle seasonality | `outcome=features_built` + n_features |
| 3 Model | Prophet + linear regression baseline; ensemble | `outcome=trained_or_inferred` + model_v |
| 4 Output | 13-week forward forecast + scenarios (base/up/down) | `outcome=auto|review|reject` per §40 |
| 5 Report | CFO dashboard: cash position + variance vs plan + alert thresholds | `outcome=report_published` + visible_to[] |

## 3.3 — Month-End Close

**Lifecycle type:** Process Automation  
**Audit prefix:** `pipeline.finance.month-end_close`

| Phase | What | Audit-row outcome |
|---|---|---|
| 1 Input | GL entries + sub-ledger reconciliations + accruals | `outcome=data_received` |
| 2 Data Process | Match candidate pairs (vendor invoice ↔ PO ↔ receipt); flag exceptions | `outcome=features_built` + n_features |
| 3 Model | Rule-based matcher + NLP narrative classifier for unmatched items | `outcome=trained_or_inferred` + model_v |
| 4 Output | Reconciliation status per account + exception list | `outcome=auto|review|reject` per §40 |
| 5 Report | Controller dashboard: close progress % + open exceptions + auto-resolved count | `outcome=report_published` + visible_to[] |

## 4. Per-phase contract (§38.3 + §57.6)

Every phase boundary writes an audit row with:

- `request_id` — propagated end-to-end (§57.6)
- `tenant_id` — for §41.3 isolation
- `phase` — 1-5
- `pipeline_id` — stable per process
- `latency_ms` — per-phase wall time
- `outcome` — see per-phase table above
- `model_v` / `prompt_v` — when phase 3 invokes ML or LLM
- `confidence` — when phase 4 carries decision (per §40)

## 5. Backend API

| Endpoint | Returns |
|---|---|
| `GET /api/v1/holy/pipelines/finance` | Pipeline catalog above as JSON |
| `GET /api/v1/holy/pipelines/finance/<process_id>` | Full 5-phase spec for one process |
| `GET /api/v1/holy/pipelines/_global` | Cross-dept process inventory |

## 6. Drill (release blocker)

`tests/drills/drill_pipelines.py` asserts:
- Every dept catalog has ≥ 1 pipeline
- Every pipeline has exactly 5 phases (no skipped phases)
- Phase ordering is deterministic (Input → DataProcess → Model → Output → Report)
- NEGATIVE: unknown dept → 404, no info leak
- NEGATIVE: unknown process_id → 404 + allowed-values hint
- NEGATIVE: bogus phase number rejected

## 7. Compose-footer (§49)

- [`HOLY_PROCESS_MGMT.md`](./HOLY_PROCESS_MGMT.md) — sibling per-process IPO + TODO + tasks catalog
- [`HOLY_DATA_MGMT.md`](./HOLY_DATA_MGMT.md) — Phase-1 input contracts every pipeline reads
- [`HOLY_TRANSACTIONS.md`](./HOLY_TRANSACTIONS.md) — runtime audit rows these pipelines emit
- [`HOLY_MONITORING_AI.md`](./HOLY_MONITORING_AI.md) — health-status view per phase
- [`HOLY_MASTER_DATA.md`](./HOLY_MASTER_DATA.md) — entities referenced in Phase 2/4 payloads
- [`HOLY_SIMULATION.md`](./HOLY_SIMULATION.md) — simulator runs each pipeline manual-vs-auto
- [`HOLY_FRD.md`](../docs/frd/HOLY_FRD.md) — functional requirements each pipeline implements
