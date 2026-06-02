# Demo Story — Claims

## Persona
**Maria, Claims Operations Manager at a Top-20 US P&C carrier**

## Scenario
Goal: compress claims cycle from 14 days to <24 hours and raise STP from 18% to 80%.
Main KPI: Claims cycle time (FNOL → settlement); STP rate; loss-adjustment expense.

## Walkthrough (first 6 processes)
1. **FNOL → Claim Intake** — Web Claim Submission (and 4 more sub-steps)
2. **Claim Setup → Registration** — Claim Number Generation (and 3 more sub-steps)
3. **Document Management → Collection & Extraction** — Document Upload (and 3 more sub-steps)
4. **Validation → Completeness & Coverage** — Missing Data Check (and 3 more sub-steps)
5. **Fraud Management → Screening** — Fraud Score Calculation (and 3 more sub-steps)
6. **Coverage → Verification** — Coverage Check (and 3 more sub-steps)

## Pitch (30 seconds)
> "Claims is the highest-ROI surface for insurance AI. Today we operate claims on legacy tooling with manual workflows costing tens of millions annually in inefficiency + leakage. Our AI roadmap turns claim intake into a sub-second straight-through process, surfaces the right escalations to humans, and creates a full audit trail per regulatory requirements. Year-1 payback; 36-month NPV in the nine figures."

## Demo Script

| Step | Action | Expected Screen | Talking Point |
| --- | --- | --- | --- |
| 1 | Open /insur/claims/dashboard?role=manager | Manager dashboard with 6-flavor scorecard | Every sub-process governed across 6 AI flavors per §64.36 |
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
