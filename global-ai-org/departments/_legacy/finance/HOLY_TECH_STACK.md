# HOLY Beverage — Finance Technology Stack

**Source:** operator brief 2026-05-21 (HOLY v3 doc batch).

**Primary AI categories:** Time-Series Forecasting, Anomaly Detection, Optimization AI, GenAI

## Application + ML stack

| Layer | Tools |
|---|---|
| Python | Prophet + statsmodels |
| SAP | Snowflake integration |
| OpenAI for CFO copilot | OpenAI for CFO copilot |
| Tableau / Power BI | Tableau / Power BI |

## Data stores

| Store | Purpose |
|---|---|
| SAP | ERP |
| Snowflake | consolidated financials |
| PostgreSQL | sub-ledgers |
| Vector DB | policy + contract embeddings |

## Key models

- Revenue forecast (Prophet ensemble)
- Cashflow forecast (ARIMA)
- Fraud detection (Isolation Forest + autoencoder)
- Spend categorization (BERT)

## Infrastructure

- Airflow for nightly close
- dbt for financial transformations
- Datadog for anomaly monitoring

---

Cross-reference: `HOLY_NAV.json` (per-dept nav), `business-layer/HOLY_SPEC.md` (dept spec), `docs/hld/HOLY_HLD.md` (HLD), `docs/lld/HOLY_LLD.md` (LLD).