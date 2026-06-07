# Audit Fix Plan (2026-06-06)

Source: external-agent audit dump pasted by operator 2026-06-06 22:30 MDT
Status: operator granted "all approval" — autonomous execution allowed

## Scope split

| Category | Items | Autonomous? |
|---|---|---|
| Build blockers | 31 frontend lint + 21 backend collection errors | ✓ DONE |
| Test environment | 7 rbac fails + 44 errors = postgres-unreachable | ✓ This plan |
| Security / hardcoded | passwords, dept lists, paths, URLs | ✓ This plan |
| Strategic | 4-vs-22 dept scope, derived placeholder backfill | ✗ Operator |
| Domain content | 322 `derived: true` blocks | ✗ Operator |
| Worktree triage | 762 dirty entries | ✗ Operator |

## Phase 1 — already complete (last session)

- [x] Fixed 31 ESLint errors in `BankUseCasePage.jsx` (duplicate keys + hook rule + empty catches)
- [x] Patched `scripts/project_doctor.sh` to auto-resolve venv via `~/.claude/python-venv-map.json` (§61)
- [x] Backend tests now collect: 84 PASS · 8 fail · 44 errors (was 21 collection errors / 0 ran)
- [x] Frontend lint exit 0

## Phase 2 — this plan (autonomous, under cron)

### 2.1 Postgres-unreachable test marker
- Add `pytest.ini` marker `requires_postgres`
- Mark all `test_rbac_middleware.py`, `test_sales_router.py`, `test_supply_chain_router.py`, `test_rossmann_ingestion.py`, `test_supply_chain_ingestion.py` (and similar) with `@pytest.mark.requires_postgres`
- Add `conftest.py` auto-skip when port 5432 unreachable
- Expected outcome: backend tests = 84 PASS · 0 fail · 0 errors when DB down · still 84 PASS + more PASS when DB up

### 2.2 Extract `INSURANCE_DEPTS` to config (4 → 22 ready)
- Source-of-truth: `data/insurance/blueprint.json::department_catalog`
- Or `config/insurance.catalog.json::departments`
- Loader helper in `backend/core/insurance_config.py`
- Update `backend/routers/insurance.py`, `scripts/audit_insurance_artifacts.py` to import from helper
- Keeps current 4-dept behavior via env flag `INSUR_DEPT_SCOPE=enabled` (default = the 4)

### 2.3 Remove hardcoded DB password fallbacks (security)
- `scripts/ingest_rossmann.py` line 36 — fallback `insur_secret_password`
- `scripts/ingest_customer_telco.py` line 55 — same
- Replace with `os.environ['INSUR_DB_PASSWORD']` (fail loudly if missing)

### 2.4 Frontend API timeout to env-derived
- `frontend/src/services/api.js` line 11 — hardcoded `10000`
- Replace with `Number(import.meta.env.VITE_API_TIMEOUT_MS) || 10000`
- Update `.env.template` with `VITE_API_TIMEOUT_MS=10000`

### 2.5 Install cron for the fix-loop
- Use existing `scripts/insur_fix_loop.sh`
- Light run every 30 min · comprehensive 09:00 + 21:00
- Crontab tag: `# INSUR-FIX-LOOP` for idempotent install
- Log to `jobs/logs/insur_fix_loop_cron.log`
- New: also schedule `scripts/audit_insurance_artifacts.py` daily at 02:00 to refresh audit state

## Phase 3 — pending operator decision (NOT in this plan)

- Decide: 4 dept scope (claims/underwriting/customer-service/fraud-siu) vs all 22
- Backfill: 322 `derived: true` placeholder content with operator-authored process truth
- Decide: fate of the 762 dirty worktree entries
- Provision: postgres credentials in dev env (`INSUR_DB_PASSWORD`) so tests can actually hit a real DB
- Re-evaluate: fraud-SIU 100% accuracy (single-class confusion matrix = data imbalance issue)

## Cron schedule (after install)

```
*/30 * * * *  → scripts/insur_fix_loop.sh --light   (every 30 min)
0 9,21 * * *  → scripts/insur_fix_loop.sh --comprehensive (09:00 + 21:00)
0 2 * * *     → scripts/audit_insurance_artifacts.py (daily 02:00)
```

## Verification gates

After each phase change:
1. `npx eslint src/` exits 0 (frontend)
2. `./scripts/project_doctor.sh` exits 0 (backend collects + most tests pass)
3. Smoke test: `curl localhost:8000/api/health` (when backend up)

## Composes with

§42 (autonomy granted) · §43 (drills required) · §51 (forensic commit substrate) · §54 (no Co-Authored-By trailer) · §57.5 (5-question runbook) · §57.7 (production-grade honesty — no fake "fixed" claims) · §61 (venv map) · §69 (approval-min) · §70/§71 (cron pattern)

**Effective date**: 2026-06-06.
