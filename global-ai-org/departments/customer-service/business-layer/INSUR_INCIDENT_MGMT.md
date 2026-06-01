# Incident Management — Customer Service / Contact Center

Per global §64.5 — L1/L2/L3 + RAG-backed resolutions.

## Severity Matrix

| Severity | Example | MTTD target | MTTR target |
|---|---|---|---|
| P1 | System down / data breach / regulatory breach | 5 min | 30 min |
| P2 | SME-needed escalation / partial outage | 5 min | 2 hrs |
| P3 | Operational degradation | 1 hour | 8 hrs |
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

- [ ] Policy lookup
- [ ] Claim status
- [ ] Premium balance
- [ ] Next payment due date
- [ ] ID card request
- [ ] Billing address change
- [ ] Auto-pay setup
- [ ] Coverage explanation
- [ ] Deductible question
- [ ] Adjuster contact
- [ ] Repair shop list
- [ ] Tow service
- [ ] Glass claim
- [ ] Rental car coverage
- [ ] Mobile app password reset
- [ ] Document upload
- [ ] Endorsement initiation
- [ ] Cancellation procedure
- [ ] Beneficiary update
- [ ] Producer assignment

## L2 — Top 10 escalations needing SME

- [ ] Coverage dispute
- [ ] Premium dispute
- [ ] Service complaint
- [ ] Claims handling complaint
- [ ] Producer complaint
- [ ] Compliance complaint
- [ ] Multi-policy issue
- [ ] Bilingual support
- [ ] ADA accommodation
- [ ] Bereavement / fraud-on-deceased policy

## L3 — Top 5 P1 incidents needing engineering / mgmt

- [ ] Contact center system down (Genesys / Avaya unavailable)
- [ ] Authentication system failure (mass login outage)
- [ ] Chatbot outage during peak hours
- [ ] Regulatory complaint surge (>500/day)
- [ ] CRM integration failure (no customer context for agents)


## RAG-Driven Resolutions

Every L1 issue has a runbook chunk indexed in the RAG corpus. When the chatbot or
support agent retrieves a chunk, the response carries citations per §48.5.

## Post-Incident Learning Loop

Every closed P1/P2 incident:
1. Loops back into the RAG corpus as a resolved case
2. Updates drill regression catalog per §43
3. Triggers retro per global §64.5
