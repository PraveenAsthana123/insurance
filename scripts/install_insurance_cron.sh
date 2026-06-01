#!/usr/bin/env bash
# Idempotent installer for INSUR-AUDIT cron entries.
# Per global §70.3 — twice daily (09:00 + 21:00) audit runs.
# Tagged with `# INSUR-AUDIT (insur_project)` for safe re-install.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python"
AUDIT="${REPO}/scripts/audit_insurance_artifacts.py"
LOG_DIR="${REPO}/jobs/logs"
TAG="# INSUR-AUDIT (insur_project)"

mkdir -p "${LOG_DIR}"

# 1. Capture current crontab (or empty if none)
CURRENT="$(crontab -l 2>/dev/null || true)"

# 2. Strip any existing INSUR-AUDIT block
FILTERED="$(echo "${CURRENT}" | awk -v tag="${TAG}" '
  $0 == tag { skip=1; next }
  skip == 1 && /^[0-9 *,/-]+ / { next }
  skip == 1 && /^$/ { skip=0; next }
  skip == 1 { skip=0 }
  { print }
')"

# 3. Append fresh block
NEW_BLOCK="
${TAG}
0 9,21 * * * ${PYTHON} ${AUDIT} >> ${LOG_DIR}/insurance_audit_cron.log 2>&1
"

NEW_CRONTAB="${FILTERED}${NEW_BLOCK}"

# 4. Install (write-then-load atomic via tempfile)
TMP="$(mktemp)"
echo "${NEW_CRONTAB}" > "${TMP}"
crontab "${TMP}"
rm -f "${TMP}"

echo "Installed INSUR-AUDIT cron entries:"
crontab -l | grep -A1 "${TAG}" || echo "(verification: tag absent in crontab output — check 'crontab -l')"
