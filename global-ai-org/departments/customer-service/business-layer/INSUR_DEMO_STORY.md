# Demo Story — Customer Service / Contact Center

## Persona
**Jasmine, VP of Customer Service operating across 3 contact centers (US + Philippines + Costa Rica)**

## Scenario
Goal: raise chatbot self-service from 22% to 85% and reduce AHT from 18 min to 6 min.
Main KPI: First-call resolution; AHT; chatbot deflection rate; CSAT; NPS.

## Walkthrough (first 6 processes)
1. **Customer Contact → Inbound Channels** — Phone (IVR + agent) (and 5 more sub-steps)
2. **Authentication → Identity & Security** — Voice biometrics (and 3 more sub-steps)
3. **Inquiry Management → Intent Routing** — Policy Inquiry (and 4 more sub-steps)
4. **Case Management → Ticket Lifecycle** — Ticket Creation (and 3 more sub-steps)
5. **Resolution → Resolution Path** — Self-Service (KB / chatbot) (and 2 more sub-steps)
6. **Escalation → Tiered Escalation** — Supervisor Escalation (and 3 more sub-steps)

## Pitch (30 seconds)
> "Customer Service / Contact Center is the high-ROI surface for insurance AI. Today we operate customer service / contact center on legacy tooling with manual workflows costing tens of millions annually in inefficiency + leakage. Our AI roadmap turns inbound channels into a sub-second straight-through process, surfaces the right escalations to humans, and creates a full audit trail per regulatory requirements. Year-1 payback; 36-month NPV in the nine figures."

## Demo Script

| Step | Action | Expected Screen | Talking Point |
| --- | --- | --- | --- |
| 1 | Open /holy/customer-service/dashboard?role=manager | Manager dashboard with 6-flavor scorecard | Every sub-process governed across 6 AI flavors per §64.36 |
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
