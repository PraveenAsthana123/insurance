# Phase 100 Autonomous Build Plan

> **Window:** 180 hours (7.5 days) of autonomous operation
> **Trigger:** cron, every 30 minutes
> **Plan source:** the consolidated pending list at the end of commit `bdf9a2bc`
> **Cron walker:** [`scripts/schedule_phase100_build.sh`](../scripts/schedule_phase100_build.sh)
> **State file:** `.phase100-build-state` (gitignored)
> **Kill switch:** `./scripts/schedule_phase100_build.sh pause`
>
> This plan continues the Phase 0–23 work driven by
> [`UI_DASHBOARD_BUILD_PLAN.md`](UI_DASHBOARD_BUILD_PLAN.md). Phase
> numbering deliberately jumps to 100 to mark the autonomous-loop
> continuation following the 9-commit UI session that landed
> 15bd0dc0..379389c7.

## At-a-glance — 21 phases

| # | Phase | Pre-approved? | Backend req? | Est. effort |
|---|---|---|---|---|
| 100 | Backend health probe + apply migrations 013–017 | ✅ | yes | 5m |
| 101 | Wire `catalogs` + `tenants_admin` routers into main.py | ⚠ operator | yes | 2m |
| 102 | Run `drill_ai_assurance_catalog.py` (22 phases × 2 families) | ✅ | yes | 5m |
| 103 | Run `drill_tenant_seed.py` (1 tenant + 24 depts) | ✅ | yes | 5m |
| 104 | Run `drill_dt_checklists_present.py` (4 DT docs + cross-link) | ✅ | no | 3m |
| 105 | Migration 018 — RLS policies enforcing `tenant_id` at SQL boundary | ⚠ operator (DDL) | yes | 60m |
| 106 | Migration 019 — FK linkage for pre-existing tenanted tables | ⚠ operator (DDL) | yes | 30m |
| 107 | `canada_finance_2026.md` — banking DT checklist (OSFI / FCAC / PCI-DSS / SOX) | ✅ | no | 30m |
| 108 | `eu_pharma_2026.md` — EMA + EU MDR + EU AI Act + GDPR DT checklist | ✅ | no | 30m |
| 109 | DataExplorer CSV export button (re-emit parsed data) | ✅ | no | 15m |
| 110 | DataExplorer column-stat sidebar (min/max/mean/median/null-count) | ✅ | no | 30m |
| 111 | Wire PhaseDetailPage Dashboard tab to live `/api/v1/catalogs/modules` | ✅ | yes | 45m |
| 112 | Per-tenant scoping (`X-Tenant-ID` + `?tenant_id=`) on Dashboard + Report | ✅ | yes | 45m |
| 113 | TenantsPage mutation endpoints (create/enable/grant — RBAC-gated) | ⚠ operator | yes | 90m |
| 114 | 17 ml_methodology drills (per commit 71c073ce body) | ✅ | mixed | 4h |
| 115 | 10 RAI drills (per commit 6f548bba body) | ✅ | mixed | 3h |
| 116 | 7 RbD drills (per commit 7b6f52a1 body) | ✅ | mixed | 2h |
| 117 | Migration 020 — `dept_framework_applies` matrix (per-dept × per-framework) | ⚠ operator (scope) | yes | 60m |
| 118 | Migration 021 — `dept_phase_applies` matrix (per-dept × per-phase) | ⚠ operator (scope) | yes | 60m |
| 119 | Expand `healthcare_industry_processes.md` to full sub-process tables | ⚠ operator (scope) | no | 90m |
| 120 | Lazy-load Plotly per-chart inside ChartShowcase | ✅ | no | 30m |

**Totals:** 21 phases · 13 pre-approved · 8 operator-gated · ~19h cumulative effort within 180h window.

## Pre-approval token economy (per §42 + §44)

The walker holds **12 pre-approval tokens** at start. Each
`require_human_approval` decision from the Approval Broker
**decrements the token count by 1**. When tokens reach 0, the loop
transitions to `STATUS=awaiting_operator` and exits.

| Token category | Initial | Refilled by |
|---|---|---|
| Migration apply (`psql -f`) | 3 | operator `advance` cmd |
| Backend restart | 2 | operator `advance` cmd |
| Drill execution | unlimited | n/a (auto-approved per §50.7) |
| Markdown doc creation | unlimited | n/a (auto-approved per §42 markdown) |
| Frontend build | unlimited | n/a (local dev) |
| Git commit + push (non-force, feature branch) | unlimited | n/a (§42 pre-approved) |
| Git push --force to main | 0 | **operator-only**, no token grant |
| DDL on production-named DBs | 0 | **operator-only**, no token grant |
| `rm -rf` outside `dist/` / `node_modules/` | 0 | **operator-only** |
| External webhook calls | 0 | **operator-only** |

## §42 hard gates (NEVER auto-approved)

Per global [§42 policy](/home/praveen/.claude/policies/autonomy-operations.md):

- `git push --force origin main` / `master` — flat refused
- `rm -rf /` / `rm -rf $HOME` / `rm -rf /etc` / `rm -rf /usr` — flat refused
- `npm publish` / `pip upload` / `cargo publish` / Docker Hub push — flat refused
- `gh secret set` / modify auth providers / secret stores — flat refused
- Slack / Discord / external webhook calls — flat refused
- `terraform destroy` / `kubectl delete namespace prod` — flat refused

If a phase requires any of the above, walker writes the request to
`STATUS=awaiting_operator` and exits with the exact command the
operator would need to run.

## Walker state machine

```
.phase100-build-state file format:
  CURRENT_PHASE=104               # next phase to execute
  STATUS=running                  # running | paused | awaiting_operator | complete
  PRE_APPROVAL_TOKENS=11          # decrements per gated operation
  AUTONOMOUS_DEADLINE=2026-06-09T20:00:00Z  # 180h from initial start
  LAST_RUN=2026-06-01T20:30:00Z
  LAST_PHASE_OUTCOME=passed       # passed | failed | gated | skipped
```

Per-invocation flow:

1. Read `.phase100-build-state`. If absent → bootstrap (CURRENT_PHASE=100, STATUS=running, TOKENS=12).
2. If `STATUS=paused` → exit silently (kill switch active).
3. If `STATUS=complete` → exit with completion banner.
4. If `now > AUTONOMOUS_DEADLINE` → set `STATUS=awaiting_operator`, exit.
5. Look up `PHASES[CURRENT_PHASE]`. If undefined → set `STATUS=complete`, exit.
6. Run phase:
   * Determine if backend required (per `BACKEND_REQUIRED[phase]`).
   * If required + backend unreachable: skip phase, set `LAST_PHASE_OUTCOME=skipped_backend_offline`, **don't advance** (next cron retries).
   * Else run phase function. Result: `passed` / `failed` / `gated`.
7. If `passed` → commit changes, advance `CURRENT_PHASE`.
8. If `failed` → set `STATUS=awaiting_operator`, log to audit, exit.
9. If `gated` → decrement `PRE_APPROVAL_TOKENS`. If `tokens > 0`, accept gate + retry; if `tokens == 0`, set `STATUS=awaiting_operator`, exit.

## Operator commands

```bash
# Bootstrap + first iteration
./scripts/schedule_phase100_build.sh start

# Run one iteration immediately (bypass cron)
./scripts/schedule_phase100_build.sh --now

# Human-readable status
./scripts/schedule_phase100_build.sh status

# Pause the loop (kill switch)
./scripts/schedule_phase100_build.sh pause

# Resume after pause
./scripts/schedule_phase100_build.sh resume

# Manually advance past a gated phase (refills tokens)
./scripts/schedule_phase100_build.sh advance

# Skip current phase and move to next
./scripts/schedule_phase100_build.sh skip

# Tail the audit log
./scripts/schedule_phase100_build.sh logs
```

## Per-phase exit criteria (KPIs)

| Phase | Exit criteria |
|---|---|
| 100 | `/api/health` returns 200; all 5 migrations applied (psql confirms) |
| 101 | `/api/v1/catalogs/phases` returns 200 with 22 rows |
| 102 | `drill_ai_assurance_catalog.py` exits 0 with `ALL N STEPS PASSED` |
| 103 | `drill_tenant_seed.py` exits 0 |
| 104 | `drill_dt_checklists_present.py` exits 0 |
| 105 | RLS-enabled query as tenant-a returns 0 rows of tenant-b data |
| 106 | All pre-existing tenanted tables have `tenant_id` FK to `tenants.id` |
| 107 | `docs/digital_transformation/canada_finance_2026.md` exists, 12 domains, compliance index has OSFI + FCAC + PCI-DSS |
| 108 | `docs/digital_transformation/eu_pharma_2026.md` exists, 12 domains, EU AI Act Art. 6/14/50/86 cited |
| 109 | DataExplorer renders an "Export CSV" button that downloads `<dept>__<file>__<date>.csv` |
| 110 | DataExplorer renders column-stat sidebar with min/max/mean/median/null-count per column |
| 111 | PhaseDetailPage Dashboard fetches from `/api/v1/catalogs/modules?phase_id=<N>` instead of mock seed |
| 112 | Dashboard + Report tab respect `?tenant_id=` and `X-Tenant-ID` header |
| 113 | `POST /api/v1/admin/tenants` + `PUT /api/v1/admin/tenant-departments/{id}` work; RBAC-gated to `tenant_admin` role |
| 114-116 | All 34 drills exist, each ≥ 8 steps + ≥ 3 negative; all exit 0 |
| 117 | Migration 020 applies; 19 depts × 11 frameworks = 209 rows seeded |
| 118 | Migration 021 applies; 19 depts × 11 phases = 209 rows seeded |
| 119 | `healthcare_industry_processes.md` expanded from 105 lines (family stub) to ≥ 500 lines (sub-process tables) |
| 120 | ChartShowcase first paint < 500KB gzip (plotly+echarts both lazy per chart) |

## Composes with

- §38 (AI Production Governance) — every walker decision lands a §38.3 audit row in `data/agent-supervisor/insur_reads.jsonl`
- §42 (Operational Autonomy) — pre-approval token economy enforces the gated list verbatim
- §43 (Drill Discipline) — Phases 102–104 + 114–116 are pure drill-execution phases; ≥ 3 negative assertions per drill
- §44 (Autonomous Feature Loop) — 21-phase iteration mode within the 180h window
- §47.11 (pre-release gates) — every phase has named exit criteria
- §51 (Forensic Substrate) — every commit from the walker carries Date / Location / Approach / Policies / Verification
- §54 (no Co-Authored-By trailer) — walker commits in user identity only
- §57.5 (5-question runbook) — `status` command answers WHAT / WHEN / WHO / WHY / HOW-to-rollback
- §66 (per-dept artifacts) — Phases 107–108 + 117–119 land per-dept content

## Risk register

| Risk | Mitigation |
|---|---|
| Backend remains offline for whole window | Phases 100/101/105/106/111/112/113/117/118 skip; Phases 102/103/104/107/108/109/110/114-116/119/120 still progress |
| `psql` migration apply fails on phase 105 (RLS syntax error) | Walker writes failure to audit + exits; operator runs phase manually |
| Drill flakes (network / fleet down) | Walker retries up to 3× per phase; on 3rd failure flips to `STATUS=awaiting_operator` |
| Token economy exhausts before phase 120 | Walker exits with summary of which gates were hit + how to refill |
| Disk fills with audit logs | Walker rotates `data/agent-supervisor/phase100_build.log` at 50MB |
| Operator changes branch mid-loop | Walker stays on `feature/phase1-admin-manager-hubs`; on detached HEAD, exits |

## The brutal rule

> A 21-phase autonomous loop with no exit criteria per phase is
> a script that runs forever and ships nothing. This plan exists
> because the alternative is "claude works on follow-ups when
> the operator pings" — which compresses to zero progress when
> the operator is AFK. The plan is the contract; the walker is
> the executor; the state file is the audit; the operator can
> pause at any time.
