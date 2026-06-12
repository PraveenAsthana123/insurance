"""Presidio Stage-1 §56 adapter · T6.10.

Per docs/PENDING_PLAN.md T6.10. Wraps Microsoft Presidio for extended
PII detection (12 entity types) alongside the existing regex DLP in
marketing_campaigns/services._dlp_scan.

Per §56 Stage-1 contract:
  - feature-flag opt-in
  - lazy import
  - drill-locked signature
  - graceful fallback when not available

Per §57.7: this environment has a transformers/tensorflow/protobuf
conflict that blocks Presidio's AnalyzerEngine from loading. Adapter
detects this and falls back to an internal 12-entity regex pack ·
operator gets EXTENDED PII coverage either way.

Entity coverage (12 types · all available in fallback mode):
  US_SSN · CREDIT_CARD · EMAIL_ADDRESS · IP_ADDRESS · IBAN_CODE
  PHONE_NUMBER · URL · UK_NHS · AU_TFN · IN_AADHAAR · BR_CPF · DATE_TIME
"""
from __future__ import annotations

import logging
import os
import re
from typing import Any, Optional

logger = logging.getLogger(__name__)


# ─── 12-entity regex pack (fallback when Presidio unavailable) ──
# Each: name → (entity_type, regex_pattern, default_score)
_FALLBACK_PATTERNS: dict[str, tuple[str, str, float]] = {
    "US_SSN":        ("US_SSN",        r"\b\d{3}-\d{2}-\d{4}\b",                                  0.95),
    "CREDIT_CARD":   ("CREDIT_CARD",   r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b",            0.85),
    "EMAIL_ADDRESS": ("EMAIL_ADDRESS", r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",   0.90),
    "IP_ADDRESS":    ("IP_ADDRESS",    r"\b(?:\d{1,3}\.){3}\d{1,3}\b",                            0.80),
    "IBAN_CODE":     ("IBAN_CODE",     r"\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b",                        0.90),
    "PHONE_NUMBER":  ("PHONE_NUMBER",  r"\+?\d{1,3}[-\s]?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}\b",   0.70),
    "URL":           ("URL",           r"\bhttps?://[^\s,)]+",                                       0.75),
    "UK_NHS":        ("UK_NHS",        r"\b\d{3}\s\d{3}\s\d{4}\b",                                 0.75),
    "AU_TFN":        ("AU_TFN",        r"\b\d{3}\s\d{3}\s\d{3}\b",                                 0.65),
    "IN_AADHAAR":    ("IN_AADHAAR",    r"\b\d{4}\s\d{4}\s\d{4}\b",                                 0.85),
    "BR_CPF":        ("BR_CPF",        r"\b\d{3}\.\d{3}\.\d{3}-\d{2}\b",                           0.90),
    "DATE_TIME":     ("DATE_TIME",     r"\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}",                  0.60),
}


# ─── Stage-1 mode detection (try Presidio · fall back gracefully) ──
_PRESIDIO_MODE: Optional[str] = None  # 'presidio' · 'fallback' · None=unprobed
_ANALYZER = None


def _try_load_presidio():
    """Lazy + graceful import per §56 Stage-1 contract.

    Returns 'presidio' if AnalyzerEngine constructs OK · 'fallback' otherwise.
    Result is cached in _PRESIDIO_MODE for subsequent calls.
    """
    global _PRESIDIO_MODE, _ANALYZER
    if _PRESIDIO_MODE is not None:
        return _PRESIDIO_MODE
    try:
        # Suppress tensorflow noise during the probe
        os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
        from presidio_analyzer import AnalyzerEngine  # type: ignore
        # Construct AnalyzerEngine · this is where tensorflow/transformers may fail
        _ANALYZER = AnalyzerEngine()
        _PRESIDIO_MODE = "presidio"
        logger.info("Presidio Stage-1 loaded · %d recognizers active",
                      len(_ANALYZER.registry.recognizers))
    except Exception as e:
        _PRESIDIO_MODE = "fallback"
        logger.info("Presidio unavailable (%s: %s) · using fallback regex pack",
                      type(e).__name__, str(e)[:120])
    return _PRESIDIO_MODE


def scan(text: str) -> dict[str, Any]:
    """Detect PII entities in `text` · returns:

      {mode, entities: [{type, start, end, score, match}],
       count_by_type: {type: n}, is_pii: bool}

    Operator can call /api/v1/marketing-campaigns/dlp/test?text=... to see
    what entities the adapter found.
    """
    mode = _try_load_presidio()
    entities: list[dict[str, Any]] = []

    if mode == "presidio" and _ANALYZER is not None:
        try:
            results = _ANALYZER.analyze(text=text, language="en")
            for r in results:
                entities.append({
                    "type": r.entity_type,
                    "start": r.start,
                    "end": r.end,
                    "score": round(r.score, 3),
                    "match": text[r.start:r.end],
                })
        except Exception as e:
            logger.warning("Presidio analyze failed · falling back: %s", e)
            mode = "fallback"

    if mode == "fallback":
        for name, (entity_type, pattern, score) in _FALLBACK_PATTERNS.items():
            for m in re.finditer(pattern, text):
                entities.append({
                    "type": entity_type,
                    "start": m.start(),
                    "end": m.end(),
                    "score": score,
                    "match": m.group(0),
                })

    count_by_type: dict[str, int] = {}
    for e in entities:
        count_by_type[e["type"]] = count_by_type.get(e["type"], 0) + 1

    return {
        "mode": mode,
        "entities": entities,
        "count_by_type": count_by_type,
        "is_pii": len(entities) > 0,
        "supported_types": list(_FALLBACK_PATTERNS.keys()),
    }


def has_pii(text: str) -> bool:
    """Convenience predicate · True if ANY PII found."""
    return scan(text).get("is_pii", False)


def status() -> dict[str, Any]:
    """Health snapshot for operator (and audit)."""
    mode = _try_load_presidio()
    return {
        "mode": mode,
        "supported_types": list(_FALLBACK_PATTERNS.keys()),
        "n_types": len(_FALLBACK_PATTERNS),
        "presidio_recognizers": (
            len(_ANALYZER.registry.recognizers) if _ANALYZER else 0
        ),
        "ready": mode in ("presidio", "fallback"),
    }
