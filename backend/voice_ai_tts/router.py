"""§F01 · TTS endpoint · POST /api/v1/voice-ai/text-to-speech.

Stage-1 per §57.7 honest scaffold: tries pyttsx3 → gTTS → Coqui TTS.
Returns base64-encoded WAV with `scaffold` flag indicating whether a
real synthesizer was used or a placeholder generated.
"""
from __future__ import annotations

import base64
import io
import os
import tempfile
import wave
import struct
import math
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core.role_dependency import require_manager_or_above

router = APIRouter(prefix="/api/v1/voice-ai", tags=["voice-ai"])


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5_000)
    voice: str | None = "default"
    speed: float = Field(1.0, ge=0.5, le=2.0)
    format: str = Field("wav", pattern="^(wav|mp3)$")


def _backend_available() -> tuple[str | None, str]:
    """Return (backend_name, label) or (None, 'scaffold')."""
    try:
        import gtts  # noqa: F401
        return "gtts", "Google TTS (online)"
    except Exception:
        pass
    try:
        import pyttsx3  # noqa: F401
        return "pyttsx3", "pyttsx3 (offline)"
    except Exception:
        pass
    try:
        from TTS.api import TTS  # noqa: F401
        return "coqui", "Coqui TTS (offline)"
    except Exception:
        pass
    return None, "scaffold"


def _generate_placeholder_wav(text: str, sample_rate: int = 16000) -> bytes:
    """Generate a tone-modulated placeholder WAV proportional to text length.

    §57.7 honest scaffold: when no TTS backend is installed, callers still
    get a valid WAV file (not silence · not zero-bytes) so the UI never
    breaks. The placeholder is a low-volume sine that audibly differs from
    real speech so testers can hear immediately that scaffold is active.
    """
    duration = max(0.5, min(10.0, len(text) * 0.06))
    n_frames = int(sample_rate * duration)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        amp = 6000
        frames = bytearray()
        for i in range(n_frames):
            # Slow chirp 220-440 Hz so it's audibly distinct from speech
            freq = 220 + (i / n_frames) * 220
            sample = int(amp * math.sin(2 * math.pi * freq * i / sample_rate))
            frames += struct.pack("<h", sample)
        wf.writeframes(bytes(frames))
    return buf.getvalue()


def _gtts_synthesize(text: str, voice: str | None = None) -> bytes:
    from gtts import gTTS
    tts = gTTS(text=text, lang=(voice or "en"))
    buf = io.BytesIO()
    tts.write_to_fp(buf)
    return buf.getvalue()


def _pyttsx3_synthesize(text: str) -> bytes:
    import pyttsx3
    engine = pyttsx3.init()
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        engine.save_to_file(text, str(tmp_path))
        engine.runAndWait()
        return tmp_path.read_bytes()
    finally:
        try:
            tmp_path.unlink()
        except OSError:
            pass


@router.post("/text-to-speech")
def text_to_speech(
    body: TTSRequest,
    _role: str = Depends(require_manager_or_above),
):
    """§F01 · Generate audio from text · returns base64 WAV/MP3."""
    backend, label = _backend_available()
    audio_bytes: bytes
    scaffold = False

    try:
        if backend == "gtts":
            audio_bytes = _gtts_synthesize(body.text, body.voice)
            content_type = "audio/mpeg"
            ext = "mp3"
        elif backend == "pyttsx3":
            audio_bytes = _pyttsx3_synthesize(body.text)
            content_type = "audio/wav"
            ext = "wav"
        else:
            scaffold = True
            audio_bytes = _generate_placeholder_wav(body.text)
            content_type = "audio/wav"
            ext = "wav"
    except Exception as e:
        # On any synth failure, fall back to scaffold but flag the error
        scaffold = True
        audio_bytes = _generate_placeholder_wav(body.text)
        content_type = "audio/wav"
        ext = "wav"
        label = f"fallback after {type(e).__name__}: {str(e)[:60]}"

    return {
        "text": body.text[:200] + ("…" if len(body.text) > 200 else ""),
        "voice": body.voice,
        "speed": body.speed,
        "backend": backend or "placeholder",
        "backend_label": label,
        "scaffold": scaffold,
        "format": ext,
        "content_type": content_type,
        "audio_b64": base64.b64encode(audio_bytes).decode("ascii"),
        "size_bytes": len(audio_bytes),
        "policy_ref": "§F01 PENDING · §57.7 honest scaffold",
    }


@router.get("/text-to-speech/voices")
def list_voices():
    """List supported voices · informational."""
    backend, label = _backend_available()
    return {
        "backend": backend or "placeholder",
        "backend_label": label,
        "voices": [
            {"id": "en", "label": "English (default)"},
            {"id": "es", "label": "Spanish"},
            {"id": "fr", "label": "French"},
            {"id": "de", "label": "German"},
        ] if backend == "gtts" else [
            {"id": "default", "label": "System default"},
        ],
    }
