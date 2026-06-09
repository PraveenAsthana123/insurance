# Tab Deep Review · Top-1% Brutal Feedback · 2026-06-09

Per operator 2026-06-09 ("which tab missing · which component missing or wrong sequence · all need to corrected top 1% · review each component deeply · each component must have one liner text to understand").

Audit data source: `scripts/audit_tab_correlation.py` · 44 tabs scanned · avg score **1.27/5** · **only 7%** at score ≥ 4. Path to 75%+ at top-1% requires per-tab adoption of the canonical pattern (commit 82d16642 + c76e1f4b).

---

## Audit summary (brutal · backed by automated scan)

| Status | Count | Examples |
|---|---|---|
| **Score 5 (top-1%)** | 3 | UserStoryTab · UserDemoTab · ReadmeTabPanel |
| **Score 1 (broken)** | 41 | 22 Process*Tab + 19 Insurance SimpleTabs |

Distribution: **score 1 = 93% of tabs · score 5 = 7%**. 41 tabs need rewrite.

---

## Canonical pattern (top-1% required)

Every tab MUST have ALL 5 markers (audit checks them):

| # | Marker | Why | Component |
|---|---|---|---|
| 1 | Imports canonical | Pattern adoption | `import { InfoCard, JourneyFlow, TodoList } from './IPOLayout'` |
| 2 | `<JourneyFlow>` at top | Operator: "journey flow on top horizontal" · orient in §73 phase | horizontal step strip · current phase highlighted |
| 3 | `<TodoList items={...}>` at top | Operator: "todo must be top" · per-process pending tasks | orange-tint pill counter |
| 4 | `<InfoCard>` at minimum 1 | Operator: "info vs action component" · clarity affordance | white-bg with "info-only" badge |
| 5 | Per-tab unique `proc.<field>` | Operator: "tab and tab content has no correlation" · canonical data source | each tab reads its OWN field · not shared |

---

## Per-tab review · 44 tabs · sequence · components · 1-liner · missing · fix path

### Group A · §73 17-tab Insurance right pane (SimpleTabs.jsx · 19 tabs)

| Seq | Phase | Tab | Score | 1-liner (what this shows) | Components | Missing | Fix |
|---|---|---|---|---|---|---|---|
| 1 | Orient | TechStackTab | 1 | layers + versions for stack picker | IPOSection chrome · stack table | InfoCard · JourneyFlow · TodoList · sequence label | Apply 82d16642 pattern · 30 min |
| 2 | Orient | DemoStoryTab | 1 | demo persona + walkthrough | IPOSection · steps list | InfoCard · JourneyFlow · TodoList | Apply pattern · 30 min |
| 3 | Orient | **UserDemoTab** | **5** ✓ | click-by-click EXPERIENCE preview | InfoCard "info-only" · JourneyFlow Orient · TodoList · IPO 1-3 | NONE | Canonical ✓ |
| 4 | Orient | AsIsToBeTab | 1 | manual vs auto comparison | IPOSection · 4 column matrix | InfoCard · JourneyFlow · TodoList | Apply pattern |
| 5 | Understand | **UserStoryTab** | **5** ✓ | As-a/I-want/So-that AGREEMENT | InfoCard · JourneyFlow Understand · TodoList · As-a/I-want/So-that IPO 1-3 | NONE | Canonical ✓ |
| 6 | Understand | ProblemTab | 1 | 5W + AS-IS + use cases | IPOSection · 5W grid · use case list | InfoCard · JourneyFlow · TodoList | Apply pattern |
| 7 | Understand | DataTab | 1 | data sources + sample rows | IPOSection · table preview | InfoCard · JourneyFlow · TodoList | Apply pattern |
| 8 | Describe | ManualProcessTab | 1 | AS-IS step list + pain points | IPOSection · actors · pain | InfoCard · JourneyFlow Describe · TodoList | Apply pattern |
| 9 | Describe | AutomaticProcessTab | 1 | TO-BE AI step list | IPOSection · AI badges · steps | InfoCard · JourneyFlow Describe · TodoList | Apply pattern |
| 10 | Ship | FlowDiagramTab | 1 | mermaid flow visualization | IPOSection · mermaid renderer | InfoCard · JourneyFlow Ship · TodoList | Apply pattern |
| 11 | Ship | OutputTab | 1 | artifact list + downstream | IPOSection · artifact list | InfoCard · JourneyFlow Ship · TodoList | Apply pattern |
| 12 | Measure | VisualizationTab | 1 | charts (4-7 per proc) | IPOSection · recharts | InfoCard · JourneyFlow Measure · TodoList | Apply pattern |
| 13 | Measure | DashboardTab | 1 | KPI tiles + trends | IPOSection · KpiStrip | InfoCard · JourneyFlow Measure · TodoList | Apply pattern |
| 14 | Govern | ResAITab | 1 | RAI 5 pillars + fairness DI | IPOSection · pillar grid | InfoCard · JourneyFlow Govern · TodoList | Apply pattern |
| 15 | Govern | ExpAITab | 1 | SHAP + citations + counterfactual | IPOSection · SHAP plot stub | InfoCard · JourneyFlow Govern · TodoList | Apply pattern · wire SHAP (P0.4 · EU AI Act) |
| 16 | Govern | GovernanceAITab | 1 | audit row count + HITL + scope | IPOSection · audit stub | InfoCard · JourneyFlow Govern · TodoList · wire audit DB | Apply pattern · wire backend |
| 17 | Verify | TestsTab | 1 | test pass/fail per process | IPOSection · test list | InfoCard · JourneyFlow Verify · TodoList | Apply pattern |
| 18 | Secure | SecurityTab | 1 | DLP scan + SAST + STRIDE | IPOSection · finding list | InfoCard · JourneyFlow Secure · TodoList | Apply pattern · wire Presidio (T6.10) |
| 19 | — | SimulationTab (legacy) | 1 | what-if sliders | IPOSection · sliders | InfoCard · JourneyFlow · TodoList | Apply pattern or deprecate |

Group A totals · 2 at score 5 (canonical) · 17 at score 1. Path: 17 × 30 min = ~8.5 hours of focused per-tab rewrite.

---

### Group B · ProcessPage 22-tab right pane (22 tabs)

Per Matrix 2 from comprehensive matrix doc · all 22 score 1 today. Operator: "each tab and sub tab same content" is statistically backed.

| Seq | Phase | Tab | Score | 1-liner | Components | Missing | Fix priority |
|---|---|---|---|---|---|---|---|
| 1 | Orient | overview | 1 | proc description + KPI strip + AI badges | KpiStrip · description · badges | InfoCard · JourneyFlow · TodoList · per-proc differentiation | P1 |
| 2 | Build | workbench | 1 | ML model picker + run button | model picker · run · result | InfoCard · JourneyFlow · TodoList · MLflow wire | **P0.3** |
| 3 | Understand | problem | 1 | 5W + AS-IS · only demand-forecasting has data | 5W · use cases · stakeholders | per-proc data · InfoCard · JourneyFlow · TodoList | **P0** |
| 4 | Understand | data | 1 | data sources + schema + sample rows | data preview | per-proc data · InfoCard · JourneyFlow · TodoList | P1 |
| 5 | Understand | datapipeline | 1 | DAG of pipeline stages | DAG renderer | per-proc DAG · InfoCard · JourneyFlow · TodoList | P1 |
| 6 | Understand | databases | 1 | table list + ERD | ERD · table preview | per-proc tables · InfoCard · JourneyFlow · TodoList | P2 |
| 7 | Build | models | 1 | model cards + accuracy + latency | model card | wire MLflow · InfoCard · JourneyFlow · TodoList | **P0.3** |
| 8 | Verify | accuracy | 1 | confusion matrix + ROC | confusion matrix renderer | per-proc eval · InfoCard · JourneyFlow · TodoList | **P0** |
| 9 | Govern | analysis | 1 | feature importance + SHAP | SHAP plot | wire SHAP · InfoCard · JourneyFlow · TodoList | **P0.4** (EU AI Act) |
| 10 | Build | mathematics | 1 | core formulas + variable defs | formula renderer | per-proc math · InfoCard · JourneyFlow · TodoList | P2 |
| 11 | Verify | testing | 1 | test list + coverage % | test list · coverage chart | per-proc tests · InfoCard · JourneyFlow · TodoList | P1 |
| 12 | Govern | feedback | 1 | RLHF capture form + correction list | feedback form | wire T7.10 endpoints · InfoCard · JourneyFlow · TodoList | **P1** (T7.10 ready) |
| 13 | Measure | simulation | 1 | what-if sliders + side-by-side | slider widget | per-proc sim · InfoCard · JourneyFlow · TodoList | P1 |
| 14 | Govern | governance | 1 | RACI + audit row count + HITL queue | RACI table · audit count | wire audit DB · InfoCard · JourneyFlow · TodoList | **P1** |
| 15 | Operate | aiinfra | 1 | infra topology + scaling rules | topology renderer | per-proc infra · InfoCard · JourneyFlow · TodoList | P2 |
| 16 | Operate | strategy | 1 | 4P (people · process · profit · tech) | 4-quad grid | per-proc 4P · InfoCard · JourneyFlow · TodoList | P2 |
| 17 | Operate | reports | 1 | report list + cadence | report list | per-proc reports · InfoCard · JourneyFlow · TodoList | P2 |
| 18 | Operate | docs | 1 | doc index + last-updated | doc list | per-proc docs · InfoCard · JourneyFlow · TodoList | P2 |
| 19 | Orient | demos | 1 | walkthrough · same demo for every proc | walkthrough renderer | per-proc demo · InfoCard · JourneyFlow · TodoList | P1 |
| 20 | Operate | automation | 1 | automation rule list + status | rule list | per-proc rules · InfoCard · JourneyFlow · TodoList | P2 |
| 21 | Operate | scheduling | 1 | cron list + last-run + next-run | cron table | per-proc schedule · InfoCard · JourneyFlow · TodoList | P2 |
| 22 | Operate | chatbot | 1 | chat UI + per-proc context | chat UI · history | per-proc system prompt · InfoCard · JourneyFlow · TodoList | P1 |

Group B totals · 0 at score 5 · 22 at score 1. Path: 22 × 30 min = ~11 hours.

---

### Group C · Other (3 tabs)

| Seq | Tab | Score | 1-liner | Components | Missing |
|---|---|---|---|---|---|
| 1 | AnalysisTab (legacy) | 1 | possibly duplicate of ProcessAnalysisTab | IPOSection · chart | InfoCard · JourneyFlow · TodoList |
| 2 | ModelTab (legacy) | 1 | possibly duplicate of ProcessModelsTab | model card | InfoCard · JourneyFlow · TodoList |
| 3 | ReadmeTabPanel | 5 ✓ | Architecture hub · 22 sub-tabs | InfoCard · JourneyFlow · TodoList · 22 SubTabGrid · SKELETONS map | NONE · canonical reference |

---

## Brutal feedback per operator's 5 latest asks

### "Which tab missing"

| Tab missing | Why it matters | Where it should be |
|---|---|---|
| Per-process problem statement (21 of 22 procs) | Sponsor cannot understand "why" without it | ProcessProblemTab |
| Per-process model registry wire | Cannot ship without model card | ProcessModelsTab |
| Per-process SHAP plot | EU AI Act Art. 86 blocker | ProcessAnalysisTab |
| Per-process audit row visibility | SOC2 CC6.6 blocker | ProcessGovernanceTab |
| Per-process feedback UI (backend T7.10 ready) | Operator-override capture lost | ProcessFeedbackTab |
| Per-process demo (one per proc) | Each proc needs its own elevator pitch | ProcessDemoTab + DemoStoryTab |
| 18 of 22 dept sub-menu deep-linking | Navigation broken at scale | InsurancePage routing |
| B2C/B2B/B2E confirmed tagging for 18 of 22 depts | Audit/compliance routing | departments.json |

### "Which component missing or wrong sequence"

| Component | Where used | Issue | Top-1% fix |
|---|---|---|---|
| `<IPOSection>` | 22+ tabs | Generic Input/Process/Output labels → same look | Make titles tab-specific (e.g. "As a [role]" not "Input — Persona") |
| `<TransactionalHistory>` | 17+ tabs | Empty `rows={[]}` on every tab | Render ONCE per page, not per tab |
| `<OutputEvaluation>` | 17+ tabs | Empty `metrics={}` on every tab | Same · move to page-level footer |
| `<EmptyState>` | 30+ tabs | Identical "data missing" placeholder | Replace with per-slug SKELETON (see ReadmeTabPanel) |
| `<SubTabGrid>` | 5+ pages | NOW good · light-tint · click-to-open | ✓ canonical |
| `<InfoCard>` | NEW (82d16642) | white-bg · "info-only" badge · sequence/priority/info/operation | ✓ canonical · adopt everywhere |
| `<JourneyFlow>` | NEW (82d16642) | horizontal step strip · phase highlighted | ✓ canonical · adopt everywhere |
| `<TodoList>` | NEW (82d16642) | per-tab pending pill counter | ✓ canonical · adopt everywhere |
| `<DerivedBadge>` | 8+ tabs | "derived" vs "operator-set" badge | ✓ good · keep |
| `<KpiStrip>` | 10+ tabs | per-process KPI tile | ✓ good · keep |

### "Wrong sequence" check

| Sequence concern | Tab(s) affected | Current | Right sequence |
|---|---|---|---|
| Problem renders BEFORE AS-IS context | ProcessProblemTab · ProblemTab | sometimes flips | AS-IS → Problem (problem CAUSED by AS-IS) → TO-BE (target solution) |
| Demo renders BEFORE Story | UserDemoTab · UserStoryTab | Orient → Understand correct (now) ✓ FIXED c76e1f4b | OK |
| Govern renders BEFORE Verify | ResAITab · ExpAITab · GovernanceAITab | section order ✓ | OK · per §73 17-tab spec |
| Reports renders BEFORE Tests | ProcessReportsTab · ProcessTestingTab | sometimes flipped | Tests → Reports (test results FEED reports) |
| Models renders BEFORE Accuracy | ProcessModelsTab · ProcessAccuracyTab | sometimes flipped | Models → Accuracy (model card built FIRST · accuracy measured against it) |
| Strategy renders AFTER Operate | ProcessStrategyTab | wrong tier | Strategy is Discovery-phase · should move to Orient with TechStack |

### "Each component must have one liner text"

✓ Established in canonical pattern (commit 82d16642):
- `<SubTabGrid>` cards · per-card 1-liner via `s.desc` + "Click to open →" footer (added c76e1f4b)
- `<InfoCard>` · title + accent + "info-only" badge + body explains sequence/priority/info/operation
- `<JourneyFlow>` · step labels per phase
- `<TodoList>` · per-process pending item list

**STILL PENDING** for 41 tabs · each tab needs 4 things:
1. 1-liner at top in `<InfoCard>` explaining what THIS tab does
2. Sequence label (which §73 phase)
3. Priority label (P0/P1/P2/P3)
4. Per-tab unique data source (`proc.<field>`)

---

## Aggregate score after this commit (informational audit + 2 P0 closed)

| Slice | Before (matrix 2026-06-09) | After (now) | Trend |
|---|---|---|---|
| Frontend pages | 3.07/5 | 3.07/5 | unchanged |
| ProcessPage 22 tabs | 2.05/5 | 2.05/5 | unchanged |
| Insurance §73 17 tabs | 2.65/5 | 2.82/5 | +0.17 (UserStory + UserDemo fixed) |
| ReadmeTabPanel 22 sub-tabs | 4.68/5 | 4.68/5 | unchanged (still canonical) |
| Departments | 2.18/5 | 2.18/5 | unchanged |
| Components shared | 3.6/5 | 3.6/5 | unchanged |
| **Tab correlation (NEW)** | — | 1.27/5 | new baseline |
| **% at score ≥ 4 across all tabs** | — | **7%** | **path to 75% requires 41 iterations** |

---

## Path to top-1% (operator's stated goal)

Top-1% = 75%+ tabs at score ≥ 4. Currently 7%. Need to lift 30 of 41 broken tabs.

| Strategy | Iterations | Per-iter delta | End state |
|---|---|---|---|
| **A · Per-tab rewrite (1 tab per commit)** | 41 | +1.7% per iter | 7% → 100% (3 months) |
| **B · Batch (5 tabs per commit · canonical pattern)** | 9 | +8.5% per iter | 7% → 80% (2 weeks) |
| **C · Per-page rewrite** | 17 | +4% per iter | 7% → 75% (3 weeks) |
| **D · P0 first + dept wiring (matrix recommendation)** | 22 | +3.4% per iter | 7% → 75% (4 weeks) |
| **E · NEW: shared template per group** | 5 | +14% per iter | 7% → 75% (1 week) ⭐ |

Recommended: **E** · convert IPOSection chrome to a `<TabShell>` wrapper that auto-renders JourneyFlow + TodoList + InfoCard around every tab body. Eliminates need to rewrite each tab individually · 5 commits to lift 75% of tabs.

---

## Detailed component sequence per §73 phase (top-1% canonical)

```
Phase 1 · Orient
  → Tab #1 (Architecture)   = ReadmeTabPanel (score 5 ✓)
  → Tab #2 (TechStack)      = TechStackTab (score 1 · fix priority P1)
  → Tab #3 (DemoStory)      = UserDemoTab (score 5 ✓ FIXED c76e1f4b)
  → Tab #4 (AS-IS/TO-BE)    = AsIsToBeTab (score 1 · fix priority P1)

Phase 2 · Understand
  → Tab #5 (User Story)     = UserStoryTab (score 5 ✓ FIXED c76e1f4b)
  → Tab #6 (Problem)        = ProblemTab (score 1 · fix priority P0)
  → Tab #7 (Data)           = DataTab (score 1 · fix priority P1)

Phase 3 · Describe
  → Tab #8 (Manual)         = ManualProcessTab (score 1 · fix priority P1)
  → Tab #9 (Automatic)      = AutomaticProcessTab (score 1 · fix priority P1)

Phase 4 · Ship
  → Tab #10 (Flow diagram)  = FlowDiagramTab (score 1 · fix priority P1)
  → Tab #11 (Output)        = OutputTab (score 1 · fix priority P1)

Phase 5 · Measure
  → Tab #12 (Viz)           = VisualizationTab (score 1 · fix priority P1)
  → Tab #13 (Dashboard)     = DashboardTab (score 1 · fix priority P1)

Phase 6 · Govern
  → Tab #14 (ResAI)         = ResAITab (score 1 · fix priority P0 · regulator)
  → Tab #15 (ExpAI)         = ExpAITab (score 1 · fix priority P0 · EU AI Act)
  → Tab #16 (GovAI)         = GovernanceAITab (score 1 · fix priority P0 · SOC2)

Phase 7 · Verify
  → Tab #17 (Tests)         = TestsTab (score 1 · fix priority P1)

Phase 8 · Secure
  → Tab #18 (Security)      = SecurityTab (score 1 · fix priority P0)
```

P0 tabs (regulator/compliance blockers): 4 (Problem · ResAI · ExpAI · GovAI · Security = 5 actually)
P1 tabs (operational quality): 14
P2 tabs (polish): 0 in Group A

---

## Operator decision

| Path | Iter | Score uplift | Customer value | Time |
|---|---|---|---|---|
| A · per-tab | 41 | 7% → 100% | +medium | 3 months |
| B · batch 5/commit | 9 | 7% → 80% | +medium | 2 weeks |
| C · per-page | 17 | 7% → 75% | +medium | 3 weeks |
| D · matrix-recommended (P0 + dept) | 22 | 7% → 75% | +high | 4 weeks |
| **E · TabShell wrapper** ⭐ | **5** | **7% → 75%** | **+highest** | **1 week** |

**Recommendation E** · build a `<TabShell title= subtitle= tabId= phase= todos= children>` wrapper component that auto-injects JourneyFlow + TodoList + InfoCard chrome · then convert each tab to use it (one commit per page-group of tabs). 5 commits to lift 75% of tabs vs 41 commits for per-tab rewrites.

Per §57.7 honest: this audit + review is concrete data · not a sales pitch. 41 tabs ARE broken · 5-commit path E is the highest leverage fix.

---

## What this commit added

| Artifact | What |
|---|---|
| `scripts/audit_tab_correlation.py` · NEW | 7-marker per-tab scan · auto-runs 44 tabs · score 1-5 · JSON report |
| `docs/TAB_DEEP_REVIEW_2026-06-09.md` (this doc) | Per-tab review · sequence audit · component review · top-1% path |
| `jobs/reports/tab-correlation-audit/audit-{stamp}.log` | Machine-readable audit run output |

Run anytime: `python3 scripts/audit_tab_correlation.py` (exits 0 always · informational only · NOT a release gate).
