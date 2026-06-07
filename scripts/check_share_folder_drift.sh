#!/usr/bin/env bash
# check_share_folder_drift.sh — thin pointer to the global drift checker.
# Per §80 share folder convention — drift detection is now centralised at
# ~/.claude/scripts/check_share_folder_drift.sh and runs daily via cron.
#
# For backward compat, this script invokes the global checker against
# the share folders this project has adopted.
exec /home/praveen/.claude/scripts/check_share_folder_drift.sh \
  --share agentic-tool-readiness \
  --target /mnt/deepa/insur_project \
  "$@"
