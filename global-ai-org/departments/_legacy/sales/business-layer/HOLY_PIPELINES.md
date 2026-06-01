# HOLY Beverage — Sales — Automated Pipelines
> Per operator 2026-05-23 — every process documented as a 5-phase
> automated pipeline: **Input → Data Process → Model → Output → Final Report**.
> Composes with global §38 audit + §40 decision system + §47 C4 L3 +
> §57.5 5-question runbook + §59 MDD + §64.20 ML lifecycle types + §66.

## 1. Pipeline catalog

This dept publishes **3 automated pipelines**. Each carries the canonical 5-phase view below + an audit row per phase boundary (per §38).

| # | Process | Lifecycle Type | Persona |
|---|---|---|---|
| 1 | Lead Scoring | Tabular ML | Dept manager + AI reviewer |
| 2 | Churn Prediction | Tabular ML | Dept manager + AI reviewer |
| 3 | Demand Forecast | Time-Series | Dept manager + AI reviewer |

## 2. 5-Phase canonical structure

Every pipeline below follows this shape; every phase emits an audit
row keyed by `request_id` per §38.3:

```
Phase 1 INPUT     → Phase 2 DATA PROCESS → Phase 3 MODEL
Phase 5 REPORT   ← Phase 4 OUTPUT       ←
```

## 3.1 — Lead Scoring

**Lifecycle type:** Tabular ML  
**Audit prefix:** `pipeline.sales.lead_scoring`

| Phase | What | Audit-row outcome |
|---|---|---|
| 1 Input | CRM leads stream + enrichment API (Clearbit/Zoominfo) — 30+ features | `outcome=data_received` |
| 2 Data Process | Drop PII at boundary; one-hot encode industry; impute company-size; scale revenue | `outcome=features_built` + n_features |
| 3 Model | XGBoost classifier, n_trials=20 Optuna, 5-fold CV, calibration sigmoid | `outcome=trained_or_inferred` + model_v |
| 4 Output | Probability 0-1 + top-5 SHAP features per lead | `outcome=auto|review|reject` per §40 |
| 5 Report | Per-rep Lead Quality Dashboard: top-N leads + score trend + conversion lift vs baseline | `outcome=report_published` + visible_to[] |

## 3.2 — Churn Prediction

**Lifecycle type:** Tabular ML  
**Audit prefix:** `pipeline.sales.churn_prediction`

| Phase | What | Audit-row outcome |
|---|---|---|
| 1 Input | Customer subscription + usage events + support tickets | `outcome=data_received` |
| 2 Data Process | Drop customerID; encode contract type; impute tenure; clip outliers | `outcome=features_built` + n_features |
| 3 Model | LightGBM + class-weight, early-stop, AUC-PR optimization | `outcome=trained_or_inferred` + model_v |
| 4 Output | Risk tier (High/Med/Low) + per-customer SHAP explanation | `outcome=auto|review|reject` per §40 |
| 5 Report | Manager dashboard: at-risk accounts ranked + recommended save-action | `outcome=report_published` + visible_to[] |

## 3.3 — Demand Forecast

**Lifecycle type:** Time-Series  
**Audit prefix:** `pipeline.sales.demand_forecast`

| Phase | What | Audit-row outcome |
|---|---|---|
| 1 Input | POS transactions (Rossmann CSV) + promo calendar + holiday calendar | `outcome=data_received` |
| 2 Data Process | Lag features (1d/7d/28d); rolling means; date decomposition; outlier flag | `outcome=features_built` + n_features |
| 3 Model | Prophet + ARIMA ensemble; per-store separate models | `outcome=trained_or_inferred` + model_v |
| 4 Output | 12-week ahead forecast + 80% prediction interval | `outcome=auto|review|reject` per §40 |
| 5 Report | S&OP planner dashboard: forecast vs actual + MAPE per store + stockout risk | `outcome=report_published` + visible_to[] |

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
| `GET /api/v1/holy/pipelines/sales` | Pipeline catalog above as JSON |
| `GET /api/v1/holy/pipelines/sales/<process_id>` | Full 5-phase spec for one process |
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
