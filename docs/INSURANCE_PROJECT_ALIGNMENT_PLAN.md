# Insurance Project Alignment Plan

Single control surface for the insurance operating model: departments × channels × stakeholders × processes × data × AI capabilities × role-aware bot UI × governance.

## Scope (6 departments, 3 channels)

| Department | B2C | B2B | B2E |
|---|---|---|---|
| Sales and Distribution | ✓ | ✓ | ✓ |
| Underwriting | ✓ | ✓ | — |
| Policy Servicing | ✓ | ✓ | ✓ |
| Claims | ✓ | ✓ | — |
| Finance and Billing | ✓ | ✓ | ✓ |
| Risk, Compliance and Audit | — | ✓ | ✓ |

## Stakeholders per department

| Department | Stakeholders |
|---|---|
| Sales and Distribution | Prospect, Agent, Broker, Employer HR, Relationship manager |
| Underwriting | Underwriter, Medical reviewer, Applicant, Agent, Reinsurer |
| Policy Servicing | Policyholder, Servicing agent, Operations user, Employer admin |
| Claims | Claimant, Adjuster, Provider, Surveyor, Fraud analyst, Finance |
| Finance and Billing | Customer, Finance analyst, Agent, Employer payroll, Bank partner |
| Risk, Compliance and Audit | Compliance officer, Auditor, Regulator, DPO, Model risk committee |

## Sub-process maps

- **Sales and Distribution**: Lead capture → Needs analysis → Quote comparison → Proposal → Cross-sell
- **Underwriting**: Eligibility → Risk scoring → Document verification → Referral → Bind decision
- **Policy Servicing**: Policy issue → Endorsement → Renewal → Cancellation → Beneficiary change
- **Claims**: FNOL → Coverage check → Triage → Adjudication → Settlement → Recovery
- **Finance and Billing**: Premium billing → Collection → Commission → Refund → Reconciliation
- **Risk, Compliance and Audit**: KYC/AML → Consent audit → Regulatory reporting → Model governance → Incident review

## Data taxonomy (6 classes)

| Class | Insurance examples | Governance |
|---|---|---|
| Master | Customer, policy, product, agent, provider, employer, branch, region | Owner / source / quality / retention / privacy |
| Conditional | Eligibility rules, underwriting conditions, exclusions, riders, risk appetite | Same |
| Organization | Department, role, authority limit, SLA, queue, branch, approval hierarchy | Same |
| Product | Plan, premium, coverage, benefits, exclusions, commission, renewal terms | Same |
| Transactional | Quote, application, policy event, claim event, payment, endorsement, complaint | Same |
| Evidence | Documents, images, medical records, call transcripts, emails, audit artifacts | Same |

## AI catalog (13 capability types)

Transactional AI · Decision AI · Analytical AI · Explainable AI · Responsible AI · Ethical AI · Secure AI · Governance AI · Performance AI · Comparison AI · Verification AI · Generative AI · Conversational AI.

## Role-aware bot UI

Six bot personas, single shell, shared audit/explain/verify actions:

- Customer Bot — eligibility, quote, policy lookup, claim status
- Agent Bot — pipeline, quote builder, recommendation, cross-sell
- Underwriter Bot — risk score, exception lookup, referral routing
- Claims Bot — FNOL intake, coverage check, fraud signal, settlement worksheet
- Compliance Bot — KYC, consent, regulatory mapping, model-card lookup
- Manager Bot — KPI rollup, queue health, override audit

## Surfaces

| Surface | Path | Purpose |
|---|---|---|
| UI route | `/insurance` ([frontend/src/pages/InsurancePage.jsx](../frontend/src/pages/InsurancePage.jsx)) | Renders 6 dept cards + data taxonomy + AI catalog + bot shell + audit panel + blueprint sections (business models / AI×model matrix / maturity / phases / 20 missing layers / autonomous org / closed loop) |
| Blueprint (source of truth) | [data/insurance/blueprint.json](../data/insurance/blueprint.json) | One JSON drives the audit, the UI, and the drill (per global §59 MDD) |
| Styling | [frontend/src/styles/insurance.css](../frontend/src/styles/insurance.css) | Maps to project's existing `--bg-card / --accent-primary / --spacing-*` vars |
| Sidebar entry | [frontend/src/components/Sidebar.jsx](../frontend/src/components/Sidebar.jsx) — "Insurance Alignment" nav-item | Top-level nav next to Insurance Catalog |
| Audit script | [scripts/insurance_alignment_audit.py](../scripts/insurance_alignment_audit.py) | Deterministic coverage + blueprint check; writes JSON + MD to `jobs/reports/insurance/` |
| Cron installer | [scripts/install_insurance_alignment_cron.sh](../scripts/install_insurance_alignment_cron.sh) | Hourly cron, idempotent reinstall |
| Reports | `jobs/reports/insurance/insurance_alignment_{stamp,latest}.{json,md}` | Latest is the read-current surface |
| Log | `jobs/logs/insurance_alignment_cron.log` | Cron stdout/stderr tail for triage |
| Vite middleware (dev) | [frontend/vite.config.js](../frontend/vite.config.js) — `insuranceAuditServer` + `insuranceBlueprintServer` | Serves `/insurance-audit/*` ← `jobs/reports/insurance/` and `/insurance-blueprint` ← `data/insurance/blueprint.json` |
| Drill | [tests/drills/drill_insurance_alignment.py](../tests/drills/drill_insurance_alignment.py) | 93 invariants (positive + negative across audit + blueprint + per-dept + state-file) |
| State init script | [scripts/insurance_init_state.py](../scripts/insurance_init_state.py) | Idempotent generator for state files; reads blueprint, adds new keys without overwriting operator-set values |
| State files | [data/insurance/capability_status.json](../data/insurance/capability_status.json) · [maturity_state.json](../data/insurance/maturity_state.json) · [implementation_state.json](../data/insurance/implementation_state.json) | Operator-editable status / maturity / progress tracking — drives UI status pills + maturity chips + implementation checklist |
| State middleware | `insuranceStateServer()` plugin in [frontend/vite.config.js](../frontend/vite.config.js) | Serves `/insurance-state/<file>.json` ← `data/insurance/*` in dev |
| Workforce rollup script | [scripts/insurance_workforce_rollup.py](../scripts/insurance_workforce_rollup.py) | Reads audit + state files + cron log → writes `data/work_tracker/insurance_alignment.json` |
| Setup-all script | [scripts/insurance_setup_all.sh](../scripts/insurance_setup_all.sh) | One command: init state → audit → cron install → rollup → drill → vite build. 6 stages, idempotent. Pre-approved. `--skip-build` flag available. |

## Audit invariants

The audit script (`insurance_alignment_audit.py`) writes 50 check rows in two groups.

### Department × channel × data × AI alignment (27 rows)

1. Each department lists ≥ 1 channel
2. Each department lists ≥ 1 stakeholder
3. Each department lists ≥ 1 data class
4. Each department lists ≥ 1 AI capability
5. Enterprise covers all 3 channels (B2C / B2B / B2E)
6. Enterprise covers all 6 data classes
7. Enterprise covers all 13 AI capability types

### Autonomous-insurance blueprint (69 rows)

8. `blueprint.json` exists and parses
9. All 3 business models present (B2C / B2B / B2E)
10. Per business model: objective + departments + agents + data sources + human-less flow each present
11. Maturity ladder covers L0..L6 (7 levels)
12. Implementation phases = exactly 5
13. Missing-AI-capability list = exactly 20
14. Autonomous org has exactly 15 executives
15. Closed loop has exactly 10 steps
16. AI × business-model matrix has 17 rows × 3 models with ratings in {High, Medium, Low}
17. AI opportunities matrix has ≥ 140 rows (currently 147)
18. Every opportunity row has `ai_type` + `scenario` populated
19. Every opportunity `ai_type` is unique
20. Top-20 ROI list has exactly 20 rows
21. Top-20 ranks are 1..20 with no duplicates
22. Every top-20 row has `department` populated
23. Enterprise architecture has exactly 13 layers
24. Every arch layer has mission + inputs + outputs + missing_ai populated
25. Top-50 missing AI list has exactly 50 rows
26. Top-50 entries are unique
27. Enterprise missing layers has exactly 20 rows
28. Every enterprise missing layer has `layer` + `purpose`
29. Department catalog covers depts **15 / 16 / 17 / 18 / 19 / 20 / 21 / 22** (8 depts, 146 processes)
30. Per dept: mission + processes + channel_scenarios + systems + data_sources + agents + human_less_workflow + kpi_improvements + top_missing_capabilities each present
31. Per dept: every process row has `name` + ≥1 AI opportunity
32. Per dept: channel_scenarios cover B2C / B2B / B2E

### Department catalog inventory

| Dept | Name | Processes | Agents | KPIs |
|---|---|---|---|---|
| 22 | Product Management, Innovation & Digital Products | 16 | 10 | 7 |
| 21 | Sales, Distribution, Broker, Agency & Partner Management | 18 | 11 | 7 |
| 20 | Cybersecurity, Identity & Fraud Defense | 22 | 12 | 7 |
| 19 | Information Technology (IT), Cloud, Infrastructure & Platform Engineering | 22 | 13 | 7 |
| 18 | Data, Analytics & Enterprise Intelligence | 18 | 11 | 7 |
| 17 | Procurement & Vendor Management | 15 | 12 | 7 |
| 16 | Human Resources (HR), Learning & Workforce Management | 18 | 12 | 7 |
| 15 | Enterprise Risk Management (ERM) | 17 | 12 | 7 |
| **Total** | **8 of 22** | **146** | **93** | **56** |

Remaining depts to encode: 1–14 (operator paste of dept 14 was truncated mid-FP&A row; awaiting full content + depts 1–13).

## End-to-end setup

```bash
bash scripts/insurance_setup_all.sh           # full setup with build
bash scripts/insurance_setup_all.sh --skip-build  # 5 stages, skip vite build
```

The script runs **6 idempotent stages**:

1. **State init** — `insurance_init_state.py` ensures capability_status / maturity_state / implementation_state JSONs exist with current schema; never overwrites operator-set values
2. **Audit** — exits non-zero if any of the **158** check rows is red
3. **Cron install** — refreshes the two hourly entries (audit at :12, rollup at :13); idempotent
4. **Work-tracker rollup** — writes `data/work_tracker/insurance_alignment.json` for the global dashboard
5. **Drill** — runs **93** positive + negative invariants; exits non-zero on any red
6. **Vite build** — production build; skip with `--skip-build`

Status banner lists canonical paths for audit report, both cron logs, blueprint, state files, rollup, plan doc, and UI route.

Pre-approved invocations (per `.claude/settings.local.json`):

- `Bash(bash scripts/insurance_setup_all.sh*)`
- `Bash(scripts/insurance_setup_all.sh*)`
- `Bash(bash scripts/install_insurance_alignment_cron.sh*)`
- `Bash(crontab -l*)`

No prompt required to run any of these.

## Cron schedule

| Minute | Job | Output |
|---|---|---|
| `12 * * * *` | `insurance_alignment_audit.py` | `jobs/reports/insurance/insurance_alignment_{stamp,latest}.{json,md}` + `jobs/logs/insurance_alignment_cron.log` |
| `13 * * * *` | `insurance_workforce_rollup.py` | `data/work_tracker/insurance_alignment.json` + `jobs/logs/insurance_workforce_rollup_cron.log` |

The 1-minute offset ensures the rollup reads the audit's just-written JSON.

## State files (operator-editable)

| File | Schema | Purpose |
|---|---|---|
| `data/insurance/capability_status.json` | `{statuses: {<name>: {status, notes}}}` | Set status for 162 capability names (20 missing + 13 arch layers + 20 enterprise missing + 50 top-50 + ~80 per-dept top missing) |
| `data/insurance/maturity_state.json` | `{depts: {<id>: {current_level, name, notes}}}` | Per-dept maturity level L0..L6 (currently 8 depts: 15..22) |
| `data/insurance/implementation_state.json` | `{current_step_index, total_steps, step_status: {<name>: {status, notes}}}` | Position in the 12-step ramp + per-step status |

Valid status vocab: `planned` · `in-progress` · `live` · `deferred`. Valid maturity vocab: `L0`..`L6`. Drill enforces both.

## UI surface (current)

The `/insurance` page now renders **18 sections** in this order:

1. KPI grid (depts/channels/data/AI counts) + audit-panel
2. Departments (6-dept alignment cards)
3. Data taxonomy (6 classes × insurance examples × governance)
4. AI catalog (13 capability pills)
5. Bot UI (6-tab shell + sample chat + action buttons)
6. Business models (B2C/B2B/B2E cards)
7. AI × business-model matrix (17 rows × 3 channels with rating chips)
8. Maturity ladder (L0..L6 table)
9. Implementation phases (5-phase cards)
10. **Implementation sequence checklist** (12 steps with current-step ▶ highlight + per-step status pill — driven by `implementation_state.json`)
11. 20 missing capabilities (cards with status pills)
12. Autonomous org structure (15 executives → departments)
13. Closed loop (10-step grid)
14. Top 20 ROI (click any row → scrolls to dept catalog; each row carries status pill)
15. Enterprise opportunities matrix (147 rows, filterable)
16. Enterprise architecture (13 layers with per-layer status + status-pilled missing AI inline)
17. Enterprise missing layers (20 rows with status pills)
18. Top 50 missing AI (filterable pill grid)
19. **Department catalog** (8 collapsible deep-dive cards, each with a colored maturity chip and per-capability status pills on top-missing)

Sidebar **"Insurance Alignment"** expands to 18 deep-link sub-items (one per section).

Exit 0 = green. Exit 1 = at least one red row (logged + visible in latest MD report).

## Autonomous-insurance blueprint

The `/insurance` route additionally renders 6 derived sections from
[data/insurance/blueprint.json](../data/insurance/blueprint.json):

- **Business models** — B2C (customer-facing), B2B (broker / employer / corporate), B2E (employee-facing). Each lists autonomous departments + agents + data sources + human-less flow.
- **AI × business model matrix** — 17 AI capabilities (Conversation, Search, RAG, Agentic, Predictive, Pricing, Underwriting, Claims, Fraud, Contract, HR, Compliance, Governance, Incident, Security, Knowledge, Workflow) rated High/Medium/Low per channel.
- **Maturity ladder** — L0 manual → L1 assistant → L2 copilot → L3 agent → L4 multi-agent department → L5 autonomous department → L6 self-learning department.
- **Implementation phases** — Phase 1 Content AI → 2 Employee Self-Service → 3 Incident → 4 Policy → 5 Human-Less Claims. Plus the 12-step recommended enterprise sequence (Content → Search → RAG → Self-Service → Incident → Policy → Claims → Underwriting → Fraud → Multi-Agent → Autonomous → Self-Learning).
- **20 missing AI layers** — Goal AI, Decision AI, Planning AI, Orchestration AI, Supervisor AI, Self-Healing AI, Organizational Memory AI, Learning AI, Simulation AI, Trust AI, Economic AI, Governance AI, AI COO, AI CFO, AI CRO, AI Chief Underwriter, AI Claims Director, AI Chief Compliance Officer, AI Security Operations Center, Meta-AI Layer.
- **Autonomous org structure** — 15 AI executives (CEO, COO, CFO, CRO, CMO, CUO, Claims Director, Compliance Officer, Security Officer, Data Officer, Knowledge Officer, Agent Manager, Auditor, Trainer, Planner) each tied to an autonomous department.
- **Closed loop** — Goals → Planning → Decision → Execution → Monitoring → Learning → Governance → Self-Healing → Economic Optimization → Continuous Improvement.
- **Top 20 ROI** — ranked AI opportunities tied to department (Claims Fraud, Claims Automation, Underwriting, Customer Service, Employee Self-Service, Regulatory Compliance, Claims Document, Pricing, Renewal Retention, Fraud Investigation, Reconciliation, Vendor Risk, Knowledge Management, Agentic Claims, Agentic Underwriting, AI Security, Enterprise Knowledge Graph, Digital Twin, Decision Intelligence, Enterprise Orchestration). Top-5 highlighted green, top-10 amber.
- **Enterprise AI opportunities matrix** — 147 AI types × insurance scenario, filterable search (try `fraud`, `claims`, `RAG`, `agentic`). Scrollable table with sticky headers.
- **Enterprise architecture (Level 2)** — 13-layer stack (CEO AI · COO AI · Knowledge Graph · Memory · Digital Twin · Event Mesh · AgentOps · LLMOps · AI Security · AI Governance · AI Observability · Decision Intelligence · Command Center). Each card carries mission + inputs + outputs + missing AI.
- **Enterprise missing layers** — 20-row table mapping each enterprise-wide missing AI layer to its operating purpose (CEO AI / COO AI / CFO Platform / CRO Platform / CDO Platform / Knowledge Graph / Memory / Digital Twin / Multi-Agent Orchestrator / AgentOps / LLMOps / AI Security / AI Compliance / AI Audit / Trust / AI FinOps / AI Observability / Autonomous Decision / Command Center / Self-Evolving Enterprise).
- **Top 50 missing AI** — filterable pill grid of the 50 "humanless insurance" gaps (CEO AI → Self-Evolving Enterprise AI). Position number shown per pill.
- **Department catalog (22-of-22 deep dive)** — expandable cards for Dept 20 (Cybersecurity) · Dept 21 (Sales/Distribution) · Dept 22 (Product Mgmt/Innovation). Collapsed: mission + L1 process list + B2C/B2B/B2E scenarios + agents + systems + workflow. Expanded: full per-process issues + AI opportunities table, KPI improvement table, top-missing-capabilities pills. Dept 22 has 16 processes; Dept 21 has 18; Dept 20 has 22 processes — total **56 process rows** drilled.

## Scheduled run

Hourly at minute 12:

```bash
bash scripts/install_insurance_alignment_cron.sh
```

Per global §61, the cron line invokes the project's venv interpreter via absolute path (`/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python`).

## Ad-hoc run

```bash
/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python scripts/insurance_alignment_audit.py
cat jobs/reports/insurance/insurance_alignment_latest.md
```

## Composes with

- Global §38 (AI governance) — audit row schema applies to every Decision/Verification/Governance AI tile rendered on the page.
- Global §43 (drill discipline) — this audit script IS the deterministic drill for the alignment surface; add a paired negative-assertion drill under `tests/drills/drill_insurance_alignment.py` when modifying the dept set.
- Global §47 (architecture) — the data taxonomy maps to C4 L4 (per-department data store boundaries).
- Global §48 (explainability) — Explainable AI tile must surface SHAP or counterfactual per the Underwriting / Claims decision audit row.
- Global §59 (TDDD/DDD/ORF/MDD) — the audit script is MDD: a single Python dict (`DEPARTMENTS`) is the model; the UI page and the audit checks are both derivations of it.
- Global §61 (Python venv) — cron + ad-hoc both invoke via absolute interpreter path.

## Highest-priority follow-ups

1. Add a `tests/drills/drill_insurance_alignment.py` with ≥ 3 negative assertions (e.g., "removing B2E from Sales fails the channel-coverage check") to lock the audit invariants per §43.
2. Wire the `Decision AI` / `Verification AI` / `Explainable AI` tiles in the UI to live backend endpoints once `/api/v1/explain`, `/api/v1/sim`, and `/api/v1/scorecard` are wired.
3. Surface the `insurance_alignment_latest.md` report inline on the `/insurance` page so the audit verdict is visible without leaving the UI.
4. Add this audit as one entry in the work-tracker (`data/work_tracker/latest.json` → `cron_logs.insurance_alignment.log`) so the per-project status dashboard rolls it up.
