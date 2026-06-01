#!/usr/bin/env bash
# Advanced installer for Codex/Archon safe local approval automation.
#
# Primary mode: user systemd service that continuously runs the conservative
# safe approval helper every 2 seconds.
# Fallback mode: repo-local nohup background process with PID file.
# Cron remains installed as a backup via scripts/install_codex_approval_cron.sh.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="${PYTHON:-/home/praveen/venv-ardupilot/bin/python3}"
INTERVAL="${CODEX_APPROVAL_WATCH_INTERVAL:-2}"
LOG_DIR="${REPO}/jobs/logs"
PID_FILE="${REPO}/jobs/codex_approval_watch.pid"
SERVICE_NAME="insur-codex-approval-watch.service"
SERVICE_DIR="${HOME}/.config/systemd/user"
SERVICE_PATH="${SERVICE_DIR}/${SERVICE_NAME}"
HELPER="${REPO}/scripts/archon_auto_approve_safe.py"

mkdir -p "${LOG_DIR}"

if [ ! -f "${HELPER}" ]; then
  echo "Missing approval helper: ${HELPER}" >&2
  exit 2
fi

# Keep cron as fallback. This is idempotent and updates only its managed block.
"${REPO}/scripts/install_codex_approval_cron.sh" >/dev/null

write_service() {
  mkdir -p "${SERVICE_DIR}"
  cat > "${SERVICE_PATH}" <<EOF
[Unit]
Description=Insur Project Codex safe local approval watcher
Documentation=file://${REPO}/docs/CODEX_APPROVAL_ADVANCED_POLICY.md
After=default.target

[Service]
Type=simple
WorkingDirectory=${REPO}
ExecStart=${PYTHON} ${HELPER} --watch --approve --interval ${INTERVAL}
Restart=always
RestartSec=5
StandardOutput=append:${LOG_DIR}/codex_approval_watch.log
StandardError=append:${LOG_DIR}/codex_approval_watch.log

[Install]
WantedBy=default.target
EOF
}

start_systemd() {
  command -v systemctl >/dev/null 2>&1 || return 1
  write_service
  systemctl --user daemon-reload
  systemctl --user enable --now "${SERVICE_NAME}"
  systemctl --user --no-pager status "${SERVICE_NAME}" || true
  echo "Advanced Codex approval watcher installed with user systemd: ${SERVICE_NAME}"
}

start_nohup() {
  if [ -f "${PID_FILE}" ]; then
    old_pid="$(cat "${PID_FILE}" 2>/dev/null || true)"
    if [ -n "${old_pid}" ] && kill -0 "${old_pid}" 2>/dev/null; then
      echo "Stopping existing fallback watcher PID ${old_pid}"
      kill "${old_pid}" 2>/dev/null || true
    fi
  fi
  nohup "${PYTHON}" "${HELPER}" --watch --approve --interval "${INTERVAL}" >> "${LOG_DIR}/codex_approval_watch.log" 2>&1 &
  echo "$!" > "${PID_FILE}"
  echo "Advanced Codex approval watcher started with fallback PID $(cat "${PID_FILE}")"
}

case "${1:-install}" in
  install|start)
    if start_systemd; then
      exit 0
    fi
    echo "User systemd unavailable; using fallback background watcher."
    start_nohup
    ;;
  stop)
    if command -v systemctl >/dev/null 2>&1 && [ -f "${SERVICE_PATH}" ]; then
      systemctl --user disable --now "${SERVICE_NAME}" || true
    fi
    if [ -f "${PID_FILE}" ]; then
      pid="$(cat "${PID_FILE}" 2>/dev/null || true)"
      if [ -n "${pid}" ] && kill -0 "${pid}" 2>/dev/null; then
        kill "${pid}" || true
      fi
      rm -f "${PID_FILE}"
    fi
    echo "Advanced Codex approval watcher stopped."
    ;;
  status)
    if command -v systemctl >/dev/null 2>&1 && [ -f "${SERVICE_PATH}" ]; then
      systemctl --user --no-pager status "${SERVICE_NAME}" || true
    fi
    if [ -f "${PID_FILE}" ]; then
      pid="$(cat "${PID_FILE}" 2>/dev/null || true)"
      if [ -n "${pid}" ] && kill -0 "${pid}" 2>/dev/null; then
        echo "Fallback watcher running: PID ${pid}"
      else
        echo "Fallback PID file exists but process is not running: ${pid}"
      fi
    fi
    ;;
  *)
    echo "Usage: $0 [install|start|stop|status]" >&2
    exit 2
    ;;
esac
