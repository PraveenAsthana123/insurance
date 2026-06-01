# Phase 2 Deep-Dive Roadmap — External Review Response

**Date:** 2026-04-19
**Status:** Roadmap (informs future spec documents)
**Source:** external brutal review + deep-dive specs for Depts 6–11
**Scope:** Phase 2+ content that fills the Phase 1 scaffolding. Each major section below becomes its own spec (`docs/superpowers/specs/<date>-<topic>.md`) when scheduled.

---

## 0. Critical fixes — DONE (commit `e6abde3`)

| Bug | Before | After |
|---|---|---|
| Frontend URL mismatch | README said `:5173`, compose bound `:3000` | README lists both (Docker 3000, Vite dev 5173) |
| MLflow URL mismatch | README said `:5000`, compose mapped `5001:5000` | README now says `:5001` |
| CORS blocked local Vite dev | compose allowed only `:3000` | compose allows 3000 + 5173 + 127.0.0.1:5173 |

---

## 1. Headline Focus Strategy

**Do not try to make all 14 departments equally deep.** Reviewer recommendation + my concurrence: pick **3 flagship departments** and build them fully. The other 11 remain scaffolded with Phase 1 stubs.

### Flagship picks (Phase 2a)
1. **Sales & Revenue** — core BEV story
2. **Supply Chain & Logistics** — operational depth
3. **Executive Scorecard** — top-of-funnel, ties everything together

For each flagship, deliver:
- 1 real Kaggle dataset mapping
- 1 full screen sequence (6–8 screens)
- 1 KPI tree
- 1 forecast flow
- 1 AI explanation flow
- 1 simulation scenario
- 1 RBAC mapping
- 1 test pack
- 1 demo script (narrated)

---

## 2. Engineering-Layer Gaps (Phase 2b)

### 2.1 Auth / RBAC (currently underspecified)
Required artifacts:
- User types + role catalog (super-admin, platform-admin, data-admin, ML-admin, dept-analyst, dept-manager, executive-viewer, auditor, demo-user)
- Permission matrix (role × screen × API × dataset × row-level rule)
- JWT/session/token lifecycle diagram
- Service-to-service auth design
- Audit-log schema for access decisions
- Data masking policy

### 2.2 Observability depth
Required:
- Distributed tracing (OpenTelemetry)
- Structured logs (JSON, correlation ID — already wired in middleware)
- Per-endpoint latency / error dashboards
- Celery job monitoring (Flower already in stack)
- Data pipeline freshness monitoring
- Model drift tracking (already partial via MLflow)
- RAG answer quality eval

### 2.3 Testing depth
Current claims exceed evidence. Add:
- Unit test pack (backend per-router, per-service)
- API integration tests (pytest + httpx)
- DB migration tests
- Frontend component tests (Vitest + RTL)
- E2E workflow tests (Playwright — scaffolding added in Phase 1)
- Forecasting pipeline regression tests
- RAG answer-quality evaluation harness

### 2.4 Deployment realism
Add:
- dev / qa / prod env strategy
- Secrets management (doppler / vault / aws secrets manager)
- Health + readiness probes (already added at /api/health)
- Backup + restore runbook
- Scaling strategy for Ollama / Celery / Postgres
- Cost controls

---

## 3. Business Layer — Missing Artifacts

For each flagship dept, produce:

### 3.1 Business artifacts (per dept)
- Business capability map
- User personas (3–5 per dept)
- Department-wise value hypothesis
- KPI dictionary (ID, name, formula, owner, target, breach-action)
- Metric lineage (data → transformation → KPI)
- Business glossary
- Decision calendar (daily/weekly/monthly)
- Alert thresholds
- Exception workflows
- ROI assumptions + expected improvement math

### 3.2 Value math template (per module)
```
Problem:        [concrete pain point]
Current metric: [baseline, e.g. forecast MAPE 22%]
AI intervention: [what changes]
Expected:       [new metric, e.g. MAPE 14%]
Economic value: [$ per year]
```

---

## 4. Functional Decomposition (per dept contract)

Every department module should expose a consistent UI contract:
1. Overview
2. Detail
3. Anomaly view
4. Forecast
5. AI explanation
6. Recommendation
7. Simulation
8. Source data / lineage
9. Action log

Screens already scaffolded in Phase 1 (AdminPage + ManagerPage tabs) partially cover this. Phase 2 content needs to:
- Wire each tab to real data
- Add the drill-down story
- Add the write-back action

---

## 5. Data Layer — Required Deep Work

### 5.1 Data engineering
- Source-to-target mapping (per dept)
- Medallion (bronze/silver/gold) design
- Canonical entities + master data design
- Fact/dimension tables, grain definitions
- SCD (Type 2 where needed)
- Data quality rules + null/late-arrival handling
- Partitioning + indexing strategy
- Refresh schedules
- Lineage (auto + manual)

### 5.2 Demo-data realism
Per flagship dept, create a doc that answers:
- Which Kaggle dataset maps to this dept?
- What was synthesized vs public?
- What assumptions were made?
- Which modules are fully data-backed vs partly mocked?

---

## 6. AI / ML / RAG — Operating Design

### 6.1 ML design (per flagship forecast)
- Target variables
- Feature engineering strategy
- Training dataset window
- Retraining cadence
- Champion / challenger strategy
- Model registry states (MLflow — already in stack)
- Evaluation metrics (MAPE/RMSE + segment-level)
- Drift triggers
- Feature importance narratives
- Forecast explainability (SHAP)

### 6.2 RAG design (per flagship)
- Corpus sources
- Chunking strategy
- Metadata filters (RBAC-aware — maps to Enterprise AI Ref Arch §3)
- Retrieval method (hybrid BM25 + vector)
- Reranking model
- Prompt template
- Grounding policy
- Source citation display
- Hallucination / fallback handling
- Role-based retrieval
- Restricted-document handling
- Eval framework (groundedness, faithfulness, answer-relevance — per Ref Arch §3.5)

### 6.3 AI governance
- AI safety assumptions
- Prompt injection controls
- PII handling
- Confidential data policy
- AI disclaimer strategy
- Human review checkpoints
- Auditability of generated narratives

---

## 7. Demo Design (currently thinnest layer)

### 7.1 Required assets
- 10+ screenshots
- 3 GIF walkthroughs
- 1 architecture diagram (image, not ASCII)
- 1 process-flow diagram
- 1 data-lineage diagram
- 1 role/permission matrix
- 1 sequence diagram — AI explanation flow
- 1 sequence diagram — forecast generation flow
- Sample API request/response collection (Postman / Bruno / .http)
- Seeded demo scenarios

### 7.2 Core screen sequence
```
Login → Role-based landing → Executive overview → Dept selection
  → Dept summary → KPI drill-down → Root-cause → Forecast → AI explanation
  → Alert queue → Scenario simulation → Action/recommendation
  → Report export → Admin / roles → Audit / monitoring
```

### 7.3 Demo stories backlog (per dept)

**Sales & Revenue** — 3 stories
1. Identify revenue drop (KPI ↓ → drill region → AI top 3 causes → action)
2. Forecast future sales (8 weeks + compare vs last year + AI explain trend)
3. Promotion impact (uplift vs margin loss, better-timing suggestion)

**Supply Chain** — 3 stories
1. Stockout risk (HIGH alert → SKU → supplier delay → expedite)
2. Route delay (identify → drill → AI cause → reroute)
3. Inventory optimization (simulate reduction → service-level impact)

**Demand Forecasting** — 3 stories (forecast vs actual, model comparison, spike detection)

**Marketing & Promotions** — 3 stories (campaign ROI, promotion optimization, budget simulation)

**Retail / Channel** — 3 stories (channel perf compare, store-level drill, shelf performance)

**Product / Innovation** — 3 stories (launch track, SKU rationalization, cannibalization)

**Finance** — 3 stories (margin analysis, trade spend, price-vs-volume simulation)

**Customer / Shopper** — 3 stories (segmentation, basket affinity, churn risk)

**Manufacturing / Quality** — 3 stories (defect analysis, line efficiency, recall simulation)

**HR / Workforce** — 3 stories (attrition prediction, workforce planning, productivity)

**Executive** — 3 stories (weekly review, strategy simulation, risk detection)

---

## 8. Dept 11 — Governance, Risk & Compliance (GRC) — NEW DEPT CANDIDATE

Reviewer proposes adding a 15th dept (if counting from existing 14 including Phase 1 additions): **Governance, Risk & Compliance**.

### 8.1 Why
Without GRC, every other module is a demo. With GRC, it becomes production-ready.

### 8.2 Screens (6)
1. Governance Command Center — data quality score, model perf, risk, compliance, AI trust
2. Data Governance — lineage, quality issues, source traceability
3. Model Governance — versions, accuracy trend, drift, retraining
4. Risk Monitoring — op/financial/supply/AI risks
5. Access & Security — roles, permissions, access logs
6. Audit Trail — who did what, when, simulation logs

### 8.3 AI
- ML: risk detection, data-quality monitoring, drift detection
- DL: advanced anomaly detection
- NLP: policy analysis, audit summarization
- **RAG (critical)**: corpus = governance policies + compliance rules + audit docs

### 8.4 Governance model (full)
- Data governance: lineage, validation, ownership
- Model governance: versioning, monitoring, retraining
- AI governance: explainability, bias, transparency
- Security governance: RBAC, ABAC, audit logs
- Compliance: regulatory adherence, audit readiness

### 8.5 Decision
**Recommendation:** add GRC as 15th dept in Phase 2 (separate spec), because it's load-bearing for enterprise credibility. Needs user approval before adding to `departments.js`.

---

## 9. Dept 10 — Executive / Strategy Dashboard (highest-value deep-dive)

### 9.1 Why it matters most
Ties all 14 departments into one decision system. Executives care about this.

### 9.2 Screens (6)
1. Executive Command Center (unified KPIs)
2. Risk & Opportunity Panel (top-5 + top-5)
3. Cross-Department Drill Down
4. **AI Narrative** (auto-generated weekly summary)
5. Strategy Simulator (adjust drivers → profit/growth/risk)
6. Decision Dashboard (recommended actions + expected impact + confidence)

### 9.3 AI
- ML: cross-domain prediction, risk prediction
- NLP: narrative generation
- **RAG (critical)**: retrieve multi-department data → generate insight

### 9.4 Decision models
- Scenario planning (price × cost × marketing)
- Optimization (maximize profit)
- Risk-reward

---

## 10. Depts 6–9 Deep-Dive Specs (condensed)

### 10.1 Marketing & Promotions (Dept 6)
- Screens: Command Center, Campaign Perf, Targeting, **GenAI Content Generator**, Optimization, Simulator
- AI: response prediction, targeting, ROI prediction, **GenAI content** (ads/emails/banners), sentiment, topic extraction, **RAG over past campaigns**
- Decision models: budget allocation, campaign optimization, multi-armed bandit
- Statistical: conversion rate, ROI, A/B, uplift modeling

### 10.2 Retail / Channel (Dept 7)
- Screens: Channel Center, Store Performance, **Shelf Intelligence (CV)**, Pricing Intelligence, Promotion Impact
- AI: store perf prediction, channel optimization, price elasticity, **Computer Vision** for shelf/planogram/out-of-stock, NLP for store feedback
- Decision: pricing optimization, channel allocation, store improvement plan

### 10.3 Product / Innovation (Dept 8)
- Screens: Product Center, Lifecycle View, SKU Ranking, **Cannibalization Matrix**, **Innovation Lab (GenAI)**
- AI: product scoring, lifecycle classification, cannibalization detection, success prediction, **GenAI idea generation**, NLP review analysis
- Decision: portfolio optimization, launch decision, feature selection

### 10.4 HR / Workforce (Dept 9)
- Screens: Workforce Center, **Attrition Risk**, Workforce Planning, Productivity, **AI HR Assistant**, Scenario Sim
- AI: attrition prediction, workforce forecasting, productivity analysis, **NLP resume parsing**, feedback/exit-interview analysis
- Decision: hiring, retention, workforce optimization
- Governance: fairness, bias, privacy

---

## 11. Simulation / What-If — Major Missing Capability

### 11.1 Scenarios to support (per dept)
- Sales: price increase vs volume
- Supply Chain: supplier delay vs service level
- Marketing: budget reallocation vs ROI
- Product: new SKU launch vs cannibalization
- Finance: price increase vs volume loss
- Workforce: reduction vs productivity loss

### 11.2 Simulator screen pattern
```
choose module → select baseline → adjust drivers → run scenario
 → compare outputs → view impact waterfall → AI narrative → save/share
```

---

## 12. RBAC — Full Spec (Phase 2b priority)

### 12.1 Minimum roles (9)
super-admin, platform-admin, data-admin, ML-admin, dept-analyst, dept-manager, executive-viewer, auditor, demo-user

### 12.2 Authorization layers (5)
1. UI navigation level
2. API route level
3. Service / business-rule level
4. Data row/column level
5. AI retrieval / document level

### 12.3 Required artifacts
- Role–permission matrix
- Auth sequence diagram
- Token lifecycle diagram
- Access audit log schema
- Data masking policy

---

## 13. Scorecard — Current Reviewer Assessment

| Dimension | Score |
|---|---|
| Architecture thinking | 8/10 |
| Repo credibility | 6/10 |
| Business articulation | 6.5/10 |
| Functional completeness | 5.5/10 |
| Demo readiness | 4.5/10 |
| Data realism | 5.5/10 |
| AI/RAG trustworthiness | 5/10 |
| Authorization/governance maturity | 4.5/10 |

**Target after Phase 2a (3 flagships done):** all scores ≥ 7/10.
**Target after Phase 2b (cross-cutting concerns):** all scores ≥ 8/10.

---

## 14. Phase 2 Work Breakdown (proposed)

| Phase | Scope | Deliverable |
|---|---|---|
| **2a-1** | Sales & Revenue deep-dive | 6 screens + Kaggle mapping + forecast + RAG + simulation + RBAC + tests + demo script |
| **2a-2** | Supply Chain deep-dive | same 8-artifact pattern |
| **2a-3** | Executive Scorecard deep-dive | same 8-artifact pattern |
| **2b-1** | RBAC + auth lifecycle (cross-cutting) | full spec + backend implementation + UI wiring |
| **2b-2** | Observability (tracing + dashboards + eval) | OTel + Grafana + eval harness |
| **2b-3** | GRC dept (if approved) | dept 15 with 6 screens + AI governance |
| **2c** | Demo assets (screenshots, diagrams, GIFs, API collection) | credibility polish |

Each bullet above becomes its own spec + plan + execution cycle.

---

## 15. Immediate Next Step

User chooses one of:
1. Start **Phase 2a-1 — Sales & Revenue deep-dive** (brainstorm → spec → plan → execute)
2. Start **Phase 2b-1 — RBAC / auth** (cross-cutting; unblocks enterprise credibility)
3. Start **Phase 2c — Demo assets** (screenshots + architecture diagram + API collection; fastest wins)
4. Add **GRC as 15th dept** first (small scaffolding extension)
5. Finalize Phase 1 first — open PR on `feature/phase1-admin-manager-hubs`, merge, then pick from 1–4

Recommendation: **5 → 3 → 1** (merge Phase 1, polish demo credibility, then deep-dive Sales).
