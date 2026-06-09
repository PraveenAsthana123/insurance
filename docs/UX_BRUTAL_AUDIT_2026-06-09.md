# UX Brutal Feedback Audit · 2026-06-09

Per operator request 2026-06-09 ("need brutal feedback analysis for each Main menu link vs Submenu vs content on each Tab and each component · create matrix table first").

**Method**: read every `*Tab.jsx` and `*Page.jsx` · trace operator path (menu → submenu → tab → sub-tab → component) · score correlation/clarity/clickability/distinctiveness per surface · file concrete fixes.

**Scope of this audit**: 22 process-tab files + 10 frontend pages + 4 insurance tab panels. Does NOT cover backend correctness · only user-visible UX.

---

## MATRIX TABLE · Tab × Component × Score × Correlation (per operator request)

Scoring (1–5): 1 = broken · 2 = poor · 3 = adequate · 4 = good · 5 = excellent.
Correlation = tab label matches tab content (✓/⚠/❌).
Data = does each process produce DIFFERENT data here (✓/⚠/❌).

| # | Tab ID | File | Components | Correlation | Data distinct | Score | Critical issue |
|---|---|---|---|---|---|---|---|
| 1 | overview | ProcessOverviewTab.jsx | description · KPI strip · AI badges | ✓ | ✓ | 4 | OK · standard |
| 2 | workbench | ProcessWorkbenchTab.jsx | ML model picker · run button | ✓ | ⚠ | 3 | Same shape every proc |
| 3 | problem | ProcessProblemTab.jsx | 5W · AS-IS/TO-BE table · use cases · stakeholders | ⚠ | ❌ | 2 | Data ONLY for demand-forecasting · others empty |
| 4 | data | ProcessDataTab.jsx | data sources · sample rows · stats | ✓ | ❌ | 2 | Same sample data across procs |
| 5 | datapipeline | ProcessDataPipelineTab.jsx | pipeline DAG · stages | ✓ | ❌ | 2 | No per-proc pipeline diff |
| 6 | databases | ProcessDatabaseTab.jsx | table list · schemas | ✓ | ❌ | 2 | Same tables shown every proc |
| 7 | models | ProcessModelsTab.jsx | model cards · metrics | ✓ | ❌ | 2 | Same model metrics every proc |
| 8 | accuracy | ProcessAccuracyTab.jsx | confusion matrix · ROC | ✓ | ❌ | 2 | Same dummy metrics every proc |
| 9 | analysis | ProcessAnalysisTab.jsx | feature importance · SHAP | ✓ | ❌ | 2 | Same SHAP plot every proc |
| 10 | mathematics | ProcessMathTab.jsx | formulas · derivations | ✓ | ❌ | 2 | Same formulas every proc |
| 11 | testing | ProcessTestingTab.jsx | test list · coverage | ✓ | ❌ | 2 | Same test count every proc |
| 12 | feedback | ProcessFeedbackTab.jsx | RLHF capture · corrections | ✓ | ❌ | 2 | No per-proc feedback yet |
| 13 | simulation | ProcessSimulationTab.jsx | what-if sliders · output | ✓ | ❌ | 2 | Same simulation every proc |
| 14 | governance | ProcessGovernanceTab.jsx | RACI · audit · compliance | ✓ | ❌ | 2 | Same RACI every proc |
| 15 | aiinfra | ProcessAIInfraTab.jsx | infra topology | ✓ | ❌ | 2 | Same diagram every proc |
| 16 | strategy | ProcessStrategyTab.jsx | 4P framework | ✓ | ❌ | 2 | Same 4P every proc |
| 17 | reports | ProcessReportsTab.jsx | report list | ✓ | ❌ | 2 | Same report list |
| 18 | docs | ProcessDocsTab.jsx | doc index | ⚠ | ❌ | 1 | Generic links · no per-proc docs |
| 19 | demos | ProcessDemoTab.jsx | demo walkthrough | ⚠ | ❌ | 2 | Same demo for every proc |
| 20 | automation | ProcessAutomationTab.jsx | automation hooks | ✓ | ❌ | 2 | Same hooks |
| 21 | scheduling | ProcessSchedulingTab.jsx | cron schedule | ✓ | ❌ | 2 | Same schedule |
| 22 | chatbot | ProcessChatbotTab.jsx | chat UI · history | ✓ | ⚠ | 3 | Chat works but no per-proc context |

### Insurance-specific tabs (`pages/insurance/tabs/`)

| # | Tab | File | Components | Correlation | Data distinct | Score | Critical issue |
|---|---|---|---|---|---|---|---|
| A1 | readme (Architecture) | ReadmeTabPanel.jsx | **22 sub-tabs** · JourneyFlow · TodoList · InfoCard · SubTabGrid | ✓ FIXED | ✓ FIXED | 5 (was 2) | **FIXED 82d16642** · canonical template |
| A2 | user-story | SimpleTabs.jsx:703 (UserStoryTab) | demo · manual · automatic | ❌ | ❌ | 1 | Label says "User Story" · renders demo+manual+auto |
| A3 | user-demo | SimpleTabs.jsx (UserDemoTab) | same as user-story | ❌ | ❌ | 1 | Identical to user-story |
| A4 | problem | ProcessProblemTab.jsx | (see #3 above) | ⚠ | ❌ | 2 | One-proc only |
| A5 | data | (see #4) | | | | | |
| A6 | manual | manual_process renderer | step list | ✓ | ⚠ | 3 | OK if data populated |
| A7 | automatic | automatic_process renderer | step list · AI badges | ✓ | ⚠ | 3 | OK if data populated |
| A8 | output | output renderer | spec list | ✓ | ⚠ | 3 | OK if data populated |
| A9 | visualization | mermaid renderer | flow diagram | ✓ | ⚠ | 3 | OK if mermaid populated |
| A10 | dashboard | KPI strip + charts | KPI tiles | ✓ | ⚠ | 3 | OK |
| A11 | res-ai (Responsible AI) | fairness · privacy | gates | ⚠ | ❌ | 2 | Generic compliance · same per proc |
| A12 | exp-ai (Explainable AI) | SHAP · citations | drill | ⚠ | ❌ | 2 | Same SHAP every proc |
| A13 | gov-ai (Governance AI) | audit · HITL · scope | controls | ⚠ | ❌ | 2 | Same controls every proc |
| A14 | tests | test runs | results | ⚠ | ❌ | 2 | No per-proc test runs |
| A15 | security | scan results | findings | ⚠ | ❌ | 2 | Generic |
| A16 | docs | doc index | links | ⚠ | ❌ | 2 | Generic |
| A17 | history | audit trail | rows | ⚠ | ❌ | 2 | Empty for most procs |

### Frontend pages (top-level)

| Page | Route | Score | Components clear | Correlation | Verdict |
|---|---|---|---|---|---|
| MarketingKPIsPage | /marketing-kpis | 5 | 7 distinct tabs (Dashboards · KPIs · Alerts · Latencies · Agents · Maturity · Scorecard) | ✓ | Best in codebase |
| AutonomousDeptFrameworkPage | /autonomous-dept-framework | 5 | 5 distinct tabs (Maturity · Governance · MCP · Hybrids · Stacks) | ✓ | Stats tiles + nested selector in Stacks |
| AutonomousAgentPage | /autonomous-agent | 4 | Decision chain · routing chip · history table | ✓ | Could add JourneyFlow + TodoList per pattern |
| AdminAuditPage | /admin/audits | 4 | 16 audit cards · per-audit log viewer | ✓ | Could group by phase |
| MarketingCampaignsPage | /marketing-campaigns | 3 | List · create form · runs | ✓ | Functional but plain |
| ScheduleExecutorPage | /schedule | 3 | Schedule list · forms | ✓ | OK |
| MasterContactsPage | /contacts | 3 | List · upload form | ✓ | OK |
| AIToolRegistryPage | /ai-tools | 4 | 173 tools · category filter · search | ✓ | OK |
| ProcessPage (insurance) | /:dept/:proc | 2 | **22 tabs in horizontal bar** · all use same chrome | ❌ | Most-broken surface |
| 100CustomerScalePage | /scale-test | 3 | Runner · result list | ✓ | OK |

### B2C / B2E / B2B process tagging audit (per operator: "does each department b2c, b2e process correct")

| Dept | Domain tags present | Tagged correctly? | Source | Issue |
|---|---|---|---|---|
| marketing | b2c · b2e | ⚠ partial | global-ai-org/departments/marketing/business-layer/ | Most processes default to b2c · some clearly b2b (sales enablement) |
| sales | b2c · b2b · b2e | ⚠ partial | Same | Cross-segment processes not labeled |
| hr | b2e only | ✓ | Same | Correct · all internal-facing |
| finance | b2c · b2b · b2e | ⚠ partial | Same | Some b2g (regulatory) not labeled |
| operations | b2e | ✓ | Same | OK |
| customer-support | b2c · b2b | ⚠ partial | Same | Mix not always clear |
| customer-experience | b2c · b2e | ⚠ partial | Same | Same |
| procurement | b2b · b2e | ⚠ partial | Same | Some b2g (gov procurement) untagged |
| legal | b2e | ✓ | Same | OK |
| engineering | b2e | ✓ | Same | OK |
| supply-chain | b2b · b2e | ⚠ partial | Same | OK mostly |
| security-operations | b2e | ✓ | Same | OK |
| others (8 depts) | mixed | ⚠ | — | Need data audit per dept |

**Brutal**: many processes default to `b2c` without explicit operator confirmation. Per §57.7 honest · the B2C/B2B/B2E labels need a per-process re-audit · NOT auto-assignment.

### Component-level recurring issues (across ALL tabs)

| Component | Pattern | Issue | Fix |
|---|---|---|---|
| `<IPOSection>` | wrapper with Input/Process/Output | Same chrome on every tab → operator can't tell tabs apart | Per-tab title (not generic Input/Process/Output) |
| `<TransactionalHistory rows={[]}>` | empty row table | Renders empty on every tab | Move to ONE place per page · not per-tab |
| `<OutputEvaluation metrics={}>` | empty metrics | Renders empty on every tab | Same · ONE per page · not per-tab |
| `<EmptyState>` | "data missing" placeholder | Operator sees identical empty state everywhere | Per-slug skeleton (see ReadmeTabPanel SKELETONS · 82d16642) |
| Decision tables | NOT PRESENT on any tab | Operator: "not decision table" | Add per-process decision matrices |
| Flowcharts | only on `visualization` tab if mermaid populated | Operator: "not flowchart" | Add Mermaid skeleton per slug |
| Operations | NOT clearly shown | Operator: "not operation" | Add operation step list per process |

---

---

## Summary Scorecard

| Surface | Correlation | Clarity | Clickability | Distinctiveness | Verdict |
|---|---|---|---|---|---|
| ProcessPage 22-tab top bar | ❌ | ❌ | ✓ | ❌ | Tab labels exist but content templates repeat · "Problem" tab buried |
| ReadmeTabPanel (Architecture hub) | ✓ (FIXED 82d16642) | ✓ FIXED | ✓ FIXED | ✓ FIXED | Per-slug skeleton differentiated · canonical template |
| UserStoryTab (SimpleTabs.jsx:703) | ❌ | ❌ | ❌ | ❌ | "User Story" label but renders demo/manual/automatic data |
| UserDemoTab | ❌ | ❌ | ❌ | ❌ | Same shape as UserStory · no distinct content |
| ProcessProblemTab | ⚠ | ⚠ | ✓ | ⚠ | Has data but only for `demand-forecasting` · other procs empty |
| ProcessDemoTab | ⚠ | ⚠ | ✓ | ⚠ | Demo lifecycle clear but skeleton sparse for new procs |
| ProcessOverviewTab | ✓ | ✓ | ✓ | ⚠ | OK but identical chrome to other tabs |
| All other Process*Tab.jsx (20 files) | ⚠ | ⚠ | ✓ | ❌ | Same Input/Process/Output chrome · operator can't tell them apart |
| AutonomousDeptFrameworkPage | ✓ | ✓ | ✓ | ✓ | 5-tab structure clean (different shapes per tab) |
| MarketingKPIsPage | ✓ | ✓ | ✓ | ✓ | 7-tab structure clean (per-tab unique content) |

Symbols: ✓ pass · ⚠ partial · ❌ fail.

---

## Finding 1 · Tab content has no correlation with tab label (CRITICAL)

**Where**: `UserStoryTab` in `frontend/src/pages/insurance/tabs/SimpleTabs.jsx:703`

```js
export function UserStoryTab({ proc, dept }) {
  const demo = proc.demo;
  const manual = proc.manual_process;
  const automatic = proc.automatic_process;
  if (!demo && !manual && !automatic) return <EmptyState tabName="User Story" />;
  // renders demo + manual + automatic — NOT user stories
}
```

The tab labeled "User Story" pulls from `proc.demo` · `proc.manual_process` · `proc.automatic_process`. A user story is `As a <role>, I want <X>, so that <Y>` — none of those fields contain that.

**Operator quote**: "User Story tab and content in tab has not correlation"

**Fix**:
1. Add `proc.user_story` field to blueprint with shape `{role, want, so_that, acceptance_criteria[]}`.
2. UserStoryTab reads `proc.user_story` (not demo/manual/automatic).
3. Fall back to per-slug SKELETON (see ReadmeTabPanel pattern · commit 82d16642) when data missing.

---

## Finding 2 · "Same template in each page" (CRITICAL · cross-cutting)

**Where**: All 22 process tabs use the same chrome:
```
IPOSection 1: Input
IPOSection 2: Process
IPOSection 3: Output
TransactionalHistory (empty)
OutputEvaluation (empty)
```

**Operator quote**: "same template in each page · each tab and sub tab"

**Why it happens**: The §73 spec mandates this 5-section chrome for compliance + decision-audit trace. But when applied literally to every tab, every tab looks the same.

**Fix** (per-tab content differentiation while keeping §73 structure):
1. Make IPOSection titles tab-specific (e.g. for User Story tab · "Input: who needs this" not "Input — Source data").
2. Make IPOSection 2 (Process) carry tab-UNIQUE content · skeleton per slug.
3. Optional: collapse TransactionalHistory + OutputEvaluation into a SHARED footer (rendered ONCE per page) · not per tab.

---

## Finding 3 · "Problem tab missing"

**Where**: `ProcessPage.jsx:31` registers `Problem & Use Case` tab.

```js
const TABS = [
  { id: 'overview', ... },
  { id: 'workbench', ... },
  { id: 'problem', label: 'Problem & Use Case', icon: '🎯' },  // present!
  // 19 more tabs...
];
```

22 tabs in a horizontal bar overflow on most screens · "Problem" is at index 2 and may scroll off-screen. Tab bar lacks visual scroll indicators.

**Operator quote**: "problme tab missing ..? why"

**Fix**:
1. Tab bar overflow: add `overflow-x: auto` with scroll indicators (arrows or sticky).
2. Pin most-used tabs (Overview · Problem · Demo · KPI) · scroll rest.
3. Optional: hamburger menu for less-used tabs.

---

## Finding 4 · "Which card is clickable vs info?" (FIXED in 82d16642 for ReadmeTabPanel · others pending)

**Where**: `SubTabGrid` in `IPOLayout.jsx` (FIXED) · but `Process*Tab.jsx` files use raw `<div>` cards with mixed click handlers.

**Operator quote**: "I am unable to understand which card to click which is not to click .. have some clarity · information card must be background white .. clickable card must have background light color"

**FIXED in 82d16642**:
- `SubTabGrid` cards · light-tinted bg · "Click to open →" footer · scroll-to-top on click
- New `InfoCard` · pure white bg · "info-only" badge

**STILL PENDING** for: `ProcessProblemTab`, `ProcessDemoTab`, `ProcessAccuracyTab`, etc.

**Pattern to apply** (replicate from ReadmeTabPanel 82d16642):
```jsx
// INFO (non-clickable)
<InfoCard icon="ℹ️" title="What this shows" accent="#6b7280">...</InfoCard>

// ACTION (clickable)
<SubTabGrid subtabs={...} onSelect={...} />  // light-tinted · hover lift · explicit footer
```

---

## Finding 5 · "Click card · control go top" (FIXED in 82d16642 for ReadmeTabPanel)

**Operator quote**: "when I click some card · then control go top"

This was actually the OPPOSITE complaint to my fix — operator wanted control TO go to top, not stay in place. My fix `window.scrollTo({top: 0})` is correct. Verified in commit 82d16642.

**Action**: Apply same `useEffect(scrollTo, [activeTab])` to all `Process*Tab.jsx` parent containers.

---

## Finding 6 · "TODO must be top · journey flow on top"

**Operator quote**: "there must be one journy flow on top to understand · list of operation going to happen in horizontal · todo list"

**FIXED in 82d16642** for ReadmeTabPanel:
- New `<JourneyFlow steps={...} currentSlug={...} />` component
- New `<TodoList items={...} />` component
- Both render at TOP of every sub-tab view

**Pattern to apply** to other tabs:
```jsx
<JourneyFlow steps={[{slug: 'phase1', label: 'Discovery'}, ...]} currentSlug={...} />
<TodoList items={['todo1', 'todo2', ...]} />
{/* then existing content */}
```

---

## Finding 7 · "One liner text for each component to understand what is happening"

**Operator quote**: "there must be some selection .. or there must be one liner text for each component to understand what is happening in each component"

**FIXED in 82d16642** for ReadmeTabPanel SubTabGrid:
- Each card now has `s.desc` (already existed) + "Click to open →" + hover detail
- New SKELETONS map has `why` field · 1-liner explanation per slug

**STILL PENDING** for other tabs: add a 1-liner `tabDescription` to each tab definition · render at top.

---

## Finding 8 · "AS-IS · TO-BE · ROI · KPI" sub-tabs missing

**Operator quote**: "AS IS · Tobe · roi · kpi"

**FIXED in 82d16642**: ReadmeTabPanel now has 22 sub-tabs (was 18) including AS-IS · TO-BE · ROI · KPI with per-slug skeletons.

---

## Finding 9 · "Very poor quality UI"

**Operator quote**: "very poor quality UI"

This is structural · result of:
1. ~100 components written quickly without a design system
2. Inconsistent spacing · color · typography across pages
3. Tab chrome reuse without per-tab differentiation
4. No clear info-vs-action affordance until commit 82d16642

**Recommended path**:
1. Establish design tokens · ALREADY HAVE `--bg-card` · `--border-color` · etc.
2. Adopt the InfoCard + SubTabGrid + JourneyFlow + TodoList pattern from 82d16642 in ALL pages.
3. Per-tab content differentiation (drop the generic IPO chrome label in favor of tab-specific labels).
4. Visual regression tests with Playwright snapshot to prevent template drift.

This is multi-iteration work · cannot be done in one commit.

---

## Per-page brutal scorecard

| # | Page | Score (1-5) | Findings | Priority |
|---|---|---|---|---|
| 1 | `MarketingKPIsPage` | 5 | 7 tabs · per-tab unique content · color-coded chips · clear affordance | ✓ |
| 2 | `AutonomousDeptFrameworkPage` | 5 | 5 tabs · 5 distinct shapes · nested selector in Stacks tab is clear | ✓ |
| 3 | `AutonomousAgentPage` | 4 | Decision chain visualizer good · routing color chip post-T7.9 great · could use journey-flow at top | minor |
| 4 | `AdminAuditPage` | 4 | 16 audits clear · per-audit label good · could group by phase | minor |
| 5 | `ProcessPage` (insurance · 22 tabs) | 2 | Tab overflow · same chrome on every tab · "Problem" buried · content non-distinctive | P0 |
| 6 | `ReadmeTabPanel` | 5 (was 2) | FIXED 82d16642 · 22 differentiated sub-tabs · canonical template | ✓ |
| 7 | `UserStoryTab` | 1 | Label-content correlation broken (renders demo/manual/automatic NOT user story) | P0 |
| 8 | `UserDemoTab` | 1 | Same content shape as UserStory · zero differentiation | P0 |
| 9 | `ProcessProblemTab` | 3 | Has rich content but ONLY for one process · others empty | P1 |
| 10 | Other `Process*Tab.jsx` (20 files) | 2 | All use same chrome · no per-tab content | P1 |

---

## Prioritized fix backlog

### P0 (this week)
1. **UserStoryTab content correlation** · change data source from demo/manual/automatic → user_story field
2. **UserDemoTab content correlation** · add `proc.user_demo` field with `{walkthrough, screenshots, pitch}`
3. **ProcessPage 22-tab overflow** · `overflow-x: auto` + scroll indicators + pin core tabs

### P1 (next 2 weeks)
4. Apply InfoCard + SubTabGrid + JourneyFlow + TodoList pattern (from 82d16642) to:
   - ProcessProblemTab
   - ProcessDemoTab
   - ProcessOverviewTab
   - ProcessAccuracyTab
   - ProcessModelsTab
5. Per-process SKELETONS map (like SKELETONS in ReadmeTabPanel) for each Problem tab default.
6. Per-tab one-liner description rendered at top.

### P2 (this month)
7. Apply pattern to remaining 17 Process*Tab.jsx files.
8. Playwright snapshot tests to prevent template drift.
9. Design system documentation: `docs/DESIGN_SYSTEM.md` · canonical components.

### P3 (this quarter)
10. Global navigation redesign · hamburger for 22 tabs.
11. Per-page tour mode (first visit hint overlays).
12. Accessibility audit (Axe + Lighthouse).

---

## What commit 82d16642 + 9cf843e4 actually addressed

| Operator complaint | Commit | Status |
|---|---|---|
| README missing 9 diagram sections | 9cf843e4 | ✓ done · all 9 added |
| README has interactive run buttons | 9cf843e4 | ✓ done · removed |
| FRD/BRD/HLD sub-tabs all look same | 82d16642 | ✓ done · per-slug differentiated skeletons |
| TODO must be top | 82d16642 | ✓ done · TodoList component at top |
| Journey flow on top horizontal | 82d16642 | ✓ done · JourneyFlow component |
| Click card → control go top | 82d16642 | ✓ done · scrollTo + useEffect |
| Info white · clickable light-tint | 82d16642 | ✓ done · InfoCard + SubTabGrid distinction |
| One-liner per component | 82d16642 | ✓ done · "Click to open" + per-slug `why` |
| AS-IS · TO-BE · ROI · KPI sub-tabs | 82d16642 | ✓ done · 22 sub-tabs across 4 phases |
| Tab and content has no correlation | — | ❌ pending · ReadmeTabPanel fixed · others not |
| Same template in each page | — | ❌ pending · pattern established · not propagated |
| Very poor quality UI | — | ⚠ partial · pattern fixed · propagation pending |
| Problem tab missing | — | ❌ pending · tab overflow CSS fix needed |

---

## The brutal honest assessment

This codebase has the **structure** to be a top-1% UI (per the §73 17-tab right pane + §63 1278-item global org + §47 C4 architecture surfaces · clear design system tokens) · but the **per-tab content** was not built with the same rigor. 22+ Process*Tab.jsx files use the same IPOSection chrome without per-tab differentiation · because the focus was on getting MANY tabs visible rather than one tab being polished first.

Commit 82d16642 establishes the canonical template for what a polished tab looks like (ReadmeTabPanel · 22 sub-tabs with differentiated skeletons · TODO at top · journey flow · InfoCard vs SubTabGrid clarity). The work needed is to PROPAGATE this template across 20+ other Process*Tab.jsx files · which is multi-iteration work.

**Operator decision needed**: continue per-tab rewrites in subsequent iterations (one tab per commit) · or batch them in a sprint dedicated to UX harmonization. Either path needs operator commitment of ~5-10 iterations.

Per §57.7: I have NOT achieved a "polished UI everywhere" claim. The fixes in 9cf843e4 + 82d16642 are real (verified) · and the remaining work is real (still pending). This document is the brutal honest map.
