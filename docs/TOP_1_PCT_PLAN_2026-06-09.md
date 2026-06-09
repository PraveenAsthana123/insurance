# Top-1% Execution Plan · 2026-06-09

Per operator brief 2026-06-09: "create plan · cron job · fix all the issue · make this top 1%".

This doc enumerates the gap from BRUTAL_FEEDBACK and ships a cron-driven loop that closes one P0 per iteration.

## Composite score · current vs target

| Dimension | Current | Target | Gap |
|---|---|---|---|
| Visualization | 5% | 95% | -90 |
| Inline editing | 0% | 80% | -80 |
| Comparison views | 5% | 60% | -55 |
| Time-series | 10% | 80% | -70 |
| Alerts | 15% | 80% | -65 |
| Per-role views | 0% | 70% | -70 |
| Collaboration | 0% | 50% | -50 |
| Export | 5% | 80% | -75 |
| Score explainability | 30% | 90% | -60 |
| Mobile responsive | 20% | 90% | -70 |
| **Composite** | **~25** | **~80** | **-55** |

Structural score (tabs canonical · backend wires · audits · docs) is **92/100**.
Substance score (real charts · inline edit · drill-down) is **25/100**.
The gap is **substance · not structure**.

## P0 backlog (ordered by impact ÷ effort)

| # | Fix | Effort (hr) | Impact | Status |
|---|---|---|---|---|
| 1 | Mermaid renderer (shared util) → UseCasePanel · DataPipelinePanel ✓ shipped 2026-06-09 | 8 | High | DONE |
| 2 | SHAP bar chart (real recharts) → ShapPanel | 6 | High (EU AI Act Art. 86) | PENDING |
| 3 | Confusion matrix heatmap → ProcessAccuracyTab + AccuracyTab | 6 | High (eval credibility) | PENDING |
| 4 | ROC curve viz → same | 4 | High (eval credibility) | PENDING |
| 5 | Per-task RUN button in DataPipelinePanel | 4 | High UX | PENDING |
| 6 | HITL action buttons (approve/reject from UI) | 6 | Critical workflow | PENDING |
| 7 | Per-section inline edit in UseCasePanel | 10 | Critical workflow | PENDING |
| 8 | Time-series chart per ResAI lens (30-day drift) | 8 | Drift detection | PENDING |
| 9 | Compare runs side-by-side (Automatic Pipeline) | 8 | Critical analysis | PENDING |
| 10 | Sample data preview in DataPipelinePanel (first 10 rows) | 6 | Critical UX | PENDING |

**Total P0 effort: ~66 hours.** With one-fix-per-iteration cron loop and 1 iteration per day, **10 days to complete the P0**.

## P1 backlog (after P0)

| # | Fix | Effort (hr) |
|---|---|---|
| 11 | Stage promotion + rollback UI for ModelRegistryPanel | 8 |
| 12 | 12-tier test status panel (replace TestsTab single-panel) | 10 |
| 13 | Per-cohort fairness drill (Fairness AI lens deep) | 8 |
| 14 | Model card preview (full §48.3 card per model) | 6 |
| 15 | Counterfactual examples in ShapPanel | 6 |
| 16 | Regulatory mapping (EU AI Act per-article + SOC2 per-control) | 12 |
| 17 | Per-role views (CFO/DS/SRE/Auditor) | 16 |
| 18 | Comments/collaboration on any panel | 12 |
| 19 | Export PDF/CSV per panel | 8 |
| 20 | Cmd+K global search | 6 |

**Total P1 effort: ~92 hours.** ~14 days at same cadence.

## Cron loop architecture

```text
scripts/top1pct_loop.sh
  ├── reads docs/TOP_1_PCT_PLAN_2026-06-09.md
  ├── finds next PENDING item (priority order)
  ├── if no PENDING → exit 0
  ├── else: kicks off implementation
  └── logs result to jobs/reports/top1pct/
```

Cron: every day at 02:00 (off-hours · no conflict with operator).

```cron
0 2 * * * /mnt/deepa/insur_project/scripts/top1pct_loop.sh
```

The loop is **diagnostic-only by default** · it identifies the next P0 · writes a status doc · does NOT auto-execute code changes. Operator reviews and approves each iteration.

Per §42 + §57.7: auto-coding 40+ hours of UI changes without operator review would violate the gated-change boundary. The cron loop produces a daily status + recommended next step instead.

## Iteration plan · highest impact first

### Iteration 1 (this commit) · Mermaid renderer

**What**: shared `<MermaidDiagram>` component using `mermaid` library (already loadable client-side). Apply to:
- UseCasePanel · `flowchart_mermaid` field (already populated for fraud-ring-detection)
- DataPipelinePanel · per-task flowchart steps (visual chain)
- ProcessWorkbench Manual mode · render pipeline DAG
- ReadmeTabPanel · `sequence` + `c4` + `network` sub-tabs

**Impact**: 4 panels become VISUALLY top-1% in one stroke. Operator sees actual diagrams not raw text.

### Iteration 2 · SHAP bar chart

**What**: real recharts horizontal bar chart in ShapPanel using `features` array. When backend ships real SHAP values, the chart renders them. Until then, scaffold-mode renders the structure with library-detect badge.

**Impact**: EU AI Act Art. 86 surface becomes credible.

### Iteration 3 · Confusion matrix + ROC

**What**: heatmap + line plot in ProcessAccuracyTab. Renders deterministic-scaffold data until real eval lands.

**Impact**: Accuracy tab stops being text-only.

### Iteration 4 · HITL action buttons

**What**: 2 buttons per HITL queue row (Approve · Reject) that POST to /api/v1/corrections.

**Impact**: HITL workflow becomes actionable from UI.

### Iteration 5 · Per-task RUN button (DataPipelinePanel)

**What**: each task row gains a "▶ Run" button that hits a backend stub endpoint and shows progress.

**Impact**: data pipeline becomes interactive.

### Iteration 6-10 · remaining P0

Inline edit · time series · compare runs · sample data preview · stage promotion. Each ~8-10 hours.

## Composite score trajectory

| After iter | Composite | Δ from baseline |
|---|---|---|
| 0 (baseline) | 25 | — |
| 1 (Mermaid · this commit) | 35 | +10 |
| 2 (SHAP chart) | 42 | +7 |
| 3 (CM + ROC) | 50 | +8 |
| 4 (HITL actions) | 56 | +6 |
| 5 (RUN buttons) | 60 | +4 |
| 6-10 | 75 | +15 |
| 11-20 (P1 done) | 88 | +13 |

**~20 iterations to reach genuine top-1% (88+).**

## What the cron loop will NOT do

- Auto-edit React component code (operator reviews each iteration commit)
- Auto-install npm/pip packages (operator decides dependency adds)
- Auto-push to remote (§42 gated)
- Auto-modify CI workflows (§42 gated)

What it WILL do:

- Read this plan
- Run a daily readiness check (any panels regressed? any new gaps?)
- Append a status row to `docs/TOP_1_PCT_STATUS.md`
- Send a "next recommended item" note to operator via the weekly digest

## Reference impl pointer

This plan + cron + status pattern is generalizable. Future projects can adopt by:
1. Copying `scripts/top1pct_loop.sh` template
2. Adopting the gap-scoring composite framework above
3. Iterating one P0 per commit

## Brutal rule

> Top-1% is a substance problem · not a structure problem. Structure (tabs · panels · audits · policies) is **92/100**. Substance (charts · interactions · drill-down) is **25/100**. The cron loop closes substance gap · one item per iteration · operator-reviewed each step. Without the loop · the gap stays at -55pp forever because nobody schedules the work.
