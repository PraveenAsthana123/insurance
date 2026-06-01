#!/usr/bin/env bash
# Idempotent installer for the Codex/Archon safe local approval cron.
#
# This installs a tagged crontab block that periodically runs the existing
# conservative approval helper. It does not bypass Codex sandbox prompts,
# dependency/network approvals, destructive command approvals, GitHub gates,
# credentials, production deploys, or external writes.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="${PYTHON:-$(command -v python3)}"
APPROVER="${REPO}/scripts/archon_auto_approve_safe.py"
LOG_DIR="${REPO}/jobs/logs"
TAG_START="# === CODEX-SAFE-APPROVAL (insur_project) - managed by scripts/install_codex_approval_cron.sh ==="
TAG_END="# === CODEX-SAFE-APPROVAL (insur_project) - end ==="
SCHEDULE="${CODEX_APPROVAL_CRON_SCHEDULE:-* * * * *}"

if [ ! -f "${APPROVER}" ]; then
  echo "Missing approval helper: ${APPROVER}" >&2
  exit 2
fi

mkdir -p "${LOG_DIR}"

CURRENT="$(crontab -l 2>/dev/null || true)"
FILTERED="$(echo "${CURRENT}" | awk -v start="${TAG_START}" -v stop="${TAG_END}" '
  $0 == start { skip=1; next }
  $0 == stop { skip=0; next }
  skip != 1 { print }
')"

NEW_BLOCK="${TAG_START}
# Safe local approval scan. Scope is controlled by .archon/approval-policy.yaml.
# Default cadence: every minute. Override with CODEX_APPROVAL_CRON_SCHEDULE.
${SCHEDULE} cd ${REPO} && ${PYTHON} ${APPROVER} --approve >> ${LOG_DIR}/codex_approval_cron.log 2>&1
${TAG_END}"

TMP="$(mktemp)"
printf '%s\n%s\n' "${FILTERED}" "${NEW_BLOCK}" > "${TMP}"
crontab "${TMP}"
rm -f "${TMP}"

echo "Installed Codex safe approval cron:"
crontab -l | awk -v start="${TAG_START}" -v stop="${TAG_END}" '
  $0 == start { show=1 }
  show == 1 { print }
  $0 == stop { show=0 }
' 
