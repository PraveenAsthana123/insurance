#!/usr/bin/env python3
"""Voice OUTPUT — pipe text → Piper TTS → WAV file or aplay.

Usage:
  echo "hello world" | scripts/voice_out.py                    # → speak via aplay
  scripts/voice_out.py --text "hello world"                    # → speak via aplay
  scripts/voice_out.py --text "hello" --out /tmp/out.wav       # → write WAV, don't play
  scripts/voice_out.py --text "hello" --model en_US-lessac-medium

The first run downloads the requested Piper model (~70-100MB) to
~/.cache/piper-models/. Subsequent runs reuse the cached model.

Per global §42 — local install pre-approved; voice output to local speaker
is also pre-approved. Per global §38.3 — speaking audio is NOT logged (we
log the text input, not the synthesized waveform).

Drill: tests/drills/drill_voice_pipeline.py
"""
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import urllib.request
import wave
from pathlib import Path


CACHE_DIR = Path(os.environ.get("PIPER_CACHE_DIR", str(Path.home() / ".cache" / "piper-models")))
DEFAULT_MODEL = "en_US-lessac-medium"
HF_BASE = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium"


def _ensure_model(model_name: str) -> tuple[Path, Path]:
    """Return (onnx_path, json_path) for the named Piper voice. Download if absent."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    onnx_path = CACHE_DIR / f"{model_name}.onnx"
    json_path = CACHE_DIR / f"{model_name}.onnx.json"
    if model_name != DEFAULT_MODEL:
        # Only the default model has a baked-in download URL. Other models
        # must be pre-downloaded by the operator.
        if not onnx_path.exists() or not json_path.exists():
            raise SystemExit(
                f"Model {model_name!r} not found in {CACHE_DIR}. "
                "Pre-download from https://huggingface.co/rhasspy/piper-voices"
            )
        return onnx_path, json_path

    if not onnx_path.exists():
        sys.stderr.write(f"downloading {model_name}.onnx (~70MB)…\n")
        urllib.request.urlretrieve(f"{HF_BASE}/{model_name}.onnx", onnx_path)
    if not json_path.exists():
        sys.stderr.write(f"downloading {model_name}.onnx.json…\n")
        urllib.request.urlretrieve(f"{HF_BASE}/{model_name}.onnx.json", json_path)
    return onnx_path, json_path


def _synthesize(text: str, model_name: str, out_path: Path) -> None:
    """Drive piper to write a WAV file. Imports happen here so the script
    can probe import errors without the side-effect of model load."""
    from piper.voice import PiperVoice

    onnx_path, _ = _ensure_model(model_name)
    voice = PiperVoice.load(str(onnx_path))
    with wave.open(str(out_path), "wb") as wf:
        voice.synthesize_wav(text, wf)


def _play(path: Path) -> int:
    """Pipe WAV through aplay. Returns aplay's exit code (0 = ok)."""
    if shutil.which("aplay") is None:
        sys.stderr.write("aplay not found; install alsa-utils to play audio\n")
        return 127
    return subprocess.run(["aplay", "-q", str(path)]).returncode


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--text", help="text to speak; if omitted, read from stdin")
    p.add_argument("--out", help="write WAV here; if omitted, play via aplay")
    p.add_argument("--model", default=DEFAULT_MODEL, help="piper voice model name")
    args = p.parse_args()

    text = args.text if args.text else sys.stdin.read()
    text = (text or "").strip()
    if not text:
        sys.stderr.write("voice_out: no text on stdin or --text\n")
        return 2

    out_path = Path(args.out) if args.out else Path("/tmp/voice_out.wav")
    _synthesize(text, args.model, out_path)
    print(f"wrote {out_path} ({out_path.stat().st_size} bytes, model={args.model})")

    if args.out:
        return 0  # caller asked to keep the file
    return _play(out_path)


if __name__ == "__main__":
    sys.exit(main())
