#!/bin/bash
# §150 — process watchdog · cron-driven port-binding check.
# Every 2 minutes: probe each required port → restart on bind-failure.
# Per §149 (UI consistency · vite never dies) + §150 (process resilience).

set -u
ROOT="/mnt/deepa/insur_project"
LOG="$ROOT/jobs/logs/process_watchdog.log"
LOCK="/tmp/insur_process_watchdog.lock"
VENV="/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python"
TZ='America/Edmonton'

mkdir -p "$ROOT/jobs/logs"

# Idempotency: skip if previous watchdog still running (avoid restart-storms)
if [ -f "$LOCK" ]; then
  pid="$(cat "$LOCK" 2>/dev/null || true)"
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    echo "[$(date)] watchdog already running pid=$pid · skipping" >> "$LOG"
    exit 0
  fi
fi
echo "$$" > "$LOCK"
trap "rm -f $LOCK" EXIT

stamp() { TZ='America/Edmonton' date '+%Y-%m-%d %H:%M:%S MDT'; }

port_bound() {
  local p="$1"
  ss -tlnp 2>/dev/null | grep -qE ":${p}\b"
}

restart_backend() {
  echo "[$(stamp)] backend (port 8001) DOWN · restarting" >> "$LOG"
  pkill -9 -f "launch_backend\|uvicorn.*8001" 2>/dev/null
  sleep 2
  # Double-fork: outer subshell + nohup + & detaches fully from watchdog
  ( cd "$ROOT" && \
    BEV_CORS_ORIGINS="http://localhost:3000,http://localhost:3210,http://127.0.0.1:3000,http://127.0.0.1:3210" \
    INSUR_SKIP_MIGRATIONS=1 INSUR_DISABLE_PRESIDIO=1 TF_CPP_MIN_LOG_LEVEL=3 \
    nohup "$VENV" scripts/launch_backend.py \
      >> "$ROOT/jobs/logs/backend.log" 2>&1 & ) &
  echo "[$(stamp)] backend respawned · double-fork detached" >> "$LOG"
}

restart_vite_3210() {
  echo "[$(stamp)] vite (port 3210) DOWN · restarting" >> "$LOG"
  pkill -9 -f "vite.*--port 3210" 2>/dev/null
  sleep 2
  ( cd "$ROOT/frontend" && \
    nohup node node_modules/.bin/vite --host 0.0.0.0 --port 3210 \
      >> "$ROOT/jobs/logs/vite_3210.log" 2>&1 & ) &
  echo "[$(stamp)] vite 3210 respawned · double-fork detached" >> "$LOG"
}

restart_vite_3000() {
  echo "[$(stamp)] vite (port 3000) DOWN · restarting" >> "$LOG"
  pkill -9 -f "vite.*--port 3000" 2>/dev/null
  sleep 2
  ( cd "$ROOT/frontend" && \
    nohup node node_modules/.bin/vite --host 0.0.0.0 --port 3000 \
      >> "$ROOT/jobs/logs/vite_3000.log" 2>&1 & ) &
  echo "[$(stamp)] vite 3000 respawned · double-fork detached" >> "$LOG"
}

check_ollama() {
  if ! curl -s --max-time 3 http://localhost:11434/api/tags >/dev/null 2>&1; then
    echo "[$(stamp)] ollama DOWN · attempting start" >> "$LOG"
    systemctl --user start ollama 2>/dev/null || \
      nohup ollama serve >> "$ROOT/jobs/logs/ollama.log" 2>&1 &
    disown 2>/dev/null
  fi
}

check_postgres() {
  if ! port_bound 5434; then
    echo "[$(stamp)] postgres (5434) DOWN · operator action required (docker compose up -d)" >> "$LOG"
    # NEVER auto-restart postgres · operator-confirmation per §42
  fi
}

# === probes ===
port_bound 8001 || restart_backend
port_bound 3210 || restart_vite_3210
port_bound 3000 || restart_vite_3000
check_ollama
check_postgres

PORT_COUNT=$(ss -tlnp 2>/dev/null | grep -cE ':(3000|3210|5434|8001|11434)\b')
echo "[$(stamp)] watchdog tick complete · ports: ${PORT_COUNT}/5" >> "$LOG"

# §150.3 — DB heartbeat so pending_topics agent counts watchdog ticks
# (silent if backend / postgres unreachable — purely best-effort per §57.7)
if port_bound 5434; then
  PGPASSWORD="${BEV_POSTGRES_PASSWORD:-insur_secret_password}" psql \
    -h "${BEV_POSTGRES_HOST:-localhost}" \
    -p "${BEV_POSTGRES_PORT:-5434}" \
    -U "${BEV_POSTGRES_USER:-insur_user}" \
    -d "${BEV_POSTGRES_DB:-insur_analytics}" \
    -c "INSERT INTO agent_invocation (invocation_id, agent_id, status, created_at, input_text)
         VALUES ('watchdog-' || EXTRACT(EPOCH FROM NOW())::bigint,
                 'sys_watchdog_agent', 'Success', NOW(),
                 'ports=' || ${PORT_COUNT} || '/5')
         ON CONFLICT DO NOTHING;" \
    >/dev/null 2>&1 || true
fi
