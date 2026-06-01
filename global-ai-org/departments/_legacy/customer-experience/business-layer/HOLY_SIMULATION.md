# HOLY Beverage — Customer Experience — Simulation Tab

> Per global CLAUDE.md §64.34 + §64.35 — every department MUST have this artifact.
> This stub is the contract; the AI-Strategy role fills in dept specifics.

## Owner

**Manager** + **DT-Strategy** + **Engineer**.

## Runnable simulations

This dept's processes registered in `backend/ml/reference/simulation_engine.py`
under `REFERENCE_PROCESSES[("customer-experience", "<process>")]`.

| Process | Steps | Manual mode actors | Auto mode replacements | Status |
|---|---|---|---|---|
| _stub: pick from HOLY_PROCESS_MGMT.md_ | _ | _ | _ | TODO |

## 5 mandatory layers (per §64.34.1)

Every simulation MUST capture:

| Layer | What |
|---|---|
| Backend | HTTP / DB / queue / agent / LLM calls with latency + status |
| Process | Sub-process step transitions, actor switches, decision branches |
| Data | Input row → cleaned → enriched → predicted → audited |
| Accuracy | Model confidence + rule outcomes + HITL + final decision |
| Reporting | Per-run summary: time-saved, error-avoided, cost-saved, Δaccuracy |

## Side-by-side panel (mandatory per §64.34.2)

Operator picks process → simulator runs both modes → UI shows comparison.
Reference component: `frontend/src/components/ProcessSimulator.jsx`.

## Replay + what-if (per §64.34.3)

- Replayable via `sim_id` + complete event log
- Deterministic seed for reproducibility
- Speed control (0.25× / 1× / 4× / instant)
- What-if: edit input mid-flow + observe outcome change

## API contract (per §64.34.4)

| Endpoint | Purpose |
|---|---|
| POST /api/v1/holy/sim/customer-experience/{process}/run | Trigger simulation |
| GET /api/v1/holy/sim/customer-experience/{process}/runs | List past runs |
| GET /api/v1/holy/sim/customer-experience/{process}/runs/{sim_id}/manifest | Per-run summary |
| GET /api/v1/holy/sim/customer-experience/{process}/runs/{sim_id}/events | Event stream |

## TODO

- [ ] Define ≥ 1 process for customer-experience in `REFERENCE_PROCESSES` dict
- [ ] Verify drill passes for new process (extend `drill_simulation_engine.py`)
- [ ] Wire dept's reference process to UI auto-mount

## Composes with

- `HOLY_PROCESS_MGMT.md` — processes available to simulate
- `HOLY_FLOW.md` — static version of these flows
- Global §43 — drill per process
- Global §64.34-35 — simulation policy
