# HOLY Beverage — Hr Technology Stack

**Source:** operator brief 2026-05-21 (HOLY v3 doc batch).

**Primary AI categories:** NLP, RPA, Churn / Retention ML, Fairness AI, Recommendation AI

## Application + ML stack

| Layer | Tools |
|---|---|
| Workday | Snowflake |
| Python | spaCy + Hugging Face |
| Aequitas / Fairlearn for bias | Aequitas / Fairlearn for bias |
| Tableau for people analytics | Tableau for people analytics |

## Data stores

| Store | Purpose |
|---|---|
| Workday | HRIS |
| Snowflake | people analytics |
| S3 | resume corpus |
| Vector DB | skill embeddings |

## Key models

- Resume-JD matcher (sentence-BERT)
- Attrition risk (XGBoost)
- Pay-equity statistical model
- Skill-gap similarity (cosine)

## Infrastructure

- UiPath / Microsoft Power Automate for RPA
- Airflow for survey ETL
- Datadog for fairness monitoring

---

Cross-reference: `HOLY_NAV.json` (per-dept nav), `business-layer/HOLY_SPEC.md` (dept spec), `docs/hld/HOLY_HLD.md` (HLD), `docs/lld/HOLY_LLD.md` (LLD).