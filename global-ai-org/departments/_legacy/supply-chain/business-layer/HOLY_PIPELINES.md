# HOLY Beverage — Supply Chain — Automated Pipelines
> Per operator 2026-05-23 — every process documented as a 5-phase
> automated pipeline: **Input → Data Process → Model → Output → Final Report**.
> Composes with global §38 audit + §40 decision system + §47 C4 L3 +
> §57.5 5-question runbook + §59 MDD + §64.20 ML lifecycle types + §66.

## 1. Pipeline catalog

This dept publishes **3 automated pipelines**. Each carries the canonical 5-phase view below + an audit row per phase boundary (per §38).

| # | Process | Lifecycle Type | Persona |
|---|---|---|---|
| 1 | Demand Sensing | Time-Series + ML | Dept manager + AI reviewer |
| 2 | Reorder-Point Optimization | ML + Optimization | Dept manager + AI reviewer |
| 3 | Supplier Risk Score | ML + Graph | Dept manager + AI reviewer |

## 2. 5-Phase canonical structure

Every pipeline below follows this shape; every phase emits an audit
row keyed by `request_id` per §38.3:

```
Phase 1 INPUT     → Phase 2 DATA PROCESS → Phase 3 MODEL
Phase 5 REPORT   ← Phase 4 OUTPUT       ←
```

## 3.1 — Demand Sensing

**Lifecycle type:** Time-Series + ML  
**Audit prefix:** `pipeline.supply_chain.demand_sensing`

| Phase | What | Audit-row outcome |
|---|---|---|
| 1 Input | POS data + weather + macroeconomic + competitor pricing | `outcome=data_received` |
| 2 Data Process | Aggregate to SKU-DC-week; lag features; weather lookup | `outcome=features_built` + n_features |
| 3 Model | LightGBM with categorical encoding + Prophet ensemble | `outcome=trained_or_inferred` + model_v |
| 4 Output | Per-SKU-DC-week forecast + uncertainty band | `outcome=auto|review|reject` per §40 |
| 5 Report | S&OP weekly forecast vs plan + reorder recommendations | `outcome=report_published` + visible_to[] |

## 3.2 — Reorder-Point Optimization

**Lifecycle type:** ML + Optimization  
**Audit prefix:** `pipeline.supply_chain.reorder-point_optimization`

| Phase | What | Audit-row outcome |
|---|---|---|
| 1 Input | Demand forecast + lead time + service level target + holding cost | `outcome=data_received` |
| 2 Data Process | Compute safety stock; combine with mean demand × lead time | `outcome=features_built` + n_features |
| 3 Model | Newsvendor model + ML lead-time predictor | `outcome=trained_or_inferred` + model_v |
| 4 Output | Per-SKU reorder point + order quantity recommendation | `outcome=auto|review|reject` per §40 |
| 5 Report | Buyer console: PO suggestions ranked by urgency | `outcome=report_published` + visible_to[] |

## 3.3 — Supplier Risk Score

**Lifecycle type:** ML + Graph  
**Audit prefix:** `pipeline.supply_chain.supplier_risk_score`

| Phase | What | Audit-row outcome |
|---|---|---|
| 1 Input | Supplier master + news API + sanctions list + delivery history | `outcome=data_received` |
| 2 Data Process | NLP on news for sentiment; graph features on supplier network | `outcome=features_built` + n_features |
| 3 Model | XGBoost on aggregated features + LLM-summarized risk events | `outcome=trained_or_inferred` + model_v |
| 4 Output | Risk score per supplier + top risk drivers | `outcome=auto|review|reject` per §40 |
| 5 Report | Procurement dashboard: supplier scorecard + risk alerts | `outcome=report_published` + visible_to[] |

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
| `GET /api/v1/holy/pipelines/supply-chain` | Pipeline catalog above as JSON |
| `GET /api/v1/holy/pipelines/supply-chain/<process_id>` | Full 5-phase spec for one process |
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
