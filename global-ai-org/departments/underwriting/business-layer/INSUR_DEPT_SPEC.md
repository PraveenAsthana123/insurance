# Department Spec — Underwriting

The canonical reference for this department. Drives everything else.

## Overview

- **Owner**: Chief Underwriting Officer
- **Objective**: Faster, more accurate risk selection + dynamic pricing across B2C, B2B, B2E.
- **Business models**: B2C, B2B, B2E
- **AI priority**: Very High
- **ROI tier**: Very High

## Stakeholder Matrix

| Stakeholder | Pain | KPI | AI Assistant |
| --- | --- | --- | --- |
| Applicant | Slow approval | Approval Time | Underwriting Assistant |
| Broker / Agent | Delayed quote | Quote TAT | Broker Copilot |
| Underwriter | Manual review burden | Cases/day | Underwriter Copilot |
| Underwriting Manager | Capacity planning | SLA attainment | Manager Copilot |
| Product Team | Poor pricing feedback | Product profitability | Product Assistant |
| Actuarial Team | Risk prediction lag | Loss ratio variance | Actuarial Copilot |
| Risk Team | Emerging risks not surfaced | Risk Exposure | Risk Assistant |
| Compliance | Regulatory review burden | Audit findings | Compliance Copilot |
| Executive | Portfolio visibility | Combined Ratio | Executive Copilot |

## Process Hierarchy (L1 → L2 → L3)

| L1 Process | L2 Process | L3 Sub-Process |
| --- | --- | --- |
| Lead Intake | Application Submission | Web Application |
| Lead Intake | Application Submission | Broker Portal |
| Lead Intake | Application Submission | Direct Sales Channel |
| Lead Intake | Application Submission | Reverse Auction Aggregator |
| Pre-Screening | Eligibility & Appetite | Eligibility Check |
| Pre-Screening | Eligibility & Appetite | Appetite Match |
| Pre-Screening | Eligibility & Appetite | Decline-and-redirect |
| Pre-Screening | Eligibility & Appetite | Quick-quote Path |
| Data Collection | External Data Pulls | KYC / Identity Verification |
| Data Collection | External Data Pulls | Credit Bureau Pull |
| Data Collection | External Data Pulls | Medical Records (HIPAA-compliant) |
| Data Collection | External Data Pulls | Motor Vehicle Records (MVR) |
| Data Collection | External Data Pulls | CLUE Loss History |
| Data Collection | External Data Pulls | Telematics Onboarding |
| Risk Assessment | Multi-Source Risk Scoring | Demographic Risk Scoring |
| Risk Assessment | Multi-Source Risk Scoring | Behavioral Risk Scoring |
| Risk Assessment | Multi-Source Risk Scoring | Catastrophe Exposure (Geo) |
| Risk Assessment | Multi-Source Risk Scoring | Credit-based Insurance Score |
| Risk Assessment | Multi-Source Risk Scoring | Predictive Lapse Risk |
| Underwriting Review | Decision Engine | Auto Underwriting (STP) |
| Underwriting Review | Decision Engine | Manual Underwriting Review |
| Underwriting Review | Decision Engine | Senior UW Referral |
| Underwriting Review | Decision Engine | Reinsurance Referral (treaty / facultative) |
| Pricing | Premium Calculation | Base Premium Calculation |
| Pricing | Premium Calculation | Dynamic Adjustment (telematics, behavior) |
| Pricing | Premium Calculation | Discount Application |
| Pricing | Premium Calculation | Surcharge Application |
| Pricing | Premium Calculation | Rate-filing Compliance Check |
| Decision | Decision Issuance | Approve |
| Decision | Decision Issuance | Reject (with reason codes) |
| Decision | Decision Issuance | Refer (with conditions) |
| Decision | Decision Issuance | Counter-offer |
| Policy Issuance | Binding & Delivery | Policy Document Generation |
| Policy Issuance | Binding & Delivery | ID Card Issuance |
| Policy Issuance | Binding & Delivery | Welcome Kit Generation |
| Policy Issuance | Binding & Delivery | Policy Delivery (e-delivery / mail) |
| Portfolio Monitoring | In-force Surveillance | Risk Re-scoring |
| Portfolio Monitoring | In-force Surveillance | Loss-experience Monitoring |
| Portfolio Monitoring | In-force Surveillance | Renewal Risk Review |
| Portfolio Monitoring | In-force Surveillance | Mid-term Endorsement Review |

## AI Capability Matrix (per L2)

| Process | Transaction AI | Analytical AI | Generative AI | Conversational AI |
| --- | --- | --- | --- | --- |
| Application | Data Capture Workflow | Risk Pre-screening | Application Summary | Application Assistant |
| Data Collection | External Data Workflow | Data Quality Scoring | Data Gap Report | Data Assistant |
| Risk Assessment | Scoring Workflow | ML Risk Models | Risk Narrative | Risk Copilot |
| Pricing | Rating Workflow | Dynamic Pricing Models | Pricing Explanation (XAI) | Pricing Assistant |
| Decision | Decision Workflow | Acceptance Probability | Decision Letter Draft | UW Copilot |
| Policy Issuance | Document Workflow | Document Validation | Policy Generation (GenAI) | Policy Assistant |
| Portfolio Monitoring | Surveillance Workflow | Drift Detection | Risk Trend Report | Portfolio Copilot |

## AI Agent Inventory

- Application Intake Agent
- Document Verification Agent
- Risk Scoring Agent
- Pricing Agent
- Underwriting Decision Agent
- Policy Generation Agent
- Compliance Verification Agent
- Portfolio Monitoring Agent
- Renewal Risk Agent

## KPIs

| KPI | AS-IS | TO-BE | Change |
| --- | --- | --- | --- |
| Quote Turnaround Time (personal lines) | 2.5 days | <5 min | −99% |
| Underwriting Cycle Time (commercial) | 14 days | <48 hrs | −86% |
| STP Rate (personal lines) | 22% | 70%+ | +218% |
| Loss Ratio | 67% | <58% | −13% |
| Combined Ratio | 102% | <94% | −8 pts |
| Risk Model Accuracy (AUC) | 0.72 | >0.85 | +18% |
| Portfolio Profitability | +8% | +18% | +10 pts |
| UW Adjuster Productivity | 12 cases/day | 30 cases/day | +150% |

## References

- Demo Story → [INSUR_DEMO_STORY.md](INSUR_DEMO_STORY.md)
- AS-IS Assessment → [INSUR_ASIS_ASSESSMENT.md](INSUR_ASIS_ASSESSMENT.md)
- DT Strategy → [INSUR_DT_STRATEGY.md](INSUR_DT_STRATEGY.md)
- Process Flow → [INSUR_PROCESS_FLOW.md](INSUR_PROCESS_FLOW.md)
- Architecture → [INSUR_ARCHITECTURE_FLOW.md](INSUR_ARCHITECTURE_FLOW.md)
- Business Models → [INSUR_BUSINESS_MODELS.md](INSUR_BUSINESS_MODELS.md)
- BRD → [../docs/brd/INSUR_BRD.md](../docs/brd/INSUR_BRD.md)
- FRD → [../docs/frd/INSUR_FRD.md](../docs/frd/INSUR_FRD.md)
