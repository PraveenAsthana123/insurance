# HOLY Beverage — Digital Marketing Technology Stack

**Source:** operator brief 2026-05-21 (HOLY v3 doc batch).

**Primary AI categories:** NLP, Recommendation AI, GenAI, Reinforcement Learning

## Application + ML stack

| Layer | Tools |
|---|---|
| Python | scikit-learn |
| OpenAI / Anthropic / Ollama for GenAI | OpenAI / Anthropic / Ollama for GenAI |
| Snowflake | dbt |
| Segment | Amplitude (clickstream) |
| Looker / Tableau | Looker / Tableau |

## Data stores

| Store | Purpose |
|---|---|
| Snowflake | CRM + clickstream + campaign |
| Vector DB | Pinecone / pgvector) for content embeddings |
| Redis | campaign caches |

## Key models

- Customer segmentation (k-means / DBSCAN)
- Propensity scoring (XGBoost)
- Brand-safety classifier (BERT)
- Channel-mix optimizer (multi-armed bandit)

## Infrastructure

- AWS / GCP
- Airflow for batch campaigns
- Kafka for clickstream

---

Cross-reference: `HOLY_NAV.json` (per-dept nav), `business-layer/HOLY_SPEC.md` (dept spec), `docs/hld/HOLY_HLD.md` (HLD), `docs/lld/HOLY_LLD.md` (LLD).