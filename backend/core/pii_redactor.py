"""PII redactor · Iter 26 · C8 closure.

Regex-based fallback when Presidio not installed. Composes with §76
Privacy pillar + §38.3 audit row pre-write redaction.
"""
from __future__ import annotations

import re
from typing import Any

# Probe Presidio · lazy + tolerant of transformers/protobuf version mismatches
_PRESIDIO = None

def _try_presidio():
    """Iter 29 fix: probe lazily so transformers/protobuf incompat in venv
    doesn't break unrelated audits."""
    global _PRESIDIO
    if _PRESIDIO is not None or _PRESIDIO is False:
        return _PRESIDIO
    try:
        from presidio_analyzer import AnalyzerEngine
        from presidio_anonymizer import AnonymizerEngine
        _PRESIDIO = (AnalyzerEngine(), AnonymizerEngine())
        return _PRESIDIO
    except Exception:
        _PRESIDIO = False  # mark probed-and-failed so retry-cost is zero
        return False


# Regex fallback patterns (§57.7 honest: high-precision · misses edge cases)
# Iter 27 fix: PHONE pattern rewritten to actually match 555-123-4567 ·
# was using lazy quantifier that consumed digits non-greedily.
_PATTERNS = {
    "EMAIL":     re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"),
    "PHONE":     re.compile(
        r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"
    ),
    "SSN":       re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    "CC":        re.compile(r"\b(?:\d[ -]?){13,16}\b"),
    "IBAN":      re.compile(r"\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}\b"),
    "IPV4":      re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b"),
    "POLICY":    re.compile(r"\bPL-\d{6,}\b"),
    "CLAIM":     re.compile(r"\bCL-\d{5,}\b"),
    # Iter 27 · new entity types
    "DOB":       re.compile(r"\b(?:0[1-9]|1[0-2])[/-](?:0[1-9]|[12]\d|3[01])[/-](?:19|20)\d{2}\b"),
    "VIN":       re.compile(r"\b[A-HJ-NPR-Z0-9]{17}\b"),
    "LICENSE":   re.compile(r"\b[A-Z]{1,3}-?\d{4,8}\b"),  # driver's license loose
    "DRIVER_LICENSE": re.compile(r"\bDL-?\d{6,12}\b"),
    "MEDICARE":  re.compile(r"\b\d{4}-?\d{2}-?\d{4}-?[A-Z]\d?\b"),
    "URL":       re.compile(r"\bhttps?://[^\s<>\"'\)]+"),
}


def redact_text(text: str) -> tuple[str, list[dict]]:
    """Return (redacted_text, list of {type, count, original_snippet})."""
    if not isinstance(text, str) or not text:
        return text, []
    findings: list[dict] = []
    out = text
    presidio = _try_presidio()
    if presidio and presidio is not False:
        analyzer, anonymizer = presidio
        try:
            results = analyzer.analyze(text=text, language="en")
            if results:
                an = anonymizer.anonymize(text=text, analyzer_results=results)
                for r in results:
                    findings.append({
                        "type": r.entity_type,
                        "start": r.start,
                        "end": r.end,
                        "score": float(r.score),
                        "source": "presidio",
                    })
                return an.text, findings
        except Exception:
            pass
    # Fallback · regex
    for kind, pat in _PATTERNS.items():
        for m in pat.finditer(out):
            findings.append({
                "type": kind,
                "start": m.start(),
                "end": m.end(),
                "score": 0.85,
                "source": "regex",
            })
        out = pat.sub(f"[{kind}_REDACTED]", out)
    return out, findings


def redact_dict(obj: Any, fields_to_redact: set[str] | None = None) -> Any:
    """Recursively redact dict values · respects field allowlist if provided."""
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if fields_to_redact and k not in fields_to_redact:
                out[k] = v
            elif isinstance(v, str):
                redacted, _ = redact_text(v)
                out[k] = redacted
            else:
                out[k] = redact_dict(v, fields_to_redact)
        return out
    if isinstance(obj, list):
        return [redact_dict(x, fields_to_redact) for x in obj]
    if isinstance(obj, str):
        redacted, _ = redact_text(obj)
        return redacted
    return obj


def detect_pii(text: str) -> dict:
    """Detection-only · no redaction · for audit/dashboard surfaces."""
    _, findings = redact_text(text)
    by_type = {}
    for f in findings:
        by_type[f["type"]] = by_type.get(f["type"], 0) + 1
    return {
        "has_pii": len(findings) > 0,
        "n_findings": len(findings),
        "by_type": by_type,
        "source": findings[0]["source"] if findings else None,
    }
