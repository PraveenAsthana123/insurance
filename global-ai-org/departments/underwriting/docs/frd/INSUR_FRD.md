# Functional Requirements Document (FRD) — Underwriting

Per global §66.2 — FR-IDs use the **UWR** prefix.

## Functional Requirements

| FR ID | Process | Sub-Process | Type | Priority | Actor | Inputs | Outputs | SLA | Audit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FR-UWR-001 | Lead Intake — Application Submission | Web Application | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-002 | Lead Intake — Application Submission | Broker Portal | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-003 | Lead Intake — Application Submission | Direct Sales Channel | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-004 | Lead Intake — Application Submission | Reverse Auction Aggregator | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-005 | Pre-Screening — Eligibility & Appetite | Eligibility Check | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-006 | Pre-Screening — Eligibility & Appetite | Appetite Match | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-007 | Pre-Screening — Eligibility & Appetite | Decline-and-redirect | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-008 | Pre-Screening — Eligibility & Appetite | Quick-quote Path | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-009 | Data Collection — External Data Pulls | KYC / Identity Verification | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-010 | Data Collection — External Data Pulls | Credit Bureau Pull | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-011 | Data Collection — External Data Pulls | Medical Records (HIPAA-compliant) | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-012 | Data Collection — External Data Pulls | Motor Vehicle Records (MVR) | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-013 | Data Collection — External Data Pulls | CLUE Loss History | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-014 | Data Collection — External Data Pulls | Telematics Onboarding | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-015 | Risk Assessment — Multi-Source Risk Scoring | Demographic Risk Scoring | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-016 | Risk Assessment — Multi-Source Risk Scoring | Behavioral Risk Scoring | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-017 | Risk Assessment — Multi-Source Risk Scoring | Catastrophe Exposure (Geo) | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-018 | Risk Assessment — Multi-Source Risk Scoring | Credit-based Insurance Score | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-019 | Risk Assessment — Multi-Source Risk Scoring | Predictive Lapse Risk | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-020 | Underwriting Review — Decision Engine | Auto Underwriting (STP) | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-021 | Underwriting Review — Decision Engine | Manual Underwriting Review | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-022 | Underwriting Review — Decision Engine | Senior UW Referral | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-023 | Underwriting Review — Decision Engine | Reinsurance Referral (treaty / facultative) | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-024 | Pricing — Premium Calculation | Base Premium Calculation | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-025 | Pricing — Premium Calculation | Dynamic Adjustment (telematics, behavior) | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-026 | Pricing — Premium Calculation | Discount Application | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-027 | Pricing — Premium Calculation | Surcharge Application | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-028 | Pricing — Premium Calculation | Rate-filing Compliance Check | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-029 | Decision — Decision Issuance | Approve | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-030 | Decision — Decision Issuance | Reject (with reason codes) | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-031 | Decision — Decision Issuance | Refer (with conditions) | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-032 | Decision — Decision Issuance | Counter-offer | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-033 | Policy Issuance — Binding & Delivery | Policy Document Generation | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-034 | Policy Issuance — Binding & Delivery | ID Card Issuance | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-035 | Policy Issuance — Binding & Delivery | Welcome Kit Generation | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-036 | Policy Issuance — Binding & Delivery | Policy Delivery (e-delivery / mail) | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-037 | Portfolio Monitoring — In-force Surveillance | Risk Re-scoring | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-038 | Portfolio Monitoring — In-force Surveillance | Loss-experience Monitoring | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-039 | Portfolio Monitoring — In-force Surveillance | Renewal Risk Review | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-UWR-040 | Portfolio Monitoring — In-force Surveillance | Mid-term Endorsement Review | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |

## Non-Functional Requirements

| NFR ID | Category | Requirement | Target |
| --- | --- | --- | --- |
| NFR-001 | Availability | System availability | 99.95% uptime |
| NFR-002 | Latency | p95 latency | ≤ 5s for non-AI, ≤ 30s for AI inference |
| NFR-003 | Throughput | Concurrent users | 50,000 |
| NFR-004 | Scalability | Horizontal scale-out | Linear to 5x baseline |
| NFR-005 | Security | RBAC + ABAC | SOC2 CC6.2 enforcement |
| NFR-006 | Authentication | SSO + MFA | Mandatory for staff; OTP for customers |
| NFR-007 | Encryption | Data at rest + transit | AES-256 + TLS 1.3 |
| NFR-008 | Audit | Full traceability | Per §38.3 audit row schema |
| NFR-009 | Compliance | Regulatory | GDPR, HIPAA (where applicable), SOC2, EU AI Act |
| NFR-010 | Hallucination | AI output reliability | < 2% hallucination rate |
| NFR-011 | Explainability | XAI for decisions | Mandatory per §48 |
| NFR-012 | Fairness | Disparate impact | ≥ 0.8 across protected classes |
| NFR-013 | Human override | HITL | Mandatory for high-risk decisions |
| NFR-014 | Logging | Structured logs | JSON + canonical fields (§57.6) |
| NFR-015 | Observability | Tracing + metrics + logs | OpenTelemetry |

## Acceptance Criteria (cross-FR)

- [ ] All functional requirements pass acceptance tests
- [ ] All NFRs pass load test (§47.10)
- [ ] All AI features pass eval gate (§59.4 ORF metrics)
- [ ] Decision audit row written for every regulated decision
- [ ] Explainability surface available via `/api/v1/explain?prediction_id=<id>`
- [ ] Fairness pre-deploy gate green
- [ ] Drill regression catalog passes (§43)

## Traceability

| FR ID prefix | Implementation surface | Drill | Owner |
|---|---|---|---|
| FR-UWR-001..N | `backend/routers/underwriting.py` + agents | `tests/drills/drill_underwriting.py` | Domain team |

Per global §51 forensic substrate — every code change implementing an FR must cite the FR ID in the commit body.
