"""/api/v1/pii/* · PII detection + redaction surface · Iter 26 C8."""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from core.pii_redactor import detect_pii, redact_text, _try_presidio

router = APIRouter(prefix="/api/v1/pii", tags=["pii"])


class TextIn(BaseModel):
    text: str


@router.get("/health")
def health():
    p = _try_presidio()
    ok = bool(p) and p is not False
    return {
        "status": "ok",
        "module": "pii",
        "spec": "C8 · regex fallback + Presidio when installed",
        "presidio_available": ok,
        "engines": ["presidio", "regex"] if ok else ["regex"],
    }


@router.post("/detect")
def detect(body: TextIn):
    return detect_pii(body.text)


@router.post("/redact")
def redact(body: TextIn):
    out, findings = redact_text(body.text)
    return {
        "original_length": len(body.text),
        "redacted": out,
        "findings": findings,
        "n_findings": len(findings),
    }
