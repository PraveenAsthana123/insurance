# Functional Requirements Document (FRD) — Fraud / Special Investigations Unit (SIU)

Per global §66.2 — FR-IDs use the **FRD** prefix.

## Functional Requirements

| FR ID | Process | Sub-Process | Type | Priority | Actor | Inputs | Outputs | SLA | Audit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FR-FRD-001 | Fraud Detection — Multi-Layer Screening | Rule-based Screening | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-FRD-002 | Fraud Detection — Multi-Layer Screening | ML Fraud Scoring | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-FRD-003 | Fraud Detection — Multi-Layer Screening | Network / Graph Analysis | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-FRD-004 | Fraud Detection — Multi-Layer Screening | Behavioral Anomaly | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-FRD-005 | Fraud Detection — Multi-Layer Screening | External Watchlist Match | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-FRD-006 | Triage — Case Prioritization | Priority Scoring | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-FRD-007 | Triage — Case Prioritization | Case Routing | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-FRD-008 | Triage — Case Prioritization | Investigator Assignment | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-FRD-009 | Investigation — Active Case Work | Document Examination | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-FRD-010 | Investigation — Active Case Work | Interview | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-FRD-011 | Investigation — Active Case Work | Surveillance | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-FRD-012 | Investigation — Active Case Work | Medical Record Review | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-FRD-013 | Investigation — Active Case Work | Vendor / Provider Audit | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-FRD-014 | Investigation — Active Case Work | Social Media OSINT | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-FRD-015 | Decision — Case Disposition | Confirm Fraud | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-FRD-016 | Decision — Case Disposition | Confirm Legitimate | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-FRD-017 | Decision — Case Disposition | Inconclusive / Refer Out | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-FRD-018 | Action — Outcome | Claim Denial | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-FRD-019 | Action — Outcome | Recovery / Subrogation | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-FRD-020 | Action — Outcome | Law Enforcement Referral | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-FRD-021 | Action — Outcome | Provider De-network | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-FRD-022 | Reporting — Regulatory & Industry | NICB Reporting | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-FRD-023 | Reporting — Regulatory & Industry | State DOI Reporting | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-FRD-024 | Reporting — Regulatory & Industry | Internal Reporting | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-FRD-025 | Reporting — Regulatory & Industry | Industry Anti-Fraud Consortium | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-FRD-026 | Prevention — Forward-looking Controls | Application Risk Scoring | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-FRD-027 | Prevention — Forward-looking Controls | Provider Audit | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-FRD-028 | Prevention — Forward-looking Controls | Customer Behavioral Monitoring | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |

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
| FR-FRD-001..N | `backend/routers/fraud-siu.py` + agents | `tests/drills/drill_fraud-siu.py` | Domain team |

Per global §51 forensic substrate — every code change implementing an FR must cite the FR ID in the commit body.
