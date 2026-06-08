# HOLY_SIMULATION.md · Dept 1 · Product Management

> Generated scaffold per §64.34 · 5-layer simulation tab.

## 5 mandatory simulation layers

| Layer | What gets shown | UI rendering |
|---|---|---|
| 1. Backend | HTTP / DB / queue / agent / LLM call · latency + status | Waterfall (Gantt) + log tail |
| 2. Process | Sub-process step transitions · actor switch · decision branch | Swimlane diagram |
| 3. Data | Input row → cleaned → enriched → predicted | Data-card step-by-step |
| 4. Accuracy | Model confidence + rules + override + final | Per-step confidence gauge |
| 5. Reporting | Per-run summary · time / cost / error / accuracy delta | Reporting card + chart |

## Side-by-side comparison (Manual vs Automatic)
```
+---------------------+---------------------+
| Manual flow (AS-IS) | Automatic (TO-BE)   |
+---------------------+---------------------+
| Step 1 · TODO       | Step 1 · TODO       |
| TODO duration       | TODO duration       |
+---------------------+---------------------+
```

## Simulation engine requirements
- Replayable · `simulation_id`
- Deterministic seed
- Speed control (0.25× · 1× · 4× · instant)
- Inputs configurable
- What-if mutations
- Audit-trail capture (per §38.3 + §64.34.3)
- MLflow integration

## Backend API
- `POST /api/v1/holy/sim/product-management/{process}/run`
- `GET /api/v1/holy/sim/product-management/{process}/runs/{sim_id}/events` (SSE)
- `GET /api/v1/holy/sim/product-management/{process}/runs/{sim_id}/manifest`
- `GET /api/v1/holy/sim/product-management/{process}/runs/{sim_id}/replay`

Composes with §38.3 · §40 · §43 · §47 · §48 · §57.5 · §64.7 · §64.27 · §64.34 · §91.
