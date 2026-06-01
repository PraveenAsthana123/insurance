# State DOI Rate Filing — Compliance Mapping for insur_project

Per operator 2026-06-01 production-readiness. Applies to **underwriting**
+ **pricing** flows that issue rated quotes in any US state.

## What state DOIs (Departments of Insurance) regulate

Every state DOI must approve:
1. **Rate filings** — premium calculation methodology, base rates, factors
2. **Form filings** — policy contract language
3. **Underwriting guidelines** — which risks are accepted / declined
4. **AI / algorithmic underwriting** — increasingly requires disclosure

## Filing types

| Type | When required |
|---|---|
| Prior approval | DOI must approve before use (NY, CA, MA, NJ) |
| File-and-use | Use immediately; subject to retroactive review (most states) |
| Use-and-file | Use immediately, file within N days |
| No-file | Some commercial lines / surplus lines |

## AI-specific requirements (post-2023 NAIC model bulletin)

Per NAIC Model Bulletin: Use of AI Systems by Insurers (2023):

| Requirement | Status |
|---|---|
| Written AI governance policy | ⚠ §38 covers; needs DOI-format restatement |
| Algorithmic accountability + bias testing | ⚠ Fairlearn installed; not in pre-filing gate |
| Third-party AI vendor due diligence | ❌ Not done for any vendor |
| Consumer disclosure where AI affects decisions | ❌ Not in UI |
| Annual algorithmic audit | ❌ Not scheduled |

## States with explicit AI / algorithmic-underwriting rules

| State | Rule | Year | Impact |
|---|---|---|---|
| Colorado | Reg 10-1-1 §11 — AI in life insurance underwriting | 2023 | Mandatory bias testing + reporting |
| New York | Insurance Circular Letter 2 | 2019 | External-data + AI use restrictions for life UW |
| Connecticut | Bulletin AC-12 | 2023 | AI in personal-lines UW + claims |
| California | SB 1120 | 2024 | AI in claim adjudication restrictions |
| Massachusetts | Bulletin 2024-04 | 2024 | Algorithmic discrimination in UW |
| Florida | SB 1718 | 2023 | AI in property insurance restrictions |
| Texas | TDI Bulletin B-0036-22 | 2022 | AI in claims handling — disclosure required |

(Roughly 35-40 states have or are drafting AI-specific insurance rules as of 2026.)

## Per-dept filing surfaces

### Underwriting

- [ ] Rate filings: base rates + factor tables per state per LOB
- [ ] Filing of risk-scoring model methodology (model card)
- [ ] Bias testing report per Colorado / Connecticut / Massachusetts
- [ ] Third-party data source attestation (CLUE, credit bureau)
- [ ] Algorithmic explainability commitment

### Claims

- [ ] AI-claims-handling disclosure per Texas / California / Florida
- [ ] Bias testing per protected class (race / gender / age) per state guidance
- [ ] Right to human review of AI-denied claims

### Fraud-SIU

- [ ] AI fraud-detection methodology disclosure
- [ ] Appeal process for false-positive fraud flags
- [ ] No-deny-on-AI-only commitment (most states)

## Filing platforms

- **SERFF** (System for Electronic Rate and Form Filing) — primary US channel
- Direct state portals (a few states)

## Filing artifacts produced by this project

| Artifact | Source |
|---|---|
| Risk model card | per-pipeline output (planned) |
| Bias testing report | per-pipeline output (planned) |
| Sample decisions (5,000+) | from [data/eval/insurance/](../../data/eval/insurance/) |
| Confidence-tier distribution | from §40 routing |
| HITL escalation rate | from audit log query |
| Model retraining cadence | per §53.5 + monitoring |
| Drift monitoring report | quarterly (planned) |

## Pre-deployment hardstops (per state)

DO NOT issue priced quotes in ANY state without:
- [ ] State-approved rate filing on file
- [ ] Filing actuary sign-off
- [ ] AI disclosure language in policy + quote UI
- [ ] HITL escalation path documented for declined risks
- [ ] Bias testing report on file for high-AI-risk states (CO, CT, MA, NY, CA, FL)

## Filing cadence

| Activity | Cadence |
|---|---|
| Rate filing refresh | 12-18 months (most states) |
| Model card update | Every model version |
| Bias report | Annual + per model change |
| Algorithmic audit | Annual |
| Customer complaint summary | Quarterly |

## Composes with

- §38 AI production governance
- §40 decision system (rule + confidence + HITL routing — filing-disclosable)
- §48 explainability (Art. 86 maps to state right-to-explanation rules)
- §53 enterprise maturity stack (item 14 Governance)
- [EU_AI_ACT.md](EU_AI_ACT.md) — parallel obligations for EU customers
- [HIPAA.md](HIPAA.md) — for health-LOB filings
