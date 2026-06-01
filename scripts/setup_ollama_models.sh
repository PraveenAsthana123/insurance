#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_MODEL="${BASE_MODEL:-gemma3:1b}"
KIVI_MODEL="${KIVI_MODEL:-kivi:local}"
OLLAMA_SERVICE="${OLLAMA_SERVICE:-ollama}"

usage() {
  cat <<'HELP'
Usage: ./scripts/setup_ollama_models.sh <command>

Commands:
  status       Show Ollama models in the compose Ollama service.
  pull-base    Pull BASE_MODEL into Ollama.
  create-kivi  Create KIVI_MODEL alias from ollama_models/kivi.Modelfile.
  setup        Start Ollama, pull base model, create Kivi alias, show status.

Environment:
  BASE_MODEL=gemma3:1b KIVI_MODEL=kivi:local OLLAMA_SERVICE=ollama
HELP
}

compose() {
  docker compose "$@"
}

ollama_exec() {
  compose exec "$OLLAMA_SERVICE" ollama "$@"
}

case "${1:-}" in
  status)
    compose up -d "$OLLAMA_SERVICE"
    ollama_exec list
    ;;
  pull-base)
    compose up -d "$OLLAMA_SERVICE"
    ollama_exec pull "$BASE_MODEL"
    ;;
  create-kivi)
    compose up -d "$OLLAMA_SERVICE"
    local_file="$ROOT_DIR/.tmp.kivi.Modelfile"
    sed "s/^FROM .*/FROM ${BASE_MODEL//\//\\/}/" "$ROOT_DIR/ollama_models/kivi.Modelfile" > "$local_file"
    tmp_file="/tmp/kivi.Modelfile"
    compose cp "$local_file" "$OLLAMA_SERVICE:$tmp_file"
    rm -f "$local_file"
    ollama_exec create "$KIVI_MODEL" -f "$tmp_file"
    ;;
  setup)
    compose up -d "$OLLAMA_SERVICE"
    ollama_exec pull "$BASE_MODEL"
    local_file="$ROOT_DIR/.tmp.kivi.Modelfile"
    sed "s/^FROM .*/FROM ${BASE_MODEL//\//\\/}/" "$ROOT_DIR/ollama_models/kivi.Modelfile" > "$local_file"
    tmp_file="/tmp/kivi.Modelfile"
    compose cp "$local_file" "$OLLAMA_SERVICE:$tmp_file"
    rm -f "$local_file"
    ollama_exec create "$KIVI_MODEL" -f "$tmp_file"
    ollama_exec list
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
