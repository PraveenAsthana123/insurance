# Business Requirements Document (BRD) — Customer Service / Contact Center

## 1. Executive Summary

Customer Service / Contact Center transformation aims to raise chatbot self-service from 22% to 85% and reduce AHT from 18 min to 6 min. Current state involves significant manual effort and risk leakage; target state delivers automation, AI augmentation, and full audit traceability.

## 2. Business Problem

| Pain | Cost | Source |
|---|---|---|
| Manual IVR menu navigation | $2M/yr (lost-call cost) | AS-IS row |
| Agent manually searches KB for answer | $3.5M/yr | AS-IS row |
| Manual sentiment review (sample 2% of calls) | $1.5M/yr | AS-IS row |
| Manual QA call audits (5 calls / agent / month) | $1.2M/yr | AS-IS row |
| Voice transcription outsourced (48h SLA) | $2.5M/yr | AS-IS row |
| Tier-1 calls handled by human (no chatbot deflection) | $8M/yr (FTE cost) | AS-IS row |
| Manual escalation routing (email + warm transfer) | $600K/yr | AS-IS row |

## 3. Business Objectives

- **OBJ-001**: First Call Resolution (FCR) from 62% to 85%+ (+37%)
- **OBJ-002**: Average Handle Time (AHT) from 18 min to 6 min (−67%)
- **OBJ-003**: Chatbot Deflection / Self-Service from 22% to 85%+ (+286%)
- **OBJ-004**: CSAT from 3.6 / 5 to 4.7 / 5 (+31%)
- **OBJ-005**: Net Promoter Score (NPS) from +18 to +55 (+37 pts)
- **OBJ-006**: Agent Attrition (annualized) from 38% to <18% (−53%)
- **OBJ-007**: Cost per Contact from $8.40 to $3.20 (−62%)
- **OBJ-008**: Voice-of-Customer Coverage from 2% to 100% (+98 pts)

## 4. Scope

In-scope:
- Customer Contact (and 6 sub-processes)
- Authentication (and 4 sub-processes)
- Inquiry Management (and 5 sub-processes)
- Case Management (and 4 sub-processes)
- Resolution (and 3 sub-processes)
- Escalation (and 4 sub-processes)
- Feedback (and 4 sub-processes)
- Retention (and 4 sub-processes)

Out-of-scope:
- Adjacent department systems (covered by their own BRDs)
- Reinsurance treaty management (Risk Management dept)
- Customer acquisition / marketing (Marketing dept)

## 5. Stakeholders

| Stakeholder | Role | KPI Owned |
| --- | --- | --- |
| Customer | Long wait time | CSAT |
| CSR Agent | Repeated questions / burnout | Cases/day |
| Supervisor | SLA misses | SLA compliance |
| Operations Manager | Workforce planning | Productivity |
| Claims Team | Repeated status questions | Call deflection |
| Underwriting Team | Status inquiry volume | Request volume |
| Sales Team | Product questions | Lead conversion |
| Executive | Customer experience visibility | NPS |

## 6. Business Models Supported

| Model | Scenario | Channels |
| --- | --- | --- |
| B2C | Policyholder asks about claim status via mobile chat | Mobile app chat, Web chat, SMS |
| B2B | Commercial broker requests certificates of insurance for 12 clients via account-manager portal | Broker portal, Email, Account manager |
| B2E | Agent Copilot whispers next-best-action during a save call | Agent desktop copilot, Voice headset |
| B2G | State DOI consumer hotline forwards complaint | Regulator-facing complaint portal, Email |

## 7. Constraints

- Regulatory: EU AI Act Art. 12 (logging ≥ 6mo), state DOI rate-filing approval, NICB reporting
- Privacy: HIPAA (health), GLBA (financial), state-specific PII rules
- Security: SOC2 Type II, ISO 27001, encryption AES-256
- Operational: 99.95% availability, p95 latency ≤ 5s

## 8. Success Criteria

- [ ] First Call Resolution (FCR) reaches 85%+
- [ ] Average Handle Time (AHT) reaches 6 min
- [ ] Chatbot Deflection / Self-Service reaches 85%+
- [ ] CSAT reaches 4.7 / 5
- [ ] Net Promoter Score (NPS) reaches +55
- [ ] Agent Attrition (annualized) reaches <18%
- [ ] Cost per Contact reaches $3.20
- [ ] Voice-of-Customer Coverage reaches 100%

## 9. Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Regulatory delay (rate filing) | High | Med | Engage compliance early; phased rollout |
| Model drift causing wrong decisions | High | Med | Continuous monitoring + drift detection (§53) |
| Adverse selection during transition | High | Low | Champion-challenger deployment |
| Adoption resistance (adjusters) | Med | High | Change mgmt program; copilot training |
| External data feed outage | Med | Med | Circuit breaker + cached fallback (§47) |

## 10. Approval

| Role | Name | Signed | Date |
|---|---|---|---|
| Director of Customer Experience | TBD | TBD | TBD |
| CIO / CTO | TBD | TBD | TBD |
| Chief Risk Officer | TBD | TBD | TBD |
| Compliance | TBD | TBD | TBD |
| Executive Sponsor | TBD | TBD | TBD |
