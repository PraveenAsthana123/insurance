#!/bin/bash
# §EAOS Top-10 audit cron · every 6h
set -u
ROOT="/mnt/deepa/insur_project"
TAG="# INSUR-EAOS-AUDIT (§EAOS Top-10 · operator 2026-06-12)"
VENV="/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python"

crontab -l 2>/dev/null | grep -v "INSUR-EAOS-AUDIT" > /tmp/insur_crontab.new
echo "0 */6 * * * $VENV $ROOT/scripts/eaos_top10_audit.py >> $ROOT/jobs/logs/eaos_top10.cron.log 2>&1 $TAG" >> /tmp/insur_crontab.new
crontab /tmp/insur_crontab.new
rm -f /tmp/insur_crontab.new

echo "[install_eaos_audit_cron] installed:"
crontab -l | grep "INSUR-EAOS-AUDIT"
