#!/usr/bin/env bash
# §118 + §109 adaptive daemon · runs until ZERO pending findings.
#
# Adaptive cadence: next-job-delay = MAX(previous_duration, 30s)
# No 5-min fixed wait · no operator keystroke needed
# Stops automatically when pending = 0 · prints "NO PENDING TASKS"
#
# Start as background daemon:
#   nohup /mnt/deepa/insur_project/scripts/auto_next_daemon.sh > /tmp/auto_next_daemon.log 2>&1 &
# OR via systemd-timer / cron @reboot

set -e
REPO="/mnt/deepa/insur_project"
PY="/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python"
LOG="$REPO/jobs/logs/auto-next-daemon.log"
PIDFILE="/tmp/auto-next-daemon.pid"
MIN_SLEEP=30      # never below 30s between jobs
MAX_RUNTIME=$((4 * 3600))  # daemon stops after 4h (safety)
MAX_CONSECUTIVE_EMPTY=3    # stop after N empty checks in a row
PROGRESS_FILE="$REPO/jobs/reports/auto-next/daemon-progress.json"

cd "$REPO"
mkdir -p jobs/logs jobs/reports/auto-next

# Idempotency · don't start if already running
if [ -f "$PIDFILE" ]; then
  OLDPID=$(cat "$PIDFILE")
  if kill -0 "$OLDPID" 2>/dev/null; then
    echo "[$(date -u +%H:%M:%S)] daemon already running pid=$OLDPID · exit"
    exit 0
  fi
  rm "$PIDFILE"
fi
echo $$ > "$PIDFILE"
trap "rm -f $PIDFILE" EXIT

START=$(date +%s)
ITER=0
EMPTY=0

log() {
  local msg="[$(date -u +%H:%M:%S)] $1"
  echo "$msg"
  echo "$msg" >> "$LOG"
}

update_progress() {
  cat > "$PROGRESS_FILE" <<EOF
{
  "daemon_pid": $$,
  "started_at": "$(date -u -d @$START +%Y-%m-%dT%H:%M:%SZ)",
  "current_iter": $ITER,
  "last_iter_status": "$1",
  "last_iter_duration_s": ${2:-0},
  "next_sleep_s": ${3:-0},
  "consecutive_empty": $EMPTY,
  "updated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
}

log "===== §118 AUTONOMOUS DAEMON STARTED ====="
log "min_sleep=${MIN_SLEEP}s · max_runtime=${MAX_RUNTIME}s · max_empty=${MAX_CONSECUTIVE_EMPTY}"
update_progress "starting" 0 0

while true; do
  NOW=$(date +%s)
  ELAPSED=$((NOW - START))
  if [ $ELAPSED -gt $MAX_RUNTIME ]; then
    log "max_runtime ${MAX_RUNTIME}s reached · daemon exiting cleanly"
    break
  fi

  ITER=$((ITER + 1))
  log "iter $ITER · runtime ${ELAPSED}s · empty_streak=$EMPTY"

  # Run auto_next_loop · measure duration
  JOB_START=$(date +%s)
  set +e
  $PY scripts/auto_next_loop.py > /tmp/auto-next-out.log 2>&1
  set -e
  JOB_END=$(date +%s)
  DUR=$((JOB_END - JOB_START))

  # Read status from latest tick report
  LATEST=$(ls -t jobs/reports/auto-next/run-*.json 2>/dev/null | head -1)
  STATUS="unknown"
  if [ -n "$LATEST" ]; then
    STATUS=$(grep -m1 '"status"' "$LATEST" | sed -E 's/.*"status"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')
    FINDINGS=$(grep -m1 '"findings_total"' "$LATEST" | sed -E 's/.*"findings_total"[[:space:]]*:[[:space:]]*([0-9]+).*/\1/')
    P0P1P2=$(grep -m1 '"p0_p1_p2_actionable"' "$LATEST" | sed -E 's/.*"p0_p1_p2_actionable"[[:space:]]*:[[:space:]]*([0-9]+).*/\1/')
  fi
  log "  → status=$STATUS · duration=${DUR}s · findings=${FINDINGS:-?} · actionable=${P0P1P2:-?}"

  # ZERO pending check
  if [ "${P0P1P2:-0}" -eq 0 ]; then
    EMPTY=$((EMPTY + 1))
    log "  → no actionable findings (streak $EMPTY/$MAX_CONSECUTIVE_EMPTY)"
    if [ $EMPTY -ge $MAX_CONSECUTIVE_EMPTY ]; then
      echo ""
      echo -e "\033[1m\033[42m"
      echo "  ╔══════════════════════════════════════════════════════════╗"
      echo "  ║  ✓ NO PENDING TASKS · PLATFORM STABLE                    ║"
      echo "  ║  Daemon stopping after $EMPTY consecutive empty checks         ║"
      echo "  ║  Total iterations: $ITER · runtime: ${ELAPSED}s                     ║"
      echo "  ╚══════════════════════════════════════════════════════════╝"
      echo -e "\033[0m"
      log "STOP · NO PENDING TASKS · $EMPTY consecutive empty checks · iter=$ITER"
      update_progress "no_pending_tasks" "$DUR" 0
      break
    fi
  else
    EMPTY=0
  fi

  # ADAPTIVE SLEEP · match previous job duration (min 30s · max 5 min)
  if [ $DUR -lt $MIN_SLEEP ]; then
    SLEEP=$MIN_SLEEP
  elif [ $DUR -gt 300 ]; then
    SLEEP=300
  else
    SLEEP=$DUR
  fi

  log "  → next job in ${SLEEP}s (adaptive · matched previous duration)"
  update_progress "$STATUS" "$DUR" "$SLEEP"
  sleep $SLEEP
done

log "===== DAEMON EXITED CLEANLY ====="
