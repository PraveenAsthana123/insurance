# HOLY Beverage — Finance — Data Downloads

> Per operator 2026-05-22 — every dept publishes downloadable
> sample data per use case, with before/after preprocessing
> visualization for the data-table tab.
> Composes with global §38 audit + §41.3 tenant isolation +
> §47.6 PII redaction + §57.6 envelope + §59 MDD + §64.6
> before/after viz + §64.26 per-data-type + §66.

## 1. Catalog

This dept publishes **3 downloadable sample datasets**.

| # | dataset_id | Title | Lifecycle Type | n_columns | n_rows |
|---|---|---|---|---|---|
| 1 | `fraud_txn_sample` | Fraud detection transactions sample | tabular | 5 | 5 |
| 2 | `cash_flow_sample` | Cash flow forecast sample | timeseries | 5 | 5 |
| 3 | `gl_close_sample` | Month-end GL close sample | tabular | 5 | 5 |

## 2. Per-dataset artifacts

Each `dataset_id` ships four files on disk under `data/samples/<dept>/`:

| File | Purpose |
|---|---|
| `<dataset_id>.csv` | 5-row tabular sample for download |
| `<dataset_id>.json` | Same data as JSON (programmatic consumers) |
| `<dataset_id>.before.svg` | Pre-process viz placeholder per §64.6 |
| `<dataset_id>.after.svg` | Post-process viz placeholder per §64.6 |

## 3. Schema per dataset

### 3.x `fraud_txn_sample`

- **Title:** Fraud detection transactions sample
- **Lifecycle:** tabular
- **Columns (5):** txn_id, amount, merchant, country, risk_score
- **Sample size:** 5 rows (download to see full)

### 3.x `cash_flow_sample`

- **Title:** Cash flow forecast sample
- **Lifecycle:** timeseries
- **Columns (5):** week, inflow, outflow, net, forecast_net
- **Sample size:** 5 rows (download to see full)

### 3.x `gl_close_sample`

- **Title:** Month-end GL close sample
- **Lifecycle:** tabular
- **Columns (5):** gl_account, debit, credit, balance, status
- **Sample size:** 5 rows (download to see full)

## 4. Backend API

| Endpoint | Returns |
|---|---|
| `GET /api/v1/holy/downloads/finance` | Catalog (datasets + URLs) |
| `GET /api/v1/holy/downloads/finance/<dataset_id>.csv` | CSV file |
| `GET /api/v1/holy/downloads/finance/<dataset_id>.json` | JSON file |
| `GET /api/v1/holy/downloads/finance/<dataset_id>.before.svg` | Pre-process viz |
| `GET /api/v1/holy/downloads/finance/<dataset_id>.after.svg` | Post-process viz |
| `GET /api/v1/holy/downloads/_global` | Cross-dept inventory |

## 5. Drill (release blocker)

`tests/drills/drill_data_downloads.py` asserts:
- Every dept catalog has ≥ 1 dataset
- Every dataset has all 4 files on disk (csv + json + before + after)
- CSV row count matches catalog
- JSON parses + has matching n_rows + same column names
- NEGATIVE: unknown dept → 404
- NEGATIVE: unknown dataset_id → 404
- NEGATIVE: path traversal attempt (`../etc/passwd`) → 400 / rejected

## 6. Compose-footer (§49)

- [`HOLY_USE_CASES.md`](./HOLY_USE_CASES.md) — use cases each dataset supports
- [`HOLY_DATA_MGMT.md`](./HOLY_DATA_MGMT.md) — input data contracts per process
- [`HOLY_PIPELINES.md`](./HOLY_PIPELINES.md) — Phase-1 inputs come from these samples
- [`HOLY_MASTER_DATA.md`](./HOLY_MASTER_DATA.md) — master entities reference these IDs
- [`HOLY_GRAPH_AI.md`](./HOLY_GRAPH_AI.md) — datasets become entity nodes in the graph
- [`HOLY_TRANSACTIONS.md`](./HOLY_TRANSACTIONS.md) — download events audit-rowed
- [`data-types/`](./data-types/) — sibling per-data-type catalog
