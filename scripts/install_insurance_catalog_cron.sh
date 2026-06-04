#!/usr/bin/env bash
# install_insurance_catalog_cron.sh — idempotent cron installer.
# Per global §70 / §80 cron-discipline pattern + §82.9 contract.
#
# Tag: INSUR-CATALOG · safe to re-run.
# Removes prior block with the same tag before appending.

set -euo pipefail

ROOT="${ROOT:-/mnt/deepa/insur_project}"
TAG="# INSUR-CATALOG (auto-installed per global §82.9 + §80)"
SCRIPT="$ROOT/scripts/refresh_insurance_catalog.sh"
LOG="$ROOT/jobs/logs/insurance_catalog_cron.log"

mkdir -p "$(dirname "$LOG")"
chmod +x "$SCRIPT" "$ROOT/scripts/refresh_insurance_catalog.sh" 2>/dev/null || true

# Strip any existing block with the tag, then append fresh.
TMP="$(mktemp)"
{ crontab -l 2>/dev/null || true; } | awk -v tag="$TAG" '
    BEGIN { skip = 0 }
    $0 == tag { skip = 1; next }
    skip && /^# end INSUR-CATALOG/ { skip = 0; next }
    !skip { print }
' > "$TMP"

cat >> "$TMP" <<EOF
$TAG
# Hourly catalog regeneration + drill + audit (read-only filesystem touches; never pushes git).
0 * * * * $SCRIPT >> $LOG 2>&1
# end INSUR-CATALOG
EOF

crontab "$TMP"
rm -f "$TMP"

echo "Installed cron block."
echo "Inspect: crontab -l | grep -A1 INSUR-CATALOG"
echo "Logs:    $LOG"
