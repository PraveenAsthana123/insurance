#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SIMPLE_AGENTS="${SIMPLE_AGENTS:-100}"
COUNCIL_AGENTS="${COUNCIL_AGENTS:-5}"
TASKS="${TASKS:-100}"
REDIS_URL="${REDIS_URL:-redis://localhost:6379/0}"
API_URL="${API_URL:-http://localhost:8000}"

usage() {
  cat <<'HELP'
Usage: ./scripts/agent_fleet.sh <command> [args]

Commands:
  start-simple [agents] [tasks]     Start Redis/Ollama, seed tasks, scale simple agents.
  start-council [agents] [tasks]    Start Redis/Ollama, seed council tasks, scale council agents.
  start-all                         Start backend, Redis/Ollama, simple agents, and council agents.
  start-100-kivi                    Setup Kivi model and start 100 simple agents.
  ollama-setup                      Pull base model and create Kivi local model alias.
  ollama-status                     List models inside the Ollama compose service.
  seed-simple [tasks]               Seed simple Redis tasks queue.
  seed-council [tasks]              Seed council Redis tasks queue.
  submit-simple "prompt" [dept]     Submit one task through OpenClaw simple mode.
  submit-council "prompt" [dept]    Submit one task through OpenClaw council mode.
  schedule-add <name> <seconds> <mode> "prompt" [dept]
                                   Add recurring interval task schedule.
  schedule-run                      Run local scheduler loop in foreground.
  schedule-once                     Enqueue all currently due schedules once.
  schedule-list                     List recurring schedules.
  status                            Show queue + live heartbeat status once.
  watch                             Refresh monitor every 2 seconds.
  supervisor                        Show queues, heartbeats, schedules, results, and coverage.
  supervisor-watch                  Refresh supervisor every 5 seconds.
  supervisor-health                 Exit non-zero when queues/results are unhealthy.
  supervisor-report [path]          Write JSON supervisor report.
  task-status <task_id>             Inspect one completed task result.
  platform-status                   Check Harness/OpenClaw/Paperclip/PoliysAI/CUA/Stagehand setup.
  platform-manifest                 Print unified agent platform manifest JSON.
  logs-simple                       Follow simple agent logs.
  logs-council                      Follow council agent logs.
  stop-agents                       Stop agent containers only.
  stop-all                          Stop compose stack.

Environment overrides:
  SIMPLE_AGENTS=100 COUNCIL_AGENTS=5 TASKS=100 API_URL=http://localhost:8000 REDIS_URL=redis://localhost:6379/0
HELP
}

compose() {
  docker compose "$@"
}

python_bin() {
  if [[ -x "$ROOT_DIR/.venv/bin/python" ]]; then
    printf '%s\n' "$ROOT_DIR/.venv/bin/python"
  elif command -v python3.11 >/dev/null 2>&1; then
    printf 'python3.11\n'
  else
    printf 'python3\n'
  fi
}

seed_simple() {
  local count="${1:-$TASKS}"
  compose up -d redis
  compose run --rm agents python seeder.py "$count"
}

seed_council() {
  local count="${1:-$TASKS}"
  compose up -d redis
  compose run --rm council_agents python council_seeder.py "$count"
}

submit_openclaw() {
  local mode="$1"
  local prompt="$2"
  local dept="${3:-}"
  curl -sS -X POST "$API_URL/api/v1/openclaw/tasks" \
    -H 'Content-Type: application/json' \
    -H 'X-Demo-Role: manager' \
    -d "{\"mode\":\"$mode\",\"department\":\"$dept\",\"prompt\":\"$prompt\",\"source\":\"codex-claude-cli\",\"metadata\":{\"submitted_by\":\"agent_fleet.sh\"}}"
  printf '\n'
}

case "${1:-}" in
  start-simple)
    agents="${2:-$SIMPLE_AGENTS}"
    tasks="${3:-$TASKS}"
    compose up -d redis ollama
    seed_simple "$tasks"
    compose up -d --scale "agents=$agents" agents
    "$ROOT_DIR/scripts/agent_monitor.py" --redis-url "$REDIS_URL"
    ;;
  start-council)
    agents="${2:-$COUNCIL_AGENTS}"
    tasks="${3:-$TASKS}"
    compose up -d redis ollama
    seed_council "$tasks"
    compose up -d --scale "council_agents=$agents" council_agents
    "$ROOT_DIR/scripts/agent_monitor.py" --redis-url "$REDIS_URL"
    ;;
  start-all)
    compose up -d redis ollama backend
    seed_simple "$TASKS"
    seed_council "$TASKS"
    compose up -d --scale "agents=$SIMPLE_AGENTS" agents --scale "council_agents=$COUNCIL_AGENTS" council_agents
    "$ROOT_DIR/scripts/agent_monitor.py" --redis-url "$REDIS_URL"
    ;;
  start-100-kivi)
    agents="${2:-100}"
    tasks="${3:-100}"
    export AGENT_MODEL="${AGENT_MODEL:-kivi:local}"
    "$ROOT_DIR/scripts/setup_ollama_models.sh" setup
    compose up -d redis ollama
    seed_simple "$tasks"
    compose up -d --scale "agents=$agents" agents
    "$(python_bin)" "$ROOT_DIR/scripts/agent_supervisor.py" --redis-url "$REDIS_URL" status
    ;;
  ollama-setup)
    "$ROOT_DIR/scripts/setup_ollama_models.sh" setup
    ;;
  ollama-status)
    "$ROOT_DIR/scripts/setup_ollama_models.sh" status
    ;;
  seed-simple)
    seed_simple "${2:-$TASKS}"
    ;;
  seed-council)
    seed_council "${2:-$TASKS}"
    ;;
  submit-simple)
    [[ $# -ge 2 ]] || { usage; exit 2; }
    submit_openclaw simple "$2" "${3:-}"
    ;;
  submit-council)
    [[ $# -ge 2 ]] || { usage; exit 2; }
    submit_openclaw council "$2" "${3:-}"
    ;;
  schedule-add)
    [[ $# -ge 5 ]] || { usage; exit 2; }
    "$(python_bin)" "$ROOT_DIR/scripts/agent_scheduler.py" --redis-url "$REDIS_URL" add --name "$2" --every "$3" --mode "$4" --prompt "$5" --department "${6:-}"
    ;;
  schedule-run)
    "$(python_bin)" "$ROOT_DIR/scripts/agent_scheduler.py" --redis-url "$REDIS_URL" run
    ;;
  schedule-once)
    "$(python_bin)" "$ROOT_DIR/scripts/agent_scheduler.py" --redis-url "$REDIS_URL" run --once
    ;;
  schedule-list)
    "$(python_bin)" "$ROOT_DIR/scripts/agent_scheduler.py" --redis-url "$REDIS_URL" list
    ;;
  status)
    "$(python_bin)" "$ROOT_DIR/scripts/agent_monitor.py" --redis-url "$REDIS_URL"
    ;;
  watch)
    "$(python_bin)" "$ROOT_DIR/scripts/agent_monitor.py" --redis-url "$REDIS_URL" --watch
    ;;
  supervisor)
    "$(python_bin)" "$ROOT_DIR/scripts/agent_supervisor.py" --redis-url "$REDIS_URL" status
    ;;
  supervisor-watch)
    "$(python_bin)" "$ROOT_DIR/scripts/agent_supervisor.py" --redis-url "$REDIS_URL" watch
    ;;
  supervisor-health)
    "$(python_bin)" "$ROOT_DIR/scripts/agent_supervisor.py" --redis-url "$REDIS_URL" health
    ;;
  supervisor-report)
    "$(python_bin)" "$ROOT_DIR/scripts/agent_supervisor.py" --redis-url "$REDIS_URL" report --output "${2:-data/agent-supervisor/latest.json}"
    ;;
  task-status)
    [[ $# -ge 2 ]] || { usage; exit 2; }
    "$(python_bin)" "$ROOT_DIR/scripts/agent_supervisor.py" --redis-url "$REDIS_URL" task --task-id "$2"
    ;;
  platform-status)
    "$(python_bin)" "$ROOT_DIR/scripts/setup_agent_platform.py" status
    ;;
  platform-manifest)
    "$(python_bin)" "$ROOT_DIR/scripts/setup_agent_platform.py" manifest
    ;;
  logs-simple)
    compose logs -f agents
    ;;
  logs-council)
    compose logs -f council_agents
    ;;
  stop-agents)
    compose stop agents council_agents test_agents
    ;;
  stop-all)
    compose down
    ;;
  -h|--help|help|'')
    usage
    ;;
  *)
    echo "Unknown command: $1" >&2
    usage
    exit 2
    ;;
esac
