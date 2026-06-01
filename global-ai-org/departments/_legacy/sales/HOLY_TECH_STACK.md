# HOLY Beverage — Sales Technology Stack

**Source:** operator brief 2026-05-21 (HOLY v3 doc batch).

**Primary AI categories:** Lead Scoring ML, RAG, GenAI, Optimization AI, Forecasting

## Application + ML stack

| Layer | Tools |
|---|---|
| Salesforce | Snowflake |
| Python | scikit-learn |
| OpenAI for proposal generation | OpenAI for proposal generation |
| Looker for sales dashboards | Looker for sales dashboards |

## Data stores

| Store | Purpose |
|---|---|
| Salesforce | CRM |
| Snowflake | pipeline + revenue |
| Vector DB | proposal templates |
| PostgreSQL | territory data |

## Key models

- Lead scoring (LightGBM)
- Pricing optimizer (LP)
- Win probability (XGBoost)
- Cross-sell recommender (collaborative filtering)

## Infrastructure

- Salesforce Einstein for native ML
- Airflow for nightly pipeline aggregation
- Snowflake for warehouse

---

Cross-reference: `HOLY_NAV.json` (per-dept nav), `business-layer/HOLY_SPEC.md` (dept spec), `docs/hld/HOLY_HLD.md` (HLD), `docs/lld/HOLY_LLD.md` (LLD).