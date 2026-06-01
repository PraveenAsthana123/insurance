# Functional Requirements Document (FRD) — Claims

Per global §66.2 — FR-IDs use the **CLM** prefix.

## Functional Requirements

| FR ID | Process | Sub-Process | Type | Priority | Actor | Inputs | Outputs | SLA | Audit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FR-CLM-001 | FNOL — Claim Intake | Web Claim Submission | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-002 | FNOL — Claim Intake | Mobile Claim Submission | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-003 | FNOL — Claim Intake | Call Center Intake | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-004 | FNOL — Claim Intake | Broker / Agent Submission | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-005 | FNOL — Claim Intake | Email / Document Upload | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-006 | Claim Setup — Registration | Claim Number Generation | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-007 | Claim Setup — Registration | Policy Linking | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-008 | Claim Setup — Registration | Customer Verification | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-009 | Claim Setup — Registration | Loss Date / Location Capture | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-010 | Document Management — Collection & Extraction | Document Upload | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-011 | Document Management — Collection & Extraction | OCR Extraction | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-012 | Document Management — Collection & Extraction | Document Classification | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-013 | Document Management — Collection & Extraction | Metadata Tagging | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-014 | Validation — Completeness & Coverage | Missing Data Check | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-015 | Validation — Completeness & Coverage | Duplicate Claim Check | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-016 | Validation — Completeness & Coverage | Coverage Validation | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-017 | Validation — Completeness & Coverage | Policy-in-force Verification | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-018 | Fraud Management — Screening | Fraud Score Calculation | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-019 | Fraud Management — Screening | Pattern Analysis | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-020 | Fraud Management — Screening | Network / Graph Analysis | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-021 | Fraud Management — Screening | External Watchlist Match | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-022 | Coverage — Verification | Coverage Check | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-023 | Coverage — Verification | Policy Limits Check | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-024 | Coverage — Verification | Deductible Application | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-025 | Coverage — Verification | Exclusion Review | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-026 | Assessment — Damage / Loss Assessment | Image / Video Analysis (CV) | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-027 | Assessment — Damage / Loss Assessment | Adjuster Field Review | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-028 | Assessment — Damage / Loss Assessment | Repair Estimate | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-029 | Assessment — Damage / Loss Assessment | Medical Bill Review | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-030 | Investigation — Case Analysis | Field Investigation | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-031 | Investigation — Case Analysis | External Verification (Police / Medical) | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-032 | Investigation — Case Analysis | Witness Interview | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-033 | Investigation — Case Analysis | Subrogation Review | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-034 | Settlement — Reserve & Decision | Reserve Calculation | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-035 | Settlement — Reserve & Decision | Settlement Recommendation | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-036 | Settlement — Reserve & Decision | Negotiation | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-037 | Settlement — Reserve & Decision | Approval Routing | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-038 | Approval — Approval Workflow | Auto Approval (STP) | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-039 | Approval — Approval Workflow | Manual Approval | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-040 | Approval — Approval Workflow | Manager Escalation | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-041 | Approval — Approval Workflow | Committee Review | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-042 | Payment — Disbursement | EFT Payment | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-043 | Payment — Disbursement | Check Issuance | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-044 | Payment — Disbursement | Vendor Direct Pay | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-045 | Payment — Disbursement | Recovery / Salvage | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-046 | Closure — Closeout & Audit | File Archive | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-047 | Closure — Closeout & Audit | Audit Logging | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-048 | Closure — Closeout & Audit | Customer Notification | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CLM-049 | Closure — Closeout & Audit | Subrogation Recovery | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |

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
| FR-CLM-001..N | `backend/routers/claims.py` + agents | `tests/drills/drill_claims.py` | Domain team |

Per global §51 forensic substrate — every code change implementing an FR must cite the FR ID in the commit body.
