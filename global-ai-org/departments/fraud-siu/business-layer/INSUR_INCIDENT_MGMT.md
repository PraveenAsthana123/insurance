# Incident Management — Fraud / Special Investigations Unit (SIU)

Per global §64.5 — L1/L2/L3 + RAG-backed resolutions.

## Severity Matrix

| Severity | Example | MTTD target | MTTR target |
|---|---|---|---|
| P1 | System down / data breach / regulatory breach | 10 min | 1 hr |
| P2 | SME-needed escalation / partial outage | 10 min | 4 hrs |
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

- [ ] Investigator status query
- [ ] Case status check
- [ ] Document request
- [ ] NICB record query
- [ ] Watchlist add request
- [ ] Provider score query
- [ ] Historical case lookup
- [ ] Network query
- [ ] Recovery status
- [ ] OSINT request
- [ ] Surveillance scheduling
- [ ] Interview scheduling
- [ ] Subpoena request
- [ ] Subrogation status
- [ ] Vendor audit status
- [ ] Reporting deadline reminder
- [ ] Investigator workload query
- [ ] Case re-assignment
- [ ] Quality review request
- [ ] Training request

## L2 — Top 10 escalations needing SME

- [ ] Multi-state fraud ring
- [ ] Provider-fraud (medical / repair)
- [ ] Application fraud at scale
- [ ] Internal-fraud allegation
- [ ] Cross-line fraud (auto + life)
- [ ] Cyber-fraud / identity-theft
- [ ] Federal interest (RICO / mail-fraud)
- [ ] Litigation-defense fraud
- [ ] Catastrophe-fraud surge
- [ ] Disability-fraud surveillance

## L3 — Top 5 P1 incidents needing engineering / mgmt

- [ ] Fraud-scoring system down (claims flow uncontrolled)
- [ ] Graph DB outage (network analysis offline)
- [ ] NICB feed failure (watchlist stale)
- [ ] OSINT data-source compromise
- [ ] Model drift causing high false-positive rate


## RAG-Driven Resolutions

Every L1 issue has a runbook chunk indexed in the RAG corpus. When the chatbot or
support agent retrieves a chunk, the response carries citations per §48.5.

## Post-Incident Learning Loop

Every closed P1/P2 incident:
1. Loops back into the RAG corpus as a resolved case
2. Updates drill regression catalog per §43
3. Triggers retro per global §64.5
