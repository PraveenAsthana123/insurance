# HOLY Beverage — Legal Technology Stack

**Source:** operator brief 2026-05-21 (HOLY v3 doc batch).

**Primary AI categories:** NLP, OCR, RAG, Document AI, Compliance AI

## Application + ML stack

| Layer | Tools |
|---|---|
| DocuSign | iManage |
| Python | spaCy + LayoutLM |
| OpenAI / Claude for redlining | OpenAI / Claude for redlining |
| Snowflake (matter analytics) | Snowflake (matter analytics) |

## Data stores

| Store | Purpose |
|---|---|
| PostgreSQL | matter management |
| S3 | contract PDFs |
| Vector DB | clause embeddings |
| Neo4j | entity / case graph |

## Key models

- Clause classifier (LayoutLM)
- Redline-suggestion model (GPT-4 fine-tune)
- Risk-flag classifier (XGBoost)
- Case-similarity (sentence-BERT)

## Infrastructure

- UiPath for contract intake
- Airflow for matter ETL
- Datadog for SLA

---

Cross-reference: `HOLY_NAV.json` (per-dept nav), `business-layer/HOLY_SPEC.md` (dept spec), `docs/hld/HOLY_HLD.md` (HLD), `docs/lld/HOLY_LLD.md` (LLD).