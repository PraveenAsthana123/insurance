# HOLY Beverage — Operations Technology Stack

**Source:** operator brief 2026-05-21 (HOLY v3 doc batch).

**Primary AI categories:** Process Mining AI, Forecasting ML, Optimization AI, Anomaly Detection

## Application + ML stack

| Layer | Tools |
|---|---|
| Celonis | UiPath |
| Python | sklearn + OR-tools |
| Snowflake | dbt |
| MLflow for model tracking | MLflow for model tracking |

## Data stores

| Store | Purpose |
|---|---|
| PostgreSQL | ops DB |
| Snowflake | process warehouse |
| TimescaleDB | operational telemetry |
| S3 | process logs |

## Key models

- Process-mining discovery (PM4Py)
- Bottleneck predictor (XGBoost)
- Capacity optimizer (LP)
- Operational anomaly (Isolation Forest)

## Infrastructure

- Airflow for ops batch
- Kafka for event streaming
- Datadog for ops monitoring

---

Cross-reference: `HOLY_NAV.json` (per-dept nav), `business-layer/HOLY_SPEC.md` (dept spec), `docs/hld/HOLY_HLD.md` (HLD), `docs/lld/HOLY_LLD.md` (LLD).