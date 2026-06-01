# Incident Management — Claims

Per global §64.5 — L1/L2/L3 + RAG-backed resolutions.

## Severity Matrix

| Severity | Example | MTTD target | MTTR target |
|---|---|---|---|
| P1 | System down / data breach / regulatory breach | 15 min | 1 hr |
| P2 | SME-needed escalation / partial outage | 15 min | 4 hrs |
| P3 | Operational degradation | 1 hour | 24 hrs |
| P4 | Cosmetic / non-blocking | 1 day | 1 week |

## Support Levels

| Level | Responsibility | First responder |
|---|---|---|
| L0 | Self-service (chatbot + RAG) | Customer |
| L1 | Help desk | Contact Center |
| L2 | Application support + domain SME | Claims / UW / Fraud team |
| L3 | Engineering / model owners | AI Platform |
| L4 | Vendor support | Vendor SaaS contracts |

## L1 — Top 20 self-service / L1 issues

- [ ] Claim status inquiry
- [ ] Missing document re-upload
- [ ] Policy lookup
- [ ] Payment status check
- [ ] Adjuster contact request
- [ ] Repair shop list request
- [ ] Claim number lost
- [ ] Coverage explanation
- [ ] Deductible question
- [ ] ETA on settlement
- [ ] How to file new claim
- [ ] Mobile app login issue
- [ ] Document format question
- [ ] Direct deposit setup
- [ ] Settlement check reissue
- [ ] Subrogation status
- [ ] Total loss process question
- [ ] Rental car coverage
- [ ] Towing reimbursement
- [ ] FNOL data correction

## L2 — Top 10 escalations needing SME

- [ ] Coverage dispute
- [ ] Reserve disagreement
- [ ] Fraud investigation request
- [ ] Subrogation initiation
- [ ] Total loss valuation dispute
- [ ] Bodily injury triage
- [ ] Multi-vehicle complex assignment
- [ ] Loss-of-use dispute
- [ ] Replacement-cost vs actual-cash-value dispute
- [ ] Out-of-state jurisdiction

## L3 — Top 5 P1 incidents needing engineering / mgmt

- [ ] Claims system down (Guidewire ClaimCenter unavailable)
- [ ] Payment gateway failure (no EFT possible)
- [ ] CAT event surge — system cannot scale
- [ ] Regulatory examination response failure
- [ ] Data breach involving claims PII


## RAG-Driven Resolutions

Every L1 issue has a runbook chunk indexed in the RAG corpus. When the chatbot or
support agent retrieves a chunk, the response carries citations per §48.5.

## Post-Incident Learning Loop

Every closed P1/P2 incident:
1. Loops back into the RAG corpus as a resolved case
2. Updates drill regression catalog per §43
3. Triggers retro per global §64.5
