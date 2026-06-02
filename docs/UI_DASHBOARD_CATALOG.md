# UI Dashboard Catalog — Top-1% Enterprise AI Platform

> **Status:** Phase 1 of 7 expanded — Phases 2-7 listed at table-of-contents level.
> **Convention:** one phase per commit; "Top 1% additions" called out inline.
> **Mapping:** every dashboard cross-references the backend surface it reads from
> (§68 Observability Hub endpoints, §56 Stage-1 adapters, §66 insur/* federated reads, etc.).

## Index — the 7 phases

| # | Phase | Owner | Status |
|---|---|---|---|
| 1 | **Executive AI Governance & Business** | C-Suite, Business Sponsors | ✅ expanded (this doc) |
| 2 | LLM & Model Operations | AI Platform / LLMOps / GenAI Engineering | 🔲 TOC only |
| 3 | RAG & Retrieval Operations | RAG Engineering / Knowledge Eng | 🔲 TOC only |
| 4 | Agentic AI & Multi-Agent Operations | AgentOps / Agent Engineering | 🔲 TOC only |
| 5 | MCP, Tooling, Workflow & Integration | Platform / Integration | 🔲 TOC only |
| 6 | Security, Compliance, Governance & Responsible AI | CISO / Legal / Risk / RAI Team | 🔲 TOC only |
| 7 | Infrastructure, Cloud, K8s, GPU, Observability | SRE / Platform Eng / FinOps | 🔲 TOC only |

**Estimated dashboard counts (after top-1% adds):** P1=23 · P2=84 · P3=160 · P4=80 · P5=106 · P6=122 · P7=≈90 → **~665 dashboards total** across the platform.

---

## Visualization → use-case canonical mapping

These visualizations are used consistently across all phases:

| Visualization | Primary use case |
|---|---|
| KPI card + delta arrow | Executive single-metric snapshot |
| Line chart | Trends over time |
| Area chart | Growth + stacked totals |
| Bar / stacked bar | Comparison + distribution |
| Pie / donut | Share-of-total |
| Gauge | SLA / threshold against target |
| Heatmap | Failure analysis + density |
| Treemap | Cost allocation + hierarchy |
| Sankey | Flow (tokens / routing / leakage) |
| Network graph | Agents / MCP / dependencies |
| Radar / spider | Multi-axis trust / quality |
| Scatter / PCA / UMAP | Drift + embedding analysis |
| Box plot | Latency / response distribution |
| Histogram | Response-size + token distribution |
| Funnel | Workflow / approval drop-off |
| Timeline | Incidents + audit trail |
| Geo map | Regional usage + attack origin |
| Waterfall | Cost analysis + business value |
| Pareto (80/20) | Root cause analysis |
| Sunburst | Hierarchical usage + classification |
| Decision tree | Agent reasoning + tool selection |
| Chord diagram | Agent-to-agent collaboration |
| Fishbone | RCA brainstorming |
| Leaderboard | Model + agent benchmarking |
| DAG | Workflow + LangGraph execution |
| Risk heatmap | Board-level risk posture |
| Compliance matrix | Regulatory tracking |
| RACI matrix | Ownership + responsibility |
| MITRE ATT&CK matrix | Red-team / adversarial testing |
| Force-directed graph | Knowledge graph + entity influence |
| SHAP / LIME / force plot | Explainability |

---

## Audience tiers

Used in the `Audience` column below:

| Tier | Persona examples | What they want |
|---|---|---|
| **EXEC** | CEO, CFO, CIO, Board, AI Steering | KPI cards + gauges + trends + waterfall |
| **PROD** | Product mgr, AI product owner | KPI + funnel + adoption curves |
| **OPS** | AI Ops, SRE, LLMOps | Heatmaps + time series + alerts |
| **ENG** | AI engineer, RAG eng, agent dev | Detail tables + traces + drill-downs |
| **RISK** | CISO, compliance, legal, audit, RAI | Matrices + scorecards + heatmaps |
| **BIZ** | Department head, line-of-business owner | Treemap + waterfall + business KPIs |

---

# PHASE 1 — Executive AI Governance & Business Dashboards

**Owner:** AI Steering Committee · Business Sponsor · Executive Office.
**Goal:** Answer "Is enterprise AI healthy, governed, profitable, and safe?" in <60 seconds.

## 1.1 Core Phase 1 Dashboards (23 total — operator-listed + top-1% additions)

| # | Dashboard | Purpose | Audience | Key Metrics | Primary Visualization | Refresh | Backend Surface | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | **Executive AI Dashboard** | Overall AI health one-glance | EXEC | Total AI requests, adoption, cost, ROI, availability | KPI cards + sparklines + scorecard | Real-time (60s) | `/observability-hub/_overview` + `/agent-platform/adapters` | Spec'd |
| 2 | **AI Cost Dashboard** | FinOps for AI | EXEC, BIZ | Cost by model, team, workflow, agent | Treemap + line + waterfall | Real-time | `/evals/cost/_global` + `/evals/cost/by-model` | Spec'd |
| 3 | **AI Usage Dashboard** | Adoption tracking | EXEC, PROD | Daily users, active users, sessions, growth | Line + area + bar | Hourly | `/insur/transactions/_global` | Spec'd |
| 4 | **Business KPI Dashboard** | Business value linkage | EXEC, BIZ | Productivity gain, revenue impact, ticket-deflection, time-saved | Treemap + waterfall + forecast | Daily | (per-dept ROI source) | Spec'd |
| 5 | **AI Portfolio Dashboard** | Initiative tracking | EXEC, PROD | Projects active/pending, risks, benefits realized | Kanban + scorecard | Weekly | (project tracker) | Spec'd |
| 6 | **AI Governance Dashboard** | Oversight + policy hits | EXEC, RISK | Approvals, policies fired, exceptions, RACI status | Funnel + matrix | Real-time | `/agent-platform/approval-broker/decide` + `/guardrails/_global` | Spec'd |
| 7 | **Responsible AI Dashboard** | Trust + fairness | EXEC, RISK | Fairness, bias, explainability, transparency | Radar + gauges | Hourly | `/evals/safety/_global` (verdict + fairness_gate) | Spec'd |
| 8 | **AI Risk Dashboard** | Enterprise risk posture | EXEC, RISK | High-risk models, open incidents, residual risk | Risk heatmap | Real-time | `/security/_global` + `/evals/safety/_global` | Spec'd |
| 9 | **AI Compliance Dashboard** | Regulatory state | EXEC, RISK | GDPR, HIPAA, PIPEDA, ISO 42001, NIST RMF, SOC2 | Compliance matrix | Daily | `/security/_global.compliance` | Spec'd |
| 10 | **Executive Scorecard** | C-level monthly | EXEC | SLA, cost, accuracy, adoption, ROI | Scorecard | Monthly | aggregator over all of P1 | Spec'd |
| 11 | **AI ROI Dashboard** ⭐ | Top-1% addition: ROI by initiative | EXEC, BIZ | ROI %, payback period, NPV, IRR | Waterfall + bar | Monthly | (initiative tracker) | Spec'd |
| 12 | **AI Investment Dashboard** ⭐ | Top-1% addition: investment trail | EXEC, BIZ | $ spent vs budget, run-rate, capex/opex | Stacked bar + forecast | Monthly | (FinOps source) | Spec'd |
| 13 | **AI Risk Heatmap** ⭐ | Top-1% addition: board-level risk view | EXEC, RISK | Risk × probability matrix per AI surface | Risk heatmap | Real-time | `/security/_global` aggregation | Spec'd |
| 14 | **Business Value Realization Dashboard** ⭐ | Top-1% addition: planned vs realized | EXEC, BIZ | Planned vs actual value, % realized, gap | Bullet chart + waterfall | Quarterly | (initiative tracker) | Spec'd |
| 15 | **AI Adoption Curve Dashboard** ⭐ | Top-1% addition: rollout S-curve | EXEC, PROD | DAU/WAU/MAU, new vs returning, viral coefficient | S-curve + funnel | Daily | `/insur/transactions/_global` slicing | Spec'd |
| 16 | **AI ROI by Department Dashboard** | Per-dept value attribution | EXEC, BIZ | ROI per dept × initiative | Treemap | Monthly | per-dept aggregation | Spec'd |
| 17 | **AI ROI by Use Case Dashboard** | Per-use-case attribution | EXEC, BIZ | ROI per use-case (lead-scoring / churn / forecast / etc.) | Bar + waterfall | Monthly | per-process aggregation (§64.20) | Spec'd |
| 18 | **AI Project Risk Register Dashboard** | Project-level risk tracking | EXEC, RISK | Open risks, severity, mitigation status | Risk register table | Weekly | (project risk source) | Spec'd |
| 19 | **AI Strategy Alignment Dashboard** | Strategic-objective fit | EXEC | OKR alignment %, initiative-to-OKR map | RACI matrix + alignment grid | Quarterly | (OKR tracker) | Spec'd |
| 20 | **AI Talent & Capability Dashboard** | Team readiness | EXEC, OPS | Headcount, skills, certifications, hiring pipeline | Stacked bar + sunburst | Monthly | (HR source) | Spec'd |
| 21 | **AI Vendor Spend Dashboard** | Vendor concentration | EXEC, BIZ, RISK | $ per vendor, vendor-lock-in score | Treemap + Pareto | Monthly | (vendor source) | Spec'd |
| 22 | **AI Audit-Readiness Dashboard** ⭐ | Top-1% addition: audit-prep | EXEC, RISK | Evidence coverage, control gaps, doc-freshness | Gap-analysis + scorecard | Weekly | `/security/_global.compliance` + audit_log | Spec'd |
| 23 | **AI Incident Executive Dashboard** | Incident summary for execs | EXEC, RISK | MTTD, MTTR, severity, impact $, count by type | Timeline + Pareto + KPI | Real-time | `/insur/transactions/_global` filtering | Spec'd |

⭐ = top-1% addition beyond the operator's original list

## 1.2 Phase 1 metrics catalog

The **canonical metrics** that surface across Phase 1 dashboards — wire each backend `audit_log` field to one of these so the catalog stays consistent:

| Category | Metric | Source field | Used in |
|---|---|---|---|
| Usage | Requests/day, Requests/hour | `audit.ts` count | 1, 3, 15 |
| Usage | Users/day (DAU), WAU, MAU | distinct `audit.actor` | 3, 15 |
| Adoption | New users, returning users | first-seen `audit.actor` | 3, 15 |
| Adoption | Active by dept | `audit.dept` | 3, 16 |
| Financial | Monthly cost USD | `cost_runs.cost_usd` sum | 2, 12 |
| Financial | Cost/user, cost/workflow, cost/agent | groupby | 2 |
| Financial | $ saved / productivity gain | (business source) | 4, 11, 14 |
| Business | Initiative ROI | calculated | 11, 14, 16, 17 |
| Business | Time-to-value | initiative tracker | 5, 14 |
| Risk | Open AI risks (count, severity) | risk register | 8, 13, 18 |
| Risk | High-risk model count | safety verdict='unsafe' | 8, 13 |
| Risk | Vendor concentration score | per-vendor share | 21 |
| Governance | Approval rate (auto/human/deny) | `approval_broker.decision` | 6 |
| Governance | Policy violations | `guardrails.decision='deny'` | 6, 18 |
| Compliance | GDPR / HIPAA / etc. control-pass % | compliance matrix | 9, 22 |
| Compliance | Audit-evidence coverage | doc + audit-row presence | 22 |
| Trust | Hallucination rate | `safety.hallucination_rate` | 7, 8 |
| Trust | Fairness gate pass rate | `safety.fairness_gate` | 7 |
| Trust | Disparate impact | `safety.disparate_impact` | 7, 13 |
| Operations | Availability % | uptime probe | 1, 10 |
| Operations | MTTD, MTTR | incident timeline | 23 |

## 1.3 Phase 1 audience drill-down flow

The dashboards form an EXEC drill-down hierarchy. Clicking a tile in `Executive AI Dashboard` (level 1) navigates to its level-2 detail:

```
Level 1 — Executive AI Dashboard
   │
   ├── Level 2 — Business KPI Dashboard ──→ Phase 2/3 detail
   ├── Level 2 — AI Cost Dashboard ────────→ Phase 2 model-cost detail
   ├── Level 2 — AI Governance Dashboard ──→ Phase 6 governance detail
   ├── Level 2 — AI Compliance Dashboard ──→ Phase 6 compliance detail
   └── Level 2 — AI Risk Dashboard ────────→ Phase 6 risk + Phase 4 agent risk
        │
        ├── Level 3 — Per-Model Risk (Phase 2)
        ├── Level 3 — Per-Agent Risk (Phase 4)
        ├── Level 3 — Per-RAG Pipeline Risk (Phase 3)
        └── Level 3 — Infrastructure Risk (Phase 7)
```

## 1.4 Backend-surface coverage (Phase 1 reuses what we shipped)

How many Phase 1 dashboards have a backend READ surface already shipped vs need new build:

| Backend status | Phase 1 dashboards | Count |
|---|---|---|
| ✅ **Backend shipped** (§68 + §66 + §56) | 1, 2, 3, 6, 7, 8, 9, 10, 13, 22, 23 | **11 / 23** |
| 🟡 Backend partial (aggregation needed on top of shipped surfaces) | 4, 11, 15, 16, 17 | 5 / 23 |
| 🔲 Backend NOT shipped (needs new source — initiative/OKR/HR/vendor trackers) | 5, 12, 14, 18, 19, 20, 21 | 7 / 23 |

**48% of Phase 1 has a backend already** thanks to the §68 work. The remaining 52% needs new trackers (most are external systems — OKR tools, project trackers, HR systems — not greenfield code).

## 1.5 Phase 1 — implementation roadmap

| Iter | Dashboard slice | Backend needed | Frontend work | Drill |
|---|---|---|---|---|
| 1 | Executive AI Dashboard (1) + Usage (3) + Cost (2) | none (reuse §68) | 1 page, 3 tiles + drill links | `drill_dashboard_executive.py` |
| 2 | Governance (6) + Compliance (9) + Risk (8) + Heatmap (13) | none | governance page | `drill_dashboard_governance.py` |
| 3 | Responsible AI (7) + Audit-readiness (22) | none | RAI page | `drill_dashboard_rai.py` |
| 4 | Business KPI (4) + ROI (11) + Business Value (14) + Investment (12) | initiative/OKR connector | BIZ page | `drill_dashboard_business.py` |
| 5 | Adoption curve (15) + Per-dept ROI (16) + Use-case ROI (17) | aggregation services | adoption page | `drill_dashboard_adoption.py` |
| 6 | Portfolio (5) + Project Risk (18) + Strategy (19) + Talent (20) + Vendor (21) | external trackers (out-of-scope until wired) | placeholder pages | drills deferred |
| 7 | Executive Scorecard (10) + Incident Exec (23) | aggregation | scorecard page | `drill_dashboard_scorecard.py` |

**Recommended order:** iters 1-3 first (full backend coverage, fastest to ship), then iter 7, then 4-5 (need new connectors), then 6 (external systems).

---

# Phase 2-7 — table of contents (expanded one at a time on request)

## Phase 2 — LLM & Model Operations (~84 dashboards)
Categories: Model Usage (8) · Token (8) · Cost (8) · PromptOps (10) · Quality (10) · Hallucination (8) · Drift (8) · Evaluation (8) · Routing (8) · Inference (8). Owner: AI Platform / LLMOps. **Backend mapping:** ~60% covered by `/evals/functional` + `/evals/cost` + `/evals/safety` + `/observability-hub`.

## Phase 3 — RAG & Retrieval Operations (~160 dashboards)
Categories: Retrieval (15) · Search (10) · Hybrid Search (10) · Vector DB (15) · Embeddings (15) · Chunking (15) · Re-ranker (10) · Citation (10) · Knowledge Graph (10) · Freshness (10) · Index Health (10) · Data Sources (10) · Evaluation (10) · Document Processing (10). Owner: RAG Engineering. **Backend mapping:** ~30% covered today (need RAG-specific telemetry).

## Phase 4 — Agentic AI & Multi-Agent Ops (~80 dashboards)
Categories: Agent Overview (8) · Reasoning & Decision (7) · Multi-Agent Coordination (8) · Tool Usage (8) · Memory (8) · HITL (7) · Safety & Governance (8) · LangGraph / Workflow (8) · Evaluation (8) · Top-1% Additions (10). Owner: AgentOps. **Backend mapping:** ~40% covered by Approval Broker + typed-council + insur_audit federation.

## Phase 5 — MCP, Tooling, Workflow & Integration (~106 dashboards)
Categories: MCP Overview (8) · MCP Servers (8) · Tool Registry (8) · Tool Execution (8) · Tool Selection (8) · APIs (8) · Enterprise Apps (8) · Workflows (8) · LangGraph (8) · Events & Queues (8) · Integrations (8) · MCP Security (8) · Top-1% Additions (10). Owner: Platform / Integration. **Backend mapping:** ~20% covered today.

## Phase 6 — Security, Compliance, Governance & Responsible AI (~122 dashboards)
Categories: Executive Risk (8) · Identity & Access (8) · Prompt Injection (8) · Jailbreak (8) · PII & Privacy (8) · Data Leakage (8) · Responsible AI (8) · Explainable AI (8) · Compliance (8) · Governance (8) · Audit (8) · Trust & Safety (8) · Third-Party Risk (8) · Security Operations (8) · Top-1% Additions (10). Owner: CISO / Legal / Risk. **Backend mapping:** ~50% covered by §68.5 guardrails + §68.6 PII + §68.7 security + audit federation.

## Phase 7 — Infrastructure, Cloud, K8s, GPU, Observability (~90 dashboards)
Categories: Executive Infra (8) · Cloud (Azure/AWS/GCP) (8) · Kubernetes (8) · GPU (8) · Inference Engine (vLLM/TGI/Triton) (8) · API Gateway (8) · Service Mesh (Istio/Linkerd) (8) · Vector DB Infra (8) · plus follow-ups truncated in source. Owner: SRE / Platform Eng / FinOps. **Backend mapping:** ~10% covered (most need Prometheus/Grafana/Otel sidecar integration).

---

## Cross-phase total

| Phase | Dashboards | Backend % shipped |
|---|---|---|
| 1 — Executive | 23 | 48% (§68 + §66) |
| 2 — LLM Ops | 84 | 60% (§68.8/9/10) |
| 3 — RAG | 160 | 30% |
| 4 — AgentOps | 80 | 40% |
| 5 — MCP / Workflow | 106 | 20% |
| 6 — Security / Governance | 122 | 50% (§68.5/6/7) |
| 7 — Infrastructure | ≈90 | 10% (Otel needed) |
| **Total** | **≈665** | **avg ~37%** |

The §68 Observability Hub work this session covers ~37% of the entire dashboard catalog's backend needs. Frontend rendering is the remaining ~63% of work for shipped backends + new backend builds for the rest.

---

## Next step

Say **"next phase"** to expand Phase 2 (LLM & Model Operations) into the same canonical-table format with backend mapping + roadmap. One phase per delivery keeps it reviewable.
