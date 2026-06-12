#!/bin/bash
# §44 + §150 · install cron for fix_all_pending_loop.py
# Tag: # INSUR-FIX-ALL-PENDING (so we can re-install idempotently)
# Cadence: */15 minutes · runs the autonomous closer loop

set -u
ROOT="/mnt/deepa/insur_project"
TAG="# INSUR-FIX-ALL-PENDING (§44 autonomous closer · per operator 2026-06-12)"
VENV="/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python"

# Strip any previous entry
crontab -l 2>/dev/null | grep -v "INSUR-FIX-ALL-PENDING" > /tmp/insur_crontab.new

# Add fresh entry
echo "*/15 * * * * $VENV $ROOT/scripts/fix_all_pending_loop.py >> $ROOT/jobs/logs/fix_all_pending.cron.log 2>&1 $TAG" >> /tmp/insur_crontab.new

crontab /tmp/insur_crontab.new
rm -f /tmp/insur_crontab.new

echo "[install_fix_all_pending_cron] installed"
echo "Verify: crontab -l | grep INSUR-FIX-ALL-PENDING"
crontab -l | grep "INSUR-FIX-ALL-PENDING"
