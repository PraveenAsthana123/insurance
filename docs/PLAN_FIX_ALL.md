# PLAN_FIX_ALL — Remaining work tracker (autonomous loop)

> Per global §73-§76 + operator 2026-06-01 "create plan, cron, fix all".
> Each row maps to a subcommand of `scripts/fix_all_runner.sh`.
> Status update auto-written to `jobs/reports/fix_all_<TS>.md` per cron run.

## Scope

Three buckets:
1. **§77 custom-build rows** (9 remaining) — each ~50-100 LOC, follows
   the Council + HITL pattern landed in commit `167fd26`.
2. **Prior-session blockers** carried over from before this loop.
3. **Operator-decision items** parked under "Deferred" (paid SaaS, etc.).

## Bucket 1 — §77 custom-build rows

| Row | Capability | Maps to | Status | Subcommand |
|---|---|---|---|---|
| 1403 | Agent Registry | §63 registry table | TODO | `registry` |
| 1410 | Agent Workforce Mgmt | §64.40 + existing insur_fleet | partial → consolidate | `workforce` |
| 1413 | Agent Cost Engine | §41.1 + existing token job | partial → tally + cap | `cost-engine` |
| 1419 | Agent Reflection | §64.43 #10 Reflection loop | TODO | `reflection` |
| 1426 | Memory Governance | §38.3 + §47.6 SOC2 CC6.2 | TODO | `memory-gov` |
| 1431 | Shared Memory (Blackboard) | §64.43 #5 | TODO | `blackboard` |
| 1439 | Memory Auditing | §38.3 audit row | partial → enforce | `memory-audit` |
| 1446 | Entity Resolution | wrap `dedupe` pip pkg | TODO | `entity-res` |
| 1457 | Knowledge Auditing | §38.3 audit row | partial → enforce | `knowledge-audit` |

## Bucket 2 — Prior-session blockers

| Item | Symptom | Fix path | Subcommand |
|---|---|---|---|
| Backend route loader stale | `/api/v1/insurance/depts` → 404 | `kill -HUP <uvicorn-pid>` OR docker restart | `backend-reload` |
| 40 stub artifacts | underwriting / customer-service / fraud-siu | re-run scaffolders | `fill-stubs` |
| SQL in `routers/tenants_admin.py` | global §3 violation | extract to `repositories/tenant_repo.py` | `move-sql` |
| 42 drill skeletons missing assert | scaffolder placeholders | inject 1 pos + 1 neg per drill | `fill-drills` |
| Ragas shim may be overwritten | next `pip --upgrade ragas` wipes shim | post-install hook re-applies | `ragas-shim` |

## Bucket 3 — Deferred (operator decision)

| Item | Why deferred |
|---|---|
| Lakera (1409) | Paid SaaS — billing decision |
| Purview (1450) | Azure subscription — operator decision |
| Spec Kit npm bundle | Upstream npm package is private — pip+clone is the supported path |
| 7 future-stack rows | Emerging — no upstream tool yet |

## Cron schedule

```
0 3 * * *    fix_all_runner.sh nightly        # registry+cost-engine+memory-gov+memory-audit
0 4 * * 0    fix_all_runner.sh weekly         # ragas-shim + backend-reload + fill-stubs
15 * * * *   fix_all_runner.sh quick-checks   # entity-res sample + blackboard sweep
```

Tag: `# === INSUR-FIX-ALL ===` (idempotent).

## Drill (release-blocker)

`tests/drills/drill_fix_all.py` — ≥3 negative assertions per §43.6. Steps:
1. Registry JSON has expected shape
2. Reflection module imports + has loop
3. Blackboard CAS-locked write/read
4. Memory audit row schema matches §38.3
5. Knowledge audit row schema matches §38.3
6. Entity Resolution dedupe sanity
7. NEGATIVE: backend route loader stale detected
8. NEGATIVE: stub artifact (< 200B) flagged
9. NEGATIVE: SQL-in-router detected when reintroduced
