# Business Requirements Document (BRD) — Claims

## 1. Executive Summary

Claims transformation aims to compress claims cycle from 14 days to <24 hours and raise STP from 18% to 80%. Current state involves significant manual effort and risk leakage; target state delivers automation, AI augmentation, and full audit traceability.

## 2. Business Problem

| Pain | Cost | Source |
|---|---|---|
| FNOL via call center (manual) | $2.4M/yr | AS-IS row |
| Manual document classification + OCR review | $3.8M/yr | AS-IS row |
| Manual claim validation (completeness, duplicates) | $1.5M/yr | AS-IS row |
| Rules-only fraud detection (no ML) | $15M/yr leakage | AS-IS row |
| Manual damage assessment (in-person inspection) | $8M/yr | AS-IS row |
| Reserve calculation via spreadsheet | $5M/yr reserve drift | AS-IS row |
| Manual approval routing (paper + email) | $1.2M/yr | AS-IS row |
| Catastrophe surge handling (manual triage) | $50M/yr (CAT event) | AS-IS row |

## 3. Business Objectives

- **OBJ-001**: FNOL → Registration Time from 30 min to 5 min (−83%)
- **OBJ-002**: Document Validation Accuracy from 78% to 95%+ (+22%)
- **OBJ-003**: Fraud Detection Rate from 55% to 92%+ (+67%)
- **OBJ-004**: Claims STP Rate from 18% to 80%+ (+344%)
- **OBJ-005**: Cycle Time (FNOL → Settlement) from 14 days to <24 hrs (−93%)
- **OBJ-006**: Loss Adjustment Expense (LAE) from $150M to $105M (−30%)
- **OBJ-007**: Customer CSAT from 3.4 / 5 to 4.6 / 5 (+35%)
- **OBJ-008**: Claims Leakage from $15M/yr to <$5M/yr (−66%)

## 4. Scope

In-scope:
- FNOL (and 5 sub-processes)
- Claim Setup (and 4 sub-processes)
- Document Management (and 4 sub-processes)
- Validation (and 4 sub-processes)
- Fraud Management (and 4 sub-processes)
- Coverage (and 4 sub-processes)
- Assessment (and 4 sub-processes)
- Investigation (and 4 sub-processes)
- Settlement (and 4 sub-processes)
- Approval (and 4 sub-processes)
- Payment (and 4 sub-processes)
- Closure (and 4 sub-processes)

Out-of-scope:
- Adjacent department systems (covered by their own BRDs)
- Reinsurance treaty management (Risk Management dept)
- Customer acquisition / marketing (Marketing dept)

## 5. Stakeholders

| Stakeholder | Role | KPI Owned |
| --- | --- | --- |
| Policyholder | Slow settlement | NPS |
| Claims Adjuster | Manual document review | Claims/day |
| Claims Manager | SLA misses | Cycle Time |
| Fraud Investigator | False positives | Fraud Detection Rate |
| Underwriter | No claims feedback loop | Loss Ratio |
| Finance | Reserve accuracy | Reserve Accuracy |
| Compliance | Audit burden | Audit Findings |
| Legal | Litigation review | Case Resolution Time |
| Executive | Visibility gaps | Combined Ratio |
| Vendor (Repair/Medical) | Delayed assignments | Vendor SLA |

## 6. Business Models Supported

| Model | Scenario | Channels |
| --- | --- | --- |
| B2C | Auto policyholder files first-party collision claim | Mobile app, Web portal, Call center |
| B2B | Commercial fleet operator submits multi-vehicle claim from warehouse fire | Broker portal, Direct EDI, Account-manager email |
| B2E | Internal adjuster handles a complex catastrophe claim (hurricane) | Adjuster Copilot (internal), Mobile field-app, Vendor coordination portal |
| B2G | Regulatory examiner requests claims sample for market-conduct exam | State DOI portal, Audit response workflow |

## 7. Constraints

- Regulatory: EU AI Act Art. 12 (logging ≥ 6mo), state DOI rate-filing approval, NICB reporting
- Privacy: HIPAA (health), GLBA (financial), state-specific PII rules
- Security: SOC2 Type II, ISO 27001, encryption AES-256
- Operational: 99.95% availability, p95 latency ≤ 5s

## 8. Success Criteria

- [ ] FNOL → Registration Time reaches 5 min
- [ ] Document Validation Accuracy reaches 95%+
- [ ] Fraud Detection Rate reaches 92%+
- [ ] Claims STP Rate reaches 80%+
- [ ] Cycle Time (FNOL → Settlement) reaches <24 hrs
- [ ] Loss Adjustment Expense (LAE) reaches $105M
- [ ] Customer CSAT reaches 4.6 / 5
- [ ] Claims Leakage reaches <$5M/yr

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
| Chief Claims Officer | TBD | TBD | TBD |
| CIO / CTO | TBD | TBD | TBD |
| Chief Risk Officer | TBD | TBD | TBD |
| Compliance | TBD | TBD | TBD |
| Executive Sponsor | TBD | TBD | TBD |
