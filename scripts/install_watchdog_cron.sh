#!/bin/bash
# §150 — install the watchdog cron entry · idempotent.
# Tag: # INSUR-WATCHDOG (so multiple runs don't duplicate).

set -u
ROOT="/mnt/deepa/insur_project"
TAG="# INSUR-WATCHDOG (§150)"
ENTRY="*/2 * * * * /mnt/deepa/insur_project/scripts/process_watchdog.sh >> /mnt/deepa/insur_project/jobs/logs/process_watchdog.cron.log 2>&1 $TAG"

# Remove old entry if present
crontab -l 2>/dev/null | grep -v "INSUR-WATCHDOG" > /tmp/insur_crontab.new

# Add fresh entry
echo "$ENTRY" >> /tmp/insur_crontab.new
crontab /tmp/insur_crontab.new
rm -f /tmp/insur_crontab.new

echo "[install_watchdog_cron] installed: $ENTRY"
echo "Verify: crontab -l | grep INSUR-WATCHDOG"
