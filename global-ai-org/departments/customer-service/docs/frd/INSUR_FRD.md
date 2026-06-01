# Functional Requirements Document (FRD) — Customer Service / Contact Center

Per global §66.2 — FR-IDs use the **CSV** prefix.

## Functional Requirements

| FR ID | Process | Sub-Process | Type | Priority | Actor | Inputs | Outputs | SLA | Audit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FR-CSV-001 | Customer Contact — Inbound Channels | Phone (IVR + agent) | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-002 | Customer Contact — Inbound Channels | Email | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-003 | Customer Contact — Inbound Channels | Chat (web + mobile) | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-004 | Customer Contact — Inbound Channels | Mobile app | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-005 | Customer Contact — Inbound Channels | Social media | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-006 | Customer Contact — Inbound Channels | WhatsApp | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-007 | Authentication — Identity & Security | Voice biometrics | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-008 | Authentication — Identity & Security | Knowledge-based authentication | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-009 | Authentication — Identity & Security | OTP / 2FA | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-010 | Authentication — Identity & Security | Account number + DOB | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-011 | Inquiry Management — Intent Routing | Policy Inquiry | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-012 | Inquiry Management — Intent Routing | Claims Inquiry | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-013 | Inquiry Management — Intent Routing | Billing Inquiry | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-014 | Inquiry Management — Intent Routing | Coverage Inquiry | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-015 | Inquiry Management — Intent Routing | Endorsement / Change Request | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-016 | Case Management — Ticket Lifecycle | Ticket Creation | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-017 | Case Management — Ticket Lifecycle | Ticket Assignment | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-018 | Case Management — Ticket Lifecycle | Routing to Specialist | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-019 | Case Management — Ticket Lifecycle | SLA Tracking | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-020 | Resolution — Resolution Path | Self-Service (KB / chatbot) | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-021 | Resolution — Resolution Path | Agent Resolution | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-022 | Resolution — Resolution Path | Escalation | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-023 | Escalation — Tiered Escalation | Supervisor Escalation | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-024 | Escalation — Tiered Escalation | Claims / UW Escalation | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-025 | Escalation — Tiered Escalation | Executive Escalation | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-026 | Escalation — Tiered Escalation | Legal / Compliance Escalation | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-027 | Feedback — Voice of Customer | Survey (CSAT) | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-028 | Feedback — Voice of Customer | Net Promoter Score | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-029 | Feedback — Voice of Customer | Complaint Capture | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-030 | Feedback — Voice of Customer | Compliment Capture | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-031 | Retention — Save Path | Renewal Reminder | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-032 | Retention — Save Path | Save Offer | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-033 | Retention — Save Path | Loyalty Program Surface | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |
| FR-CSV-034 | Retention — Save Path | Cross-sell Suggestion | Functional | Must | User / System | Inputs from upstream | Outputs to downstream | Per dept SLA | Yes |

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
| FR-CSV-001..N | `backend/routers/customer-service.py` + agents | `tests/drills/drill_customer-service.py` | Domain team |

Per global §51 forensic substrate — every code change implementing an FR must cite the FR ID in the commit body.
