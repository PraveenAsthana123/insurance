# AI Quality Analyses Catalog — 400+ Analyses (Consolidated §81 + §82)

> **Single source of truth** for the 21 AI quality modalities (§81 11 + §82 10) and their ~400 analysis rows. Per-process detail tabs reference this catalog; per-process selections are tracked in [`docs/per-process-analysis-checklist-template.md`](per-process-analysis-checklist-template.md).

## How to use this catalog

| Surface | Where |
|---|---|
| **Policy level** | This file — full catalog of all 21 modalities × ~400 analyses |
| **Per-process level** | Each process drills down via the per-process checklist template (see below) marking which analyses apply |
| **Tab level** | Process tabs (Data · Model · Analysis · ResAI · ExpAI · GovAI · Security · Tests · Visualization · UserStory · UserDemo) each surface a relevant subset |

## The 21 modality index

| # | Modality | Rows | Source policy |
|---|---|---|---|
| 1 | **Reliable AI** | 18 | §81 |
| 2 | **Trustworthy AI** | 18 | §81 |
| 3 | **Safe AI** | 18 | §81 |
| 4 | **Accountable AI** | 18 | §81 |
| 5 | **Auditable AI** | 18 | §81 |
| 6 | Lifecycle Management | 18 | §81 |
| 7 | Monitoring & Drift | 18 | §81 |
| 8 | Sustainable / Green AI | 18 | §81 |
| 9 | **Responsible GenAI** | 18 | §81 |
| 10 | Debug AI | 20 | §81 |
| 11 | Portability AI | 18 | §81 |
| 12 | Energy-Efficient AI | 18 | §82 |
| 13 | **Hallucination Prevention** | 20 | §82 |
| 14 | **Hypothesis in AI** | 20 | §82 |
| 15 | Threat AI | 20 | §82 |
| 16 | SWOT (3 sub-frameworks) | 3 | §82 |
| 17 | **Governance AI** | 20 | §82 |
| 18 | **Compliance AI** | 20 | §82 |
| 19 | Responsible AI (catalog) | 20 | §82 |
| 20 | Explainable AI (catalog) | 20 | §82 |
| 21 | **Secure AI** | 20 | §82 |

**Total**: ~400 analysis rows. Full row content lives in the share-folder templates (the §81 + §82 adopt scripts populate it into `docs/ai-quality/` and `docs/ai-quality-extended/` per project — already done for this project).

## Tab → Modality mapping (which tab surfaces which modalities)

Per process detail page (21 tabs · per §73 + commit `e8963c5+`):

| Process Tab | Modalities surfaced |
|---|---|
| **Data** | #5 Auditable (lineage) · #11 Portability (data dependency) · #14 Hypothesis (data sufficiency) |
| **Model** | #1 Reliable · #6 Lifecycle · #10 Debug (capacity · sensitivity) · #14 Hypothesis (model capacity) |
| **Analysis** | #5 Auditable · #14 Hypothesis (full) · §83 8-phase research analysis |
| **UserStory** | #4 Accountable (RACI) · #14 Hypothesis (problem framing) · #16 SWOT |
| **UserDemo** | #2 Trustworthy · #20 Explainable |
| **ManualProcess** | #4 Accountable (HITL) · #19 Responsible AI |
| **AutomaticProcess** | #6 Lifecycle · #15 Threat (automation risk) |
| **FlowDiagram** | Per §64.27 manual/auto flow |
| **Output** | #5 Auditable (output traceability) · #11 Portability |
| **Visualization** | #20 Explainable (visual XAI) |
| **Dashboard** | #7 Monitoring & Drift · #18 Compliance (KPI reporting) |
| **ResAI** | **#19 Responsible AI** (5-pillar full) · #3 Safe · #7 Monitoring |
| **ExpAI** | **#20 Explainable AI** (20-row full · LIME · SHAP · counterfactual) |
| **GovernanceAI** | **#17 Governance AI** (20-row full) · #5 Auditable · #4 Accountable |
| **Tests** | #10 Debug (full 20 rows) · #14 Hypothesis (testing) · #1 Reliable |
| **Security** | **#21 Secure AI** (20-row full) · #15 Threat · #18 Compliance |
| **Architecture** (tab #1) | §47 C4 · §86 architecture docs · cross-references all modalities |
| **TechStack** | #6 Lifecycle · #11 Portability (tooling) |
| **DemoStory** | #2 Trustworthy · #20 Explainable |
| **AsIsToBe** | #14 Hypothesis · #16 SWOT · §64.27 |
| **Readme** | Index of all 21 modalities |

## Mandatory subset (must pass per process before deploy)

Even for processes with no specific AI components, these 6 modalities apply:

1. **#5 Auditable** — every process has lineage/audit row
2. **#4 Accountable** — every process has named owner
3. **#17 Governance** — every process under governance policy
4. **#21 Secure** — every process passes security review
5. **#18 Compliance** — every process maps to applicable laws
6. **#19 Responsible AI** — every AI-touching process passes 5 pillars

Per-process: see [per-process-analysis-checklist-template.md](per-process-analysis-checklist-template.md).

## Source files (full row content)

Catalog rows live in the per-modality .md files dropped by §81 + §82 adopt scripts:

- `docs/ai-quality/01_RELIABLE_AI.md` ... `11_PORTABILITY_AI.md` (per §81)
- `docs/ai-quality-extended/12_ENERGY_EFFICIENT_AI.md` ... `21_SECURE_AI.md` (per §82)

The per-tab mapping above tells process owners which file to consult per tab; the per-process checklist tells them what to fill in.

## Cross-modality matrix (§80 phase × §81/§82 modality = 273 cells)

For agentic systems (per §80): 13 phases × 21 modalities = 273 analysis cells. Not all meaningful for every process — the per-process checklist filters.

## Composes with

§47 (architecture) · §73 (two-menu layout · 21 tabs) · §80 (agentic 13-phase · cross-product) · §81 (11 modalities) · §82 (10 more modalities) · §83 (research-grade 8-phase analysis) · §84 (ISO 42001 + CMMI L3 governance frame) · §86 (architecture docs)
