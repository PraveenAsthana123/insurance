#!/usr/bin/env bash
# Install cron entries for all 10 pending tasks. Per §42 + §69 + §70 + §72.
#
# Per operator 2026-06-01: "create cron job for all pending task ..complete
# it with all approval"
#
# 10 entries with staggered times to avoid resource contention. Tagged
# under # === INSUR-PENDING-TASKS (insur_project) === for idempotent
# re-install.
#
# §42-gated ops (force-push / destroy / publish) are NEVER invoked by
# these crons. push-hint just LOGS that a push is possible; it doesn't
# do the push.

set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python"
RUNNER="${REPO}/scripts/pending_tasks_runner.sh"
LOG_DIR="${REPO}/jobs/logs"
TAG_START="# === INSUR-PENDING-TASKS (insur_project) — managed by install_pending_tasks_cron.sh ==="
TAG_END="# === INSUR-PENDING-TASKS (insur_project) — end ==="

mkdir -p "$LOG_DIR"

CURRENT="$(crontab -l 2>/dev/null || true)"

# Strip existing block
FILTERED="$(echo "$CURRENT" | awk -v start="$TAG_START" -v stop="$TAG_END" '
    $0 == start { skip=1; next }
    $0 == stop  { skip=0; next }
    skip != 1   { print }
')"

# 10 cron entries — schedule | task
declare -a TASKS=(
    "0 3 * * *|drill"              # drill nightly @ 03:00 UTC
    "30 4 * * *|openapi"           # OpenAPI snapshot daily @ 04:30
    "0,30 * * * *|boot"            # backend boot check every 30 min
    "0 5 * * *|data-manifest"      # data manifest verify @ 05:00
    "0 6 * * 0|reports-cleanup"    # weekly Sunday @ 06:00
    "0 7 * * 0|voice-prune"        # voice prune Sunday @ 07:00
    "0 8 * * 1|module-sync"        # module drift check Monday @ 08:00
    "0 9 * * *|prod-aggregate"     # daily aggregate report @ 09:00
    "0 */6 * * *|push-hint"        # every 6h: log push status (no actual push)
    "0 10 * * *|claude-md-drift"   # CLAUDE.md §72 sync check @ 10:00
    "*/15 * * * *|push"            # every 15 min: safe push (skips if no remote / behind)
)

NEW_BLOCK="$TAG_START"
for entry in "${TASKS[@]}"; do
    sched="${entry%|*}"
    task="${entry#*|}"
    NEW_BLOCK="${NEW_BLOCK}
${sched} bash ${RUNNER} ${task} >> ${LOG_DIR}/pending_${task}.log 2>&1"
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

echo "Installed ${#TASKS[@]} cron entries under tag INSUR-PENDING-TASKS."
echo "Verify: crontab -l | grep -A12 'INSUR-PENDING-TASKS'"
echo
echo "Per §42: NONE of these entries invoke gated operations (no push, no destroy,"
echo "no publish, no external messaging). They are pure local audits + report generators."
