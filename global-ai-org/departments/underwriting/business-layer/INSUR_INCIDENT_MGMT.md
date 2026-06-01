# Incident Management — Underwriting

Per global §64.5 — L1/L2/L3 + RAG-backed resolutions.

## Severity Matrix

| Severity | Example | MTTD target | MTTR target |
|---|---|---|---|
| P1 | System down / data breach / regulatory breach | 15 min | 2 hrs |
| P2 | SME-needed escalation / partial outage | 15 min | 8 hrs |
| P3 | Operational degradation | 1 hour | 48 hrs |
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

- [ ] Application status inquiry
- [ ] Document upload help
- [ ] Premium calculation question
- [ ] Policy delivery status
- [ ] ID card request
- [ ] Renewal date question
- [ ] Quote retrieval
- [ ] Discount eligibility question
- [ ] Coverage limit question
- [ ] Endorsement procedure
- [ ] Cancellation procedure
- [ ] Address change
- [ ] Beneficiary update
- [ ] Payment method change
- [ ] Late payment grace period
- [ ] Premium financing
- [ ] Lapse reinstatement
- [ ] Certificate of insurance request
- [ ] Lienholder change
- [ ] Application correction

## L2 — Top 10 escalations needing SME

- [ ] Risk class dispute
- [ ] Pricing dispute
- [ ] Coverage decline appeal
- [ ] Medical-records delay impacting decision
- [ ] Telematics dispute
- [ ] Reinsurance referral
- [ ] Complex commercial UW
- [ ] Catastrophe re-rating
- [ ] Compliance review (rate filing)
- [ ] Group renewal rate action

## L3 — Top 5 P1 incidents needing engineering / mgmt

- [ ] Underwriting platform down
- [ ] Bureau / external data feed failure
- [ ] Rating engine failure (mispricing risk)
- [ ] Rate-filing compliance breach
- [ ] Risk-model accuracy drift (loss ratio spike)


## RAG-Driven Resolutions

Every L1 issue has a runbook chunk indexed in the RAG corpus. When the chatbot or
support agent retrieves a chunk, the response carries citations per §48.5.

## Post-Incident Learning Loop

Every closed P1/P2 incident:
1. Loops back into the RAG corpus as a resolved case
2. Updates drill regression catalog per §43
3. Triggers retro per global §64.5
