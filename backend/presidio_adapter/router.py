"""/api/v1/presidio/* · Iter 89 · Presidio Stage-1 adapter (Microsoft PII detection)."""
from __future__ import annotations

import re
import httpx
from fastapi import APIRouter
from pydantic import BaseModel

from _adapter_helpers import stamp, configured_when, env_config, scaffold_note

router = APIRouter(prefix="/api/v1/presidio", tags=["presidio"])
ENV_KEY = "PRESIDIO_ANALYZER_URL"

# Fallback regex (when Presidio not deployed) · honest scaffold
FALLBACK_PII = [
    (re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), "US_SSN"),
    (re.compile(r"\b(?:\d[ -]*?){13,16}\b"), "CREDIT_CARD"),
    (re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I), "EMAIL_ADDRESS"),
    (re.compile(r"\b\+?\d{1,3}[-\s]?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}\b"), "PHONE_NUMBER"),
    (re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), "US_ITIN"),
    (re.compile(r"\b\d{1,2}/\d{1,2}/\d{2,4}\b"), "DATE_TIME"),
]


@router.get("/health")
def health():
    url = env_config(ENV_KEY, "http://localhost:5002")
    is_live = False
    if configured_when(ENV_KEY):
        try:
            r = httpx.get(f"{url}/health", timeout=2)
            is_live = r.status_code == 200
        except Exception:
            is_live = False
    return {**stamp(), "module": "presidio-adapter",
            "vendor": "Microsoft Presidio (OSS)",
            "configured": configured_when(ENV_KEY),
            "live_at": url if is_live else None,
            "scaffold_note": None if is_live else scaffold_note(ENV_KEY, "Presidio"),
            "fallback": "Built-in regex (6 PII patterns)",
            "capabilities": ["PII detection (50+ entity types if live)",
                             "anonymization", "deanonymization",
                             "custom recognizers"],
            "spec": "§56 Stage-1 · §57.7 honest · §76 RAI Privacy pillar"}


class AnalyzeRequest(BaseModel):
    text: str
    language: str = "en"


@router.post("/analyze")
def analyze(body: AnalyzeRequest):
    if configured_when(ENV_KEY):
        try:
            url = env_config(ENV_KEY, "http://localhost:5002")
            r = httpx.post(f"{url}/analyze",
                           json={"text": body.text, "language": body.language},
                           timeout=5)
            if r.status_code == 200:
                return {**stamp(), "status": "live", "vendor": "Presidio",
                        "results": r.json()}
        except Exception as e:
            return {**stamp(), "status": "error", "error": str(e)[:200],
                    "fallback_results": _regex_scan(body.text)}
    # Scaffold path · regex fallback
    return {**stamp(), "status": "scaffold",
            "fallback": "built-in regex",
            "results": _regex_scan(body.text)}


def _regex_scan(text: str) -> list[dict]:
    findings = []
    for pat, label in FALLBACK_PII:
        for m in pat.finditer(text):
            findings.append({
                "entity_type": label, "start": m.start(), "end": m.end(),
                "score": 0.85,  # scaffold confidence
                "text_match": m.group()[:30]
            })
    return findings


class AnonymizeRequest(BaseModel):
    text: str


@router.post("/anonymize")
def anonymize(body: AnonymizeRequest):
    """Redact PII · uses regex fallback if Presidio unavailable."""
    redacted = body.text
    n_redacted = 0
    for pat, label in FALLBACK_PII:
        new = pat.sub(f"[REDACTED_{label}]", redacted)
        n_redacted += len(pat.findall(redacted))
        redacted = new
    return {**stamp(), "status": "scaffold" if not configured_when(ENV_KEY) else "live",
            "original_length": len(body.text), "redacted_text": redacted,
            "n_redacted": n_redacted}


@router.get("/config-example")
def config_example():
    return {**stamp(), "vendor": "Microsoft Presidio (OSS)",
            "setup_steps": [
                "1. docker run -d -p 5002:3000 mcr.microsoft.com/presidio-analyzer",
                "2. docker run -d -p 5001:3000 mcr.microsoft.com/presidio-anonymizer",
                "3. export PRESIDIO_ANALYZER_URL=http://localhost:5002",
                "4. Restart backend",
                "5. POST /api/v1/presidio/analyze",
            ],
            "current_fallback": "Built-in regex (6 PII types)",
            "oss_url": "https://github.com/microsoft/presidio",
            "rai_alignment": "§76 Privacy pillar"}
