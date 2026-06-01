# Department Spec — Claims

The canonical reference for this department. Drives everything else.

## Overview

- **Owner**: Chief Claims Officer
- **Objective**: Faster, accurate claim settlement across B2C, B2B, B2E channels.
- **Business models**: B2C, B2B, B2E, B2G
- **AI priority**: Very High
- **ROI tier**: Very High

## Stakeholder Matrix

| Stakeholder | Pain | KPI | AI Assistant |
| --- | --- | --- | --- |
| Policyholder | Slow settlement | NPS | Claims Assistant |
| Claims Adjuster | Manual document review | Claims/day | Adjuster Copilot |
| Claims Manager | SLA misses | Cycle Time | Claims Operations Copilot |
| Fraud Investigator | False positives | Fraud Detection Rate | Fraud Copilot |
| Underwriter | No claims feedback loop | Loss Ratio | Risk Insights Assistant |
| Finance | Reserve accuracy | Reserve Accuracy | Finance Copilot |
| Compliance | Audit burden | Audit Findings | Compliance Copilot |
| Legal | Litigation review | Case Resolution Time | Legal Assistant |
| Executive | Visibility gaps | Combined Ratio | Executive AI Assistant |
| Vendor (Repair/Medical) | Delayed assignments | Vendor SLA | Vendor Portal Assistant |

## Process Hierarchy (L1 → L2 → L3)

| L1 Process | L2 Process | L3 Sub-Process |
| --- | --- | --- |
| FNOL | Claim Intake | Web Claim Submission |
| FNOL | Claim Intake | Mobile Claim Submission |
| FNOL | Claim Intake | Call Center Intake |
| FNOL | Claim Intake | Broker / Agent Submission |
| FNOL | Claim Intake | Email / Document Upload |
| Claim Setup | Registration | Claim Number Generation |
| Claim Setup | Registration | Policy Linking |
| Claim Setup | Registration | Customer Verification |
| Claim Setup | Registration | Loss Date / Location Capture |
| Document Management | Collection & Extraction | Document Upload |
| Document Management | Collection & Extraction | OCR Extraction |
| Document Management | Collection & Extraction | Document Classification |
| Document Management | Collection & Extraction | Metadata Tagging |
| Validation | Completeness & Coverage | Missing Data Check |
| Validation | Completeness & Coverage | Duplicate Claim Check |
| Validation | Completeness & Coverage | Coverage Validation |
| Validation | Completeness & Coverage | Policy-in-force Verification |
| Fraud Management | Screening | Fraud Score Calculation |
| Fraud Management | Screening | Pattern Analysis |
| Fraud Management | Screening | Network / Graph Analysis |
| Fraud Management | Screening | External Watchlist Match |
| Coverage | Verification | Coverage Check |
| Coverage | Verification | Policy Limits Check |
| Coverage | Verification | Deductible Application |
| Coverage | Verification | Exclusion Review |
| Assessment | Damage / Loss Assessment | Image / Video Analysis (CV) |
| Assessment | Damage / Loss Assessment | Adjuster Field Review |
| Assessment | Damage / Loss Assessment | Repair Estimate |
| Assessment | Damage / Loss Assessment | Medical Bill Review |
| Investigation | Case Analysis | Field Investigation |
| Investigation | Case Analysis | External Verification (Police / Medical) |
| Investigation | Case Analysis | Witness Interview |
| Investigation | Case Analysis | Subrogation Review |
| Settlement | Reserve & Decision | Reserve Calculation |
| Settlement | Reserve & Decision | Settlement Recommendation |
| Settlement | Reserve & Decision | Negotiation |
| Settlement | Reserve & Decision | Approval Routing |
| Approval | Approval Workflow | Auto Approval (STP) |
| Approval | Approval Workflow | Manual Approval |
| Approval | Approval Workflow | Manager Escalation |
| Approval | Approval Workflow | Committee Review |
| Payment | Disbursement | EFT Payment |
| Payment | Disbursement | Check Issuance |
| Payment | Disbursement | Vendor Direct Pay |
| Payment | Disbursement | Recovery / Salvage |
| Closure | Closeout & Audit | File Archive |
| Closure | Closeout & Audit | Audit Logging |
| Closure | Closeout & Audit | Customer Notification |
| Closure | Closeout & Audit | Subrogation Recovery |

## AI Capability Matrix (per L2)

| Process | Transaction AI | Analytical AI | Generative AI | Conversational AI |
| --- | --- | --- | --- | --- |
| FNOL | Claim Creation Workflow | Claim Classification | Claim Summary Drafting | Claims Intake Chatbot (24×7) |
| Validation | Rules Workflow | Anomaly Detection | Validation Report | Validation Assistant |
| Fraud | Alert Workflow | Fraud Scoring + Graph | Investigation Narrative | Fraud Copilot |
| Coverage | Rules Engine | Coverage Analytics | Coverage Explanation | Policy Assistant |
| Assessment | Workflow | CV Damage Prediction | Assessment Report | Adjuster Copilot |
| Investigation | Case Routing | Pattern + Network Analysis | Investigation Narrative | Investigator Copilot |
| Settlement | Payment Workflow | Reserve Prediction | Settlement Recommendation | Claims Assistant |
| Closure | Audit Workflow | Trend Analysis | Closure Summary | Service Assistant |

## AI Agent Inventory

- Claim Intake Agent
- Claim Assessment Agent
- Claim Validation Agent
- Claim Triage Agent
- Claim Settlement Agent
- Claims Investigation Agent
- Fraud Detection Agent
- Coverage Verification Agent
- Document Extraction Agent
- Subrogation Agent
- Customer Notification Agent

## KPIs

| KPI | AS-IS | TO-BE | Change |
| --- | --- | --- | --- |
| FNOL → Registration Time | 30 min | 5 min | −83% |
| Document Validation Accuracy | 78% | 95%+ | +22% |
| Fraud Detection Rate | 55% | 92%+ | +67% |
| Claims STP Rate | 18% | 80%+ | +344% |
| Cycle Time (FNOL → Settlement) | 14 days | <24 hrs | −93% |
| Loss Adjustment Expense (LAE) | $150M | $105M | −30% |
| Customer CSAT | 3.4 / 5 | 4.6 / 5 | +35% |
| Claims Leakage | $15M/yr | <$5M/yr | −66% |

## References

- Demo Story → [INSUR_DEMO_STORY.md](INSUR_DEMO_STORY.md)
- AS-IS Assessment → [INSUR_ASIS_ASSESSMENT.md](INSUR_ASIS_ASSESSMENT.md)
- DT Strategy → [INSUR_DT_STRATEGY.md](INSUR_DT_STRATEGY.md)
- Process Flow → [INSUR_PROCESS_FLOW.md](INSUR_PROCESS_FLOW.md)
- Architecture → [INSUR_ARCHITECTURE_FLOW.md](INSUR_ARCHITECTURE_FLOW.md)
- Business Models → [INSUR_BUSINESS_MODELS.md](INSUR_BUSINESS_MODELS.md)
- BRD → [../docs/brd/INSUR_BRD.md](../docs/brd/INSUR_BRD.md)
- FRD → [../docs/frd/INSUR_FRD.md](../docs/frd/INSUR_FRD.md)
