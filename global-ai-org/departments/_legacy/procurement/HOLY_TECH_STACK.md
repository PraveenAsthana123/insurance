# HOLY Beverage — Procurement Technology Stack

**Source:** operator brief 2026-05-21 (HOLY v3 doc batch).

**Primary AI categories:** NLP, OCR, Scoring ML, Optimization AI, Risk ML

## Application + ML stack

| Layer | Tools |
|---|---|
| SAP Ariba | Coupa |
| Python | spaCy + Tesseract |
| OpenAI for contract analysis | OpenAI for contract analysis |
| Snowflake for spend analytics | Snowflake for spend analytics |

## Data stores

| Store | Purpose |
|---|---|
| SAP Ariba | vendor master |
| Snowflake | spend warehouse |
| S3 | contract PDFs |
| Vector DB | contract clause embeddings |

## Key models

- Supplier risk scoring (LightGBM)
- Contract-clause classifier (LayoutLM)
- Invoice-PO matcher (rule + ML)
- Spend optimizer (LP)

## Infrastructure

- UiPath for invoice automation
- Airflow for spend aggregation
- Datadog for SLA monitoring

---

Cross-reference: `HOLY_NAV.json` (per-dept nav), `business-layer/HOLY_SPEC.md` (dept spec), `docs/hld/HOLY_HLD.md` (HLD), `docs/lld/HOLY_LLD.md` (LLD).