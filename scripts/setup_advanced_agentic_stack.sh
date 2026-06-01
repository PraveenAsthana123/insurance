#!/usr/bin/env bash
# Unified advanced setup for BMAD + Archon + OpenClaw in this repo.
#
# This script does not make production changes. It prepares the local planning,
# workflow, approval, and agent-task submission surfaces used by Codex/Claude.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${ROOT}/jobs/logs"
REPORT_DIR="${ROOT}/jobs/reports"
REPORT="${REPORT_DIR}/advanced_agentic_stack_status.txt"
API_URL="${API_URL:-http://localhost:8000}"
REDIS_URL="${REDIS_URL:-redis://localhost:6379/0}"
MODE="${1:-status}"

mkdir -p "${LOG_DIR}" "${REPORT_DIR}"

log() {
  printf '%s\n' "$*" | tee -a "${REPORT}"
}

run_capture() {
  local label="$1"
  shift
  log ""
  log "== ${label} =="
  if "$@" > >(tee -a "${REPORT}") 2> >(tee -a "${REPORT}" >&2); then
    log "OK: ${label}"
  else
    local rc=$?
    log "WARN: ${label} exited ${rc}"
    return 0
  fi
}

reset_report() {
  : > "${REPORT}"
  log "Advanced agentic stack report"
  log "Root: ${ROOT}"
  log "Mode: ${MODE}"
  log "API_URL: ${API_URL}"
  log "REDIS_URL: ${REDIS_URL}"
  log "Generated: $(date -Is)"
}

start_local_stack() {
  run_capture "docker compose up redis ollama backend" docker compose up -d redis ollama backend
}

start_advanced_approval() {
  run_capture "advanced Archon/Codex approval watcher" "${ROOT}/scripts/install_codex_approval_advanced.sh" start
  run_capture "advanced approval status" "${ROOT}/scripts/install_codex_approval_advanced.sh" status
}

check_bmad() {
  run_capture "BMAD status" "${ROOT}/scripts/bmad.sh" status
}

check_archon() {
  run_capture "Archon version" archon --version
  run_capture "Archon workflow list" archon workflow list
  run_capture "Archon workflow status" archon workflow status --json
}

check_openclaw() {
  run_capture "agent platform status" "${ROOT}/scripts/agent_fleet.sh" platform-status
  run_capture "agent supervisor status" "${ROOT}/scripts/agent_fleet.sh" supervisor
  run_capture "OpenClaw HTTP status" curl -sS "${API_URL}/api/v1/openclaw/status"
  run_capture "OpenClaw HTTP manifest" curl -sS "${API_URL}/api/v1/openclaw/manifest"
}

submit_smoke_task() {
  local prompt="${2:-Advanced stack smoke: confirm local agent queue is reachable}"
  run_capture "OpenClaw council smoke submit" "${ROOT}/scripts/agent_fleet.sh" submit-council "${prompt}" engineering
}

usage() {
  cat <<'HELP'
Usage: scripts/setup_advanced_agentic_stack.sh <command>

Commands:
  setup          Start local Redis/Ollama/backend, advanced approval watcher, and run status checks.
  status         Check BMAD, Archon, approval watcher, agent platform, supervisor, and OpenClaw.
  start          Start local stack and advanced approval watcher only.
  smoke          Submit one safe OpenClaw council smoke task after status checks.
  stop-approval  Stop the advanced approval watcher only.

Environment:
  API_URL=http://localhost:8000
  REDIS_URL=redis://localhost:6379/0
HELP
}

reset_report
cd "${ROOT}"

case "${MODE}" in
  setup)
    start_local_stack
    start_advanced_approval
    check_bmad
    check_archon
    check_openclaw
    ;;
  status)
    start_advanced_approval
    check_bmad
    check_archon
    check_openclaw
    ;;
  start)
    start_local_stack
    start_advanced_approval
    ;;
  smoke)
    start_local_stack
    start_advanced_approval
    check_bmad
    check_archon
    check_openclaw
    submit_smoke_task "$@"
    ;;
  stop-approval)
    run_capture "stop advanced approval watcher" "${ROOT}/scripts/install_codex_approval_advanced.sh" stop
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    usage
    exit 2
    ;;
esac

log ""
log "Report: ${REPORT}"
