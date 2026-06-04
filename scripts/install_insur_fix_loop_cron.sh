#!/usr/bin/env bash
# Idempotent installer for the insurance fix-loop cron entries.
# Per global §70.3 (schedule pattern) + §71 (correction discipline) + §42 (pre-approved repo-local work).
#
# Schedule:
#   */30 * * * *   light run (enrich + audit + drill + smoke)
#   0 9,21 * * *   comprehensive run (also builds)
#
# Re-running the installer is safe — the existing tagged entries are
# stripped first, then re-written. No duplicates.

set -euo pipefail

TAG="# INSUR-FIX-LOOP (auto-installed per project)"
RUNNER="/mnt/deepa/insur_project/scripts/insur_fix_loop.sh"
LOG_DIR="/mnt/deepa/insur_project/jobs/logs/insurance"
mkdir -p "$LOG_DIR"

# Build new crontab: existing entries minus our tagged block + new entries.
CURRENT=$(crontab -l 2>/dev/null || true)

# Strip prior INSUR-FIX-LOOP block (tag line + 2 following entries).
NEW_BLOCK=$(printf "%s\n%s\n%s\n" \
  "$TAG" \
  "*/30 * * * * $RUNNER >> $LOG_DIR/cron.log 2>&1" \
  "0 9,21 * * * $RUNNER --comprehensive >> $LOG_DIR/cron.log 2>&1")

CLEANED=$(printf "%s\n" "$CURRENT" | awk -v tag="$TAG" '
  $0 == tag { skip = 3; next }
  skip > 0  { skip--; next }
  { print }
')

# Append the new block (with leading newline if cleaned section is non-empty)
if [[ -n "$CLEANED" ]]; then
  printf "%s\n\n%s\n" "$CLEANED" "$NEW_BLOCK" | crontab -
else
  printf "%s\n" "$NEW_BLOCK" | crontab -
fi

echo "✓ Installed insur_fix_loop cron entries:"
crontab -l | grep -A 2 "$TAG" || true
