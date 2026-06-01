# Cron Jobs Plan — Approval Workflow + Complete Inventory

Per operator 2026-06-01: "plan the cron job with all the approval and complete".

This document is the **single source of truth** for every cron job that runs
in this project. Every entry has an owner, an approver, and a destruction trigger.

## Approval workflow

Adding / modifying any cron entry follows this gated workflow:

```
1. Proposer:    Author opens PR with cron entry diff in install_*.sh
2. Reviewer:    Code review per dept owner (see "Owner" column below)
3. Approver:    Operator confirms via session approval per §42 gating
4. Apply:       Author runs `bash scripts/install_*_cron.sh` on target host
5. Verify:      `crontab -l | grep -A1 TAG` shows entry
6. Drill:       `tests/drills/drill_*.py` includes "cron exists" check (where applicable)
7. Audit row:   Every cron run writes a row to its own log file under jobs/logs/
```

## Approval gates

Per global §42 — cron installation is **not auto-gated** (operator dev box,
Mode A "Fully Open Dev"). But for production hosts:

| Environment | Approval needed |
|---|---|
| Dev (Mode A) | No (auto-approved per §42 + §69) |
| Staging (Mode B) | Operator OK + smoke run |
| Prod (Mode B) | Operator OK + change-control ticket + on-call notification |

## Complete cron inventory

### Tag: `INSUR-AUDIT (insur_project)`

Managed by [scripts/install_insurance_cron.sh](../scripts/install_insurance_cron.sh).
Idempotent — re-running cleans the existing block first.

| # | Schedule | Command | Owner | Approver | Purpose |
|---|---|---|---|---|---|
| 1 | `0 9,21 * * *` | `audit_insurance_artifacts.py` | Platform | Operator | Twice-daily artifact freshness audit per §70.3 |
| 2 | `15 2 * * 0` | `download_insurance_datasets.py --only claims/auto_insurance_claims --refresh` | Claims | Operator | Weekly Kaggle refresh |
| 3 | `15 3 * * 0` | `... --only claims/vehicle_insurance_fraud` | Claims | Operator | Weekly Kaggle refresh |
| 4 | `15 4 * * 0` | `... --only claims/health_insurance_claims` | Claims | Operator | Weekly Kaggle refresh |
| 5 | `15 2 * * 1` | `... --only claims/property_claims` | Claims | Operator | Weekly Kaggle refresh |
| 6 | `15 3 * * 1` | `... --only underwriting/life_insurance_data` | UW | Operator | Weekly Kaggle refresh |
| 7 | `15 4 * * 1` | `... --only underwriting/auto_insurance_underwriting` | UW | Operator | Weekly Kaggle refresh |
| 8 | `15 2 * * 2` | `... --only underwriting/medical_cost` | UW | Operator | Weekly Kaggle refresh |
| 9 | `15 3 * * 2` | `... --only customer-service/call_center_data` | CS | Operator | Weekly Kaggle refresh |
| 10 | `15 4 * * 2` | `... --only customer-service/customer_complaints` | CS | Operator | Weekly Kaggle refresh |
| 11 | `15 2 * * 3` | `... --only customer-service/customer_churn` | CS | Operator | Weekly Kaggle refresh |
| 12 | `15 3 * * 3` | `... --only fraud-siu/vehicle_claim_fraud` | Fraud | Operator | Weekly Kaggle refresh |
| 13 | `15 4 * * 3` | `... --only fraud-siu/creditcard_fraud` | Fraud | Operator | Weekly Kaggle refresh |
| 14 | `15 2 * * 4` | `... --only fraud-siu/auto_insurance_fraud` | Fraud | Operator | Weekly Kaggle refresh |

### Tag: `CLAUDE-CHAT-LOGGER` (global, not project-specific)

| # | Schedule | Command | Owner | Approver |
|---|---|---|---|---|
| 1 | `0 * * * *` | `claude-chat-logger.py sync` | Praveen | Self | Hourly sync of Claude transcripts to SQLite |
| 2 | `0 21 * * *` | `claude-chat-logger.py full` | Praveen | Self | Daily email summary (currently commented out) |

## Planned (not yet installed)

| # | Schedule | Command | Owner | Approver | Purpose |
|---|---|---|---|---|---|
| 15 | `0 1 * * *` | `pipeline runner --dept claims --pipeline 1 --smoke` | Platform | Operator | Daily smoke run; alert on failure |
| 16 | `0 2 * * *` | `pipeline runner --dept underwriting --pipeline 1 --smoke` | Platform | Operator | Daily smoke run |
| 17 | `0 3 * * *` | `pipeline runner --dept customer-service --pipeline 1 --smoke` | Platform | Operator | Daily smoke run |
| 18 | `0 4 * * *` | `pipeline runner --dept fraud-siu --pipeline 1 --smoke` | Platform | Operator | Daily smoke run |
| 19 | `0 5 * * 1` | `run_drills.py --tag insurance` | Platform | Operator | Weekly drill regression |
| 20 | `0 * * * *` | `OTel collector flush` | Platform | Operator | Hourly trace flush to backend |
| 21 | `*/15 * * * *` | `health probe → on-call alert if down` | SRE | Operator | Health monitoring |
| 22 | `0 6 * * 0` | `pg_dump → S3 + retention check` | Platform | Operator | Weekly DB backup |
| 23 | `0 7 1 * *` | `compliance audit report generation` | Compliance | CISO | Monthly compliance report |
| 24 | `0 8 1 * *` | `bias / fairness scan per model` | AI-Reviewer | CRO | Monthly fairness check |

## Operator approval bundle — pending

The operator's "all approve" + "user approval" applies to:

| Item | Approval status |
|---|---|
| Install cron entries 1-14 (already installed) | ✅ Approved + applied |
| Push 6 commits to origin | ⚠ **Approved by operator, but no `git remote` configured** |
| Install cron entries 15-24 (planned daily pipeline + drill + backup) | ⏳ Pending — needs operator green-light per item |
| Deploy nginx LB to docker-compose | ⏳ Pending |
| Deploy CDN to production | ⏳ **Operator + cloud team** (out of scope for code commit) |
| Enable external data feeds in prod | ⏳ **Operator + vendor BAA signing** (HIPAA gates) |
| EU AI Act registration | ⏳ **Operator + legal counsel** |
| State DOI rate filings | ⏳ **Filing actuary + legal counsel** |
| Run k6 5-phase against staging | ⏳ Pending — needs staging URL |

## Destruction trigger

Every cron MUST have a destruction trigger:
- Audit cron — runs forever (artifact freshness is always needed)
- Kaggle refresh cron — destruction when corresponding dataset retired from project
- Smoke pipeline cron — destruction when pipeline removed from `PIPELINE_REGISTRY`
- Drill cron — destruction when drill deprecated

When a destruction trigger fires:
1. Remove entry from `install_*_cron.sh`
2. Re-run installer (cleans old block)
3. Verify `crontab -l | grep -c <tag>` matches new expected count

## Cron observability

| Log file | Pattern |
|---|---|
| `jobs/logs/insurance_audit_cron.log` | Audit runs |
| `jobs/logs/insurance_data_refresh_<dataset>.log` | Per-dataset refresh runs |
| `jobs/logs/insurance_pipeline_smoke_<dept>.log` (planned) | Per-dept smoke runs |
| `jobs/reports/insurance_audit_summary_<ts>.md` | Per-run audit summary |
| `jobs/reports/insurance_audit_summary_latest.md` | Symlink to latest |

Per global §57.5 — when something breaks, "WHEN did it break?" answers
from these log files.

## Verification

```bash
crontab -l | grep INSUR
crontab -l | grep -c "download_insurance_datasets"   # expect 13
crontab -l | grep -c "audit_insurance_artifacts"     # expect 1
```

## Composes with

- §42 operational autonomy (cron install is local-pre-approved, prod-gated)
- §43 drill testing (cron-existence verified by drill step 15)
- §51 forensic substrate (every commit touching cron entries cites this doc)
- §57.5 5-question runbook (cron logs are the WHEN answer)
- §69 approval minimization (cron install is on the allow list)
- §70 LaTeX table audits + §71 cron schedule (same pattern, different domain)

## Approval log

| Date | Approver | Action | Detail |
|---|---|---|---|
| 2026-06-01 | Operator | Approve | Install audit + 13 per-data refresh entries |
| 2026-06-01 | Operator | Approve | "all approve, next and ll" — push pending remote config |
