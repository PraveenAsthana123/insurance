# Simulation UI — Fraud / Special Investigations Unit (SIU)

Per global §64.34 + operator 2026-06-01.

This dept's `/insur/fraud-siu/simulation` tab specification. Manual-mode + Automatic-mode
side-by-side with 5 layers visible per run.

## Tab path
`/insur/fraud-siu/simulation?process=<L2-process-name>`

## Available processes (L2)
- Multi-Layer Screening
- Case Prioritization
- Active Case Work
- Case Disposition
- Outcome
- Regulatory & Industry

## The 5 mandatory visible layers (per §64.34.1)

| Layer | Manual mode | Automatic mode |
|---|---|---|
| **Backend** | Email + paper trails (no telemetry) | Every HTTP/DB/agent call with latency + status — live waterfall |
| **Process** | Actor switches with hand-offs; no timing | Step transitions with active-step highlight + duration |
| **Data** | Raw input only; mutation hidden | Step-by-step data card showing input → cleaned → enriched → predicted → audited |
| **Accuracy** | "Verified by reviewer" stamp | Per-step confidence gauge + accuracy vs ground truth |
| **Reporting** | Final outcome only | Per-run summary: time-saved, error-avoided, cost-saved, accuracy-gained vs Manual baseline |

## Side-by-side panel layout

```
┌───────────────────────────────────────────────────────────┐
│  Manual flow (AS-IS)        │  Automatic flow (TO-BE)    │
├─────────────────────────────┼─────────────────────────────┤
│  Step 1: human actor        │  Step 1: agent             │
│    ~15 min                   │    ~200 ms                │
│  Step 2: human actor        │  Step 2: model + rule       │
│    ~25 min      ❌ error      │    ~400 ms ✓             │
│  Step 3: queue              │  Step 3: auto-route         │
│    ~240 min wait         │    ~80 ms                │
├─────────────────────────────┼─────────────────────────────┤
│  Manual total: ~280 min         │  Auto total: ~0.68 sec   │
│  Manual cost:  $135         │  Auto cost:  $0.03         │
│  Manual errors: 1           │  Auto errors: 0            │
└─────────────────────────────────────────────────────────────┘
```

## Backend API (§64.34.4)

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/insur/sim/fraud-siu/{process}/run` | Trigger sim; body: `{mode, inputs, seed}` |
| `GET /api/v1/insur/sim/fraud-siu/{process}/runs/{sim_id}/events` | SSE stream for live waterfall |
| `GET /api/v1/insur/sim/fraud-siu/{process}/runs/{sim_id}/manifest` | Per-layer summary + comparison report |
| `GET /api/v1/insur/sim/fraud-siu/{process}/runs/{sim_id}/replay` | Frame-by-frame replay of past run |

## Engine requirements (§64.34.3)

| Requirement | Detail |
|---|---|
| Replayable | Each run gets `simulation_id` + full event log; frame-by-frame |
| Deterministic seed | Same seed → same result across operators |
| Speed control | 0.25× / 1× / 4× / instant playback |
| Inputs configurable | Operator picks row from per-process dataset OR Faker synthesis |
| What-if mutations | Edit input field mid-flow → sensitivity probe |
| Audit-trail capture | `data/eval/sim/fraud-siu/<process>/<sim_id>/events.jsonl` |
| MLflow integration | Simulation run = MLflow run with 5-layer artifacts |

## Frontend stack (per global §14)

- Next.js App Router + vanilla CSS
- Server Component for the page shell + tab list
- Client Component for the side-by-side comparison panel (state for play/pause/speed)
- Mermaid renderer for the L2 process map
- Recharts for layer charts; Plotly for waterfall

## Composes with

- [INSUR_MANUAL_VS_AUTO_FLOW.md](INSUR_MANUAL_VS_AUTO_FLOW.md) — static doc; simulation tab is the **runnable** version
- [INSUR_PIPELINES.md](INSUR_PIPELINES.md) — Automatic-mode invokes registered pipelines
- [INSUR_AI_AGENTS.md](INSUR_AI_AGENTS.md) — Automatic-mode shows agent traces
- §38.3 — every sim run writes audit row keyed by `sim_id`
- §40 — confidence + HITL gate per step
- §43 — drill: Auto-mode produces M events; beats Manual on time + cost + error
- §47 — backend layer view IS the C4 L2 dynamic view per request

## Implementation status

- [x] Spec document (this file)
- [x] Backend pipeline runner: [backend/ml/insurance/run_dept_pipelines.py](../../../backend/ml/insurance/run_dept_pipelines.py)
- [ ] Frontend simulation tab (Next.js component) — future iteration
- [ ] SSE event stream wiring — future iteration
- [ ] MLflow run linkage — future iteration
