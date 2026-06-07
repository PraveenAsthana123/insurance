#!/usr/bin/env bash
# check_share_folder_drift.sh — diff insur_project copies vs §89 share folder.
# Run daily via cron to flag when local edits diverge from the canonical share folder.
# Per global §63.7 mirror pattern.
#
# Exit 0  — no drift
# Exit 1  — drift detected (review jobs/logs/share_folder_drift.log)
# Exit 2  — share folder missing

set -uo pipefail  # NOT -e — we want to scan all files even if one diff fails

SHARE="$HOME/.claude/templates/agentic-tool-readiness"
INSUR="/mnt/deepa/insur_project"
LOG="$INSUR/jobs/logs/share_folder_drift.log"
TS="$(date -Iseconds)"

mkdir -p "$(dirname "$LOG")"

[[ ! -d "$SHARE" ]] && { echo "[$TS] FATAL: share folder missing: $SHARE" >>"$LOG"; exit 2; }

# (share-name → insur-path) mapping mirrors adopt-agentic-tool-readiness.sh
declare -A MAP=(
  ["ADVANCED_AGENTIC_OS_TOOLS.json"]="config/advanced_agentic_os_tools.json"
  ["test_advanced_agentic_os_tools.py"]="scripts/test_advanced_agentic_os_tools.py"
  ["agent_supervisor.py"]="scripts/agent_supervisor.py"
  ["agent_fleet.sh"]="scripts/agent_fleet.sh"
  ["router_agent_supervisor.py"]="backend/routers/agent_supervisor.py"
  ["AGENT_SUPERVISOR_RUNBOOK.md"]="docs/AGENT_SUPERVISOR_RUNBOOK.md"
  ["AGENT_TOOL_SELECTION_MATRIX.md"]="docs/AGENT_TOOL_SELECTION_MATRIX.md"
  ["AGENTIC_TOOL_READINESS_REPORT.md"]="docs/AGENTIC_TOOL_READINESS_REPORT.md"
  ["ADVANCED_AGENTIC_OS_TOOLING_PLAN.md"]="docs/ADVANCED_AGENTIC_OS_TOOLING_PLAN.md"
  ["AGENT_ARCHITECTURE_PATTERNS.md"]="docs/AGENT_ARCHITECTURE_PATTERNS.md"
  ["AGENT_COUNCIL_ARCHITECTURE.md"]="docs/AGENT_COUNCIL_ARCHITECTURE.md"
  ["AGENT_HARNESS_GUIDE.md"]="docs/AGENT_HARNESS_GUIDE.md"
  ["BACKEND_UNIVERSAL_PROJECT_POLICY.md"]="docs/BACKEND_UNIVERSAL_PROJECT_POLICY.md"
  ["DARK_FACTORY_OPERATING_MODEL.md"]="docs/DARK_FACTORY_OPERATING_MODEL.md"
  ["PRODUCTION_AGENT_PLATFORM_ARCHITECTURE.md"]="docs/PRODUCTION_AGENT_PLATFORM_ARCHITECTURE.md"
  ["TENANT_ID_IDEMPOTENCY_CONTRACT.md"]="docs/TENANT_ID_IDEMPOTENCY_CONTRACT.md"
  ["APPROVAL_GOVERNANCE.md"]="docs/APPROVAL_GOVERNANCE.md"
  ["dbviewer/TOOL_COMPARISON.md"]="docs/dbviewer/TOOL_COMPARISON.md"
)

drift_total=0
drift_files=""

for SRC_NAME in "${!MAP[@]}"; do
  share_path="$SHARE/$SRC_NAME"
  insur_path="$INSUR/${MAP[$SRC_NAME]}"
  if [[ ! -f "$share_path" ]] || [[ ! -f "$insur_path" ]]; then
    drift_total=$((drift_total+1))
    drift_files="$drift_files\n  MISSING — share:$share_path insur:$insur_path"
    continue
  fi
  if ! diff -q "$share_path" "$insur_path" >/dev/null 2>&1; then
    drift_total=$((drift_total+1))
    drift_files="$drift_files\n  DIVERGED — $SRC_NAME"
  fi
done

if [[ $drift_total -eq 0 ]]; then
  echo "[$TS] OK — 0/18 files diverged" >>"$LOG"
  exit 0
else
  echo "[$TS] DRIFT — $drift_total/18 files diverged" >>"$LOG"
  printf "$drift_files\n" >>"$LOG"
  exit 1
fi
