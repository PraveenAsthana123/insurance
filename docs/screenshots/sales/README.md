# Sales Flagship — Screenshots

Captured 2026-04-19 after Phase 1 + Sales α (data) + β (Prophet forecast) + ε (frontend). Backend on `http://localhost:8001`, frontend on `http://localhost:5173` with Vite proxy routing `/api/*` to backend.

## The captures

| # | File | What it shows |
|---|---|---|
| 01 | [`01-dashboard.png`](01-dashboard.png) | Root `/` — 15-tile dept grid including new Contact Center, Marketing, Telehealth |
| 02 | [`02-sales-overview.png`](02-sales-overview.png) | `/sales` — OverviewTab with 4 live KPI tiles (Active stores, Store types, Backend, Forecast engine) fetched from `/api/v1/sales/stores` |
| 03 | [`03-sales-manager-10-tabs.png`](03-sales-manager-10-tabs.png) | `/sales/manager` — 10 tabs (7 base + 3 sales-specific: Forecast, Revenue Tree, Simulation) |
| 04a | [`04a-forecast-empty.png`](04a-forecast-empty.png) | Forecast tab before submit — store picker (1,115 stores), horizon input |
| 04b | [`04b-forecast-generated.png`](04b-forecast-generated.png) | Forecast tab after submit — **real Prophet forecast line + confidence band**. MAPE 14.7%, fit ~100ms, predict ~110ms |
| 04c | [`04c-explain-drawer.png`](04c-explain-drawer.png) | ExplainDrawer open with the forecast context payload (Phase γ will replace the placeholder with live RAG) |
| 05 | [`05-revenue-drilldown.png`](05-revenue-drilldown.png) | Revenue Tree tab — 1,115 Rossmann stores grouped by type × assortment, with Explain hooks per row |
| 06 | [`06-simulation-placeholder.png`](06-simulation-placeholder.png) | Simulation tab — interactive form, submit disabled with clear "ships in Phase δ" messaging |
| 07 | [`07-admin-workflows.png`](07-admin-workflows.png) | `/sales/admin` → Workflows tab — 18 Sales enhancement processes, filterable by role (Mgr / TM / Compl / R&M) |
| 08 | [`08-data-flow.png`](08-data-flow.png) | `/data-flow` — 20-edge cross-dept flow table (Phase 4 will add interactive diagram) |
| 09 | [`09-sidebar-sales-expanded.png`](09-sidebar-sales-expanded.png) | Sidebar with Sales expanded → ⚙️ Admin and 📊 Manager sub-links above the process list |

## Reproducing these

```bash
# 1. Backend (from repo root)
cd backend && uvicorn main:app --port 8001 --host 127.0.0.1 &

# 2. Frontend with proxy
cd ../frontend && npm run dev &   # Vite on :5173 proxies /api/* to :8001

# 3. Screenshot spec
npx playwright test capture-screenshots --project=chromium
```

Outputs land in this directory. Each run overwrites the previous captures.

## Key facts visible in the captures

- **Prophet forecast is real**, not mocked. The chart in 04b is computed from 1,017,209 Rossmann rows.
- **Every placeholder carries a "ships in Phase X" message** — no blank screens, no undefined states.
- **15 departments** in the sidebar and dashboard grid (11 original + 3 new + 1 Dashboard entry).
- **10-tab Sales Manager page** is unique to Sales; other depts still show the standard 7 tabs.
- **ExplainDrawer shell** is already wired from multiple screens (ForecastTab + RevenueDrillDownTab). Phase γ replaces the "coming soon" body with live RAG output without touching the trigger points.

## What's NOT shown (Phase γ / δ / ζ / η / θ deferred)

- Live AI Explain narratives with citations (Phase γ)
- Simulation waterfall output (Phase δ)
- OTel trace visualizations (Phase ζ)
- Role-selector affecting UI visibility (Phase η)
- Anomaly queue with real data (later polish)
