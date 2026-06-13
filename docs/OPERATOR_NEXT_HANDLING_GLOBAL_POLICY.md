# Operator-Typed "Next" Directive Handling — Project-Local Policy

Mirrors global §138 at `~/.claude/policies/operator-next-handling.md` ·
applied to this project per §58 (every project mirrors applicable globals
locally for discoverability via `docs/GOVERNANCE_INDEX.md`).

## Rule

When the operator types ANY of `next` · `fix all` · `create plan and fix all` ·
`create plan for all pending` · `check all pending` · `push` · `1` · `go` ·
`continue` · `auto` — Claude MUST run the 10-dimension sweep, build a
prioritized plan, execute autonomously per §42 safe-allowlist, and report
in the §138.8 shape (Done table · Final state · Pending · Future · §122
brutal score).

## The 10-dimension sweep (≤ 30 seconds)

1. `curl POST /api/v1/missing-items-advisor/scan` (cached 60s)
2. `curl /api/v1/test-catalog/top-1pct-report`
3. `curl /api/v1/production-checklist/summary`
4. `python scripts/pending_topics_agent.py --format json` (includes finder)
5. `bash scripts/audit_no_black_backgrounds.sh` (§137)
6. `git status --short` (real-code vs runtime churn classification)
7. `tail jobs/logs/auto-next.log` (auto-loop heartbeat)
8. Log mtime check for cron jobs (§137 audit / watchdog / rotation / etc.)
9. `ls .agent/pending_*.diff` (dispatcher state)
10. `git rev-list --count insur-origin/main..HEAD` (commits ahead)

## Plan priority

| Severity | Examples | Action in this project |
|---|---|---|
| P0 | Advisor P0 · §137 audit FAIL · top-1pct drop > 50% · drill regression | Auto-fix · commit · report |
| P1 | Advisor P1 · finder uncommitted-real > 0 · §150 watchdog silent | Auto-fix · commit · report |
| P2 | Backlog items · perf cache opportunities · drill missing | Auto-fix if < 10 min |
| P3 | Stale workforce hygiene · low-priority | Defer |
| Gated | `push` · force-push · prod write · external | NEVER auto-execute |

## Required deliverables for THIS project (§138.10)

- ✅ `scripts/pending_topics_agent.py` (extra_scans includes uncommitted-real finder)
- ✅ `scripts/auto_next_loop.py` (wired to extra_scans per ADR-012)
- ✅ `scripts/auto_next_dispatcher.sh` (§109 dynamic timer)
- ✅ Advisor /scan endpoint cached with 60s TTL (`backend/missing_items_advisor/router.py`)
- ✅ Per-project §137 audit at `scripts/audit_no_black_backgrounds.sh`
- ✅ 3 new drills in `tests/drills/` (auto_next_loop_wiring · history_rotation · advisor_cache)
- ✅ ADR-012 records the dispatcher wiring decision (`docs/architecture/adr/`)

## Reference

- Global policy: `~/.claude/policies/operator-next-handling.md`
- Global §138 master entry: `~/.claude/CLAUDE.md` line 8453
- Reference impl commits (this project): `78c7b18f` (§137) → `c61c5abe` (race-fix)
  · 17 commits demonstrating the full discipline

## Composes with

§38.3 audit · §42 safe-allowlist · §43 drill · §44/§55/§105/§106/§109/§115/§116/§118
(existing autonomous-loop) · §47.3 ADR · §51 substrate · §54 no trailer ·
§57.7 honest · §70 cron audit · §80 consolidator · §99 production-ready ·
§107 5-stamp · §122 brutal · §137 dark-bg-block.

## Brutal rule

> Short directive · long discipline. The sweep IS the answer to "what next?"
> A "stable" status that lies is worse than a "no-handler" that tells the truth.
> The discipline is the product.

**Effective date for this project**: 2026-06-12.
