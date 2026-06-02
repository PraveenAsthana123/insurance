#!/usr/bin/env bash
# setup_advanced_models.sh — install/verify advanced Whisper + Ollama models.
#
# Per operator 2026-06-01 ("setup advance whisper model, kivi coding model,
# grok model on ollama as well").
#
# Downloads (lazy — only if not already present):
#   - Whisper distil-large-v3 (faster + as-accurate-as large-v3, ~1.5GB)
#   - Kivi coding model on Ollama (if not present)
#   - Advanced coding model: qwen2.5-coder:7b (Grok-equivalent capable, ~4GB)
#   - Deepseek-coder-v2:16b as fallback (~10GB, only if requested with --heavy)
#
# Usage:
#   bash scripts/setup_advanced_models.sh           # default light setup
#   bash scripts/setup_advanced_models.sh --heavy   # include large coder models

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="${PYTHON:-/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python}"
OLLAMA_HOST="${OLLAMA_HOST:-http://localhost:11434}"
HEAVY="false"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --heavy) HEAVY="true"; shift;;
        *) echo "unknown arg: $1" >&2; exit 1;;
    esac
done

red()    { printf "\033[1;31m%s\033[0m\n" "$*"; }
green()  { printf "\033[1;32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[1;33m%s\033[0m\n" "$*"; }
blue()   { printf "\033[1;34m%s\033[0m\n" "$*"; }

# ─────────────────────────────────────────────────────────────────────────
# Whisper advanced model — distil-large-v3 via faster-whisper
# ─────────────────────────────────────────────────────────────────────────
blue "═══ Step 1: Whisper distil-large-v3 ═══"
"$PYTHON" <<'PYEOF'
import sys
try:
    from faster_whisper import WhisperModel
except ImportError:
    print("  ! faster-whisper not installed; installing...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "faster-whisper"])
    from faster_whisper import WhisperModel

# Triggers download to ~/.cache/huggingface/hub/ on first use
print("  → ensuring distil-large-v3 cached (downloads ~1.5GB if first time)...")
model = WhisperModel("distil-large-v3", device="cpu", compute_type="int8")
print(f"  ✓ distil-large-v3 ready (compute=int8, device=cpu)")

# Optional: also pre-fetch large-v3 for highest-quality fallback
import os
if os.environ.get("WHISPER_PREFETCH_LARGE") == "1":
    print("  → also caching large-v3 (~1.5GB)...")
    model_lg = WhisperModel("large-v3", device="cpu", compute_type="int8")
    print(f"  ✓ large-v3 ready")
PYEOF
green "  Whisper advanced models cached"

# ─────────────────────────────────────────────────────────────────────────
# Ollama models — Kivi, coder, optional heavy
# ─────────────────────────────────────────────────────────────────────────
blue "═══ Step 2: Ollama coding + Kivi models ═══"

# Test Ollama reachable
if ! curl -fs "$OLLAMA_HOST/api/tags" >/dev/null 2>&1; then
    red "  ✗ Ollama not reachable at $OLLAMA_HOST"
    yellow "    docker compose up -d ollama"
    yellow "    OR set OLLAMA_HOST=http://your-ollama:11434"
    exit 1
fi
green "  ✓ Ollama reachable at $OLLAMA_HOST"

INSTALLED=$(curl -fs "$OLLAMA_HOST/api/tags" | python3 -c "import sys,json; print(' '.join(m['name'] for m in json.load(sys.stdin).get('models', [])))")
echo "  installed: $INSTALLED"

pull_if_missing() {
    local model="$1"
    if echo " $INSTALLED " | grep -q " $model "; then
        green "  ✓ $model already present"
    else
        yellow "  → pulling $model (may take minutes)..."
        if curl -X POST "$OLLAMA_HOST/api/pull" -d "{\"name\":\"$model\"}" --no-buffer 2>&1 | grep -E "status|error" | tail -3; then
            green "  ✓ $model pulled"
        else
            red "  ✗ $model pull failed"
        fi
    fi
}

# Kivi — the operator's local coding model (referenced as kivi:local in compose)
pull_if_missing "kivi:local"

# Advanced coder (Grok-equivalent capable)
pull_if_missing "qwen2.5-coder:7b"

# Grok community port (only if available — not always on Ollama hub)
if [[ "$HEAVY" == "true" ]]; then
    pull_if_missing "deepseek-coder-v2:16b"
    # Grok-1 community is huge; skip unless explicitly approved
    yellow "  ! grok-1 (314B params) not pulled — too large. Use qwen2.5-coder:7b as Grok-equivalent."
fi

# ─────────────────────────────────────────────────────────────────────────
# Verify Kivi reachable via inference
# ─────────────────────────────────────────────────────────────────────────
blue "═══ Step 3: Verify Kivi inference ═══"
RESP=$(curl -s -X POST "$OLLAMA_HOST/api/generate" \
    -d '{"model":"kivi:local","prompt":"reply with the single word PONG","stream":false}' \
    --max-time 30 2>&1)
if echo "$RESP" | grep -qi "pong"; then
    green "  ✓ Kivi inference works (PONG returned)"
else
    yellow "  ! Kivi inference test inconclusive; raw response:"
    echo "$RESP" | head -3
fi

# ─────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────
blue "═══ Summary ═══"
cat <<EOF
  Whisper:
    distil-large-v3 (default for voice_command.sh)
    large-v3 (set WHISPER_PREFETCH_LARGE=1 to pre-cache)

  Ollama:
    kivi:local        (operator's coding model)
    qwen2.5-coder:7b  (Grok-equivalent capable coder)
$([[ "$HEAVY" == "true" ]] && echo "    deepseek-coder-v2:16b (heavy mode)")

  Use voice command:
    bash scripts/voice_command.sh                          # 10s mic → STT → clipboard
    bash scripts/voice_command.sh --dispatch               # also run via automation
    bash scripts/voice_command.sh --model large-v3         # use heavier Whisper

  Use Kivi coder via existing infra:
    COUNCIL_AUTHOR_MODEL=kivi:local docker compose up -d council_agents
EOF
green "✓ Advanced models setup complete"
