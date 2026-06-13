# Agent Roster · insur_project

> Canonical list of system agents (`sys_*`) operating in this repository.
> Each agent has named responsibilities, owned artifacts, and a §117
> orchestra role (CHECKER · PLANNER · EXECUTOR · MONITOR · APPROVER).

Effective date: 2026-06-13 MDT. Composes with §57.6 (canonical audit
fields) · §57.7 (honest scaffold) · §103.5 (HITL approval) · §117
(5-agent orchestra) · §122 (brutal feedback) · §138 (operator-handling).

---

## §1 · sys_brutal_feedback_agent (global §122)

| Field | Value |
|---|---|
| **Role** | CHECKER (§117) |
| **Owned artifact** | `scripts/brutal.py` |
| **Responsibility** | Score every response on 11 dimensions · output band (TOP_1_PCT / TOP_5_PCT / TOP_25_PCT / MID / BOTTOM) |
| **Trigger** | End of every assistant turn (per global §122) |
| **HITL** | None — score is advisory |

---

## §2 · sys_advisor_agent

| Field | Value |
|---|---|
| **Role** | CHECKER + MONITOR (§117) |
| **Owned artifact** | `backend/services/missing_items_advisor.py` · endpoint `/api/v1/missing-items-advisor/scan` |
| **Responsibility** | Detect missing items by P0/P1/P2/P3 severity · feed §138 picker |
| **Trigger** | Per §105 (operator types "next") · per §106 cron auto-loop |
| **HITL** | None — advisory only |

---

## §3 · sys_pending_topics_agent

| Field | Value |
|---|---|
| **Role** | CHECKER (§117) |
| **Owned artifact** | `scripts/pending_topics_agent.py` |
| **Responsibility** | Surface uncommitted-real files + working-tree drift · feed §138 sweep |
| **Trigger** | Per §138.4 sweep |
| **HITL** | None — discovery only |

---

## §4 · sys_137_dark_bg_audit_agent

| Field | Value |
|---|---|
| **Role** | MONITOR (§117) |
| **Owned artifact** | `scripts/audit_no_black_backgrounds.sh` · cron @ 09:00 + 21:00 daily |
| **Responsibility** | Detect black/dark backgrounds in content/workspace areas (per §137) |
| **Trigger** | Cron + per-iter §138.4 sweep |
| **HITL** | None — auto-blocks merge via CI gate |

---

## §5 · sys_auto_next_loop_agent

| Field | Value |
|---|---|
| **Role** | PLANNER + EXECUTOR (§117) |
| **Owned artifact** | `scripts/auto_next_loop.py` · cron @ */5 min |
| **Responsibility** | Pick top-1 actionable per §138.5 P0/P1/P2/P3 ladder · auto-execute safe-list (§106) |
| **Trigger** | Cron */5 min |
| **HITL** | §42 gated operations require operator confirmation |

---

## §6 · sys_council_agent

| Field | Value |
|---|---|
| **Role** | CHECKER + APPROVER (§117) |
| **Owned artifact** | `agents/council_agent.py` (3-stage: author · reviewer · advisor) |
| **Responsibility** | Adversarial review of non-trivial fix proposals (per §50.3 council pattern) |
| **Trigger** | Per `scripts/run_council_batch.py` |
| **HITL** | Operator selects winning proposal |

---

## §7 · sys_tab_outcome_scoring_agent

| Field | Value |
|---|---|
| **Role** | CHECKER (§117) |
| **Owned artifact** | `frontend/src/pages/bank/tabs/tab-objective-evidence.js` (115 rules across 31 tabs) |
| **Responsibility** | For every tab in the bank workspace: evaluate each TAB_CHARTER objective against process data · maintain evidence_rule per objective · keep 100% coverage parity with TAB_CHARTER · enforce §57.7 honest split between auto-verifiable and operator_confirms |
| **Trigger** | Per render of `<TabOutcomeScorecard>` (frontend · React) · per `drill_tab_outcome_evaluator.py` (CI) |
| **HITL** | `operator_confirms` rules wait for operator sign-off (per §103.5 · audit row logged) |
| **Drilled by** | `tests/drills/drill_tab_outcome_evaluator.py` (8 steps · 4 negative) |
| **Reports** | aggregate band per tab: `top-1pct` ≥80% · `ok` 60-79% · `needs-work` <60% · `failing` any ✗ |
| **Owner authority** | When charter objectives change (new entry / removed / renamed), this agent MUST update `tab-objective-evidence.js` to maintain count parity. Drill fails CI if not synchronized. |
| **Established** | 2026-06-13 11:42 MDT · per operator "fix all ..have agent assign for this task" + "100% ..top 1" |

### Sub-responsibilities

1. **Rule classification** — for each new objective: AUTO (concrete `proc.*` path) OR CONFIRM (qualitative · needs HITL). Default to CONFIRM when uncertain · NEVER fake-AUTO (§57.7).
2. **Rule maintenance** — when proc blueprint shape changes, audit affected `path` fields and update.
3. **Band threshold review** — quarterly check if 80% top-1% threshold matches operator expectation.
4. **HITL coordination** — wire `operator_confirms` rules to the §103.5 HITL approval table when implemented.

### Cross-tab scoring report (future)

Roll up per-tab scores into an aggregate workspace scorecard. Surface via `/api/v1/holy/scorecard/workspace` once implemented.

---

## §8 · sys_charter_coverage_agent (sister to §7)

| Field | Value |
|---|---|
| **Role** | CHECKER (§117) |
| **Owned artifact** | `tests/drills/drill_tab_charter_coverage.py` |
| **Responsibility** | Enforce TAB_PROFILES ⊆ TAB_CHARTER (no goal-blind tab) · 8 canonical fields per charter · objectives[] ≥ 3 per tab |
| **Trigger** | CI per PR · per-iter §138.4 sweep |
| **HITL** | None — drill blocks merge if violated |
| **Established** | 2026-06-13 11:30 MDT · per operator "10/10" + "fix all" |

---

## §9 · sys_bank_shell_navigation_agent

| Field | Value |
|---|---|
| **Role** | CHECKER (§117) |
| **Owned artifact** | `tests/drills/drill_bank_shell_navigation.py` |
| **Responsibility** | Enforce bank-internal Links use in-shell navigation · shell-breaking links have `target=_blank` · Platform Modules block stays removed (OP-1) · /ai-types stays in-shell (OP-2) |
| **Trigger** | CI per PR |
| **HITL** | None |
| **Established** | 2026-06-13 (OP-1 + OP-2 ship) |

---

## §11 · sys_tab_monitor_agent

| Field | Value |
|---|---|
| **Role** | CHECKER + MONITOR (§117) — per-tab feedback agent |
| **Owned artifact** | `frontend/src/pages/bank/BankUseCasePage.jsx::TopBriefStrip` + `BankUseCasePage.jsx::TechnicalRiskBrief` + `tab-objective-evidence.js` + `tab-technical-brief.js` |
| **Responsibility** | For every (dept, process, tab, sub-tab) tuple in the bank workspace: surface a 1-line objective (from TAB_PROFILES.intent), 1-2 line goal (from TAB_CHARTER.why), top-3 todos (from TAB_OBJECTIVE_EVIDENCE pending+failing), monitor agent attribution, and band (TOP-1% / OK / NEEDS-WORK / FAILING). The strip MUST be the first render item in every tab body — no widget pushes it down. |
| **Aligns with** | Main Menu (department) · Sub Menu (process / AI type / process-type) · §73 17-tab right pane |
| **Trigger** | Every TopBriefStrip render (frontend reactive) · per drill_tab_outcome_evaluator (CI) |
| **HITL** | Pending rules wait for §103.5 operator confirmation · failing rules block tab completion |
| **Drilled by** | `tests/drills/drill_top_brief_strip.py` (new this iter) |
| **Reports** | Per-tab band rendered live: TOP-1% (≥80% verified) · OK (60-79%) · NEEDS-WORK (<60%) · FAILING (any ✗) |
| **Owner authority** | When operator says "this tab feels poor", check the strip — it surfaces objective + goal + todo + band. The strip IS the feedback channel. |
| **Established** | 2026-06-13 13:53 MDT · per operator 12-message stack |

### Why this agent exists

Operator's recurring complaint pattern: "where is the goal" · "where is the objective" · "what's the to-do" · "who is monitoring this tab" — the answer was always "buried 6 widgets deep." sys_tab_monitor_agent fixes this by owning the TOP strip. If a tab lacks objective+goal+todo+band visible in the first 200px, the agent has failed and the drill catches it.

### Composes with prior agents

- **§7 sys_tab_outcome_scoring_agent**: provides the score that drives band + todo list
- **§8 sys_charter_coverage_agent**: enforces TAB_CHARTER has the goal data sys_tab_monitor_agent reads from
- **§4 sys_137_dark_bg_audit_agent**: ensures the strip doesn't get a dark background

---

## §10 · sys_auto_fix_worker

| Field | Value |
|---|---|
| **Role** | EXECUTOR (§117) — DANGEROUS |
| **Owned artifact** | `~/.claude/scripts/agent-auto-fix-worker.py` (global · NOT in this repo) |
| **Responsibility** | Auto-stage + commit fixes from ruff/mypy output |
| **Trigger** | Cron */15 min (per global agent-auto-fix config) |
| **HITL** | None auto-merge — but operator must verify diffs before push |
| **Known issues** | Has historically introduced regressions (e.g., BankSidebar Link removal · 2026-06-13). Requires §138.4 sweep with all drills to catch its working-tree noise. |
| **Mitigation** | sys_pending_topics_agent should surface its uncommitted changes per §138.4 |

---

## Conventions

- **All `sys_*` agents** are advisory unless drill-locked. Drill-locked = CI gate · cannot bypass without explicit operator override.
- **HITL escalation** routes via §103.5 approval table when implemented.
- **Audit rows** carry §57.6 canonical fields: `request_id`, `tenant_id`, `actor`, `tool`, `latency_ms`, `outcome`.
- **Agent renaming** requires updating both this roster AND the drill that locks the agent (per the agent's "Drilled by" field).

## How to add a new agent

1. Pick a § number (next available)
2. Fill all required fields above
3. Reference the §117 orchestra role (CHECKER · PLANNER · EXECUTOR · MONITOR · APPROVER)
4. Name the owned artifact (script path · config path · endpoint)
5. Name the trigger (cron · render · per-PR · per-iter)
6. Name the HITL boundary (what requires operator confirmation)
7. Create a drill if the agent makes assertions about state
8. Update this roster + commit

## §122 brutal honesty about this roster

This roster is a §57.7 honest list of EXISTING agents · not aspirational. Adding "agents we wish existed" without owned artifacts is ceremony. Every § here points to a real file path. If a §-row stops being true (artifact deleted), the row MUST be removed in the same commit.
