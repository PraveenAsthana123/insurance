#!/usr/bin/env bash
# §109 dynamic dispatcher · auto-chains §106 ticks · per operator brief 2026-06-11.
#
# Behavior:
#   - Runs auto_next_loop.py
#   - If it ACTED (closed a finding) → immediately runs again (no 5-min wait)
#   - If COOLDOWN/GATED/STABLE → exits cleanly (cron will fire again later)
#   - Hard cap: 4 minutes wall-clock to prevent overlap with next cron tick
#   - Hard cap: 10 chained iterations to prevent runaway
#
# Exit codes:
#   0 acted (work done · chain continues)
#   10 cooldown (skip · cron later)
#   20 gated (operator needed · cron later)
#   30 stable (nothing to do · cron later)
#   40 error (retry next tick)
#
# Cron entry (per §109 + §106):
#   */5 * * * * /full/path/to/scripts/auto_next_dispatcher.sh >> jobs/logs/auto-next.log 2>&1

set -e

REPO="/mnt/deepa/insur_project"
PY="/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python"
LOG_DIR="$REPO/jobs/logs"
MAX_ITERATIONS=10
MAX_WALL_S=240  # 4 min

mkdir -p "$LOG_DIR"
cd "$REPO"

START_T=$(date +%s)
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "[dispatcher] $TS · starting · max_iter=$MAX_ITERATIONS · max_wall=${MAX_WALL_S}s"

ITER=0
while [ $ITER -lt $MAX_ITERATIONS ]; do
  ITER=$((ITER + 1))
  NOW_T=$(date +%s)
  ELAPSED=$((NOW_T - START_T))
  if [ $ELAPSED -gt $MAX_WALL_S ]; then
    echo "[dispatcher] wall-clock cap ${MAX_WALL_S}s reached · exit"
    exit 30
  fi

  echo "[dispatcher] iter $ITER · elapsed ${ELAPSED}s"

  # Run auto_next_loop · capture exit code
  set +e
  $PY scripts/auto_next_loop.py
  RC=$?
  set -e

  # Determine action from the latest tick report
  LATEST=$(ls -t jobs/reports/auto-next/run-*.json 2>/dev/null | head -1)
  if [ -n "$LATEST" ]; then
    STATUS=$(grep -o '"status":"[^"]*"' "$LATEST" | head -1 | cut -d'"' -f4)
    echo "[dispatcher] tick status: $STATUS"
  else
    STATUS="unknown"
  fi

  # §109 cadence routing
  case "$STATUS" in
    "acted")
      echo "[dispatcher] work completed · chaining to next iter immediately"
      continue
      ;;
    "cooldown")
      echo "[dispatcher] cooldown · stopping chain · cron will fire again"
      exit 10
      ;;
    "gated")
      echo "[dispatcher] operator action needed · stopping · cron later"
      exit 20
      ;;
    "stable")
      echo "[dispatcher] platform stable · 0 actionable · stopping"
      exit 30
      ;;
    "no-handler"|"error")
      echo "[dispatcher] non-fatal status: $STATUS · stopping for diagnostic"
      exit 40
      ;;
    *)
      echo "[dispatcher] unknown status '$STATUS' · stopping"
      exit 30
      ;;
  esac
done

echo "[dispatcher] max iterations $MAX_ITERATIONS reached · stopping for safety"
exit 0
