# HOLY Beverage — Product Rd Technology Stack

**Source:** operator brief 2026-05-21 (HOLY v3 doc batch).

**Primary AI categories:** GenAI, Bayesian Optimization, Knowledge Graph AI, NLP, RAG

## Application + ML stack

| Layer | Tools |
|---|---|
| Python | scikit-learn + optuna |
| RDKit for cheminformatics | RDKit for cheminformatics |
| Neo4j for ingredient knowledge graph | Neo4j for ingredient knowledge graph |
| OpenAI / Anthropic for GenAI | OpenAI / Anthropic for GenAI |

## Data stores

| Store | Purpose |
|---|---|
| Neo4j | ingredient + nutrition KG |
| Vector DB | research paper embeddings |
| PostgreSQL | lab + sensory data |
| S3 | research PDFs |

## Key models

- Flavor preference predictor (gradient boosting)
- Bayesian recipe optimizer (BoTorch)
- Nutrition compliance classifier
- Trend topic model (BERTopic)

## Infrastructure

- Conda envs for cheminformatics
- Streamlit dashboards for scientists
- MLflow for experiment tracking

---

Cross-reference: `HOLY_NAV.json` (per-dept nav), `business-layer/HOLY_SPEC.md` (dept spec), `docs/hld/HOLY_HLD.md` (HLD), `docs/lld/HOLY_LLD.md` (LLD).