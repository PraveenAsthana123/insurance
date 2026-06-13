# PLAN — AEO Layer 10 + Enterprise Maturity Pyramid · 2026-06-12 18:25 MDT

> Operator brief 2026-06-12 dropped the full Enterprise Maturity Model with
> Layers 3-10 + AEO as the top-of-pyramid. Each layer = its own portfolio.

## Maturity pyramid (per operator spec)

```
Layer 10 · Autonomous Enterprise Orchestrator (AEO)  ← TOP · brain of autonomy
Layer 9  · Enterprise Command Center                  ← what should we do?
Layer 8  · Enterprise Digital Twin                    ← what if?
Layer 7  · Investment Portfolio                       ← where to invest?
Layer 6  · Cost Portfolio                             ← can we afford?
Layer 5  · Risk Portfolio                             ← can we survive?
Layer 4  · Model Portfolio                            ← intelligence health
Layer 3  · Agent Portfolio                            ← digital workforce
Layer 2  · Department Portfolio                       ← business units
Layer 1  · AI Use Cases / Projects                    ← bottom
```

## Honest snapshot · BEFORE this batch

| Layer | State | Evidence |
|---|---|---|
| L9 Command Center | ✅ built today | `/command-center` Exec + Ops dual layer |
| L3 Agent Portfolio | ✅ built | `/agentic` · 454 agents · `/agent-lifecycle` (5-stage flow) |
| L4 Model Portfolio | ❌ no consolidated UI | model_registry table exists · scattered endpoints |
| L5 Risk Portfolio | ❌ no consolidated UI | ai_risk table (6 rows) · risk module exists |
| L6 Cost Portfolio | 🟡 partial | `/cost` Cost Optimizer · no portfolio aggregator |
| L7 Investment Portfolio | ❌ no UI | no investment tables · scattered project tracking |
| L8 Digital Twin | ❌ no UI | simulation engine for tickets only · no enterprise twin |
| L10 AEO | ❌ MISSING | operator's brand-new spec · this is the brain |

## What this batch ships

### Layer 10 · AEO (the brain · top of pyramid)
- `backend/migrations/sql/200_aeo_enterprise.sql` · 15 enterprise_* tables seeded
- `backend/aeo/router.py` · 6 endpoints for dashboard / goals / policies / decisions / actions / health
- `frontend/src/pages/AeoDepartmentPage.jsx` · per §73 + §149.2 layout:
  - **MAIN MENU** = "🧠 AEO Department · Autonomous Enterprise Orchestrator"
  - **SUB MENU** = 20 sections per operator spec grouped into 5 mega-zones:
      Goals & Objectives (Goal Registry, Objective Engine)
      Decisions & Actions (Policy, Decision Orchestrator, Human Approval, Autonomous Action, Constraint)
      Learn & Optimize (Learning, Feedback Loop, Optimization, Scenario)
      Coordinate & Govern (Coordination · Governance · Trust · Memory · Workforce)
      Health & Audit (Health · Audit · Report · Control Console)
  - **CONTENT** = 10-12 tabs per section (Overview · Objective · Input · Process · Output · Visualization · Data · Audit · ResAI · ExpAI · Metrics · TO-DO)

### Layers 4-8 · 5 scaffold portfolio pages
- `/model-portfolio` (L4) · consume model_registry
- `/risk-portfolio` (L5) · consume ai_risk + 11-category hierarchy
- `/cost-portfolio` (L6) · consume ai_cost + LLM cost dashboard
- `/investment-portfolio` (L7) · scaffold (no investment tables yet · §57.7 honest)
- `/digital-twin` (L8) · scaffold (no twin engine yet · §57.7 honest)

### Cron
- `0 0 * * *` INSUR-AEO-AUTONOMY-AUDIT · daily autonomy score drift check

## Verification

```bash
# AEO dashboard
curl -s http://localhost:8001/api/v1/aeo/dashboard -H "X-Demo-Role: manager" | \
  jq '.autonomy_score, .summary'

# Layer 10 + 5 portfolio routes
for r in /aeo /model-portfolio /risk-portfolio /cost-portfolio \
         /investment-portfolio /digital-twin; do
  curl -s -o /dev/null -w "$r HTTP %{http_code}\n" http://localhost:3210$r
done
```

**Effective**: 2026-06-12 18:25 MDT. Composes with §44 · §57.7 · §73 · §96 · §144 · §149.2 · §150.
