# Demo Story — Fraud / Special Investigations Unit (SIU)

## Persona
**Raj, Director of SIU at a multi-line carrier**

## Scenario
Goal: raise fraud detection from 55% to 92%+ and cut fraud leakage from $15M to <$5M.
Main KPI: Fraud detection rate; fraud savings; SIU referral conversion; investigation cycle time.

## Walkthrough (first 6 processes)
1. **Fraud Detection → Multi-Layer Screening** — Rule-based Screening (and 4 more sub-steps)
2. **Triage → Case Prioritization** — Priority Scoring (and 2 more sub-steps)
3. **Investigation → Active Case Work** — Document Examination (and 5 more sub-steps)
4. **Decision → Case Disposition** — Confirm Fraud (and 2 more sub-steps)
5. **Action → Outcome** — Claim Denial (and 3 more sub-steps)
6. **Reporting → Regulatory & Industry** — NICB Reporting (and 3 more sub-steps)

## Pitch (30 seconds)
> "Fraud / Special Investigations Unit (SIU) is the highest-ROI surface for insurance AI. Today we operate fraud / special investigations unit (siu) on legacy tooling with manual workflows costing tens of millions annually in inefficiency + leakage. Our AI roadmap turns multi-layer screening into a sub-second straight-through process, surfaces the right escalations to humans, and creates a full audit trail per regulatory requirements. Year-1 payback; 36-month NPV in the nine figures."

## Demo Script

| Step | Action | Expected Screen | Talking Point |
| --- | --- | --- | --- |
| 1 | Open /insur/fraud-siu/dashboard?role=manager | Manager dashboard with 6-flavor scorecard | Every sub-process governed across 6 AI flavors per §64.36 |
| 2 | Click first L2 process card | Process detail with IPO + sub-processes | IPO + TODO + Task per §64.15 |
| 3 | Open Simulation tab | Side-by-side Manual vs Automatic | Per §64.34 — 5-layer simulation |
| 4 | Open Agentic tab | 10-layer execution trace for a goal | Per §64.40 — goal → council → plan → policy → CUA |
| 5 | Open Security tab | Live logs + audit + PII inventory | Per §64.32 + §68 |
| 6 | Open Reports tab | Role-scoped reports | Per §64.37 |

## Success Criteria (drill-able)

- [ ] Dashboard loads in < 2 sec
- [ ] All 6 flavors show a score (or N/A with reason)
- [ ] Simulation Auto-mode beats Manual on time + cost + error
- [ ] Agentic execution writes audit row per §38.3
- [ ] Security tab shows last-24h activity with tenant isolation

## Common Gotchas
- Pre-warm Ollama (`ollama pull llama3`) before demo
- Set `INSUR_DEMO_MODE=true` in `.env.template`
- Confirm Kaggle data downloaded (see INSUR_DATA_MGMT.md)
