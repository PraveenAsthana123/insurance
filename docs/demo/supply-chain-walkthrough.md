# Supply Chain Flagship — Demo Walkthrough

Three narrated scenarios mirroring the Sales walkthrough. Each ~2 minutes
end-to-end. Designed to run against a local stack: `docker compose up` +
`cd backend && uvicorn main:app --port 8001` + `cd frontend && npm run dev`.

Role selector starts at **Manager**.

---

## Scenario 1 — Stockout risk → expedite decision (Inventory Planner)

**Persona:** Inventory Planner starting the shift and checking the at-risk
list before morning stand-up.

**Opening shot:** Browser on `http://localhost:5173`.

### Narration

> "Good morning. Let's see what's flashing red in supply."

Click **Supply Chain** in the left sidebar.

**On screen:** Supply Chain Overview mounts with four live KPI tiles —
Active SKUs (100), Suppliers (5), Top supplier score (e.g. 76.4), and Backend
status (✓ Live). Below the tiles, a band of risk counts: 8 SKUs in the high
band, 14 medium, 78 low.

> "Eight high-risk SKUs. That's my priority for the next hour. Let me drill in."

Click **📊 Manager** in the sidebar, then the **⚠️ Stockout Risk** tab.

**On screen:** SKU picker loads all 100 SKUs. User selects SKU0 from the
dropdown and clicks **Assess risk**.

**On screen:** Risk panel renders in ~200 ms. Risk band: **high**. Days to
stockout: 2. Lead time: 7 days. Reason: "only 2d of cover vs 7d lead time".

> "Two days of cover against a seven-day lead time. That's a textbook expedite
> situation. Let's ask the AI why this is happening — sometimes the answer is
> the weather, not the demand."

Click **🤖 Ask AI**.

**On screen:** ExplainDrawer slides in from the right. Context shows
`{screen: 'StockoutRiskTab', sku_id: 'SKU0', risk_band: 'high'}`. The seeded
question is "Why is SKU SKU0 in the high stockout risk band?". User hits
**Ask**.

**On screen:** ~3-second AI response with citations. Narrative cites
`logistics-playbook.md` — monsoon-window Sea-lane delays and the expediting
rule ("expedite when days_to_stockout < lead_time/2"). Three citations listed
with chunk sources visible.

> "Good — the AI confirms this matches the expedite-trigger rule and suggests
> a mode upgrade. I'll raise an expedite PO and switch the remaining leg to
> Air. Ninety seconds of investigation, one decision, outbound."

---

## Scenario 2 — Supplier scorecard review → sourcing shift (Supply Chain Manager)

**Persona:** Supply Chain Manager reviewing the weekly supplier performance
report before the S&OP meeting.

From the sidebar click **📊 Manager** (already loaded), then the
**🏭 Supplier Scorecard** tab.

**On screen:** Ranked table of 5 suppliers with composite score in a colour
pill — green above 70, amber 40–70, red below 40. Top supplier ~76, bottom
around 38 (depends on live data). Columns show location, manufacturing lead
time, and the 3 sub-scores (defect, lead time, inspection).

> "Supplier 2 is in the red band at thirty-eight. Their defect sub-score
> tanked to single digits. I want the narrative before I raise it in S&OP."

Click the red score pill on Supplier 2.

**On screen:** ExplainDrawer opens with context `{screen: 'SupplierScorecardTab',
supplier_id: 'Supplier 2', supplier_name: 'Supplier 2', score: 38.2}`. Seeded
question: "Why does supplier Supplier 2 have a score of 38.2?". User hits
**Ask**.

**On screen:** AI narrative cites `supplier-scorecard-methodology.md` —
the 40/30/30 weighting, defect sub-score formula, and the amber/red banding
rule. It explicitly notes a defect rate above 2.5% drives the defect sub-score
below 50, dominating the composite.

> "That's the answer. Defect rate is the 40% weight and it's pulling them
> under. I'll put Supplier 2 on the corrective-action track and flag their two
> single-sourced SKUs for secondary sourcing. One question, one citation,
> twenty seconds."

---

## Scenario 3 — Network delay simulation → contingency (Supply Chain Manager)

**Persona:** Supply Chain Manager sizing the impact of a rumoured 10-day
Supplier 1 slowdown before the VP-Ops call.

Click the **📈 Network Simulation** tab.

**On screen:** Form with Supplier dropdown, Delay days input (0–30), and
Affected SKU count (1–100). No waterfall yet.

> "Supplier 1 — Mumbai. Delay ten days. Let's assume twenty SKUs are
> affected, that's roughly their active range."

Select **Supplier 1**. Enter **10** for delay, **20** for affected SKUs.
Click **▶ Run simulation**.

**On screen:** Waterfall renders in ~250 ms with three numbers:

- Stockout probability change: **+20 %**
- Service level delta: **−20 %**
- Revenue at risk: **~$11,300** (from `fact_shipment.revenue_generated`
  aggregation for Supplier 1).

> "Twenty percentage points of service level and eleven thousand at risk.
> That's a material hit. Let me get an AI-written recommendation for the VP."

Click **🤖 Ask AI**.

**On screen:** ExplainDrawer opens with context `{screen: 'NetworkSimTab',
supplier_id: 'Supplier 1', delay_days: 10, affected_sku_count: 20}`.
Narrative cites `logistics-playbook.md` (expedite policy, carrier-strike
response) and `safety-stock-policies.md` (expedite tiers). Recommendation:
mode-upgrade one tier for the at-risk SKUs, split-shipment for the top-3
high-velocity, activate secondary supplier if available.

Click the role selector in the top bar, switch to **Team Member**.

**On screen:** The **▶ Run simulation** button now shows
"🔒 Manager role required" with a yellow banner. Simulation is manager-only
per the Wave 3 RBAC matrix.

> "Good — a team member can read risk and scorecard, but only a manager
> commits a what-if that feeds a sourcing decision. That's demo-mode RBAC
> at work on a second flagship."

---

## Appendix

- **Dataset.** Kaggle `harshsingh2209/supply-chain-analysis` — 100 SKUs × 5
  suppliers × 3 route bands, one row per SKU, ingested into Postgres as
  `dim_sku`, `dim_supplier`, and `fact_shipment`.
- **Models.** Heuristic stockout-risk (no ML training on 100 rows),
  rule-based ETA from per-mode `shipping_time` averages, composite
  supplier score with 40/30/30 weighting.
- **RAG corpus.** 4 hand-authored markdown files under
  `data/supply-chain-context/` totalling ~1,700 words and 22 H2 chunks.
- **LLM.** `qwen2.5:latest` via local Ollama (same as Sales).
- **RBAC.** demo-mode via `X-Demo-Role` header; manager / team-member /
  compliance / reporting-monitoring. `/supply-chain/simulate` is
  manager-only.
