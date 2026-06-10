# Insurance Catalog — Build Plan

**Owner**: Claude (autonomous loop) · **Operator**: Praveen ·
**Started**: 2026-06-02 · **Status**: In progress

## Goal

A single, end-to-end insurance operations catalog with:

1. **22 departments** (Product, Marketing, Sales, Underwriting, Policy Admin,
   Billing, Claims, SIU, Customer Service, Actuarial, Reinsurance, Compliance,
   Legal, Finance, ERM, HR, Procurement, Data & Analytics, AI/Data Science,
   IT Ops, Cybersecurity, Enterprise AI Governance).
2. **B2B / B2C / B2E channel tag** per process — single nav, multi-channel view.
3. **Process → sub-process tree** with stakeholders, AI capabilities, sample
   data on every leaf.
4. **Downloadable data per process — multi-format**: CSV, JSON, XML, text,
   Word (.docx), PDF, PNG, WAV (audio), MP4 (video). Each process declares
   which formats apply. Samples now; real datasets in Phase 2.
5. **Visualization layer** — Sankey of dept → process → AI capability;
   stakeholder network; KPI cards per dept.
6. **Management decision view** — single-screen scoreboard with ROI, channel
   coverage, top AI capabilities, hot processes.
7. **Bot AI panel** — RAG-backed Q&A over the catalog JSON.
8. **Cron-driven autonomous loop** — regen on schedule, refresh data, run
   drill, emit audit row per global §73/§80.

## The 22 departments + per-dept AI capability map

Source of truth: operator-supplied capability lists for each of the 22 depts
(see `config/build_insurance_catalog.py::DEPTS`). Cross-cutting AIs
(Compliance, Governance, Monitoring, Reporting) are de-duped into the
horizontal registry — every dept references capability ids; the registry
owns name + description + icon.

## Architecture

```
config/build_insurance_catalog.py   ← single editable source (Python)
       │
       ├── writes  config/brand.config.json       (lean nav, 22 depts)
       ├── writes  config/insurance.catalog.json  (deep tree, all processes)
       ├── writes  data/insurance/<dept>/<process>.csv  (~80 sample files)
       └── writes  data/insurance/manifest.json   (download index)
              │
frontend/src/data/insuranceCatalog.js  ← imports the deep JSON
frontend/src/pages/InsuranceCatalogPage.jsx  ← renders the tree
       │
       ├── component DepartmentNode (expandable)
       ├── component ProcessRow (B2B/B2C/B2E badges + stakeholders + download)
       ├── component SubProcessRow
       ├── component CapabilitySankey (Plotly)
       └── component ManagementScoreboard (Recharts KPIs)
       │
backend (existing FastAPI)
       └── /api/v1/insurance/data/<dept>/<process>.csv  (proxy to disk file)
```

## Phases

### Phase 1 — Foundation (this session)
- [x] Generator script with 22 depts + 3 procs each + 2 sub-procs each
- [x] Emits brand.config.json + insurance.catalog.json + ~80 sample CSVs
- [x] Drill locking schema invariants (22 depts, valid channels, every leaf
      has stakeholders + AI + sample data)
- [x] Catalog UI page rendering full tree
- [x] Advanced graph report (sankey + KPI dashboard) on same page
- [x] Bot AI placeholder panel
- [x] Cron installer + scripts/refresh_insurance_catalog.sh

### Phase 2 — Real data (next iteration)
- [ ] Wire `download_kaggle.py` per dept for real public insurance datasets
- [ ] Replace sample CSVs with Kaggle datasets where licenses allow
- [ ] Add data-quality scan per file (row counts, schema validation)

### Phase 3 — Model + decisioning (follow-up)
- [ ] Per-dept ML notebook stub (predictive, fairness, explainability)
- [ ] Decision audit row per management action (per global §38.3)

### Phase 4 — Reporting (follow-up)
- [ ] PDF export per dept (existing pdf-export bundle already in build)
- [ ] Weekly digest cron — email summary of catalog growth + data freshness

### Phase 5 — Bot AI (follow-up)
- [ ] Vector index over insurance.catalog.json + CSV samples
- [ ] Chat tab calls existing agent fleet (council pattern per global §64.43)

## Cron contract

```
0 * * * *   refresh_insurance_catalog.sh  # hourly: regen + drill + audit log
```

Failure escalates via `~/agent_notify.sh` per global §76. No `git push` from
cron (per §42 force-push gate).

## Approvals taxonomy (per global §75.5)

| Action | Cron-safe (auto) | Operator approval needed |
|---|---|---|
| Re-run generator (deterministic) | ✓ | — |
| Regenerate sample CSVs (deterministic) | ✓ | — |
| Run drill (read-only) | ✓ | — |
| Append audit log | ✓ | — |
| Vite rebuild on change | ✓ | — |
| Download Kaggle dataset (idempotent, no PII) | ✓ | — |
| Git commit (autonomous, no push) | ✓ | — |
| Git push to remote | — | ✓ |
| Drop existing CSV (destructive) | — | ✓ |
| Edit operator's data files outside data/insurance/ | — | ✓ |

## Success criteria

1. Operator opens `/insurance-catalog` and sees all 22 depts.
2. Clicking any dept expands processes; each process row has channel chips
   (B2B/B2C/B2E), stakeholder chips, AI-capability chips, **Download CSV** button.
3. Sankey at top shows dept → AI-capability flow density.
4. Management Scoreboard shows top KPIs (process count, AI coverage, channel mix).
5. Bot panel (placeholder) is visible + opens.
6. Drill exits 0 with 15+ invariants green.
7. Cron entry visible in `crontab -l`; tagged with `INSUR-CATALOG`.
8. End-to-end build green.
