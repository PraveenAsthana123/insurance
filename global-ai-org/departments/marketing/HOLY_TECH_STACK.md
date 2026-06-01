# HOLY Beverage — Marketing Technology Stack

**Source:** operator brief 2026-05-21 (HOLY v3 doc batch).

**Primary AI categories:** NLP, GenAI, Recommendation AI, Attribution ML, Brand-safety AI

## Application + ML stack

| Layer | Tools |
|---|---|
| Adobe | Salesforce Marketing Cloud |
| Python | scikit-learn |
| OpenAI / Anthropic for content | OpenAI / Anthropic for content |
| Snowflake | dbt |

## Data stores

| Store | Purpose |
|---|---|
| Snowflake | CDP |
| Vector DB | creative embeddings |
| Redis | campaign caches |
| S3 | asset library |

## Key models

- Attribution model (Markov chains)
- Audience segmentation (k-means)
- Content recommender (LightFM)
- Brand-safety classifier (BERT)

## Infrastructure

- Airflow for campaign batch
- Kafka for engagement events
- Tableau / Looker for dashboards

---

Cross-reference: `HOLY_NAV.json` (per-dept nav), `business-layer/HOLY_SPEC.md` (dept spec), `docs/hld/HOLY_HLD.md` (HLD), `docs/lld/HOLY_LLD.md` (LLD).