# Deep Audit Fix Plan (2026-06-07)

Source: deep audit across error/data/api/model/training/process layers
Status: operator granted "all approval" — autonomous execution

## Findings (5 real bugs)

| # | Bug | Layer | Autonomous? |
|---|---|---|---|
| 1 | `/bank` route missing 4-level sub-process | ERROR | ✓ DONE |
| 2 | 3 depts have empty `channel_scenarios` (1, 3, 14) | DATA | ✓ This plan |
| 3 | kaggle CLI not on cron's PATH → all data refresh fails | DATA/API | ✓ This plan |
| 4 | bev_backend squats on :8000 → insur backend can't start | API | ✗ Operator gated |
| 5 | mlruns/ empty despite 6 manifests on disk | TRAINING | This plan (config check) |

## Phase A — channel_scenarios backfill for depts 1, 3, 14

**Data shape** (per dept 22 reference):
```json
"channel_scenarios": {
  "B2C": {"label": "...", "products": [...], "ai": [...]},
  "B2B": {...},
  "B2E": {...}
}
```

**Action**: Add canonical placeholder entries with `_derived: true` marker so operator knows to refine. Sources:
- Dept 1 (Product Management) → "New Products", "Partner Programs", "Internal R&D"
- Dept 3 (Sales & Distribution) → "Direct Sales", "Broker Channel", "Sales Enablement"
- Dept 14 (Finance & Accounting) → "Customer Billing", "Vendor Payments", "Internal Reporting"

## Phase B — kaggle PATH fix for cron

**Root cause**: 13 cron entries call `kaggle` from a script. Cron's PATH doesn't include `/home/praveen/.local/bin` where kaggle lives. CLI exec fails with `Errno 2`.

**Action**:
1. Patch `scripts/download_insurance_datasets.py` to look up kaggle CLI via absolute path
2. OR add PATH export at top of cron entries

Cleanest: have script try `/home/praveen/.local/bin/kaggle` first, fall back to PATH search.

## Phase C — run the job once + verify

After Phase A+B:
1. Run one kaggle refresh manually with the fix
2. Confirm exit 0 + manifest updated
3. Add a daily preflight check cron that catches PATH issues early

## Cron

```text
INSUR-CHANNEL-BACKFILL  — one-time (after this plan), then idempotent on subsequent boots
INSUR-DATA-REFRESH      — 13 entries (existing), patched to use absolute kaggle path
INSUR-PREFLIGHT         — daily 06:00 — check kaggle reachable + venv reachable
```

## Composes with

§42 (autonomy granted) · §57.5 (5-question runbook · script answers "why did it fail?")
· §60 (path verification on disks AND CLIs) · §57.7 (honest, no fake "fixed" claims)
