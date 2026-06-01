# Business Requirements Document (BRD) — Underwriting

## 1. Executive Summary

Underwriting transformation aims to raise STP from 22% to 70% on personal-lines and cut commercial underwriting cycle from 14 days to <48 hours. Current state involves significant manual effort and risk leakage; target state delivers automation, AI augmentation, and full audit traceability.

## 2. Business Problem

| Pain | Cost | Source |
|---|---|---|
| Manual application data entry (call center / paper) | $2.8M/yr | AS-IS row |
| Sequential external data pulls (one bureau at a time) | $1.2M/yr | AS-IS row |
| Manual risk classification (book of rules) | $3.5M/yr | AS-IS row |
| Static pricing tables (annual refresh) | $8M/yr adverse selection | AS-IS row |
| Manual rate-filing compliance review | $800K/yr | AS-IS row |
| Paper-based policy issuance + mail | $400K/yr postage + handling | AS-IS row |
| Reactive portfolio review (quarterly) | $5M/yr adverse selection | AS-IS row |

## 3. Business Objectives

- **OBJ-001**: Quote Turnaround Time (personal lines) from 2.5 days to <5 min (−99%)
- **OBJ-002**: Underwriting Cycle Time (commercial) from 14 days to <48 hrs (−86%)
- **OBJ-003**: STP Rate (personal lines) from 22% to 70%+ (+218%)
- **OBJ-004**: Loss Ratio from 67% to <58% (−13%)
- **OBJ-005**: Combined Ratio from 102% to <94% (−8 pts)
- **OBJ-006**: Risk Model Accuracy (AUC) from 0.72 to >0.85 (+18%)
- **OBJ-007**: Portfolio Profitability from +8% to +18% (+10 pts)
- **OBJ-008**: UW Adjuster Productivity from 12 cases/day to 30 cases/day (+150%)

## 4. Scope

In-scope:
- Lead Intake (and 4 sub-processes)
- Pre-Screening (and 4 sub-processes)
- Data Collection (and 6 sub-processes)
- Risk Assessment (and 5 sub-processes)
- Underwriting Review (and 4 sub-processes)
- Pricing (and 5 sub-processes)
- Decision (and 4 sub-processes)
- Policy Issuance (and 4 sub-processes)
- Portfolio Monitoring (and 4 sub-processes)

Out-of-scope:
- Adjacent department systems (covered by their own BRDs)
- Reinsurance treaty management (Risk Management dept)
- Customer acquisition / marketing (Marketing dept)

## 5. Stakeholders

| Stakeholder | Role | KPI Owned |
| --- | --- | --- |
| Applicant | Slow approval | Approval Time |
| Broker / Agent | Delayed quote | Quote TAT |
| Underwriter | Manual review burden | Cases/day |
| Underwriting Manager | Capacity planning | SLA attainment |
| Product Team | Poor pricing feedback | Product profitability |
| Actuarial Team | Risk prediction lag | Loss ratio variance |
| Risk Team | Emerging risks not surfaced | Risk Exposure |
| Compliance | Regulatory review burden | Audit findings |
| Executive | Portfolio visibility | Combined Ratio |

## 6. Business Models Supported

| Model | Scenario | Channels |
| --- | --- | --- |
| B2C | Individual buys homeowners policy online | Web direct, Mobile app |
| B2B | Manufacturing firm seeks commercial property + liability + workers' comp via broker | Broker portal, ACORD-form submission |
| B2E | Underwriter handles a complex group-life renewal for a Fortune-500 employer | UW Copilot (internal), Renewal workflow |

## 7. Constraints

- Regulatory: EU AI Act Art. 12 (logging ≥ 6mo), state DOI rate-filing approval, NICB reporting
- Privacy: HIPAA (health), GLBA (financial), state-specific PII rules
- Security: SOC2 Type II, ISO 27001, encryption AES-256
- Operational: 99.95% availability, p95 latency ≤ 5s

## 8. Success Criteria

- [ ] Quote Turnaround Time (personal lines) reaches <5 min
- [ ] Underwriting Cycle Time (commercial) reaches <48 hrs
- [ ] STP Rate (personal lines) reaches 70%+
- [ ] Loss Ratio reaches <58%
- [ ] Combined Ratio reaches <94%
- [ ] Risk Model Accuracy (AUC) reaches >0.85
- [ ] Portfolio Profitability reaches +18%
- [ ] UW Adjuster Productivity reaches 30 cases/day

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
| Chief Underwriting Officer | TBD | TBD | TBD |
| CIO / CTO | TBD | TBD | TBD |
| Chief Risk Officer | TBD | TBD | TBD |
| Compliance | TBD | TBD | TBD |
| Executive Sponsor | TBD | TBD | TBD |
