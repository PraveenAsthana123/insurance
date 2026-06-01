# HOLY Beverage — Procurement — Input Data Mgmt + Before/After Viz

> Per global CLAUDE.md §64.17 + §64.18 — every department MUST have this artifact.
> This stub is the contract; the AI-Strategy role fills in dept specifics.

## Owner

**AI-Strategy role** + **Engineer**.

## Per-process data surfaces (6 required per process)

For every process AND sub-process in this dept (procurement), populate the 6
surfaces below. spend + contracts + vendor data is the primary data class for procurement.

### Surface 1 — Input data sources

| Process | Source | Endpoint | Format | Schema v | SLA | Retention |
|---|---|---|---|---|---|---|
| _ | _ | _ | CSV / JSON / Parquet / stream | v1 | < 15 min | 7 yr |

### Surface 2 — Input data contract

| Field | Type | Required? | Range / regex | Null policy | Idempotency-key? |
|---|---|---|---|---|---|
| _ | string | yes | _ | reject | yes |

### Surface 3 — Data quality rules

- Must-be-present: _ (per field)
- Must-be-unique: _
- Must-match-regex: _
- Must-be-in-range: _
- Cross-field invariants: _

### Surface 4 — Data lineage

```
Source X → Ingest (Kafka / SFTP / API)
       → Bronze (raw landing)
       → Silver (cleaned + typed)
       → Gold (feature store)
       → Model (XGBoost / LightGBM / RAG)
       → Decision audit row
```

### Surface 5 — Before-process visualization (per §64.7 + §64.19)

For each numeric column:
- Histogram + KDE
- Boxplot (outlier scan)
- Missing-value bar
- Target distribution (if labeled)

Plots land in: `data/eval/procurement/<pipeline>/<run_id>/plots/before_*.png`

### Surface 6 — After-process visualization (per §64.7 + §64.19)

Same columns, post-pipeline:
- Imputed + scaled histogram
- Engineered-feature histogram
- Correlation heatmap (post feature-engineering)
- Outlier scan (should show fewer)
- Class-balance (after SMOTE / undersampling)

Plots land in: `data/eval/procurement/<pipeline>/<run_id>/plots/after_*.png`

## Drill (per §43)

- Every pipeline run MUST produce BOTH `before_*.png` AND `after_*.png`
- Drill asserts: each pair exists + non-zero bytes + valid PNG header
- Negative: missing "after" plot = release blocker

## Composes with

- `HOLY_PROCESS_MGMT.md` — process catalog
- Global §64.19 — full data-prep checklist
- Global §64.26 — per-data-type use cases
- Global §43 — drill discipline
