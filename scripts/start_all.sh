#!/bin/bash
# §150 — single-command start-all · brings every service up under supervision.
# Order: postgres → ollama → backend → vite-3210 → vite-3000 → watchdog cron.
# Idempotent: skips processes already running.
#
# Usage: bash scripts/start_all.sh
# Test:  bash scripts/start_all.sh --status

set -u
ROOT="/mnt/deepa/insur_project"
cd "$ROOT" || exit 1
TZ='America/Edmonton'
stamp() { TZ='America/Edmonton' date '+%Y-%m-%d %H:%M:%S MDT'; }
mkdir -p jobs/logs

port_bound() { ss -tlnp 2>/dev/null | grep -qE ":${1}\b"; }

if [ "${1:-}" = "--status" ]; then
  printf '%-12s %-8s %s\n' "SERVICE" "PORT" "STATUS"
  for svc in "postgres:5434" "ollama:11434" "backend:8001" "vite-3210:3210" "vite-3000:3000"; do
    name="${svc%:*}"; port="${svc#*:}"
    if port_bound "$port"; then
      echo "$(printf '%-12s %-8s' "$name" "$port") ✓ UP"
    else
      echo "$(printf '%-12s %-8s' "$name" "$port") ✗ DOWN"
    fi
  done
  echo
  echo "Cron watchdog:"
  crontab -l 2>/dev/null | grep -E "process_watchdog|INSUR-WATCHDOG" || echo "  (not installed · run: bash scripts/install_watchdog_cron.sh)"
  exit 0
fi

echo "[$(stamp)] === §150 start_all begin ==="

# 1. Postgres
if port_bound 5434; then
  echo "[$(stamp)] ✓ postgres already up on 5434"
else
  echo "[$(stamp)] postgres DOWN · attempting docker compose up -d"
  docker compose up -d postgres 2>/dev/null || \
    echo "[$(stamp)] docker compose unavailable · operator action required"
fi

# 2. Ollama
if curl -s --max-time 3 http://localhost:11434/api/tags >/dev/null 2>&1; then
  echo "[$(stamp)] ✓ ollama already up on 11434"
else
  echo "[$(stamp)] ollama DOWN · starting"
  systemctl --user start ollama 2>/dev/null || \
    (nohup ollama serve >> jobs/logs/ollama.log 2>&1 & disown)
  sleep 3
fi

# 3. Backend + 4. + 5. Vite — delegate to watchdog (idempotent restart logic)
bash scripts/process_watchdog.sh

sleep 6

# 6. Watchdog cron (idempotent install)
bash scripts/install_watchdog_cron.sh 2>/dev/null || true

echo
bash "$0" --status

echo
echo "[$(stamp)] === §150 start_all complete ==="
echo "  • Watchdog cron runs every 2 minutes (per §150)"
echo "  • Health: http://localhost:8001/api/v1/health/processes"
echo "  • UI:     http://localhost:3210/"
echo "  • Logs:   $ROOT/jobs/logs/process_watchdog.log"
