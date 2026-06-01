# Customer Analytics — Pilot Depth Push

**Hypothesis:** Pushing significantly more process-depth into ONE dept (while leaving 13 others at baseline) will produce measurably better transformation outcomes. This plan instruments the experiment.

**Constraint:** **Zero changes to any other department.** Every modification is scoped to `dept === 'customer'` filters, customer-specific files, or customer-specific corpus. Other depts' tabs, data counts, and tests must remain identical.

**Duration guide:** ~4-6h of subagent work.

---

## Deliverables (pilot scope — customer only)

### 1. Data enrichment
- **New:** `data/customer-analytics/ibm_telco_churn.csv` — IBM Telco Churn dataset (~7 k rows; via Kaggle `blastchar/telco-customer-churn` or equivalent public mirror)
- **New:** `backend/migrations/012_customer_pilot.sql` — tables: `dim_customer_pilot`, `fact_customer_interaction`, `fact_churn_label`. Indexed for segment + tenure lookups.
- **New:** `scripts/ingest_customer_telco.py` — mirrors ingest_rossmann.py / ingest_supply_chain.py pattern.

### 2. Real ML churn model (replaces ChurnRiskTab mock data)
- **New:** `backend/services/churn_model_service.py` — trains scikit-learn XGBoost + LogisticRegression ensemble on first request, caches in-process. Backtest AUC + precision@top10% stored.
- **New:** `backend/services/segmentation_service.py` — K-means clustering on {tenure, monthly_charges, service_count} → 4 canonical segments ("At-Risk", "Loyal High-Value", "New Adopters", "Lapsers").
- **New:** `backend/services/ltv_service.py` — CLV computation using BG/NBD-lite heuristic (simplified from lifetimes package to avoid new dep).

### 3. New customer-specific endpoints
```
POST /api/v1/customer/churn-predict   # {customer_id} → {probability, top_drivers, segment, ltv}
GET  /api/v1/customer/segments         # 4 segments with population + mean metrics
POST /api/v1/customer/cohort-analysis  # {cohort_month} → retention curve
GET  /api/v1/customer/ltv-distribution # histogram buckets
```

### 4. Expanded catalog entries (customer only)
- `aiUseCases.js` — add **+10 customer use cases** (current: 5 → target: 15). New categories: Segmentation, CLV, Cohort Analysis, Sentiment, Next-Best-Action, Retention Campaign, Voice-of-Customer NLP, Cross-sell Graph, Loyalty Prediction, Journey Stage.
- `workflows.js` — add **+15 customer enhancement processes** (current: ~14 → target: ~30). Mix across all 4 roles.
- `roles.js` — deepen customer's 4 role entries (more responsibilities + KPIs + reports).

### 5. Two new live Manager tabs (customer-specific, mirror Sales/SC pattern)
- **SegmentationTab** — shows 4 segments with radar chart, drill-in shows top 20 customers per segment
- **CohortAnalysisTab** — retention curve heatmap (months since join × retention %)

(ChurnRiskTab already exists — upgrade it from mock to hitting `/churn-predict`.)

### 6. RAG corpus specifically for Customer
- **New:** `data/customer-context/*.md` — 4 files:
  - `churn-playbook.md` (industry retention patterns + when to intervene)
  - `segmentation-methodology.md` (RFM, K-means, behavioral segmentation)
  - `ltv-calculation-guide.md` (BG/NBD, Gamma-Gamma, simplified formulas)
  - `nps-interpretation.md` (detractor routing, promoter leverage, industry benchmarks)
- Register corpus in RAG service (use existing selector — `corpus: 'customer'`)

### 7. RBAC extension for customer endpoints
- Add entries to `PERMS_MATRIX`:
  - `GET /customer/segments`, `POST /customer/churn-predict`, `POST /customer/cohort-analysis`, `GET /customer/ltv-distribution` → all 4 roles
  - No manager-only routes for this pilot (customer analytics is view-focused, not action)

### 8. Observability hooks (automatic via existing middleware + per-service emit_event)
- `customer.churn.predict` — customer_id, probability, segment, top driver count
- `customer.segmentation.run` — k, silhouette score
- `customer.ltv.compute` — bucket, cohort_size

### 9. Pilot measurement doc (the point of the experiment)

**New:** `docs/pilots/customer-analytics-pilot-metrics.md` with before/after table:

| Metric | Baseline (pre-pilot) | Post-Pilot (target) | Other 13 depts (control) |
|---|---:|---:|---:|
| Live dept-specific Manager tabs | 1 (ChurnRisk, mock) | 3 (ChurnRisk real + Segmentation + Cohort) | 0 for most |
| Backend ML services | 0 | 3 (churn, segmentation, LTV) | 0 for most |
| AI use cases | 5 | 15 | 5 avg |
| Enhancement workflows | ~14 | ~29 | ~14 avg |
| Corpus files | 0 dept-specific | 4 | 0 dept-specific |
| Live endpoints | 0 customer-only | 4 | 0 (except Sales 4 + SC 5) |
| Model AUC on real data | N/A | ≥ 0.80 (IBM Telco benchmark) | N/A |
| AI Explain citations from dept corpus | 0 | 3+ per query | 0 |
| **Demo scenarios** | 0 | 3 narrated | 0 for most |
| **Screenshots** | 1 (ChurnRiskTab mock) | 4+ (new tabs, model output) | varies |

Plus qualitative:
- Can a Customer Manager end-to-end answer "which 50 customers should we call today?" with data + reasoning + citations? (pre: no; post: yes)
- Does the real churn model meaningfully rank customers vs mock random? (measure precision@top10% vs random baseline)

### 10. Demo walkthrough
- **New:** `docs/demo/customer-analytics-walkthrough.md` — 3 scenarios:
  1. Segmentation review (Customer Manager lands on SegmentationTab, identifies shrinking "Loyal High-Value" segment)
  2. Retention targeting (drills ChurnRisk → top-20 at-risk → exports for outreach)
  3. Cohort health (CohortAnalysisTab — January 2024 cohort's 6-month retention cratered; AI Explain cites NPS detractor spike)

---

## Isolation guarantees (quality bar)

Every change must pass these checks:

- [ ] `git diff main..HEAD -- frontend/src/components/dept-tabs/OverviewTab.jsx` shows NO changes to non-customer sections
- [ ] `git diff main..HEAD -- frontend/src/pages/ManagerPage.jsx` only adds customer-specific tabs under the `dept.id === 'customer'` branch
- [ ] `aiUseCases.js` only adds entries where `dept === 'customer'` (verify: pre-count non-customer entries, post-count identical)
- [ ] `workflows.js` only adds entries where `dept === 'customer'`
- [ ] `roles.js` only modifies the `customer: { ... }` block; other dept blocks byte-identical
- [ ] Other 13 depts' backend tests, Playwright tests, and rendered UI unchanged

Easy way to verify: run `git diff` + confirm `-dept: '<not-customer>'` lines are zero.

---

## Execution plan

Single subagent wave (aggressive scope but cohesive). Commits structured:

1. `feat(data): ingest IBM Telco churn — migration + script + dim/fact tables` (customer-only)
2. `feat(service): churn_model_service — XGBoost + logistic on Telco data`
3. `feat(service): segmentation + LTV services`
4. `feat(router): /api/v1/customer/* endpoints (4) + RBAC matrix entry`
5. `feat(data): +10 customer use cases, +15 workflows, deepened role entries`
6. `docs(data): customer-context RAG corpus (4 markdown files)`
7. `feat(ui): upgrade ChurnRiskTab to live model + add SegmentationTab + CohortAnalysisTab`
8. `test(customer): unit + integration + RAG corpus tests`
9. `test(e2e): customer pilot screenshots (3 new)`
10. `docs(pilot): customer analytics pilot metrics + walkthrough`

## Isolation tests (to run after every batch)

```bash
# Non-customer tab content should not change.
git diff main.. frontend/src/components/ -- ':!frontend/src/components/manager-tabs/customer*' | wc -l
# Expected: small (ManagerPage.jsx conditional branch only)

# Count non-customer use cases before/after
node -e "const m=require('./frontend/src/data/aiUseCases.js'); console.log(m.aiUseCases.filter(u=>u.dept!=='customer').length)"
# Expected: identical to pre-pilot count (currently ~72)

# Other depts' tests pass
python -m pytest backend/tests/ --ignore=backend/tests/eval | tail -3
# Expected: no regressions
```

## Completion criteria

- [ ] 10 commits landed on feature branch
- [ ] `docs/pilots/customer-analytics-pilot-metrics.md` has real post-pilot numbers populated
- [ ] Churn model trained; precision@top10% measured and recorded
- [ ] Customer Manager page shows 10 tabs (7 base + 3 customer-specific) — matching Sales/SC pattern
- [ ] RAG `corpus=customer` returns grounded answers citing customer-context files
- [ ] Other 13 depts bit-identical in behavior
- [ ] Demo walkthrough 3 scenarios ready

## Risks

| Risk | Mitigation |
|---|---|
| Accidentally mutate non-customer data | Use `filter + concat` instead of mutating arrays; verify with pre/post counts |
| XGBoost/scikit-learn model too slow | Cache fitted model in-process (same pattern as ForecastService) |
| IBM Telco dataset has different column names than plan expects | Script uses `r.get(...)` pattern from Sales α to tolerate variations |
| Playwright screenshots break due to live model latency | Use skeleton-first rendering (same pattern as Sales Overview) |
