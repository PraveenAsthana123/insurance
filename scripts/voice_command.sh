#!/usr/bin/env bash
# voice_command.sh — push-to-talk: record mic → faster-whisper → clipboard + dispatch.
#
# Per operator 2026-06-01 ("I am not able to give voice over command here").
#
# Flow:
#   1. Record N seconds of mic via arecord
#   2. Transcribe with faster-whisper (default: distil-large-v3, ~1.5GB, fast + accurate)
#   3. Copy transcript to clipboard (xclip / wl-copy auto-detect)
#   4. Echo transcript to stdout
#   5. Optionally dispatch to automation_job_runner.py for self-driving mode
#
# Usage:
#   bash scripts/voice_command.sh                          # 10s record + clipboard + echo
#   bash scripts/voice_command.sh --duration 5             # 5s record
#   bash scripts/voice_command.sh --model large-v3         # heavier model
#   bash scripts/voice_command.sh --dispatch               # also send to automation
#   bash scripts/voice_command.sh --department engineering # dispatch to specific dept
#
# Composes with:
#   scripts/voice_in.py            (the underlying STT)
#   scripts/automation_job_runner.py (the LLM plan + dispatch)

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="${PYTHON:-/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python}"
LOG_DIR="$REPO/jobs/logs"

DURATION=10
MODEL="distil-large-v3"
DISPATCH="false"
DEPT="engineering"
MODE="council"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --duration)   DURATION="$2"; shift 2;;
        --model)      MODEL="$2"; shift 2;;
        --dispatch)   DISPATCH="true"; shift;;
        --department) DEPT="$2"; shift 2;;
        --mode)       MODE="$2"; shift 2;;
        -h|--help)
            sed -n '2,30p' "$0"
            exit 0;;
        *)            echo "unknown arg: $1" >&2; exit 1;;
    esac
done

mkdir -p "$LOG_DIR"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
WAV="/tmp/voice_${TS}.wav"
TRANSCRIPT="/tmp/voice_${TS}.txt"

# ─────────────────────────────────────────────────────────────────────────
# 1. Record
# ─────────────────────────────────────────────────────────────────────────
echo "[voice] recording ${DURATION}s... (speak now)"
arecord -q -f S16_LE -r 16000 -c 1 -d "$DURATION" "$WAV"
echo "[voice] recorded $(du -h "$WAV" | cut -f1) → $WAV"

# ─────────────────────────────────────────────────────────────────────────
# 2. Transcribe (faster-whisper)
# ─────────────────────────────────────────────────────────────────────────
echo "[voice] transcribing with faster-whisper ($MODEL)..."
"$PYTHON" - "$WAV" "$MODEL" "$TRANSCRIPT" <<'PYEOF'
import sys
wav, model_name, out = sys.argv[1], sys.argv[2], sys.argv[3]
try:
    from faster_whisper import WhisperModel
    # CPU is fine for short clips; switch to "cuda" if GPU available
    import os
    device = os.environ.get("WHISPER_DEVICE", "cpu")
    compute = "int8" if device == "cpu" else "float16"
    model = WhisperModel(model_name, device=device, compute_type=compute)
    segments, info = model.transcribe(wav, beam_size=5)
    text = " ".join(seg.text for seg in segments).strip()
except ImportError:
    # Fallback to openai-whisper
    import whisper
    model = whisper.load_model(model_name if "/" not in model_name else "base")
    text = model.transcribe(wav)["text"].strip()
with open(out, "w") as f:
    f.write(text)
print(f"[voice] transcript: {text!r}")
PYEOF

TEXT="$(cat "$TRANSCRIPT")"
echo "$TEXT"

# ─────────────────────────────────────────────────────────────────────────
# 3. Copy to clipboard
# ─────────────────────────────────────────────────────────────────────────
if command -v wl-copy >/dev/null 2>&1 && [[ -n "${WAYLAND_DISPLAY:-}" ]]; then
    echo -n "$TEXT" | wl-copy
    echo "[voice] → clipboard (wl-copy)"
elif command -v xclip >/dev/null 2>&1; then
    echo -n "$TEXT" | xclip -selection clipboard
    echo "[voice] → clipboard (xclip)"
else
    echo "[voice] (no clipboard tool found)"
fi

# ─────────────────────────────────────────────────────────────────────────
# 4. Optional dispatch to automation pipeline
# ─────────────────────────────────────────────────────────────────────────
if [[ "$DISPATCH" == "true" ]]; then
    echo "[voice] dispatching to automation_job_runner..."
    "$PYTHON" "$REPO/scripts/automation_job_runner.py" run-once \
        --mode "$MODE" \
        --department "$DEPT" \
        --text "$TEXT" \
        2>&1 | tee -a "$LOG_DIR/voice_command_${TS}.log"
fi

# Cleanup audio after success (keep transcript for audit)
rm -f "$WAV"

echo "[voice] done. transcript at $TRANSCRIPT"
