#!/usr/bin/env bash
# Install 7 RAG-infrastructure cron entries.
# Per operator 2026-06-01 + §42 (operational autonomy) — local audit/embed only.
# Tagged for idempotent re-install: # === INSUR-RAG-OPS (insur_project) ===

set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNNER="${REPO}/scripts/basic_rag_ops_runner.sh"
FLEET="${REPO}/scripts/insur_fleet.py"
TRACKER="${REPO}/scripts/work_tracker.py"
LOG_DIR="${REPO}/jobs/logs"
PYTHON="/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python"
TAG_START="# === INSUR-RAG-OPS (insur_project) — managed by install_basic_rag_ops_cron.sh ==="
TAG_END="# === INSUR-RAG-OPS (insur_project) — end ==="

mkdir -p "$LOG_DIR"
chmod +x "$RUNNER"

CURRENT="$(crontab -l 2>/dev/null || true)"
FILTERED="$(echo "$CURRENT" | awk -v start="$TAG_START" -v stop="$TAG_END" '
    $0 == start { skip=1; next }
    $0 == stop  { skip=0; next }
    skip != 1   { print }
')"

declare -a TASKS=(
    "5,35 * * * *|chunking"          # every 30 min @ :05 / :35
    "10,40 * * * *|embedding"         # every 30 min @ :10 / :40 (after chunking)
    "15 * * * *|token"                # hourly @ :15
    "0 2 * * *|cache"                 # daily @ 02:00 (vacuum + purge)
    "*/20 * * * *|guardrail"          # every 20 min
    "0 */4 * * *|deepeval"            # every 4 hours
    "30 */4 * * *|ragas"              # every 4 hours @ :30
    "*/5 * * * *|FLEET_TRACK"          # every 5 min: fleet status snapshot
)

NEW_BLOCK="$TAG_START"
for entry in "${TASKS[@]}"; do
    sched="${entry%|*}"
    task="${entry#*|}"
    if [[ "$task" == "FLEET_TRACK" ]]; then
        NEW_BLOCK="${NEW_BLOCK}
${sched} ${PYTHON} ${TRACKER} snapshot >> ${LOG_DIR}/work_tracker.log 2>&1"
    else
        NEW_BLOCK="${NEW_BLOCK}
${sched} bash ${RUNNER} ${task} >> ${LOG_DIR}/rag_${task}.log 2>&1"
    fi
done
NEW_BLOCK="${NEW_BLOCK}
${TAG_END}"

NEW_CRONTAB="${FILTERED}
${NEW_BLOCK}
"
TMP="$(mktemp)"
echo "${NEW_CRONTAB}" > "$TMP"
crontab "$TMP"
rm -f "$TMP"

echo "Installed ${#TASKS[@]} cron entries under tag INSUR-RAG-OPS."
echo "Verify: crontab -l | grep -A10 'INSUR-RAG-OPS'"
echo
echo "Schedule:"
echo "  chunking   :05, :35 each hour"
echo "  embedding  :10, :40 each hour (depends on chunking)"
echo "  token      :15 each hour"
echo "  cache      02:00 daily"
echo "  guardrail  every 20 min"
echo "  deepeval   every 4 hours @ :00"
echo "  ragas      every 4 hours @ :30"
echo "  work-track every 5 min"
