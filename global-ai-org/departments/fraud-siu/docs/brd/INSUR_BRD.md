# Business Requirements Document (BRD) — Fraud / Special Investigations Unit (SIU)

## 1. Executive Summary

Fraud / Special Investigations Unit (SIU) transformation aims to raise fraud detection from 55% to 92%+ and cut fraud leakage from $15M to <$5M. Current state involves significant manual effort and risk leakage; target state delivers automation, AI augmentation, and full audit traceability.

## 2. Business Problem

| Pain | Cost | Source |
|---|---|---|
| Rules-only fraud detection (no ML) | $15M/yr leakage | AS-IS row |
| Manual graph / network analysis (Excel) | $4M/yr | AS-IS row |
| Manual OSINT / social media review | $2M/yr | AS-IS row |
| Sequential document forensics review | $3.2M/yr | AS-IS row |
| Manual NICB / DOI reporting | $600K/yr | AS-IS row |
| Provider audit (annual / reactive) | $8M/yr provider-fraud leakage | AS-IS row |
| Manual recovery / subrogation tracking | $1.5M/yr lost recovery | AS-IS row |

## 3. Business Objectives

- **OBJ-001**: Fraud Detection Rate from 55% to 92%+ (+67%)
- **OBJ-002**: Fraud Leakage from $15M/yr to <$5M/yr (−66%)
- **OBJ-003**: Provider-Fraud Detection from 30% to 80%+ (+167%)
- **OBJ-004**: Investigation Cycle Time from 45 days to <15 days (−67%)
- **OBJ-005**: False-Positive Rate from 62% to <20% (−68%)
- **OBJ-006**: Recovery Rate from 40% to 75%+ (+87%)
- **OBJ-007**: Network / Ring Detection from 12% to 65%+ (+442%)
- **OBJ-008**: Investigator Productivity from 8 cases/mo to 22 cases/mo (+175%)

## 4. Scope

In-scope:
- Fraud Detection (and 5 sub-processes)
- Triage (and 3 sub-processes)
- Investigation (and 6 sub-processes)
- Decision (and 3 sub-processes)
- Action (and 4 sub-processes)
- Reporting (and 4 sub-processes)
- Prevention (and 3 sub-processes)

Out-of-scope:
- Adjacent department systems (covered by their own BRDs)
- Reinsurance treaty management (Risk Management dept)
- Customer acquisition / marketing (Marketing dept)

## 5. Stakeholders

| Stakeholder | Role | KPI Owned |
| --- | --- | --- |
| SIU Investigator | False-positive overload | Cases closed / week |
| Claims Adjuster | Unclear fraud signals | Referral accuracy |
| Underwriter | Application fraud risk | Application fraud score |
| Provider Network | Network-level fraud patterns | Provider risk score |
| Legal | Prosecution readiness | Case win rate |
| Compliance | Regulatory reporting (NICB, state DOI) | Reporting compliance |
| Executive | Fraud-leakage visibility | Fraud Leakage |

## 6. Business Models Supported

| Model | Scenario | Channels |
| --- | --- | --- |
| B2C | Suspicious auto-glass claim flagged at FNOL | Claims feed, Fraud scoring pipeline |
| B2B | Provider-fraud detected in workers' comp medical billing | Bill-review pipeline, Provider audit workflow |
| B2E | Internal fraud — employee colluding with vendor | Internal-audit pipeline, HR coordination |

## 7. Constraints

- Regulatory: EU AI Act Art. 12 (logging ≥ 6mo), state DOI rate-filing approval, NICB reporting
- Privacy: HIPAA (health), GLBA (financial), state-specific PII rules
- Security: SOC2 Type II, ISO 27001, encryption AES-256
- Operational: 99.95% availability, p95 latency ≤ 5s

## 8. Success Criteria

- [ ] Fraud Detection Rate reaches 92%+
- [ ] Fraud Leakage reaches <$5M/yr
- [ ] Provider-Fraud Detection reaches 80%+
- [ ] Investigation Cycle Time reaches <15 days
- [ ] False-Positive Rate reaches <20%
- [ ] Recovery Rate reaches 75%+
- [ ] Network / Ring Detection reaches 65%+
- [ ] Investigator Productivity reaches 22 cases/mo

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
| Chief Fraud Officer | TBD | TBD | TBD |
| CIO / CTO | TBD | TBD | TBD |
| Chief Risk Officer | TBD | TBD | TBD |
| Compliance | TBD | TBD | TBD |
| Executive Sponsor | TBD | TBD | TBD |
