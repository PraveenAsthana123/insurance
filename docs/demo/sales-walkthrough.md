# Sales Flagship — Demo Walkthrough

Three narrated scenarios. Each ~2 minutes end-to-end. Designed to run against
a local stack: `docker compose up` + `cd backend && uvicorn main:app --port 8001`
+ `cd frontend && npm run dev`.

Role selector starts at **Manager** (the default).

---

## Scenario 1 — Revenue-drop investigation (Sales Manager)

**Persona:** Sales Manager opening Monday morning's board.

**Opening shot:** Browser on `http://localhost:5173`.

### Narration

> "Morning. Let's start with the Sales Overview."

Click **Sales & Demand** in the left sidebar, then ⚙️ nothing (stay on the dept page).

**On screen:** Four live KPI tiles mount — Active stores (1,115), Store types (4), Backend (✓ Live), Forecast engine (Prophet · MAPE 14.7%).

> "Fifteen hundred stores across four formats. The 14.7% forecast error is the number that matters — under 15% is healthy for daily retail."

Scroll down. Sees the **Data snapshot** block — 18 enhancement workflows, 4 AI use cases, 4 seeded roles, 4 in / 2 out data flows.

> "Now I want to check where revenue is trending. Let's open the Manager view."

Click **📊 Manager** in the sidebar.

**On screen:** Manager hub loads with 10 tabs. Three are Sales-specific in blue.

Click the **Revenue Tree** tab. Store-type × assortment breakdown renders instantly from the in-memory store catalog.

> "Type-b stores are the flagship format — 17 of them. The category pill tells me assortment depth. Type-c Basic is underrepresented, only 142 stores. Worth a look, but not now."

Click the first row's **🤖 Explain** button.

**On screen:** ExplainDrawer slides in from the right. Seeds the question "Why does store type a perform the way it does?". User hits **Ask**.

> "A 2-second Prophet query, and the AI gives me a grounded narrative — note the [ref 1] tag. Citations are expanded below. No hallucinations — the answer is pulled from the `rossmann-business-context.md` file."

---

## Scenario 2 — 8-week forecast + confidence (Demand Planner)

**Persona:** Demand Planner validating next quarter's forecast.

From Manager hub, click the **📈 Forecast** tab.

**On screen:** Store picker loads with 1,115 options. Horizon defaults to 56 days.

> "Store 262. Standard type, average volume. Let me regenerate with a longer horizon."

Change horizon to **90**. Click **Generate forecast**.

**On screen:** ~3-second Prophet fit (cached after first run per store). Chart renders with historical line + forecast line + confidence band. Stats row: Backtest MAPE 12.8%, fit 94ms, predict 108ms.

> "Backtest MAPE at 12.8% — that's better than our cold-start of 14.7. The confidence band widens after day 45, which is expected — seasonality amplifies uncertainty at that horizon."

Click **Ask AI why**.

**On screen:** ExplainDrawer opens with context `{screen: 'ForecastTab', store_id: 262, horizon_days: 90, mape: 0.128}`. AI narrates yearly seasonality dominating, weekly component secondary.

> "Exactly what I'd expect. I'll export this — PDF button comes next phase."

---

## Scenario 3 — Promo ROI simulation (Revenue Ops)

**Persona:** Revenue Ops analyst sizing a Black Friday promo.

Click the **🎯 Simulation** tab.

**On screen:** Form with Store ID, Discount %, Duration (days). No waterfall yet.

> "Store 1 — our highest-volume flagship. 25% off for 10 days."

Enter **25** for discount, **10** for duration. Click **▶ Run scenario**.

**On screen:** Backend runs the baseline forecast (reuses the cached fit from Scenario 2) + applies the elasticity model. Waterfall chart renders in ~400ms:
- Baseline margin: $34,689
- Promo uplift: +$17,345 (volume lift at -2.0 elasticity)
- Margin hit: -$21,681 (discount eats 15% of revenue)
- Net promo margin: $30,353

> "Net margin hit of $4,336 — acceptable for a visibility play, but not a profit move. Let's stress-test at 15%."

Change discount to **15**. Click **Run scenario** again.

**On screen:** New waterfall. Net margin impact is now slightly positive at +$1,200.

> "That's the sweet spot. I can ask the AI for context."

Click the role selector in the top bar, switch to **Team Member**.

**On screen:** The Run scenario button now shows "🔒 Manager role required" with a yellow banner explaining. Simulation is manager-only per the RBAC matrix.

> "Good — someone on my team can view forecasts and revenue trees, but only a manager can run scenarios that affect promotional commitments. That's the demo-mode RBAC at work."

---

## Appendix

- **Rossmann dataset** (public mirror via Kaggle, ODbL-1.0): 1,115 stores × 942 days = 1,017,209 rows, ingested into Postgres.
- **Prophet** with trend + weekly + yearly seasonality (promo + state_holiday regressors deferred per Phase 2b roadmap).
- **RAG corpus**: 4 hand-authored markdown files totaling ~2,000 words, ingested in-process with rank_bm25 + Ollama embeddings.
- **LLM**: `qwen2.5:latest` via local Ollama.
- **Elasticity** constant -2.0 (BEV grocery benchmark); real per-store learning is Phase 2b.
- **RBAC**: demo-mode via `X-Demo-Role` header; manager / team-member / compliance / reporting-monitoring. Simulation is manager-only.
