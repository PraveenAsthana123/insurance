# Supply Chain & Logistics — Demo Scenarios & Deep-Dive Content

**Date:** 2026-04-19
**Status:** Content spec (precedes Phase 2a-2 deep-dive when scheduled)
**Companion to:** Sales deep-dive spec `docs/superpowers/specs/2026-04-19-sales-revenue-deep-dive-design.md`

This is the **second flagship** in the 3-dept strategy (Sales → Supply Chain → Executive). Content here defines the demo scenarios, screens, data, and AI use cases for Supply Chain. When we schedule Supply Chain execution, this doc becomes the input for a formal `<date>-supply-chain-deep-dive-design.md` spec.

---

## 1. Dept summary

**Mission:** Keep the right product in the right place at the right time at the right cost.

**Users / personas:**
- **Supply Chain Manager** (strategic) — plans network, approves major supplier / lane changes
- **Inventory Planner** (tactical) — daily reorder decisions, safety-stock calibration
- **Warehouse / Logistics Supervisor** (operational) — floor ops, exception close-out
- **Demand-Planning Analyst** (crosses into Sales) — forecast input consumer
- **Supplier-Relations Analyst** (compliance) — OTIF scorecards, contract adherence

**Why this dept matters for the demo:** supply chain is the BEV industry's #1 pain point post-2020. Showing real stockout detection + supplier-risk scoring + lane-level ETA prediction in one dashboard is exactly what portfolio reviewers want to see.

---

## 2. Kaggle dataset candidates

| Dataset | Slug | Pros | Cons |
|---|---|---|---|
| **Supply Chain Analysis** | `harshsingh2209/supply-chain-analysis` | 100 SKUs × 9 products, rich feature set, customer demographics, supplier, transport mode, delivery time, defect rate | Small (100 rows) — good for demo, not for ML training |
| **DataCo Smart Supply Chain** | `shashwatwork/dataco-smart-supply-chain-for-big-data-analysis` | 180k rows, orders + shipments + delivery status, geo coords | Generic / synthetic, not BEV-specific |
| **Online Retail II (UCI)** | `lakshmi25npathi/online-retail-dataset` | 1M transactions + SKU-level demand + returns | E-commerce, not pure supply chain |
| **Walmart M5 (recommended for forecast)** | `c/m5-forecasting-accuracy` | SKU × store × day (58k series) | Competition (rule-acceptance needed); big |

**Recommended for deep-dive:** Hybrid of **DataCo Smart Supply Chain** (for orders/shipments/delays + OTIF metrics) and **Supply Chain Analysis** (for SKU × supplier × lead-time + defect signals). Use DataCo as the fact base (volume + lineage), Supply Chain Analysis for enrichment (supplier + SKU metadata).

**Canonical schema (target):**
```
dim_supplier(supplier_id, name, location, rating, contract_expiry)
dim_sku(sku_id, product_category, lead_time_days, shelf_life_days)
dim_warehouse(warehouse_id, region, capacity_units)
dim_lane(lane_id, origin_warehouse, dest_region, mode, baseline_transit_days)
fact_shipment(shipment_id, order_id, sku_id, supplier_id, lane_id, qty,
              ship_date, promised_delivery, actual_delivery, status)
fact_inventory(warehouse_id, sku_id, date, on_hand, reorder_point, safety_stock)
fact_demand(warehouse_id, sku_id, date, shipped_units, stockout_flag)
```

---

## 3. The 6 screens (mirrors Sales pattern)

### Screen 1 — Supply Chain Overview
- KPI tiles: **OTIF %**, **Fill rate %**, **Days of supply**, **Lead-time variance**, **Stockout incidents (week)**
- Heatmap: stockout risk by region × product category
- Top-5 SKUs at stockout risk (link → Screen 2)
- Top-5 underperforming suppliers (link → Screen 6)

### Screen 2 — Stockout Risk & Inventory Drill-Down
- Tree drill: Region → Warehouse → SKU → daily on-hand
- At each level: on-hand vs reorder point, days of supply, predicted stockout date
- Click SKU → opens `ExplainDrawer` (reuse the one built in Sales ε)
- Action button: "Trigger expedite PO" (stubbed action log in Phase 2a-2)

### Screen 3 — Lead-Time & ETA Prediction
- Pick a shipment in-transit → predicted delivery date + confidence band
- Lane-level performance: baseline transit days vs actual distribution (box plot)
- Exception feed: shipments predicted to miss promised delivery by >1 day

### Screen 4 — AI Explanation Drawer (shared)
- Triggered from Screens 1, 2, 3, 6
- RAG corpus: `data/supply-chain-context/` with
  - `logistics-playbook.md` — typical disruption patterns + responses
  - `supplier-scorecard-methodology.md` — OTIF / defect / price compliance
  - `network-topology.md` — warehouse-region-lane map
  - `safety-stock-policies.md` — safety-stock math + category-specific rules
- Same hybrid retrieval + reranking + citations + guardrails as Sales γ

### Screen 5 — Scenario Simulator (supplier delay / inventory change)
- Inputs: supplier_id, delay_days (0–21), affected_SKUs, alternative_source (dropdown)
- Output waterfall: Stockout risk change · Service level delta · Revenue at risk · Mitigation cost
- Uses the same simulation service pattern as Sales δ

### Screen 6 — Supplier Risk & Scorecard
- Ranked supplier list: overall score (0–100) + 4 sub-scores (OTIF, quality, cost, responsiveness)
- Drill into supplier → historical performance, active shipments, contract terms, risk flags
- AI narrative: "Why is supplier X's score declining?" → ExplainDrawer

---

## 4. Demo scenarios (mirrors Sales §11 — 3 narrated scenarios)

### 🎬 Scenario 1: Stockout risk → expedite decision (2 min)
**Persona:** Inventory Planner
1. Lands on `/supply-chain` — Overview heatmap shows red cells in "Beverages × West region"
2. Clicks the cell → Screen 2 opens, filtered to West + Beverages
3. Sees SKU `BEV-5521` with 2 days of supply remaining, predicted stockout on day 4
4. Clicks "Explain" → AI narrative cites `logistics-playbook.md` → "Supplier delay on lane L-23; typical pattern after carrier strike"
5. Clicks "Trigger expedite PO" → action logged, alternative supplier suggested
6. **Outcome:** Potential stockout prevented. Decision takes 90 seconds.

### 🎬 Scenario 2: Shipment ETA miss → proactive alert (2 min)
**Persona:** Logistics Supervisor
1. Opens `/supply-chain/manager/eta` (Screen 3)
2. Exception feed shows shipment `SH-8842` predicted 2 days late (promised Mon, predicted Wed)
3. Drills into shipment → lane L-23 (Dallas → Chicago) has been 35% slower than baseline this week
4. Clicks "Ask AI why" → narrative cites `network-topology.md` + historical incidents → "Weather disruption at Dallas DC last 48h; similar patterns in 2023 added 1.8 days on average"
5. Triggers customer communication workflow
6. **Outcome:** Customer pre-notified before promised delivery date slips silently.

### 🎬 Scenario 3: Supplier delay simulation → sourcing decision (2 min)
**Persona:** Supply Chain Manager
1. Opens Screen 5 (simulator)
2. Inputs: supplier = "Supplier-12", delay = 14 days, affected SKUs = 8, alt source = "Supplier-19"
3. Runs scenario → waterfall:
   - Stockout risk change: +12 incidents
   - Service level delta: −3.8%
   - Revenue at risk: $420k
   - Mitigation cost (alt source): $85k premium
4. Clicks "Ask AI for recommendation" → narrative cites `supplier-scorecard-methodology.md` → "Accept mitigation cost — 4.9× ROI, Supplier-19 OTIF over trailing 90 days = 96.3%"
5. **Outcome:** Data-driven sourcing decision in 3 minutes instead of 3-day committee cycle.

---

## 5. Supply Chain KPI tree (for Screen 1 + 2)

```
Service Level
  ├─ OTIF (On-Time In-Full) % = shipments meeting both time + qty / total shipments
  │     ├─ On-Time % = shipments arriving by promised date
  │     └─ In-Full % = shipments delivering 100% ordered qty
  ├─ Fill Rate % = units shipped / units ordered
  └─ Order Cycle Time = ship_date − order_date

Inventory Health
  ├─ Days of Supply = on_hand / avg_daily_shipped
  ├─ Inventory Turns = 365 / days_of_supply
  ├─ Stockout Incidents (period)
  └─ Safety-Stock Adherence % = (actual_safety_stock / target) averaged

Supplier Performance (rolls up into Supplier Score)
  ├─ Supplier OTIF %
  ├─ Defect Rate (PPM)
  ├─ Lead-Time Variance = stddev(actual_lead_days)
  └─ Price Compliance % = units@contract_price / total

Financial
  ├─ Working Capital Tied in Inventory
  ├─ Expedite Spend / Freight Cost
  └─ Obsolescence Write-Off $
```

**Owner tags** (for RBAC):
- OTIF / Fill Rate / Cycle Time → Manager (view + edit SLA targets)
- Days of Supply / Safety-Stock → Inventory Planner (view + adjust policy)
- Supplier Score → Manager + Compliance (view; Compliance has audit rights)
- Stockout Incidents → Reporting & Monitoring (view + alert config)

---

## 6. AI use cases (maps to existing `aiUseCases.js` schema — additions for Phase 2a-2)

Extend `frontend/src/data/aiUseCases.js` with 7 supply-chain entries:

```js
{
  id: 'sc-stockout-prediction',
  dept: 'supply-chain',
  category: 'Anomaly Detection',
  name: 'Stockout-risk scoring',
  inputs: ['on-hand inventory', 'demand forecast', 'in-transit', 'historical lead time'],
  outputs: ['stockout probability per SKU × warehouse', 'days-to-stockout'],
  model: 'XGBoost + LSTM residual',
  trigger: 'hourly batch',
  owner: 'reporting-monitoring',
  businessImpact: '−35% stockout incidents',
},
{
  id: 'sc-eta-prediction',
  dept: 'supply-chain',
  category: 'ML',
  name: 'Shipment ETA prediction',
  inputs: ['shipment metadata', 'lane history', 'live telemetry', 'weather'],
  outputs: ['predicted delivery date', 'confidence band'],
  model: 'Gradient boosting on lane features',
  trigger: 'on shipment-status change',
  owner: 'team-member',
  businessImpact: '−40% silent delivery slips',
},
{
  id: 'sc-supplier-risk',
  dept: 'supply-chain',
  category: 'Anomaly Detection',
  name: 'Supplier risk scoring',
  inputs: ['OTIF history', 'defects', 'financial signals (D&B)', 'ESG disclosures', 'geopolitical news'],
  outputs: ['risk score 0-100', 'risk tier', 'watchlist flag'],
  model: 'Composite scorecard + LLM news classifier',
  trigger: 'daily',
  owner: 'manager',
  businessImpact: 'Early-warning 30 days on supplier failure',
},
{
  id: 'sc-network-sim',
  dept: 'supply-chain',
  category: 'Recommendation',
  name: 'Network disruption simulator',
  inputs: ['scenario inputs', 'current network state', 'alt supplier catalog'],
  outputs: ['impact waterfall', 'mitigation recommendation'],
  model: 'Causal sim + optimization',
  trigger: 'on-demand',
  owner: 'manager',
  businessImpact: '3× faster sourcing decisions',
},
{
  id: 'sc-demand-sensing',
  dept: 'supply-chain',
  category: 'ML',
  name: 'Short-horizon demand sensing',
  inputs: ['POS signals', 'weather', 'promotion calendar', 'social sentiment'],
  outputs: ['7-14 day demand signal by SKU × store'],
  model: 'N-BEATS / Prophet ensemble',
  trigger: 'daily',
  owner: 'reporting-monitoring',
  businessImpact: '+8% forecast accuracy vs monthly baseline',
},
{
  id: 'sc-rpa-po-creation',
  dept: 'supply-chain',
  category: 'RPA',
  name: 'Auto-PO for reorder-point triggers',
  inputs: ['inventory state', 'approved supplier catalog', 'approval thresholds'],
  outputs: ['PO created in ERP', 'notification to buyer'],
  model: 'UiPath + rules',
  trigger: 'reorder-point breach',
  owner: 'team-member',
  businessImpact: '80% of routine POs auto-created',
},
{
  id: 'sc-n8n-customs',
  dept: 'supply-chain',
  category: 'n8n',
  name: 'Customs doc orchestration',
  inputs: ['shipment manifest', 'country-of-origin', 'HS codes'],
  outputs: ['customs forms generated', 'broker notified'],
  model: 'n8n workflow + document template engine',
  trigger: 'shipment status = "ready"',
  owner: 'team-member',
  businessImpact: '−65% customs-hold rate',
},
```

---

## 7. RBAC for Supply Chain (deep-dive scope, demo-mode)

Extends the Sales RBAC matrix pattern from the Sales spec §10.8.

| Action / endpoint | Supply Chain Manager | Inventory Planner | Logistics Supervisor | Compliance | Reporting & Monitoring |
|---|:-:|:-:|:-:|:-:|:-:|
| `GET /supply-chain/kpi-summary` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /supply-chain/inventory-tree` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /supply-chain/shipments` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /supply-chain/eta` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /supply-chain/simulate` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `GET /supply-chain/suppliers` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /supply-chain/expedite-po` (stub) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit safety-stock thresholds | ❌ | ✅ | ❌ | ❌ | ❌ |
| View supplier contract terms | ✅ | ❌ | ❌ | ✅ | ❌ |
| Audit supplier compliance | ❌ | ❌ | ❌ | ✅ | ❌ |
| Configure stockout alerts | ❌ | ✅ | ❌ | ❌ | ✅ |

---

## 8. Roadmap to a Supply Chain deep-dive (Phase 2a-2)

When scheduled, Phase 2a-2 mirrors the Sales 8-sub-phase structure (α–θ) but with supply-chain-specific content. Estimated effort: **~36–40h** (slightly larger than Sales because of the 3-fact-table schema + ETA prediction model).

| Phase | Scope | Effort |
|---|---|---|
| **2a-2-α** | DataCo + Supply Chain Analysis ingestion; dim_supplier / dim_sku / dim_warehouse / dim_lane / 3 facts | 5h |
| **2a-2-β** | Backend: stockout-risk service (XGBoost) + ETA service + supplier-score service + 3 routers | 7h |
| **2a-2-γ** | RAG over `data/supply-chain-context/` (~4 md docs) | 5h |
| **2a-2-δ** | Network-disruption simulator | 4h |
| **2a-2-ε** | Frontend: 6 screens (Overview, Inventory Drilldown, ETA, Supplier, Simulator, AI Explain) | 7h |
| **2a-2-ζ** | Observability hooks (reuse Sales ζ pattern) | 2h |
| **2a-2-η** | RBAC (reuse Sales η middleware, add supply-chain matrix) | 2h |
| **2a-2-θ** | Playwright specs + demo script + diagrams | 4h |

Each sub-phase becomes its own plan + subagent-driven execution cycle (same pattern as Sales).

---

## 9. What to reuse from Sales (saves significant time)

- **`ExplainDrawer`** component (from Sales ε) — works identically, just needs supply-chain RAG corpus pointed to
- **RAG pipeline** (from Sales γ) — generic over corpus; point at `data/supply-chain-context/`
- **Simulation service pattern** (from Sales δ) — reuse the `simulate()` interface
- **Observability middleware** (from Sales ζ) — already dept-agnostic
- **RBAC middleware** (from Sales η) — add supply-chain permission matrix to the config dict
- **TestClient fixtures + conftest.py** (from Sales β) — unchanged
- **`workflows.js` pattern** (from Phase 2 workflows tab UI) — supply chain processes already in the 193-entry catalog

**Estimated reuse savings: ~6–8h** out of the 36h Phase 2a-2 estimate. So realistically Supply Chain is **~28–30h new work** on top of Sales.

---

## 10. Dashboard tiles that appear on the overview page

When Supply Chain deep-dive ships, the main Dashboard (`/`) Supply Chain tile shows live (not stubbed):

- Headline: OTIF 94.2% (trailing 7 days)
- Trend arrow (WoW change)
- One alert count: "3 SKUs at stockout risk in the next 48h"
- Quick-link: "Open Supply Chain →"

This pattern repeats for Sales (already in spec), and later for Executive Scorecard.

---

## 11. Comparison to Sales flagship (what makes Supply Chain different)

| Dimension | Sales | Supply Chain |
|---|---|---|
| Primary AI | Prophet forecast (time series) | XGBoost stockout + gradient boost ETA (classification + regression) |
| Data grain | 1 fact (sales) × store × day | 3 facts (shipment, inventory, demand) × SKU × warehouse × day |
| Demo hero moment | "Why did revenue drop?" AI narrative | "Expedite THIS PO because..." AI-recommended action |
| Simulation | Price × promo waterfall | Supplier delay → stockout + cost waterfall |
| Hardest tech | RAG eval harness | Supplier-risk composite scoring (many weak signals) |
| Reviewer appeal | Forecast + explanation = classic BI+AI | Action-oriented decision support = "real product" signal |

Both depts anchor the portfolio differently. Together they tell the "AI-native enterprise" story better than either alone.

---

## 12. Open questions for when Phase 2a-2 starts

- Do we try the M5 competition data (needs rule-acceptance) or stick with public dataset mirrors as in Sales?
- Does the network-disruption simulator need a real OR-Tools dependency, or is a heuristic sim sufficient for Phase 2a-2?
- Should supplier-risk scoring include news-sentiment NLP (extra RAG corpus over recent news) or keep it to structured signals only?
- ETA prediction — generic features, or lane-specific model per high-volume lane?

These become decisions in the formal Phase 2a-2 design spec when it's written.

---

## 13. Immediate actionable if this doc is approved

1. Save (this doc — done)
2. When ready, invoke brainstorming skill → produce `2026-MM-DD-supply-chain-deep-dive-design.md` with these scenarios as the seed
3. Write phase α plan for supply-chain data ingestion
4. Execute — subagent-driven

**Or:** treat this as "Supply Chain on deck" and return to Sales (γ RAG / ε Frontend / etc.) for deeper proof-of-concept on one dept before horizontal expansion.

Reviewer recommendation (external): go deep on Sales first (ε + γ), because **one fully working flagship > two half-built**. But this is a design call.
