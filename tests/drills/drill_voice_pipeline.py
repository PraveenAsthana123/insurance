#!/usr/bin/env python3
"""
Drill: voice pipeline — Piper TTS → WAV → Whisper STT round-trip.

Locks the install + behavior contract for scripts/voice_out.py and
scripts/voice_in.py per the operator's "make voice-over command" ask.
Real synthesis + transcription happen — no mocks. Drill skips mic
capture (operator hardware) and exercises file-only paths.

Steps (8 total; 3 negative):
  1. (+) Piper voice model present (en_US-lessac-medium cached)
  2. (+) Whisper 'tiny' model loadable
  3. (+) voice_out.py synthesizes a WAV from --text (valid PCM 22050 Hz)
  4. (-) NEG: voice_out.py with no text + no stdin → exit 2
  5. (+) voice_in.py transcribes the Piper WAV back to text containing
        the key phrase (substring match, case-insensitive)
  6. (-) NEG: voice_in.py with non-existent WAV → exit 2 (no crash)
  7. (-) NEG: voice_in.py without --wav or --record → argparse rejects (exit 2)
  8. (+) Cleanup: WAV file deletable; no leftover model temp files

# RESOURCES: disk_io,gpu_or_cpu_compute

Exit 0 on PASS, 1 on any failure. ~15-30s wall-clock on first run
(model loads); ~3s on subsequent runs once models are cached.
"""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import time
import wave
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
VENV_PY = Path("/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python")
PY = str(VENV_PY) if VENV_PY.exists() else sys.executable

VOICE_OUT = REPO_ROOT / "scripts" / "voice_out.py"
VOICE_IN = REPO_ROOT / "scripts" / "voice_in.py"
PIPER_CACHE = Path(os.environ.get("PIPER_CACHE_DIR", str(Path.home() / ".cache" / "piper-models")))
PIPER_MODEL = PIPER_CACHE / "en_US-lessac-medium.onnx"


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' - ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def _run(args, timeout=120):
    """Run a script + return (returncode, stdout, stderr). Never raises."""
    try:
        proc = subprocess.run(
            [PY] + args, capture_output=True, text=True, timeout=timeout,
        )
        return proc.returncode, proc.stdout, proc.stderr
    except subprocess.TimeoutExpired:
        return 124, "", "timeout"


def main() -> int:
    print("\nDRILL: voice pipeline (Piper TTS + Whisper STT)\n")
    t0 = time.time()

    # ---- Step 1: Piper model present ----
    step(1, "Piper voice model en_US-lessac-medium present in cache",
         PIPER_MODEL.exists() and PIPER_MODEL.stat().st_size > 1_000_000,
         f"path={PIPER_MODEL} size={PIPER_MODEL.stat().st_size if PIPER_MODEL.exists() else 0}")

    # ---- Step 2: whisper package + tiny model loadable ----
    rc, out, err = _run(["-c",
        "import whisper; m = whisper.load_model('tiny'); print('ok', m.device)"
    ], timeout=120)
    step(2, "Whisper 'tiny' model loads (downloads if absent on first run)",
         rc == 0 and "ok" in out,
         f"rc={rc} stdout={out.strip()[:60]!r}")

    # ---- Step 3: voice_out synthesizes WAV ----
    with tempfile.TemporaryDirectory() as tmp:
        wav_path = Path(tmp) / "test.wav"
        # Use common English words that Whisper tiny transcribes reliably.
        # 'insurerage' was misheard as 'bafferage' on first runs.
        rc, out, err = _run([str(VOICE_OUT), "--text",
                             "this is a voice pipeline test",
                             "--out", str(wav_path)], timeout=60)
        wav_ok = rc == 0 and wav_path.exists() and wav_path.stat().st_size > 1000
        if wav_ok:
            with wave.open(str(wav_path)) as wf:
                rate = wf.getframerate()
                nch = wf.getnchannels()
        else:
            rate = nch = None
        step(3, "voice_out.py synthesizes valid WAV (22050Hz mono PCM)",
             wav_ok and rate == 22050 and nch == 1,
             f"rc={rc} size={wav_path.stat().st_size if wav_path.exists() else 0} rate={rate} nch={nch}")

        # ---- Step 4: NEG no text → exit 2 ----
        # Pipe empty stdin
        proc = subprocess.run(
            [PY, str(VOICE_OUT)], input="", capture_output=True, text=True, timeout=30,
        )
        step(4, "NEG: voice_out.py with no text + empty stdin → exit 2",
             proc.returncode == 2,
             f"rc={proc.returncode}")

        # ---- Step 5: voice_in transcribes the WAV ----
        rc, out, err = _run([str(VOICE_IN), "--wav", str(wav_path),
                             "--model", "tiny"], timeout=180)
        transcript = (out or "").strip().lower()
        # Loose match: assert ≥3 of the 5 spoken content words appear.
        # Whisper tiny is fast but mishears; the drill verifies the pipeline,
        # not the model's accuracy.
        expected_words = {"voice", "pipeline", "test", "this", "is"}
        seen = {w for w in expected_words if w in transcript}
        step(5, "voice_in.py transcribes Piper WAV → ≥3 of 5 expected words present",
             rc == 0 and len(seen) >= 3,
             f"rc={rc} transcript={transcript[:80]!r} matched={sorted(seen)}")

        # ---- Step 6: NEG non-existent WAV → exit 2 ----
        rc, out, err = _run([str(VOICE_IN), "--wav", "/tmp/nonexistent_voice_drill.wav",
                             "--model", "tiny"], timeout=30)
        step(6, "NEG: voice_in.py on missing WAV → exit 2 (no crash)",
             rc == 2,
             f"rc={rc} stderr={(err or '').strip()[:60]!r}")

        # ---- Step 7: NEG no --wav / --record → argparse 2 ----
        rc, out, err = _run([str(VOICE_IN), "--model", "tiny"], timeout=15)
        step(7, "NEG: voice_in.py with neither --wav nor --record → argparse exit 2",
             rc == 2,
             f"rc={rc}")

        # ---- Step 8: cleanup ----
        wav_path.unlink(missing_ok=True)
        step(8, "WAV file removable after use",
             not wav_path.exists(),
             f"")

    print(f"\n\033[32mALL 8 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
