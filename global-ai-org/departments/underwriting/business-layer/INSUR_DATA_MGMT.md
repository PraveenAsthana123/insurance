# Data Management — Underwriting

Per global §64.10 + §64.17 — input data sources + before/after viz per process + per sub-process.

## Data Sources (downloadable via Kaggle CLI per global §36)

| Dataset name | Kaggle slug | Description | Local path |
| --- | --- | --- | --- |
| life_insurance_data | `broaniki/insurance` | Health insurance dataset (age/BMI/region/charges) | `data/insurance/underwriting/life_insurance_data/` |
| auto_insurance_underwriting | `easonlai/sample-insurance-claim-prediction-dataset` | Auto UW + claims features | `data/insurance/underwriting/auto_insurance_underwriting/` |
| medical_cost | `mirichoi0218/insurance` | Medical cost personal dataset | `data/insurance/underwriting/medical_cost/` |

## Download Commands

```bash
# Per global §36 — Kaggle CLI is globally installed.
kaggle datasets download -d broaniki/insurance -p data/insurance/underwriting/life_insurance_data/ --unzip
kaggle datasets download -d easonlai/sample-insurance-claim-prediction-dataset -p data/insurance/underwriting/auto_insurance_underwriting/ --unzip
kaggle datasets download -d mirichoi0218/insurance -p data/insurance/underwriting/medical_cost/ --unzip
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
data/eval/underwriting/<pipeline-name>/<run_id>/plots/
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
