"""F08 · F10 · F11 · F14 runtime endpoints · operator 2026-06-12.

  POST /api/v1/translate/run                     · F10
  POST /api/v1/image-clean/ocr                   · F11
  POST /api/v1/embeddings/run                    · F14
  GET  /api/v1/vector-browser/collections        · F08
  GET  /api/v1/vector-browser/collections/{name} · F08
  GET  /api/v1/vector-browser/health             · F08
"""
from __future__ import annotations

import base64
import io
import json
import os
import re
import socket
import urllib.request
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel, Field

from core.role_dependency import require_manager_or_above

translate_router = APIRouter(prefix="/api/v1/translate", tags=["translate"])
ocr_router = APIRouter(prefix="/api/v1/image-clean", tags=["image-clean"])
embed_router = APIRouter(prefix="/api/v1/embeddings", tags=["embeddings"])
vector_router = APIRouter(prefix="/api/v1/vector-browser", tags=["vector-browser"])


# ─────────────────────────────────────────────────────────────────────
# F10 · Translation

class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10_000)
    source_lang: str = "auto"
    target_lang: str = "en"


def _translate_backend() -> tuple[str | None, str]:
    """Detect installed translation lib.

    §57.7 honest: transformers needs model download (multi-GB) so we
    only opt-in to it via env var INSUR_TRANSLATE_USE_HF=1. Otherwise
    we stop at argos · then fall through to scaffold to keep the
    endpoint snappy.
    """
    try:
        import argostranslate.translate  # noqa: F401
        return "argos", "Argos Translate (offline)"
    except Exception:
        pass
    if os.environ.get("INSUR_TRANSLATE_USE_HF") == "1":
        try:
            from transformers import pipeline  # noqa: F401
            return "transformers", "transformers Helsinki-NLP (HF · slow load)"
        except Exception:
            pass
    return None, "scaffold"


@translate_router.post("/run")
def translate_run(body: TranslateRequest,
                  _role: str = Depends(require_manager_or_above)):
    """F10 · Translate text from source_lang to target_lang."""
    backend, label = _translate_backend()
    translated = None
    scaffold = False

    if backend == "argos":
        try:
            from argostranslate import translate as at
            src = body.source_lang if body.source_lang != 'auto' else 'en'
            translated = at.translate(body.text, src, body.target_lang)
        except Exception as e:
            scaffold = True
            translated = f"[SCAFFOLD · argos error: {type(e).__name__}] {body.text}"
    elif backend == "transformers":
        try:
            from transformers import pipeline
            model_id = f"Helsinki-NLP/opus-mt-{body.source_lang}-{body.target_lang}"
            pipe = pipeline("translation", model=model_id)
            r = pipe(body.text, max_length=512)
            translated = r[0]["translation_text"] if r else None
        except Exception as e:
            scaffold = True
            translated = f"[SCAFFOLD · transformers error: {type(e).__name__}] {body.text}"
    else:
        scaffold = True
        # Honest placeholder · mark direction
        translated = (
            f"[STAGE-1 SCAFFOLD · install argostranslate or transformers] "
            f"({body.source_lang}→{body.target_lang}): {body.text}"
        )

    return {
        "text":          body.text[:200] + ("…" if len(body.text) > 200 else ""),
        "source_lang":   body.source_lang,
        "target_lang":   body.target_lang,
        "backend":       backend or "placeholder",
        "backend_label": label,
        "scaffold":      scaffold,
        "translation":   translated,
        "policy_ref":    "§F10 · §57.7 honest scaffold",
    }


@translate_router.get("/languages")
def translate_languages():
    return {
        "languages": [
            {"id": "en", "label": "English"},
            {"id": "es", "label": "Spanish"},
            {"id": "fr", "label": "French"},
            {"id": "de", "label": "German"},
            {"id": "it", "label": "Italian"},
            {"id": "pt", "label": "Portuguese"},
            {"id": "nl", "label": "Dutch"},
            {"id": "ja", "label": "Japanese"},
            {"id": "ko", "label": "Korean"},
            {"id": "zh", "label": "Chinese"},
        ],
        "backend": _translate_backend()[1],
    }


# ─────────────────────────────────────────────────────────────────────
# F11 · Functional OCR

def _ocr_backend() -> tuple[str | None, str]:
    try:
        import pytesseract  # noqa: F401
        return "pytesseract", "pytesseract (Tesseract)"
    except Exception:
        pass
    try:
        import easyocr  # noqa: F401
        return "easyocr", "EasyOCR (PyTorch)"
    except Exception:
        pass
    return None, "scaffold"


@ocr_router.post("/ocr")
async def ocr_run(file: UploadFile = File(...),
                   _role: str = Depends(require_manager_or_above)):
    """F11 · OCR an image file · returns extracted text + per-region boxes."""
    blob = await file.read()
    backend, label = _ocr_backend()

    response: dict[str, Any] = {
        "filename":      file.filename,
        "size_bytes":    len(blob),
        "backend":       backend or "placeholder",
        "backend_label": label,
        "scaffold":      backend is None,
        "policy_ref":    "§F11 · §57.7 honest scaffold",
    }

    if backend is None:
        response["text"] = (
            "[STAGE-1 SCAFFOLD · install pytesseract or easyocr] "
            f"Received {len(blob)} bytes · {file.filename}"
        )
        response["regions"] = []
        return response

    # Real OCR path
    import tempfile
    from pathlib import Path
    tmp = Path(tempfile.gettempdir()) / f"ocr-{os.getpid()}-{file.filename or 'in.png'}"
    tmp.write_bytes(blob)
    try:
        if backend == "pytesseract":
            import pytesseract
            from PIL import Image
            img = Image.open(tmp)
            text = pytesseract.image_to_string(img)
            data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
            regions = []
            for i in range(len(data.get("text", []))):
                t = data["text"][i].strip()
                conf = int(data["conf"][i] or 0)
                if not t or conf < 0:
                    continue
                regions.append({
                    "text": t, "confidence": conf,
                    "x": data["left"][i], "y": data["top"][i],
                    "w": data["width"][i], "h": data["height"][i],
                })
            response["text"] = text.strip()
            response["regions"] = regions[:200]
        else:  # easyocr
            import easyocr
            reader = easyocr.Reader(['en'], gpu=False)
            results = reader.readtext(str(tmp))
            response["text"] = " ".join(r[1] for r in results)
            response["regions"] = [
                {"text": r[1], "confidence": int(r[2] * 100), "box": r[0]}
                for r in results[:200]
            ]
    except Exception as e:
        response["scaffold"] = True
        response["error"] = f"{type(e).__name__}: {str(e)[:120]}"
        response["text"] = "[OCR runtime error · see error field]"
        response["regions"] = []
    finally:
        try:
            tmp.unlink()
        except OSError:
            pass

    return response


# ─────────────────────────────────────────────────────────────────────
# F14 · Embedding Playground

class EmbedRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10_000)
    model: str = "bge-m3"


def _ollama_url() -> str:
    return os.environ.get("OLLAMA_URL", "http://localhost:11434")


def _ollama_reachable(timeout: float = 0.5) -> bool:
    try:
        host = _ollama_url().split("://")[1].split(":")[0]
        port = int(_ollama_url().split(":")[-1])
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(timeout)
            return s.connect_ex((host, port)) == 0
    except (OSError, ValueError, IndexError):
        return False


def _ollama_embed(model: str, text: str) -> list[float] | None:
    """Call Ollama /api/embeddings · returns vector or None."""
    if not _ollama_reachable():
        return None
    try:
        req = urllib.request.Request(
            f"{_ollama_url()}/api/embeddings",
            data=json.dumps({"model": model, "prompt": text}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            d = json.loads(resp.read().decode("utf-8"))
        return d.get("embedding")
    except Exception:
        return None


@embed_router.post("/run")
def embed_run(body: EmbedRequest,
              _role: str = Depends(require_manager_or_above)):
    """F14 · Get embedding vector via Ollama (bge-m3 / nomic-embed / etc)."""
    vec = _ollama_embed(body.model, body.text)
    if vec is None:
        return {
            "text":     body.text[:200] + ("…" if len(body.text) > 200 else ""),
            "model":    body.model,
            "scaffold": True,
            "backend":  "ollama-unreachable",
            "dim":      0,
            "vector":   [],
            "policy_ref": "§F14 · §57.7 honest scaffold (Ollama not reachable)",
        }
    return {
        "text":         body.text[:200] + ("…" if len(body.text) > 200 else ""),
        "model":        body.model,
        "scaffold":     False,
        "backend":      "ollama",
        "dim":          len(vec),
        "vector":       vec[:64],   # surface first 64 dims to UI; full vec too big
        "vector_full_count": len(vec),
        "norm":         round(sum(x * x for x in vec) ** 0.5, 6),
        "min":          round(min(vec), 6),
        "max":          round(max(vec), 6),
        "policy_ref":   "§F14 · live Ollama embedding",
    }


@embed_router.get("/health")
def embed_health():
    reachable = _ollama_reachable()
    return {
        "ollama_reachable": reachable,
        "url": _ollama_url(),
        "scaffold": not reachable,
        "supported_models": ["bge-m3", "nomic-embed-text", "all-minilm",
                              "bge-large", "mxbai-embed-large"],
    }


# ─────────────────────────────────────────────────────────────────────
# F08 · Vector DB Browser

def _port_open(host: str, port: int, timeout: float = 0.5) -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(timeout)
            return s.connect_ex((host, port)) == 0
    except OSError:
        return False


def _chroma_client():
    host = os.environ.get("CHROMA_HOST", "localhost")
    port = int(os.environ.get("CHROMA_PORT", "8000"))
    if not _port_open(host, port):
        return None
    try:
        import chromadb
        return chromadb.HttpClient(host=host, port=port)
    except Exception:
        return None


def _qdrant_client():
    host = os.environ.get("QDRANT_HOST", "localhost")
    port = int(os.environ.get("QDRANT_PORT", "6333"))
    if not _port_open(host, port):
        return None
    try:
        from qdrant_client import QdrantClient
        return QdrantClient(host=host, port=port, timeout=2)
    except Exception:
        return None


@vector_router.get("/health")
def vector_health():
    chroma_ok = False
    qdrant_ok = False
    try:
        c = _chroma_client()
        if c:
            c.heartbeat()
            chroma_ok = True
    except Exception:
        pass
    try:
        q = _qdrant_client()
        if q:
            q.get_collections()
            qdrant_ok = True
    except Exception:
        pass
    return {
        "chroma": {"reachable": chroma_ok,
                    "host": os.environ.get("CHROMA_HOST", "localhost"),
                    "port": int(os.environ.get("CHROMA_PORT", "8000"))},
        "qdrant": {"reachable": qdrant_ok,
                    "host": os.environ.get("QDRANT_HOST", "localhost"),
                    "port": int(os.environ.get("QDRANT_PORT", "6333"))},
        "scaffold": not (chroma_ok or qdrant_ok),
        "policy_ref": "§F08 · honest reachability per §57.7",
    }


@vector_router.get("/collections")
def vector_collections():
    """List collections from Chroma + Qdrant if reachable · §57.7 honest scaffold otherwise."""
    out: list[dict] = []

    c = _chroma_client()
    if c:
        try:
            for col in c.list_collections():
                out.append({
                    "backend":    "chroma",
                    "name":       getattr(col, "name", str(col)),
                    "count":      getattr(col, "count", lambda: None)() if callable(getattr(col, "count", None)) else None,
                    "metadata":   getattr(col, "metadata", None),
                })
        except Exception:
            pass

    q = _qdrant_client()
    if q:
        try:
            cols = q.get_collections().collections
            for col in cols:
                info = q.get_collection(col.name)
                out.append({
                    "backend":     "qdrant",
                    "name":        col.name,
                    "points_count": getattr(info, "points_count", None),
                    "vectors_count": getattr(info, "vectors_count", None),
                    "status":      str(getattr(info, "status", "")),
                })
        except Exception:
            pass

    if not out:
        # §57.7 honest scaffold: return demo rows so UI still renders
        out = [
            {"backend": "scaffold", "name": "(no vector DB reachable)",
             "scaffold": True, "hint": "Start chroma on :8000 or qdrant on :6333"},
        ]

    return {
        "collections": out,
        "count":       len(out),
        "scaffold":    not any(c.get("backend") in ("chroma", "qdrant") for c in out),
        "policy_ref":  "§F08 · live Chroma + Qdrant aggregator · §57.7 honest fallback",
    }


@vector_router.get("/collections/{name}")
def vector_collection_detail(name: str):
    """Get details + sample 5 rows from one collection · works for either backend."""
    detail: dict[str, Any] = {"name": name, "rows": []}

    c = _chroma_client()
    if c:
        try:
            col = c.get_collection(name)
            d = col.get(limit=5, include=["documents", "metadatas"])
            detail.update({
                "backend": "chroma",
                "count":   col.count(),
                "rows":    [
                    {"id": d["ids"][i],
                     "document": (d["documents"][i] or "")[:200] if d.get("documents") else None,
                     "metadata": d["metadatas"][i] if d.get("metadatas") else None}
                    for i in range(len(d.get("ids", [])))
                ],
            })
            return detail
        except Exception:
            pass

    q = _qdrant_client()
    if q:
        try:
            info = q.get_collection(name)
            scrolled = q.scroll(collection_name=name, limit=5, with_payload=True)
            points, _ = scrolled
            detail.update({
                "backend":      "qdrant",
                "points_count": getattr(info, "points_count", None),
                "rows":         [
                    {"id": p.id, "payload": p.payload}
                    for p in points
                ],
            })
            return detail
        except Exception:
            pass

    raise HTTPException(404, {"detail": f"Collection not found: {name}",
                                "error_code": "VECTOR_COLLECTION_404"})
