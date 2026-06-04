#!/usr/bin/env bash
# Install / refresh the hourly insurance alignment cron entries.
# Idempotent: re-running replaces existing entries (matched by script path).
# Per global §61: invoke the venv interpreter via absolute path, not via PATH.
#
# Two cron entries:
#   minute 12 — run the audit (writes jobs/reports/insurance/*.{json,md})
#   minute 13 — run the work_tracker rollup (writes data/work_tracker/insurance_alignment.json)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${PYTHON_BIN:-/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python}"
LOG_DIR="$ROOT/jobs/logs"
AUDIT_LOG="$LOG_DIR/insurance_alignment_cron.log"
ROLLUP_LOG="$LOG_DIR/insurance_workforce_rollup_cron.log"
AUDIT_SCRIPT="$ROOT/scripts/insurance_alignment_audit.py"
ROLLUP_SCRIPT="$ROOT/scripts/insurance_workforce_rollup.py"
AUDIT_LINE="12 * * * * $PYTHON_BIN $AUDIT_SCRIPT >> $AUDIT_LOG 2>&1"
ROLLUP_LINE="13 * * * * $PYTHON_BIN $ROLLUP_SCRIPT >> $ROLLUP_LOG 2>&1"

mkdir -p "$LOG_DIR" "$ROOT/jobs/reports/insurance" "$ROOT/data/work_tracker"

TMP="$(mktemp)"
crontab -l 2>/dev/null | grep -v -E "insurance_alignment_audit\\.py|insurance_workforce_rollup\\.py" > "$TMP" || true
echo "$AUDIT_LINE"  >> "$TMP"
echo "$ROLLUP_LINE" >> "$TMP"
crontab "$TMP"
rm -f "$TMP"

echo "Installed hourly insurance cron entries:"
echo "  audit  : $AUDIT_LINE"
echo "  rollup : $ROLLUP_LINE"
echo "Logs   : $AUDIT_LOG"
echo "         $ROLLUP_LOG"
echo "Reports: $ROOT/jobs/reports/insurance/"
echo "Rollup : $ROOT/data/work_tracker/insurance_alignment.json"
