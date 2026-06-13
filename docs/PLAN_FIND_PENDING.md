# PLAN — Find Pending + Fix All · 2026-06-12 19:18 MDT

> Operator directive: "create plan ..find pending and fix all .."
> Standing 'no need to ask approval' authorizes batch.

## Snapshot · BEFORE this batch

| Gap-finder | State |
|---|---|
| `/missing-items-advisor/scan` | **0 findings** (P0/P1/P2/P3 all zero) |
| `/test-catalog/top-1pct-report` | A · 11/11 · 0.989 · is_top_1_pct true |
| `/status-agents/all` | **7 of 7 GREEN** |
| `/eaos/scoreboard` | 0.985 · 9 done · **1 mostly** (Agent Registry · UI score 0.5) |
| `feature_backlog_audit.py` | 12/16 (75%) · 0 missing · **4 partial** |
| `production-checklist/summary` | 106/106 = 100% |

## Pending items (real)

### Real partials (live endpoint paths don't match audit-script expectations)

| # | Item | Issue | Fix |
|---|---|---|---|
| EAOS-A | Agent Registry · UI 0.5 | Page lives in `components/` not `pages/` so `_page_exists` returns False | Update `_page_exists` to also search `frontend/src/components/` |
| F04 | Audit Log Explorer | Audit script expects `GET /api/v1/audit-search/recent` (404). Real: `/api/v1/audit-chain/recent` | Update audit script + AuditExplorerPage endpoint |
| F05 | Cost Optimizer | Audit script expects `GET /api/v1/eai-os/cost` (404). Real: `/api/v1/agent-kernel/cost/usage` | Update audit script + CostOptimizerPage endpoint |
| F08 | Vector DB Browser | Audit script expects `GET /api/v1/agent-kernel/memory` (no such path). Real (NEW): `/api/v1/vector-browser/collections` | Update audit script paths |
| F14 | Embedding Playground | Audit script expects `GET /api/v1/agent-kernel/memory` (no such path). Real (NEW): `GET /api/v1/embeddings/health` | Update audit script paths |

### Status agent · Pending Tasks 90.5%
- 2 ⏳ counted in `docs/PENDING_TASKS_PLAN.md` are LITERAL emoji occurrences in the doc's help-text (lines 290+292), not real tasks. The counter naively `text.count("⏳")`.
- Fix · adjust `_agent_pending_tasks()` to subtract known help-text references OR move literal emojis out of the doc.

## Targets · AFTER this batch

```
EAOS Top-10        0.985 → 1.000 (all 10 → done)
F00 backlog        12/16 (75%) → 16/16 (100%) · 0 partial · 0 missing
Pending tasks      90.5% → 100% (help-text literals replaced)
```

## Closures shipped

1. `backend/eaos_scoreboard/router.py` · `_page_exists` searches both `pages/` AND `components/`
2. `scripts/feature_backlog_audit.py` · corrected paths for F04, F05, F08, F14
3. `frontend/src/pages/AuditExplorerPage.jsx` · endpoint → `/api/v1/audit-chain/recent`
4. `frontend/src/pages/CostOptimizerPage.jsx` · endpoint → `/api/v1/agent-kernel/cost/usage`
5. `docs/PENDING_TASKS_PLAN.md` · replace literal ⏳ in help-text with named markers

## Verification

```bash
curl -s http://localhost:8001/api/v1/eaos/scoreboard -H "X-Demo-Role: manager" | \
  jq '.overall_score, .summary'
# target: 1.0 · all 10 done

python3 scripts/feature_backlog_audit.py | head -2
# target: 16/16 · 0 partial · 0 missing

curl -s http://localhost:8001/api/v1/status-agents/all | \
  jq '.status_agents[] | select(.label=="Pending Tasks") | .summary'
# target: 0 pending · 100% complete
```

**Effective**: 2026-06-12 19:18 MDT. Composes with §44 · §57.7 · §96 · §150.
