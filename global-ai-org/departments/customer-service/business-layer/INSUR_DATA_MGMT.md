# Data Management — Customer Service / Contact Center

Per global §64.10 + §64.17 — input data sources + before/after viz per process + per sub-process.

## Data Sources (downloadable via Kaggle CLI per global §36)

| Dataset name | Kaggle slug | Description | Local path |
| --- | --- | --- | --- |
| call_center_data | `banuprakashv/call-center-data` | Call center metrics dataset | `data/insurance/customer-service/call_center_data/` |
| customer_complaints | `anandhuh/insurance-customer-complaints` | Insurance customer complaints | `data/insurance/customer-service/customer_complaints/` |
| customer_churn | `thedevastator/customer-churn-prediction-dataset` | Customer churn prediction | `data/insurance/customer-service/customer_churn/` |
| nlp_intent_classification | `bittlingmayer/amazonreviews` | Customer intent / sentiment corpus | `data/insurance/customer-service/nlp_intent_classification/` |

## Download Commands

```bash
# Per global §36 — Kaggle CLI is globally installed.
kaggle datasets download -d banuprakashv/call-center-data -p data/insurance/customer-service/call_center_data/ --unzip
kaggle datasets download -d anandhuh/insurance-customer-complaints -p data/insurance/customer-service/customer_complaints/ --unzip
kaggle datasets download -d thedevastator/customer-churn-prediction-dataset -p data/insurance/customer-service/customer_churn/ --unzip
kaggle datasets download -d bittlingmayer/amazonreviews -p data/insurance/customer-service/nlp_intent_classification/ --unzip
```

Run from project root. Reuses existing `scripts/download_kaggle_data.py` infrastructure.

## Master Data (SAP-style)

| Entity | Source System | Owner | Freshness SLA |
|---|---|---|---|
| Customer | CRM | CX | Real-time |
| Policy | Policy Admin | UW | Real-time |
| Claim | Claims System | Claims | Real-time |
| Vendor / Provider | Vendor Mgmt | Procurement | Daily |
| Adjuster / Agent | HR / Identity | HR | Daily |
| Product / Coverage | Product Catalog | Product | Per release |

## Transactional Data

| Entity | Source | Volume estimate |
|---|---|---|
| Claim transactions | Claims System | 1M / month |
| Policy transactions | Policy Admin | 500K / month |
| Payment transactions | Billing / Finance | 200K / month |
| Customer interactions | CRM + Contact Center | 2M / month |
| Decision audit rows | This system | per-decision |

## Condition Data (real-time context)

| Signal | Source | Use case |
|---|---|---|
| Weather | NOAA API | Catastrophe risk |
| Telematics | Device API | Auto risk scoring |
| Medical records | EHR (HIPAA-secured) | Health UW |
| Police reports | State LE feed | Claim verification |
| Credit bureau | Experian / Equifax | Underwriting |
| Watchlists | NICB / state DOI | Fraud screening |

## Before / After Preprocessing

Every ML/RAG pipeline run MUST save before/after pairs per global §64.7:

```
data/eval/customer-service/<pipeline-name>/<run_id>/plots/
├── before_distribution.png    after_distribution.png
├── before_correlation.png     after_correlation.png
├── before_missing.png         after_missing.png
├── before_target.png          after_target.png
└── before_outliers.png        after_outliers.png
```

Drill `tests/drills/drill_insurance_dept_artifacts.py` enforces existence per run.

## Data Quality Rules

Per global §40.6 — every dataset has rules:

- Customer table: customer_id NOT NULL, primary_email regex-valid, tenant_id mandatory
- Policy table: policy_number unique within tenant, effective_date ≤ expiry_date
- Claims table: claim_number unique, claim_date ≤ now()
- Fraud table: score ∈ [0, 1], confidence ∈ [0, 1]

PII redaction per global §47.6 SOC2 CC6.2 — default redacted; `?include_pii=1` requires audit row.
