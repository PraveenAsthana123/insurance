#!/usr/bin/env bash
# setup_advanced_dev_environment.sh — master orchestrator for the advanced
# dev environment. Editor-agnostic: works under Claude Code, Cursor, Codex,
# vim, or bare shell.
#
# Per operator 2026-06-01:
#   "have advance level voice over command setup, bmad setup, openclaw setup,
#    perpclip [paperclip] setup"
#   "other editor codex also should able to use"
#
# Sets up (or verifies) all 4 advanced subsystems in dependency order:
#   1. BMAD (planning + PRD + architecture + stories)
#   2. OpenClaw (execution-orchestration gateway)
#   3. Paperclip (artifact / context-pack adapter)
#   4. Voice command (mic → Whisper → clipboard + dispatch)
#   5. Advanced models (Whisper distil-large-v3 + Kivi + qwen2.5-coder)
#
# Usage:
#   bash scripts/setup_advanced_dev_environment.sh           # full setup
#   bash scripts/setup_advanced_dev_environment.sh --status  # status check only
#   bash scripts/setup_advanced_dev_environment.sh --module bmad,openclaw

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="${PYTHON:-/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python}"
BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
OLLAMA_HOST="${OLLAMA_HOST:-http://localhost:11434}"
LOG_DIR="$REPO/jobs/logs"

STATUS_ONLY="false"
MODULES="bmad,openclaw,paperclip,voice,models"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --status) STATUS_ONLY="true"; shift;;
        --module) MODULES="$2"; shift 2;;
        *) echo "unknown arg: $1" >&2; exit 1;;
    esac
done

mkdir -p "$LOG_DIR"

red()    { printf "\033[1;31m%s\033[0m\n" "$*"; }
green()  { printf "\033[1;32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[1;33m%s\033[0m\n" "$*"; }
blue()   { printf "\033[1;34m%s\033[0m\n" "$*"; }

# ─────────────────────────────────────────────────────────────────────────
# Per-module checks
# ─────────────────────────────────────────────────────────────────────────

check_bmad() {
    blue "═══ BMAD (planning + PRD + architecture + stories) ═══"
    if [[ -d "$REPO/_bmad" && -d "$REPO/_bmad-output" ]]; then
        green "  ✓ _bmad/ + _bmad-output/ present"
        green "  ✓ skills available: bmad-create-prd, bmad-create-architecture, bmad-dev-story"
        if [[ -f "$REPO/_bmad/_config/config.toml" ]]; then
            green "  ✓ _bmad/_config/config.toml present"
        fi
        echo "  Use from any editor:"
        echo "    # Claude/Codex/Cursor: invoke skill name"
        echo "    bmad-create-prd     # → produces docs/PRD.md"
        echo "    bmad-create-architecture"
        echo "    bmad-dev-story <story-id>"
    else
        red "  ✗ BMAD not present at _bmad/ — install via your editor's BMAD plugin"
        return 1
    fi
}

check_openclaw() {
    blue "═══ OpenClaw (execution-orchestration gateway) ═══"
    if [[ -f "$REPO/backend/routers/openclaw.py" && \
          -f "$REPO/backend/services/openclaw_gateway_service.py" ]]; then
        green "  ✓ routers + service wired"
    else
        red "  ✗ openclaw router/service missing"
        return 1
    fi
    if curl -fs "$BACKEND_URL/api/v1/openclaw/status" >/dev/null 2>&1; then
        green "  ✓ /api/v1/openclaw/status reachable"
    else
        yellow "  ! backend not running (start: docker compose up -d backend)"
    fi
    echo "  Use from any editor (HTTP):"
    cat <<EOF
    curl -X POST $BACKEND_URL/api/v1/openclaw/tasks \\
        -H 'Content-Type: application/json' \\
        -H 'X-Tenant-ID: default' \\
        -d '{"task_type":"plan","description":"add /healthz endpoint","department":"engineering"}'
EOF
}

check_paperclip() {
    blue "═══ Paperclip (artifact / context-pack adapter) ═══"
    if [[ -f "$REPO/backend/routers/paperclip.py" && \
          -f "$REPO/backend/services/paperclip_service.py" ]]; then
        green "  ✓ routers + service wired"
    else
        red "  ✗ paperclip router/service missing"
        return 1
    fi
    if curl -fs "$BACKEND_URL/api/v1/paperclip/status" >/dev/null 2>&1; then
        green "  ✓ /api/v1/paperclip/status reachable"
    else
        yellow "  ! backend not running"
    fi
    echo "  Use from any editor (HTTP):"
    cat <<EOF
    # Store an artifact (text + metadata)
    curl -X POST $BACKEND_URL/api/v1/paperclip/clips \\
        -H 'Content-Type: application/json' \\
        -H 'X-Tenant-ID: default' \\
        -H 'Idempotency-Key: \$(uuidgen)' \\
        -d '{"title":"design note","content":"...","source":"editor"}'

    # Build a context pack from multiple clips
    curl -X POST $BACKEND_URL/api/v1/paperclip/context-packs \\
        -H 'Content-Type: application/json' \\
        -H 'X-Tenant-ID: default' \\
        -d '{"clip_ids":["clip-xxx","clip-yyy"],"max_chars":50000}'
EOF
}

check_voice() {
    blue "═══ Voice command (mic → Whisper → clipboard + dispatch) ═══"
    if [[ -x "$REPO/scripts/voice_command.sh" ]]; then
        green "  ✓ scripts/voice_command.sh present + executable"
    else
        red "  ✗ scripts/voice_command.sh missing"
        return 1
    fi
    for tool in arecord xclip; do
        if command -v "$tool" >/dev/null 2>&1; then
            green "  ✓ $tool available"
        else
            yellow "  ! $tool missing (sudo apt install alsa-utils xclip)"
        fi
    done
    "$PYTHON" -c "import faster_whisper" 2>/dev/null && green "  ✓ faster-whisper installed" || \
        yellow "  ! faster-whisper missing (pip install faster-whisper)"
    echo "  Use from any editor / hotkey:"
    cat <<EOF
    bash scripts/voice_command.sh                     # 10s mic → clipboard
    bash scripts/voice_command.sh --duration 5
    bash scripts/voice_command.sh --dispatch          # also dispatch to automation
    bash scripts/voice_command.sh --model large-v3    # heavier model
EOF
}

check_models() {
    blue "═══ Advanced models (Whisper + Kivi + qwen2.5-coder) ═══"
    if [[ -x "$REPO/scripts/setup_advanced_models.sh" ]]; then
        green "  ✓ scripts/setup_advanced_models.sh present"
    else
        red "  ✗ scripts/setup_advanced_models.sh missing"
        return 1
    fi
    if curl -fs "$OLLAMA_HOST/api/tags" >/dev/null 2>&1; then
        green "  ✓ Ollama reachable at $OLLAMA_HOST"
        INSTALLED=$(curl -fs "$OLLAMA_HOST/api/tags" | "$PYTHON" -c "import sys,json; print(' '.join(m['name'] for m in json.load(sys.stdin).get('models', [])))")
        for m in "kivi:local" "qwen2.5-coder:7b"; do
            if echo " $INSTALLED " | grep -q " $m "; then
                green "  ✓ Ollama model: $m"
            else
                yellow "  ! Ollama model missing: $m (run setup_advanced_models.sh)"
            fi
        done
    else
        yellow "  ! Ollama not reachable (docker compose up -d ollama)"
    fi
    echo "  Run full setup:"
    echo "    bash scripts/setup_advanced_models.sh         # default"
    echo "    bash scripts/setup_advanced_models.sh --heavy  # + deepseek-coder-v2:16b"
}

# ─────────────────────────────────────────────────────────────────────────
# Run checks per --module flag
# ─────────────────────────────────────────────────────────────────────────

IFS=',' read -ra SELECTED <<< "$MODULES"
for m in "${SELECTED[@]}"; do
    case "$m" in
        bmad)     check_bmad ;;
        openclaw) check_openclaw ;;
        paperclip) check_paperclip ;;
        voice)    check_voice ;;
        models)   check_models ;;
        *) yellow "  ! unknown module: $m" ;;
    esac
    echo
done

# ─────────────────────────────────────────────────────────────────────────
# Boot if not status-only
# ─────────────────────────────────────────────────────────────────────────

if [[ "$STATUS_ONLY" == "true" ]]; then
    blue "═══ Status-only mode: no installs/changes made ═══"
    exit 0
fi

blue "═══ Boot recommendation ═══"
cat <<EOF
  1. docker compose up -d                           # base stack + Ollama
  2. bash scripts/setup_advanced_models.sh          # pull advanced models
  3. bash scripts/setup_advanced_agentic_stack_v2.sh # OPA + OTel + Temporal
  4. bash scripts/voice_command.sh                  # speak a command
EOF

green ""
green "✓ Advanced dev environment ready for ANY editor (Claude Code / Codex / Cursor / bare shell)"
green "  See docs/EDITOR_AGNOSTIC_SETUP.md for per-editor wiring"
