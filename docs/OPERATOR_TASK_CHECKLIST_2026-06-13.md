# Operator Task Checklist · 2026-06-13

> Captures every operator-reported directive from the 2026-06-13 session so
> nothing falls through the cracks. Per §138 + §57.7 honest: status reflects
> what's actually done, not what's been claimed.
>
> **Update protocol**: when an item closes, change status `⏳ pending` →
> `✅ done` with a one-line evidence summary (commit SHA · drill output ·
> link to fix). When operator adds a new directive, append to the bottom
> with the timestamp.

---

## Open items

### OP-1 · "there should not be any workspace/content page which should replace Main menu and sub menu"

| Field | Value |
|---|---|
| Operator quote (10:15 MDT) | "there should not be any workspace/content page which should replace Main menu and sub menu ...check each link" |
| Status | ✅ **DONE** (commit 2240734d+) · Platform Modules block REMOVED from BankSidebar |
| Last action | Commit `3eed68d8` added `target="_blank" rel="noopener noreferrer"` to 38 Platform Modules + 4 /ai-types Links |
| Evidence | `drill_bank_shell_navigation.py` · ALL 8 STEPS PASS · 0 violations across 14 bank files / 4 patterns / 46 routes |
| Honest gap | `target="_blank"` opens in NEW TAB · operator wants content rendered INSIDE workspace pane (see OP-2) |
| Suggested next action | Remove Platform Modules block from BankSidebar entirely · they belong in the global Layout sidebar, not bank-specific |

### OP-2 · "click of Main Menu .. click of that .. Sub Menu should open and under Sub Menu link click content workspace should get opne"

| Field | Value |
|---|---|
| Operator quote (10:24 MDT) | "click of Main Manu ..click of that ..Sub Menu shoud open and unders Sub Menu link clicke content workspace should get opne" |
| Status | ✅ **DONE** · BankWorkspaceModulePage restored · /bank/workspace?module= route registered · BankSubMenu links updated |
| Required pattern | Main Menu click → BankSubMenu populates with relevant sub-options · Sub Menu click → BankUseCasePage's workspace tab content updates (no full route change · no new tab) |
| Blocker | The earlier `BankWorkspaceModulePage` (commit `674e3ae5`) was reverted by parallel session (commit `d6b29327`) · no in-shell module renderer currently exists |
| Suggested next action | Either restore `BankWorkspaceModulePage` OR use BankUseCasePage's existing tab system to render module content via `?tab=module&module=<key>` query |

### OP-3 · "sliding up" when clicking workspace component

| Field | Value |
|---|---|
| Operator quote (10:28 MDT) | "when I click some component in content Area -worksapce ...then I noticed sliding up ..why ?" |
| Status | ✅ **DONE** (Option B applied) · scrollTo with behavior:'instant' replaces previous restore logic |
| Root cause | `frontend/src/pages/bank/BankUseCasePage.jsx:7434-7447` useEffect resets `main.scrollTop = 0` on every tab/sub-tab change (or restores saved position via `requestAnimationFrame`) |
| Fix options | **A** No-op on first visit (preserve current scroll) · **B** Instant scroll (no animation · cheapest) · **C** Conditional (skip reset if operator scrolled within 50px of top) |
| Suggested next action | Apply **B** (instant) as zero-controversy minimum · follow up with **C** if smarter behavior wanted |

### OP-4 · "list of graph in each ...pie chart, radar chart, trend chart" + "list of chart"

| Field | Value |
|---|---|
| Operator quotes (10:32 MDT) | "there should be list of graph in each ..pie chart, radarchart, trend chart" + "lsit of chart" |
| Status | ⏳ **Pending scope** (deferred · awaits operator interpretation choice a/b/c) |
| Interpretation candidates | (a) Each workspace tab shows a list-of-charts panel with pie / radar / trend options · (b) Sub Menu gains a "Charts" section listing available chart types · (c) A central catalog page enumerating all chart components |
| Required clarification | Where should the list appear? Which tab/sub-tab? What data series? |
| Suggested next action | Pick interpretation (a/b/c) then build · OR operator names target location |

### OP-7 · "are you showing what is goal of each tab and what is end conclusion or output dose these there on each tab" → "evaluate each tab for each component and score" → "fix all" → "10/10"

| Field | Value |
|---|---|
| Operator quotes (11:12 MDT) | "are you showing what is goal of each tab and what is end conclusion or output" |
| Operator quotes (11:14 MDT) | "evaluate each tab for each component and score ..goal vs final outcome score" |
| Operator quotes (11:24 MDT) | "brutal feedback" + "top 1%" + "fix all" + "10/10" |
| Status | ✅ **DONE** · 22/31 → 31/31 rich charter coverage · drill locks 100% |
| Audit shipped | `docs/TAB_GOAL_OUTPUT_AUDIT.md` (commit `6b88482a`) · brutal corrected score 22/31 |
| Close-list shipped | 9 new TAB_CHARTER entries: problem-as-is · to-be · ai-strategy · digital-transformation · manual-transaction · automatic-pipeline · accuracy-benchmarking · analytical-ai-process · ai-control-tower |
| Drill shipped | `tests/drills/drill_tab_charter_coverage.py` (8 steps · 3 negative) · locks PROFILES ⊆ CHARTER + 8-field shape + objectives ≥ 3 |
| §138.4 sweep miss caught | Working tree had uncommitted regression to BankSidebar (Link import removed) · reverted in this commit |

### OP-8 · "how do you evalute the final outcome of each tab" → "fix all ..have agent assign for this task" → "100% ..top 1"

| Field | Value |
|---|---|
| Operator quotes (11:37 MDT) | "how do you evalute the final outcome of each tab" |
| Operator quotes (11:42 MDT) | "fix all ..have agent assign for this task" + "100% ..top 1" |
| Status | ✅ **DONE** · 115/115 evidence rules · 100% coverage · drill-locked |
| Component shipped | `<TabOutcomeScorecard>` renders per-objective ✓/🟡/✗ + aggregate band (top-1pct / ok / needs-work / failing) |
| Evidence file | `frontend/src/pages/bank/tabs/tab-objective-evidence.js` · 115 rules · 105 auto + 10 operator_confirms |
| Wired in renderer | `sec.outcomeScorecard` added · 4 lens orders updated (base · engineer · manager · business) |
| Drill shipped | `tests/drills/drill_tab_outcome_evaluator.py` (8 steps · 4 negative) · locks 100% coverage |
| Agent registered | `docs/AGENT_ROSTER.md` §7 · `sys_tab_outcome_scoring_agent` (CHECKER role per §117) · owns evidence map maintenance |
| §138.4 sweep miss caught | BankSidebar + BankSubMenu had uncommitted auto-fix-worker regressions · reverted before commit (3rd recurrence this session · noted in roster §10) |

### OP-9 · "Sub Menu has link · main menu node should not show the workspace · b2b,b2c,b2e must present in Main menu" + master data + conditional + transaction + independent + dependent process ops

| Field | Value |
|---|---|
| Operator quotes (13:15 MDT) | "Sub Menu shave link which user will click to see the workspace tab. (so there is dependency of SUB Menu link and Workspace) -main menu node should not show the workspace. b2b,b2c,b2e must present in Main menu" + the full operation list |
| Status | ✅ **DONE** (parallel session) + **drill updated** (this iter) |
| Parallel session shipped | OPERATION_WORKSPACE_LINKS (4 groups · 12 items) · Main Menu B2C/B2B/B2E added · Sub Menu workspace gateway · 3-piece (tab+sub+focus) sync |
| Verified via inspection | BankSidebar:133/167/196 have B2C/B2B/B2E · BankSubMenu has 4 groups · 5 master data entities · 17 tab/18 sub/12 focus refs · 0 workspace components in Main Menu |
| Drill updated (this iter) | `tests/drills/drill_bank_shell_navigation.py` rewritten to 10 steps · 5 negative · enforces OP-9 architecture contract (B2C/B2B/B2E presence · 4 operation groups · 5 master data entities · 3-piece sync · no workspace in Main Menu) |
| Operation groups locked by drill | Master Data Operation (Org/Cust/Ven/Emp/Prod) · Conditional Data Operation · Transaction Data Operation · Process Dependency Operation (Independent/Dependent) |

### OP-10 · "core objective + to-do on top · 1-2 line text explain · goal · agent monitor + feedback · aligned with Main Menu dept + Sub Menu AI/process type · must on top"

| Field | Value |
|---|---|
| Operator quotes (13:40-13:53 MDT · 12-message stack) | "create core objective on top, to do list on top ...which must be align with tab or sub tab" + "every tab must have one agent which is monitoing" + "1-2 line text explain the objective" + "goal" + "to do list" + "they must be align Main menu department and sub menu AI type, process type" + "must on top" + "quality is very poor" + "same repitation" + "no creative" |
| Status | ✅ **DONE** (consolidated header strip + monitor agent) |
| Component shipped | `<TopBriefStrip tab sub proc dept />` rendered as FIRST item in every tab body (above 6 prior widgets) |
| 4-anchor layout | (1) Main Menu › Process › Tab › Sub context · (2) 🎯 Objective (1-line from TAB_PROFILES.intent) · (3) 📌 Goal (1-2 line from TAB_CHARTER.why · trimmed at 200 chars) · (4) ✅ Top-3 to-do (from TAB_OBJECTIVE_EVIDENCE pending+failing) |
| Monitor agent | `sys_tab_monitor_agent` registered in AGENT_ROSTER.md §11 · CHECKER+MONITOR role per §117 · attributed in strip + band displayed (TOP-1% / OK / NEEDS-WORK / FAILING) |
| Drill shipped | `tests/drills/drill_top_brief_strip.py` (8 steps · 4 negative) · locks first-position + 4 anchors + 4 props + roster registration + OP-10 marker |
| §137 self-catch | Initial commit used `background: '#0f172a'` for agent badge · §137 audit FAILED · reverted to `'#f1f5f9'` with border before commit |
| Pending follow-up | Operator's "more diagrams/errors/cadence/mistakes/testing" stack remains · partially captured in `tab-technical-brief.js` (README pilot) · component to render not yet built (deferred to avoid ceremony per "no creative" feedback) |

### OP-11 · "fix all" → render TechnicalRiskBrief · 8 visually-distinct panels · README pilot

| Field | Value |
|---|---|
| Operator quotes (15:36 MDT) | "fix all" (follow-up to 13:42 stack about diagrams/errors/cadence/mistakes/testing) |
| Status | ✅ **DONE** · 8-panel renderer shipped with README pilot showing substantive content |
| Component shipped | `<TechnicalRiskBrief tab proc />` in BankUseCasePage.jsx · 8 panels with DIFFERENT visual shapes (NOT another spec-card grid) |
| 8 panel shapes | (1) Diagrams: mermaid code blocks in violet code-editor cards · (2) Challenges+Strategy: red/blue split-column compare · (3) Edge cases: amber alert grid · (4) Scale/Perf: 4-tile gauge (color-coded ok/warn/fail) · (5) Errors LOGGED: red 2-col table · (5b) Errors SILENT: purple 2-col table · (6) Cadence: 3-column timeline (amber daily / cyan weekly / violet monthly) · (7) Mistakes: red/purple user-vs-architect split · (8) Testing: 9-cell grid (one cell per category) |
| README pilot content (verified by drill) | 3 mermaid diagrams · 4 challenge+strategy pairs · 5 edge cases · 4 scale/perf metrics · 4 errors-logged · 4 errors-silent · 3 daily / 3 weekly / 3 monthly cadence · 4 user mistakes · 4 architect mistakes · 9-category testing plan with 31 test items |
| Drill shipped | `tests/drills/drill_tab_technical_brief.py` (10 steps · 5 negative) · locks panel count + content floor + 4 lens orders + 9 testing categories |
| Wired in renderer | `sec.technicalBrief` consumed in all 4 lens orders (base · engineer · manager · business) · positioned after `outcomeScorecard` · before `kpiViz` |
| Sister agent | sys_tab_monitor_agent (AGENT_ROSTER §11) extended ownership to include `TechnicalRiskBrief` + `tab-technical-brief.js` |
| Pending follow-up | Catalog covers README only · 30 other tabs render "no brief registered" badge per §57.7 honest scaffold · operator can extend per-tab via next `fix all` |

### OP-5 · "each card must have different light color"

| Field | Value |
|---|---|
| Operator quote (10:33 MDT) | "each card must have different light color" |
| Status | ⏳ **Iter 2 partial** · 7 high-impact card-in-list patterns swept in BankUseCasePage (sibling-card grid + map() loops) · 27 strict candidates remain |
| Existing infrastructure | `frontend/src/pages/bank/tabs/BankTabs.jsx:102` (6-color palette) + `BankUseCasePage.jsx:816 cardListTone(index)` helper |
| Audit findings | Originally 120 plain-light bg occurrences · sweep filtered to 34 STRICT card-in-list candidates (excludes chips/badges/phase-colored IPO indicators) · 7 closed this iter · 27 remain |
| Iter 2 swept (commit pending) | 5132 (AI-type validation 4-sibling grid · sibling 0/1/2/3) · 2279 ops.map (add idx) · 5916 entries.map · 6180 items.map (kanban) · 2819 visuals.map · 4471 focusEntry.entries.map · 5209 aiList.map |
| Suggested next action | Pick up 27 remaining strict candidates in next iter · OR move to BankFrameworkPage (20 occurrences) |

### OP-6 · "same all these prompt in checklist of task"

| Field | Value |
|---|---|
| Operator quote (10:33 MDT) | "same all these prompt in checklist of task" |
| Status | ✅ **Done** (THIS FILE) |
| Evidence | `docs/OPERATOR_TASK_CHECKLIST_2026-06-13.md` (this doc) captures all 6 items with quote · status · root cause / blocker · suggested next action |

---

## Done items (from this session, prior iterations)

- ✅ §137 dark-bg block + audit + cron + CI (multiple commits earlier today)
- ✅ §138 operator-next handling policy (`fcb67cb2`)
- ✅ Auto-fix worker 47-file overreach prevention (`b0aff26e`)
- ✅ Parallel-session lock (`1c98f04c`) + worker integration (`79ff5942`)
- ✅ Drill suite expanded: drill_no_black_bg_audit · drill_absence_mode · drill_parallel_lock · drill_bank_shell_navigation · drill_auto_fix_worker_overreach (90 drills · 9 pure-file CI-gated)
- ✅ Absence-mode infrastructure (sentinel + handler + drill + runbook)
- ✅ Backend cache for advisor + checklist + top-1pct endpoints

---

## How operator can drive forward

Reply with the OP-N letter to direct what to fix next:

- `OP-1` → I'll remove Platform Modules from BankSidebar
- `OP-2` → I'll restore in-shell module rendering (rebuild BankWorkspaceModulePage)
- `OP-3 B` → I'll apply instant-scroll fix · or `OP-3 A` / `OP-3 C` for alternatives
- `OP-4 a` / `OP-4 b` / `OP-4 c` → I'll build the chart-list per chosen interpretation
- `OP-5` → I'll sweep BankUseCasePage to apply `cardListTone(i)` to plain-light cards
- `do all` → I'll execute in this order: OP-3 B (smallest) → OP-1 → OP-5 → OP-2 → OP-4

---

## §138 self-policing notes

This checklist exists because the session has had 6+ operator directives that crossed conversation boundaries — without persistence, items can drop. Per §138.9 brutal rule, the honest answer to "did you fix all?" was NO, and capturing this checklist is what makes the next "did you fix all?" question answerable with evidence (each row's status field).

The drill discipline that exists for code invariants (~90 drills · 9 CI-gated) should arguably extend to operator-request tracking. Future: drill that this file exists + has at minimum the open-items table + suggests next actions for each.

**Effective date**: 2026-06-13 10:33 MDT. **Author**: claude-opus-4-7 in the session continuing from §138 ship.
