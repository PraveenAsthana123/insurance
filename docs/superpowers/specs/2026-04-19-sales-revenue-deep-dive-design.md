# Sales & Revenue Deep-Dive — Design (Phase 2a-1)

**Date:** 2026-04-19
**Status:** Draft (**full deep-dive** scope — user chose option B on 2026-04-19)
**Supersedes:** per-dept Phase-1 stubs for `/sales`, `/sales/admin`, `/sales/manager`
**Out of scope:** all other 13 departments (they remain stubbed)

---

## 1. Summary

Transform the Sales & Demand department from scaffolding into a **walking skeleton** with 6 working screens, one real Kaggle-backed dataset, one working Prophet forecast, one RAG-grounded AI explanation, and one price-×-promotion simulation. Other depts stay stubbed. Tests and a narrated demo script ship with the code.

**Audience:** hiring manager / portfolio reviewer who needs to see "this is a real product, not a mockup" on at least one department.

**Success criterion:** someone can clone the repo, run `docker compose up`, navigate to `/sales`, and execute every one of the 3 demo stories (revenue-drop investigation, 8-week forecast, promotion impact) without hitting a `TabStub`.

---

## 2. Decisions (locked via user input "1 + defaults" on 2026-04-19)

| # | Decision | Choice |
|---|---|---|
| 1 | Kaggle dataset | **Rossmann Store Sales** — 1,115 stores, ~1.1M daily rows, promo + holiday signals |
| 2 | Backend strategy | **Hybrid** — real FastAPI forecast endpoint + static mock JSON for KPI cards |
| 3 | Forecast model | **Prophet** (Meta's — already in `requirements.txt`) |
| 4 | RAG scope | **Full** — Ollama + LangChain + hybrid retrieval (BM25 + vector) |
| 5 | Scope size | **Full deep-dive** — all 8 roadmap bullets: 6 screens + forecast + RAG + simulation + tests + demo script + observability + RBAC-for-sales |

---

## 3. Non-goals (explicitly OUT)

- Fill the 17 other Admin + Manager tabs for the 13 other depts.
- Real JWT / session auth (RBAC is presentational + middleware-enforced via a demo-mode role selector — no real login).
- Multi-model champion-challenger. One Prophet model only.
- Real-time streaming updates. Everything is request-response.
- Cross-dept data-flow viz (deferred to Phase 4).
- Full LLMOps dashboards in Grafana (observability hooks ship; dashboards deferred to Phase 2b-2).
- Deploy to cloud. Local `docker compose up` is enough.
- Complete the other 13 depts' RBAC maps. Only Sales is RBAC-wired.

---

## 4. The 6 Screens

### Screen 1 — Sales Overview (existing `OverviewTab` — enhance)
- Headline KPI cards: Revenue MTD, Revenue YoY %, Forecast MAPE, Open pipeline
- Territory / store-type breakdown chart (reuse `recharts`)
- Top-5 stores by revenue
- Top-5 stores by anomaly score (link → screen 5)

### Screen 2 — Revenue Drill-Down (new tab: `RevenueDrillDownTab`)
Route: `/sales/manager/revenue-drilldown` (added as a Manager tab panel)
- Tree drill: Country → State → Store → SKU category → day
- At each level: current-period revenue, YoY %, rank
- Click a leaf → opens an `ExplainDrawer` that fires the AI Explanation flow (Screen 4)
- Export CSV of current view

### Screen 3 — 8-Week Forecast (new tab: `ForecastTab`)
Route: `/sales/manager/forecast`
- Pick store (autocomplete) → call `POST /api/v1/sales/forecast`
- Render actual vs forecast line chart
- MAPE for the model on backtest
- Prophet components chart (trend, weekly, yearly)
- Button: "Regenerate with different horizon"

### Screen 4 — AI Explanation (new modal: `ExplainDrawer`)
Triggered from Screens 1, 2, 5.
- Takes a context payload: `{storeId?, skuCat?, dateRange, metric, observedValue, expectedValue}`
- Calls `POST /api/v1/ai/explain`
- Backend: RAG pipeline (hybrid retrieval over `sales_context`, Ollama generates)
- Displays: natural-language driver analysis + top-3 contributing factors + source citations
- Each citation is a chip that expands to show the retrieved snippet

### Screen 5 — Anomaly Queue (existing manager tab `MonitoringAlertsTab` — enhance for Sales)
- Table of current anomalies: store, date, metric, expected, actual, severity
- Filters: severity, store, metric, date range
- Row action: "Explain" → opens `ExplainDrawer`

### Screen 6 — Promotion Simulator (new tab: `SimulationTab`)
Route: `/sales/manager/simulation`
- Inputs: store, promo intensity (0–50% discount), duration (days), week-of-year
- Submit → `POST /api/v1/sales/simulate`
- Backend: use Prophet forecast + price-elasticity coefficient from the Rossmann `Promo` column uplift learned offline
- Waterfall chart: Baseline → Promo uplift → Margin hit → Net impact
- Button: "Ask AI why" → opens `ExplainDrawer` with the simulated context

---

## 5. Data Model

### 5.1 Kaggle dataset mapping
Source: `rossmann-store-sales` (3 files: `train.csv`, `store.csv`, `test.csv`)

Transform to canonical schema (ingested via `scripts/ingest_rossmann.py`):

```
dim_store(store_id, store_type, assortment, competition_distance, competition_open_since)
dim_date(date, day_of_week, is_school_holiday, is_state_holiday, holiday_type)
fact_sales(store_id, date, sales, customers, open, promo, promo2)
```

Postgres tables, populated in `backend/migrations/010_sales_rossmann.sql` (new migration).

### 5.2 Frontend data shape (mock JSON served from `frontend/public/mock/sales/`)
- `kpi_summary.json` — current-period KPIs for Screen 1
- `revenue_tree.json` — hierarchical structure for Screen 2
- `anomalies.json` — seeded anomaly list for Screen 5

Real backend endpoints back Screens 3, 4, 6 (Forecast, AI Explanation, Simulation).

### 5.3 RAG corpus (for Screen 4)
Static markdown documents under `data/sales-context/`:
- `rossmann-business-context.md` — business meaning of fields
- `sales-kpi-definitions.md` — KPI formulas
- `promo-playbook.md` — known promo patterns + their typical uplift
- `anomaly-handbook.md` — what various anomaly patterns typically indicate

Ingested into a **Chroma** vector store at startup (Chroma is already a Python dep or can be added; no infra change — runs in-process).

---

## 6. Backend

### 6.1 New routers

`backend/routers/sales.py`
```
GET  /api/v1/sales/kpi-summary          # serves kpi_summary.json (mock for Phase 2a-1)
GET  /api/v1/sales/revenue-tree         # serves revenue_tree.json (mock)
GET  /api/v1/sales/anomalies            # serves anomalies.json (mock)
POST /api/v1/sales/forecast             # real — runs Prophet
POST /api/v1/sales/simulate             # real — price-elasticity sim
GET  /api/v1/sales/stores               # list stores from fact_sales
```

`backend/routers/ai_explain.py`
```
POST /api/v1/ai/explain                 # real — RAG pipeline
```

### 6.2 Services

- `backend/services/forecast_service.py` — loads Prophet model per store (cached), predicts horizon days, returns `{actual[], forecast[], components{}, mape}`.
- `backend/services/simulation_service.py` — combines baseline forecast + elasticity coefficient + margin factor → waterfall output.
- `backend/services/rag_service.py` — wraps LangChain hybrid retrieval (BM25 + Chroma) + Ollama LLM call.

### 6.3 Repository

- `backend/repositories/sales_repo.py` — all SQL for `fact_sales`, `dim_store`, `dim_date`.

### 6.4 Pydantic schemas

- `backend/schemas/sales.py` — `ForecastRequest`, `ForecastResponse`, `SimulationRequest`, `SimulationResponse`, `ExplainRequest`, `ExplainResponse`.

---

## 7. AI Explanation (RAG) Flow

```
┌──────────────┐
│ ExplainRequest
│ {store, metric, observed, expected, dateRange}
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ Query builder        │  templates a natural-language query + metadata filter
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Hybrid retrieval     │  BM25 + Chroma vector search over data/sales-context/
│ top-k=10             │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Reranker (cross-enc) │  keep top-3
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Prompt assembly      │  system + context snippets + request
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Ollama (llama3)      │  generates markdown response
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Citation extractor   │  attach source file:line for each claim
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ ExplainResponse
│ {markdown, citations[]}
└──────────────────────┘
```

Maps to Enterprise AI Policy §3 (Advanced RAG) layers: retrieval → reranking → context optimization → grounding.

### 7.1 Guardrails (mandatory)
- Max context tokens: 3000 (prompt + retrieved chunks)
- Max response tokens: 800
- Timeout: 30s (fail → return "explanation temporarily unavailable")
- No PII in prompts (sales data is aggregated; still scan for email/phone regex and redact)
- Every paragraph in the response must have at least one citation, or the response is rejected

---

## 8. Forecast Flow

```
ForecastRequest {store_id, horizon_days=56}
   ↓
Load historical fact_sales for store_id (last 730 days)
   ↓
Prophet(weekly_seasonality=True, yearly_seasonality=True, holidays=state_holidays)
   ↓
Fit
   ↓
Predict next 56 days
   ↓
Backtest MAPE on last 56 days of history (held out during fit)
   ↓
ForecastResponse {actual[], forecast[], components{trend, weekly, yearly}, mape}
```

Model is cached in-process per store. Background task retrains weekly (stub — log to `logger.info` only in Phase 2a-1, real Celery task in Phase 2b).

---

## 9. Simulation Flow

```
SimulationRequest {store_id, promo_intensity, duration_days, week_of_year}
   ↓
Load baseline forecast for store_id, same duration
   ↓
Apply learned elasticity:
  uplift_units = baseline_units × (1 + elasticity × promo_intensity)
  new_revenue = uplift_units × (price × (1 - promo_intensity))
  margin_hit = baseline_revenue - new_revenue
   ↓
SimulationResponse {
  baseline_revenue, promo_revenue, uplift_units, margin_hit,
  net_impact, waterfall[4 steps]
}
```

Elasticity coefficient learned offline (`scripts/learn_elasticity.py`, one-time), stored as a constant in `simulation_service.py`. Published value + methodology in `docs/data/elasticity-methodology.md`.

---

## 10. Tests (expanded for full deep-dive)

### 10.1 Backend unit (pytest)
- `test_forecast_service.py` — fixture Prophet model, assert MAPE < 20% on synthetic data, component extraction, cache hit/miss
- `test_simulation_service.py` — assert monotonic (more promo → more units, less margin), bounds enforcement, elasticity loading
- `test_rag_service.py` — mock Ollama, assert citation extraction, guardrails block over-long prompts, PII redaction, timeout path
- `test_sales_repo.py` — SQL round-trips against test Postgres (via `pytest-postgresql` or similar)

### 10.2 Backend integration (pytest + TestClient)
- `test_sales_router.py` — all 6 endpoints, response schema validation
- `test_ai_explain_router.py` — full RAG pipeline with real Ollama stub, asserts ≥1 citation + grounded claim ratio
- `test_rbac_sales.py` — each role-guard returns 200/403 per matrix

### 10.3 Data quality tests
- `test_rossmann_ingestion.py` — post-ingest: row counts match, no nulls in key columns, date range covers expected window
- `test_forecast_calibration.py` — holdout backtest MAPE < target (e.g. 20%) for ≥ 80% of stores

### 10.4 RAG evaluation harness (new)
- `backend/tests/eval/test_rag_groundedness.py` — 10 sample Q&A; each response scored for:
  - Groundedness (does each claim map to a retrieved chunk?)
  - Faithfulness (does the response contradict retrieved chunks?)
  - Answer relevance (does it address the question?)
- Passes if all 3 scores ≥ 0.7 on ≥ 8 of 10 samples

### 10.5 Frontend (Playwright — new `e2e/sales-deep-dive.spec.js`)
- Overview page loads with KPI cards
- Clicking a store in revenue tree opens ExplainDrawer with ≥1 citation
- Forecast tab: enter store → chart renders within 10s
- Anomaly queue: click "Explain" → ExplainDrawer shows response
- Simulation: change promo slider → waterfall updates
- Role selector change: switching to "Team Member" hides admin-only actions
- Keyboard navigation works on Forecast / Simulation inputs (a11y)

---

## 10.6 Sales KPI Tree (full, for Screen 1 + 2)

```
Revenue (period = day / week / month)
  ├─ Net Revenue = Gross Revenue − Returns − Trade Spend
  ├─ Gross Revenue = Σ (units × unit_price)
  │     └─ by store, SKU, promo-status, holiday-status
  ├─ Returns = Σ (returned_units × unit_price)
  └─ Trade Spend = Σ promo_discounts + display_spend

Forecast-driven KPIs
  ├─ Forecast MAPE = mean(|actual − forecast| / actual)
  ├─ Forecast Bias = mean(forecast − actual)
  └─ Forecast Stability = |MAPE_t − MAPE_{t-1}|

Operational KPIs
  ├─ Promo Uplift % = (revenue_with_promo − baseline) / baseline
  ├─ Lost-sale rate (store closed days as proxy) = closed_days / total_days
  └─ Anomaly rate = anomalies / store-days
```

Owner tags (for RBAC):
- Revenue / Gross / Net → Manager (view + edit targets)
- MAPE / Bias / Stability → Reporting & Monitoring (view + alert config)
- Anomaly rate → Reporting & Monitoring (view + triage)
- Promo Uplift → Manager (view + scenario)

---

## 10.7 Observability hooks (new — deep-dive only)

Every Sales endpoint emits:
- **Structured log** — correlation_id, user_role, endpoint, latency_ms, status_code, response_size_bytes
- **Prompt log** (for `/api/v1/ai/explain`) — correlation_id, retrieved_doc_ids, prompt_token_count, response_token_count, groundedness_score, citation_count, model_name, model_version
- **Forecast eval log** — correlation_id, store_id, horizon, mape, fit_time_ms, predict_time_ms
- **OpenTelemetry spans** — parent span per request, child spans per service boundary (repo, service, external call)

Logs emit to stdout as JSON (picked up by container logging). Tracing goes to console exporter in Phase 2a-1; Jaeger / Tempo integration in Phase 2b.

Log schema documented in `docs/observability/sales-logs.md`.

---

## 10.8 RBAC for Sales (new — deep-dive only, demo-mode)

**No real auth.** Demo-mode role selector in the top bar lets a user pick one of the 4 canonical roles. Role claim is passed via `X-Demo-Role` header to backend. Middleware enforces the permission matrix below.

### Permission matrix (Sales dept only)

| Action / endpoint | Manager | Team Member | Compliance | Reporting & Monitoring |
|---|:-:|:-:|:-:|:-:|
| `GET /sales/kpi-summary` | ✅ | ✅ | ✅ | ✅ |
| `GET /sales/revenue-tree` | ✅ | ✅ | ✅ | ✅ |
| `POST /sales/forecast` | ✅ | ✅ | ✅ | ✅ |
| `POST /sales/simulate` | ✅ | ❌ | ❌ | ❌ |
| `GET /sales/anomalies` | ✅ | ✅ | ✅ | ✅ |
| `POST /ai/explain` | ✅ | ✅ | ✅ | ✅ |
| View PII (customer email/phone in store data) | ❌ | ❌ | ✅ | ❌ |
| Edit forecast targets | ✅ | ❌ | ❌ | ❌ |
| Configure alert thresholds | ❌ | ❌ | ❌ | ✅ |

Middleware: `backend/core/rbac_middleware.py` — maps `X-Demo-Role` to permission set; returns 403 if action not permitted.

UI: Top-bar role selector updates `localStorage.role`; all frontend API calls automatically attach `X-Demo-Role`. Admin-only buttons hidden when role lacks permission (defense-in-depth — backend enforces too).

---

## 11. Demo script

`docs/demo/sales-walkthrough.md` — 3 narrated scenarios, ~2 min each:

1. **Revenue drop investigation** (Sales Manager persona)
   - Lands on `/sales`
   - KPI card shows Revenue YoY ↓ 12%
   - Drills to store 823, week 32
   - Clicks "Explain" → AI narrative cites `promo-playbook.md` → "Missing promo cycle"
   - Decision: schedule compensating promo

2. **8-week forecast + confidence** (Demand Planner persona)
   - Forecast tab → picks store 262
   - Sees forecast line, MAPE 8.3%
   - Inspects Prophet components → yearly seasonality dominates
   - Saves forecast PDF (stub button — Phase 2b)

3. **Promo ROI simulation** (Revenue Ops persona)
   - Simulation tab → store 823, 30% promo, 7 days
   - Waterfall: +$12k units, -$8k margin, +$4k net
   - Clicks "Ask AI why" → AI explains uplift driver
   - Saves scenario to clipboard

---

## 12. File Structure

```
NEW backend files:
  backend/routers/sales.py
  backend/routers/ai_explain.py
  backend/services/forecast_service.py
  backend/services/simulation_service.py
  backend/services/rag_service.py
  backend/repositories/sales_repo.py
  backend/schemas/sales.py
  backend/migrations/010_sales_rossmann.sql
  backend/tests/test_forecast_service.py
  backend/tests/test_simulation_service.py
  backend/tests/test_rag_service.py
  backend/tests/test_sales_router.py

NEW data / scripts:
  data/sales-context/rossmann-business-context.md
  data/sales-context/sales-kpi-definitions.md
  data/sales-context/promo-playbook.md
  data/sales-context/anomaly-handbook.md
  scripts/ingest_rossmann.py
  scripts/learn_elasticity.py

NEW frontend files:
  frontend/public/mock/sales/kpi_summary.json
  frontend/public/mock/sales/revenue_tree.json
  frontend/public/mock/sales/anomalies.json
  frontend/src/components/manager-tabs/sales/RevenueDrillDownTab.jsx
  frontend/src/components/manager-tabs/sales/ForecastTab.jsx
  frontend/src/components/manager-tabs/sales/SimulationTab.jsx
  frontend/src/components/common/ExplainDrawer.jsx
  frontend/src/services/salesApi.js
  frontend/src/services/aiExplainApi.js
  frontend/e2e/sales-deep-dive.spec.js

NEW docs:
  docs/data/sales-rossmann-mapping.md
  docs/data/elasticity-methodology.md
  docs/demo/sales-walkthrough.md

MODIFY existing:
  backend/main.py                         (wire new routers)
  backend/database.py                     (run new migration)
  backend/requirements.txt                (add langchain, chromadb if missing)
  frontend/src/pages/ManagerPage.jsx      (add 3 sales-specific tab panels when dept.id === 'sales')
  frontend/src/components/manager-tabs/MonitoringAlertsTab.jsx  (extend for sales anomaly rendering)
  frontend/src/components/dept-tabs/OverviewTab.jsx             (enrich when dept.id === 'sales')
  docs/ARCHITECTURE.md                    (add sales flagship section if exists, else create)
```

---

## 13. Acceptance Criteria (full deep-dive)

### Core functionality
- [ ] `docker compose up` starts clean
- [ ] Kaggle dataset ingested → `fact_sales` has > 1M rows, `dim_store` has 1115 stores
- [ ] `/sales` Overview shows real KPI cards with Rossmann-derived data + full KPI tree visible
- [ ] `/sales/manager/forecast` renders a Prophet forecast for any valid store, with components chart + MAPE
- [ ] `/sales/manager/simulation` returns a 4-step waterfall
- [ ] `ExplainDrawer` returns a markdown response with ≥1 citation in < 30s, citation chips expand to show retrieved snippet

### Quality gates
- [ ] Backend unit tests: all pass (`pytest backend/tests/ -m "not integration"`)
- [ ] Backend integration tests: all pass (`pytest backend/tests/ -m integration`)
- [ ] Data quality tests: 0 nulls in key columns, backtest MAPE < 20% on ≥ 80% of stores
- [ ] RAG eval harness: groundedness + faithfulness + relevance all ≥ 0.7 on ≥ 8/10 samples
- [ ] Playwright: existing 7 + new 7 = 14 specs all pass
- [ ] Coverage: sales service + repo + router ≥ 80%

### Enterprise signals
- [ ] Every Sales endpoint emits structured logs with correlation_id (verified in test)
- [ ] Every `/ai/explain` call emits a prompt log with token counts, citations, groundedness score
- [ ] OTel spans propagate correlation_id across service boundaries (verified in integration test)
- [x] RBAC middleware returns 403 for unpermitted role+action pairs per the matrix in §10.8 *(Phase η, 2026-04-19)*
- [x] Role selector in top bar visibly hides/shows admin-only UI *(Phase η, 2026-04-19)*
- [ ] PII in prompts is redacted before Ollama call (verified via test)
- [ ] Every AI response has a citation attached per paragraph (guardrail enforced)

### Demo-ready
- [ ] Demo script runs end-to-end without hitting a stub
- [ ] 3 demo scenarios (Sales Mgr, Demand Planner, Revenue Ops) each complete in < 2 min
- [ ] Screenshots captured for each of the 6 screens
- [ ] Architecture diagrams (RAG sequence + Forecast sequence) committed to `docs/diagrams/`

### Policy alignment
- [ ] RAG implementation matches Enterprise AI Policy §3 (hybrid retrieval + reranking + citations + guardrails)
- [ ] Multi-agent structure documented (even if only 1 agent runs now) in `docs/architecture/sales-agent-topology.md`
- [ ] Every generated narrative traces to a source document in the retrieval corpus

---

## 14. Build Phases (split for plan writing)

| Phase | Scope | Effort |
|---|---|---|
| **2a-1-α** | Data: Kaggle download + ingest script + migration + repo | 3h |
| **2a-1-β** | Backend: sales router + forecast service + unit & integration tests | 5h |
| **2a-1-γ** | RAG: corpus + service + router + guardrails + eval harness | 6h |
| **2a-1-δ** | Simulation: service + router + tests + elasticity learn script | 3h |
| **2a-1-ε** | Frontend: ExplainDrawer + 3 new tabs + salesApi.js + KPI tree + enriched OverviewTab | 6h |
| **2a-1-ζ** | Observability: structured logs + prompt logs + OTel spans | 3h |
| **2a-1-η** | RBAC-for-sales: middleware + permission matrix + role selector + tests | 4h |
| **2a-1-θ** | Playwright specs + demo script + screenshots + architecture diagrams | 4h |

**Total: ~34h = 3–4 day build.**

Each phase will become its own implementation plan + subagent-driven execution cycle.

---

## 15. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Kaggle dataset requires credentials that may not be set in the dev env | Script checks env; if missing, prints instructions and exits non-zero |
| Prophet training slow at 1.1M rows × 1115 stores | Only fit on-demand per requested store; cache fitted model in-process |
| Ollama not running / slow | Guardrail timeout → graceful degradation to "explanation unavailable" |
| RAG returns ungrounded response | Citation-required guardrail rejects non-cited responses |
| Build size grows past 2MB | Code-split the 3 new tabs with React.lazy (already noted as Phase 2b concern) |

---

## 16. Decisions Reaffirmed

| Q | Choice |
|---|---|
| Kaggle dataset | Rossmann |
| Backend strategy | Hybrid (real forecast + mock KPIs) |
| Forecast model | Prophet |
| RAG scope | Full — hybrid + rerank + citations + guardrails |
| Scope | Walking skeleton (6 screens, 1 forecast, 1 RAG, 1 simulation) |

---

*End of Sales deep-dive spec. Next step: user approves spec → writing-plans skill drafts the 6 sub-plans (α through ζ) → execute via subagent-driven-development.*
