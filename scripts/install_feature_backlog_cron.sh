#!/bin/bash
# §F00 · install cron */30 INSUR-FEATURE-BACKLOG
# Per docs/PLAN_FEATURE_BACKLOG.md

set -u
ROOT="/mnt/deepa/insur_project"
TAG="# INSUR-FEATURE-BACKLOG (§F00 · operator 2026-06-12)"
VENV="/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python"

crontab -l 2>/dev/null | grep -v "INSUR-FEATURE-BACKLOG" > /tmp/insur_crontab.new
echo "*/30 * * * * $VENV $ROOT/scripts/feature_backlog_audit.py >> $ROOT/jobs/logs/feature_backlog.cron.log 2>&1 $TAG" >> /tmp/insur_crontab.new
crontab /tmp/insur_crontab.new
rm -f /tmp/insur_crontab.new

echo "[install_feature_backlog_cron] installed:"
crontab -l | grep "INSUR-FEATURE-BACKLOG"
