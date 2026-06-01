# HOLY Beverage — Supply Chain Technology Stack

**Source:** operator brief 2026-05-21 (HOLY v3 doc batch).

**Primary AI categories:** Forecasting ML, Optimization AI, IoT AI, Anomaly Detection

## Application + ML stack

| Layer | Tools |
|---|---|
| Python | Prophet + XGBoost |
| OR-tools for optimization | OR-tools for optimization |
| Snowflake | dbt |
| MLflow for model tracking | MLflow for model tracking |

## Data stores

| Store | Purpose |
|---|---|
| PostgreSQL | orders + inventory |
| Time-series DB | TimescaleDB) for IoT |
| S3 | weather + telemetry archives |
| Snowflake for warehouse | — |

## Key models

- Demand forecast (Prophet / N-BEATS)
- Supplier risk scoring (LightGBM)
- Route optimization (OR-tools VRP)
- Anomaly detection (Isolation Forest)

## Infrastructure

- Apache Airflow for batch forecasting
- Kafka for IoT streams
- AWS SageMaker for model training

---

Cross-reference: `HOLY_NAV.json` (per-dept nav), `business-layer/HOLY_SPEC.md` (dept spec), `docs/hld/HOLY_HLD.md` (HLD), `docs/lld/HOLY_LLD.md` (LLD).