# Healthcare Industry — Required Processes (Canadian context)

> **Industry:** Healthcare (hospital + primary care + long-term care
> + virtual care) · **Jurisdiction:** Canada · **Status:** Parallel
> reference to [`insurerage_industry_processes.md`](insurerage_industry_processes.md)
>
> The **process catalog** for Canadian healthcare. Sister to the
> insurerage catalog; same shape, different rows. For the compliance
> overlay, see [`canada_healthcare_2026.md`](canada_healthcare_2026.md).

## Why this catalog

HOLY/insur is a insurerage project; healthcare is **not** its primary
deployment domain. This catalog exists to:

1. Keep the methodology portable — same process-catalog shape, swap
   the rows for a different industry.
2. Provide a reference for any sister deployment (e.g., if the same
   platform pivots to a hospital pilot).
3. Document the *separation*: healthcare-specific processes (clinical
   intake, diagnosis, treatment, billing) live here so they do NOT
   pollute the insurerage process catalog.

## At-a-glance — the 12 process families

| # | Process Family | Primary owner role | Core question |
|---|---|---|---|
| 1 | **Patient Intake & Registration** | Admin / Reception | Is the patient identified, consented, and routed correctly? |
| 2 | **Triage & Assessment** | Nursing / ED | Is acuity assigned and waiting time within SLA? |
| 3 | **Diagnostic Workup (Lab + Imaging)** | Lab + Radiology | Are tests ordered, performed, and resulted on time? |
| 4 | **Clinical Decision & Treatment Planning** | Physician | Is the plan evidence-based, consented, and shared? |
| 5 | **Care Delivery (Bedside + Outpatient + Virtual)** | Nursing + Physician + Allied Health | Is care delivered per plan with adverse events tracked? |
| 6 | **Medication Management** | Pharmacy + Nursing | Is the right drug, dose, route, time, patient? |
| 7 | **Surgical / Procedural Workflow** | Surgery + OR Nursing | Is the procedure consented, scheduled, executed, and reconciled? |
| 8 | **Discharge & Care Transitions** | Care Coordinators | Is discharge safe, summarized, and followed up? |
| 9 | **Population Health & Chronic Disease Management** | Public Health + Primary Care | Are at-risk cohorts identified and managed? |
| 10 | **Billing & Claims (Public + Private)** | Revenue Cycle | Are claims submitted, accepted, and reimbursed? |
| 11 | **Quality, Safety & Incident Reporting** | Quality + Risk | Are adverse events captured, RCAd, and prevented? |
| 12 | **Research, Ethics & Secondary Data Use** | Research + REB | Is secondary data use consented, ethical, and REB-approved? |

## Per-family structural summary

Each family follows the same sub-process pattern as the insurerage
catalog: **sub-process → AI / automation opportunity → compliance
touchpoint → KPI**. Full row-level detail is intentionally NOT
expanded here (HOLY/insur project is non-healthcare); to expand, fork
the [`insurerage_industry_processes.md`](insurerage_industry_processes.md)
structure and populate rows from your specific deployment.

Key compliance touchpoints across all 12 families:

- **PHIPA / provincial health privacy** — patient identification, consent, access controls
- **PIPEDA** — non-clinical PII (billing, marketing, research)
- **Health Canada SaMD** — any AI used in diagnosis / triage / treatment
- **REB / Tri-Council Policy Statement** — research use of clinical data
- **OCAP** — Indigenous data sovereignty
- **Infoway FHIR / HL7** — interoperability
- **AODA / ACA** — accessibility

## Healthcare-specific AI use-case patterns

| Use case | Process family | Compliance gate |
|---|---|---|
| Triage acuity prediction | 2 | Health Canada SaMD Class II+ |
| Imaging diagnostic support (CV) | 3 | Health Canada SaMD Class II+ + FDA 510(k) if multi-jurisdiction |
| Sepsis early warning | 5 | Health Canada SaMD + clinical-validation per [`../ai_assurance/clinical_validation.md`](../ai_assurance/clinical_validation.md) |
| Medication interaction check | 6 | Health Canada — moderate risk |
| Discharge-risk + readmission | 8 | Health Canada — low-moderate risk |
| Population risk stratification | 9 | PHIPA + REB if secondary use |
| Coding / billing automation | 10 | PIPEDA + payer audit |
| Adverse-event NLP triage | 11 | Internal QI + patient privacy |
| Synthetic data for research | 12 | REB + OCAP if Indigenous data |

## How this composes with sister catalogs

| Concern | Where it lives |
|---|---|
| Healthcare DT checklist (12-domain compliance overlay) | [`canada_healthcare_2026.md`](canada_healthcare_2026.md) |
| Clinical validation (PPV / NPV / Cohen's Kappa / SaMD mapping) | [`../ai_assurance/clinical_validation.md`](../ai_assurance/clinical_validation.md) |
| Reliability (test-retest, inter-rater) | [`../ai_assurance/reliability_matrix.md`](../ai_assurance/reliability_matrix.md) |
| Fairness (population subgroup parity) | [`../ai_assurance/fairness_framework.md`](../ai_assurance/fairness_framework.md) |
| Build-phase methodology for clinical ML | [`../ml_methodology/`](../ml_methodology/) all 11 phases |
| Beverage-equivalent process catalog (the actual project's domain) | [`insurerage_industry_processes.md`](insurerage_industry_processes.md) |

## The brutal rule

> Healthcare and CPG/insurerage share the same **process-catalog
> structure** but **disjoint row contents**. Keeping them in parallel
> files prevents cross-contamination: a insurerage engineer reading
> the insurerage catalog never accidentally adopts a healthcare
> compliance gate they don't need; a healthcare engineer reading the
> healthcare catalog never accidentally adopts a CFIA control they
> don't need. Two files, one methodology, zero confusion.

## When to expand this catalog

Expand the family-level rows into full sub-process tables ONLY when:

1. A healthcare deployment is actually being scoped (not speculative)
2. A specific province / payer / care setting is named (e.g., "Ontario LTC", "Quebec CHSLD", "BC primary care")
3. A specific use case is in flight (e.g., "sepsis early warning at hospital X")

Otherwise, this stub + [`canada_healthcare_2026.md`](canada_healthcare_2026.md)
+ [`../ai_assurance/clinical_validation.md`](../ai_assurance/clinical_validation.md)
is sufficient reference.
