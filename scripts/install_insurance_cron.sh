#!/usr/bin/env bash
# Idempotent installer for INSUR-AUDIT + per-dataset refresh cron entries.
#
# Per operator 2026-06-01 — "schedule cron job for each data":
#   - 13 per-dataset weekly refresh entries (staggered across days/hours)
#     to keep Kaggle datasets fresh without bursting the API
#   - 1 twice-daily audit entry (§70.3)
#
# Tagged with `# INSUR-AUDIT (insur_project)` for safe re-install.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python"
AUDIT="${REPO}/scripts/audit_insurance_artifacts.py"
DOWNLOAD="${REPO}/scripts/download_insurance_datasets.py"
LOG_DIR="${REPO}/jobs/logs"
TAG_START="# === INSUR-AUDIT (insur_project) — managed by scripts/install_insurance_cron.sh ==="
TAG_END="# === INSUR-AUDIT (insur_project) — end ==="

mkdir -p "${LOG_DIR}"

# 1. Capture current crontab (or empty if none)
CURRENT="$(crontab -l 2>/dev/null || true)"

# 2. Strip any existing INSUR-AUDIT block:
#    (a) bare-tag legacy form: single comment line + one cron line below
#    (b) marker form: everything between TAG_START / TAG_END
LEGACY_TAG="# INSUR-AUDIT (insur_project)"
FILTERED="$(echo "${CURRENT}" | awk -v start="${TAG_START}" -v stop="${TAG_END}" -v legacy="${LEGACY_TAG}" '
  $0 == start  { skip=1; next }
  $0 == stop   { skip=0; next }
  $0 == legacy { legacy_skip=2; next }
  legacy_skip > 0 { legacy_skip--; next }
  skip != 1    { print }
')"

# 3. Per-dataset weekly refresh entries — staggered across day-of-week + hour
# to spread Kaggle API hits. Each runs the downloader with --only --refresh.
# 13 active datasets (2 intentionally skipped per scaffold).
#
# Schedule grid (day-of-week 0=Sun … 6=Sat):
#   Sun 02:15 → claims/auto_insurance_claims
#   Sun 03:15 → claims/vehicle_insurance_fraud
#   Sun 04:15 → claims/health_insurance_claims
#   Mon 02:15 → claims/property_claims
#   Mon 03:15 → underwriting/life_insurance_data
#   Mon 04:15 → underwriting/auto_insurance_underwriting
#   Tue 02:15 → underwriting/medical_cost
#   Tue 03:15 → customer-service/call_center_data
#   Tue 04:15 → customer-service/customer_complaints
#   Wed 02:15 → customer-service/customer_churn
#   Wed 03:15 → fraud-siu/vehicle_claim_fraud
#   Wed 04:15 → fraud-siu/creditcard_fraud
#   Thu 02:15 → fraud-siu/auto_insurance_fraud

declare -a SCHEDULE=(
  "15 2 * * 0|claims/auto_insurance_claims"
  "15 3 * * 0|claims/vehicle_insurance_fraud"
  "15 4 * * 0|claims/health_insurance_claims"
  "15 2 * * 1|claims/property_claims"
  "15 3 * * 1|underwriting/life_insurance_data"
  "15 4 * * 1|underwriting/auto_insurance_underwriting"
  "15 2 * * 2|underwriting/medical_cost"
  "15 3 * * 2|customer-service/call_center_data"
  "15 4 * * 2|customer-service/customer_complaints"
  "15 2 * * 3|customer-service/customer_churn"
  "15 3 * * 3|fraud-siu/vehicle_claim_fraud"
  "15 4 * * 3|fraud-siu/creditcard_fraud"
  "15 2 * * 4|fraud-siu/auto_insurance_fraud"
)

NEW_BLOCK="${TAG_START}
# Twice-daily artifact audit (§70.3)
0 9,21 * * * ${PYTHON} ${AUDIT} >> ${LOG_DIR}/insurance_audit_cron.log 2>&1

# Per-dataset weekly refresh (staggered to avoid Kaggle API bursts)"

for entry in "${SCHEDULE[@]}"; do
    sched="${entry%|*}"
    slug="${entry#*|}"
    NEW_BLOCK="${NEW_BLOCK}
${sched} ${PYTHON} ${DOWNLOAD} --only ${slug} --refresh >> ${LOG_DIR}/insurance_data_refresh_$(basename ${slug}).log 2>&1"
done

NEW_BLOCK="${NEW_BLOCK}
${TAG_END}"

NEW_CRONTAB="${FILTERED}
${NEW_BLOCK}
"

# 4. Install (write-then-load atomic via tempfile)
TMP="$(mktemp)"
echo "${NEW_CRONTAB}" > "${TMP}"
crontab "${TMP}"
rm -f "${TMP}"

echo "Installed:"
crontab -l | sed -n "/${TAG_START}/,/${TAG_END}/p"
echo
echo "Summary: 1 audit (twice-daily) + 13 per-dataset (weekly, staggered Sun-Thu 02-04 UTC)."
