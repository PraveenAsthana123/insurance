#!/usr/bin/env python3
"""Voice INPUT — record mic OR transcribe WAV → text via OpenAI Whisper.

Usage:
  scripts/voice_in.py --wav /tmp/sample.wav                # transcribe existing WAV
  scripts/voice_in.py --record 5                           # record 5s from mic, transcribe
  scripts/voice_in.py --record 5 --model base              # use 'base' model (39MB, faster)
  scripts/voice_in.py --wav file.wav --model small         # 'small' (244MB, more accurate)

Models: tiny (39MB) / base (74MB) / small (244MB) / medium (769MB) / large (1.5GB)
First use of each model triggers a one-time download to ~/.cache/whisper/.

The recorded/transcribed text goes to stdout — pipe it to xclip, Claude,
or any other consumer. Per global §42 — local mic capture is pre-approved
when invoked explicitly by the operator (push-to-talk model, not always-on).

Drill: tests/drills/drill_voice_pipeline.py
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

DEFAULT_MODEL = "base"


def _record(duration_sec: float, out_path: Path) -> None:
    """Record mono 16kHz WAV from the default ALSA mic via arecord."""
    if shutil.which("arecord") is None:
        raise SystemExit("arecord not found; install alsa-utils for mic capture")
    cmd = [
        "arecord",
        "-q",
        "-f", "S16_LE",
        "-r", "16000",
        "-c", "1",
        "-d", str(duration_sec),
        str(out_path),
    ]
    subprocess.run(cmd, check=True)


def _transcribe(wav_path: Path, model_name: str) -> str:
    """Drive openai-whisper and return the transcribed text. Errors propagate."""
    import whisper  # local import so script can probe without model load
    model = whisper.load_model(model_name)
    result = model.transcribe(str(wav_path), fp16=False)
    return (result.get("text") or "").strip()


def main() -> int:
    p = argparse.ArgumentParser()
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--wav", help="path to a pre-recorded WAV to transcribe")
    g.add_argument("--record", type=float, metavar="SECONDS",
                   help="record N seconds from default mic, then transcribe")
    p.add_argument("--model", default=DEFAULT_MODEL,
                   help="whisper model (tiny|base|small|medium|large)")
    p.add_argument("--keep-record-at", help="if recording, save WAV here for replay/debug")
    args = p.parse_args()

    if args.wav:
        wav_path = Path(args.wav)
        if not wav_path.exists():
            sys.stderr.write(f"voice_in: WAV not found: {wav_path}\n")
            return 2
        text = _transcribe(wav_path, args.model)
    else:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            wav_path = Path(tmp.name)
        try:
            sys.stderr.write(f"recording {args.record}s from mic…\n")
            _record(args.record, wav_path)
            text = _transcribe(wav_path, args.model)
        finally:
            if args.keep_record_at:
                shutil.move(str(wav_path), args.keep_record_at)
            elif wav_path.exists():
                wav_path.unlink()

    print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
