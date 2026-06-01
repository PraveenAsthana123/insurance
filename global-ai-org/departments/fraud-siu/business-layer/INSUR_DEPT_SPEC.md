# Department Spec — Fraud / Special Investigations Unit (SIU)

The canonical reference for this department. Drives everything else.

## Overview

- **Owner**: Chief Fraud Officer
- **Objective**: Detect + prevent insurance fraud across claims, application, and provider networks.
- **Business models**: B2C, B2B, B2E
- **AI priority**: Very High
- **ROI tier**: Very High

## Stakeholder Matrix

| Stakeholder | Pain | KPI | AI Assistant |
| --- | --- | --- | --- |
| SIU Investigator | False-positive overload | Cases closed / week | Fraud Copilot |
| Claims Adjuster | Unclear fraud signals | Referral accuracy | Fraud Signal Assistant |
| Underwriter | Application fraud risk | Application fraud score | Application Fraud Agent |
| Provider Network | Network-level fraud patterns | Provider risk score | Network Analysis Agent |
| Legal | Prosecution readiness | Case win rate | Legal Investigation Assistant |
| Compliance | Regulatory reporting (NICB, state DOI) | Reporting compliance | Compliance Reporter |
| Executive | Fraud-leakage visibility | Fraud Leakage | Fraud Executive Dashboard |

## Process Hierarchy (L1 → L2 → L3)

| L1 Process | L2 Process | L3 Sub-Process |
| --- | --- | --- |
| Fraud Detection | Multi-Layer Screening | Rule-based Screening |
| Fraud Detection | Multi-Layer Screening | ML Fraud Scoring |
| Fraud Detection | Multi-Layer Screening | Network / Graph Analysis |
| Fraud Detection | Multi-Layer Screening | Behavioral Anomaly |
| Fraud Detection | Multi-Layer Screening | External Watchlist Match |
| Triage | Case Prioritization | Priority Scoring |
| Triage | Case Prioritization | Case Routing |
| Triage | Case Prioritization | Investigator Assignment |
| Investigation | Active Case Work | Document Examination |
| Investigation | Active Case Work | Interview |
| Investigation | Active Case Work | Surveillance |
| Investigation | Active Case Work | Medical Record Review |
| Investigation | Active Case Work | Vendor / Provider Audit |
| Investigation | Active Case Work | Social Media OSINT |
| Decision | Case Disposition | Confirm Fraud |
| Decision | Case Disposition | Confirm Legitimate |
| Decision | Case Disposition | Inconclusive / Refer Out |
| Action | Outcome | Claim Denial |
| Action | Outcome | Recovery / Subrogation |
| Action | Outcome | Law Enforcement Referral |
| Action | Outcome | Provider De-network |
| Reporting | Regulatory & Industry | NICB Reporting |
| Reporting | Regulatory & Industry | State DOI Reporting |
| Reporting | Regulatory & Industry | Internal Reporting |
| Reporting | Regulatory & Industry | Industry Anti-Fraud Consortium |
| Prevention | Forward-looking Controls | Application Risk Scoring |
| Prevention | Forward-looking Controls | Provider Audit |
| Prevention | Forward-looking Controls | Customer Behavioral Monitoring |

## AI Capability Matrix (per L2)

| Process | Transaction AI | Analytical AI | Generative AI | Conversational AI |
| --- | --- | --- | --- | --- |
| Detection | Alert Workflow | Fraud Scoring + Graph | Investigation Narrative Draft | Fraud Copilot |
| Triage | Case Routing | Priority Scoring | Case Brief | Triage Assistant |
| Investigation | Case Workflow | Pattern + Network Analysis | Investigation Report Generation | Investigator Copilot |
| Decision | Decision Workflow | Outcome Probability | Decision Memo | SIU Manager Copilot |
| Action | Action Workflow | Recovery Estimation | Denial / Recovery Letter | Action Assistant |
| Reporting | Regulatory Workflow | Reporting Validation | NICB / DOI Report Generation | Compliance Reporter |
| Prevention | Surveillance Workflow | Predictive Risk Modeling | Risk Bulletin Generation | Prevention Assistant |

## AI Agent Inventory

- Fraud Detection Agent
- Anomaly Detection Agent
- Graph / Network Analysis Agent
- Behavioral Analysis Agent
- OSINT Agent
- Document Forensics Agent
- Provider Audit Agent
- Recovery Agent
- NICB / DOI Reporting Agent
- Application Fraud Agent

## KPIs

| KPI | AS-IS | TO-BE | Change |
| --- | --- | --- | --- |
| Fraud Detection Rate | 55% | 92%+ | +67% |
| Fraud Leakage | $15M/yr | <$5M/yr | −66% |
| Provider-Fraud Detection | 30% | 80%+ | +167% |
| Investigation Cycle Time | 45 days | <15 days | −67% |
| False-Positive Rate | 62% | <20% | −68% |
| Recovery Rate | 40% | 75%+ | +87% |
| Network / Ring Detection | 12% | 65%+ | +442% |
| Investigator Productivity | 8 cases/mo | 22 cases/mo | +175% |

## References

- Demo Story → [INSUR_DEMO_STORY.md](INSUR_DEMO_STORY.md)
- AS-IS Assessment → [INSUR_ASIS_ASSESSMENT.md](INSUR_ASIS_ASSESSMENT.md)
- DT Strategy → [INSUR_DT_STRATEGY.md](INSUR_DT_STRATEGY.md)
- Process Flow → [INSUR_PROCESS_FLOW.md](INSUR_PROCESS_FLOW.md)
- Architecture → [INSUR_ARCHITECTURE_FLOW.md](INSUR_ARCHITECTURE_FLOW.md)
- Business Models → [INSUR_BUSINESS_MODELS.md](INSUR_BUSINESS_MODELS.md)
- BRD → [../docs/brd/INSUR_BRD.md](../docs/brd/INSUR_BRD.md)
- FRD → [../docs/frd/INSUR_FRD.md](../docs/frd/INSUR_FRD.md)
