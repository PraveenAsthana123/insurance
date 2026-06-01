"""KYC adapter — Identity verification bureau integration.

Per §56 Stage-1: feature-flag opt-in. Real production wiring would integrate
with Onfido / Jumio / Trulioo / LexisNexis InstantID.

ENV:
  INSUR_KYC_ENABLED       — "true" to enable
  INSUR_KYC_PROVIDER      — onfido | jumio | trulioo | lexisnexis (default: onfido)
  INSUR_KYC_API_BASE      — provider API base URL
  INSUR_KYC_API_KEY       — provider API key (from secrets manager in prod)
  INSUR_KYC_TIMEOUT       — seconds (default 30)
"""
from __future__ import annotations

import logging
import os
import time
import uuid
from typing import Any

logger = logging.getLogger(__name__)


def is_enabled() -> bool:
    return os.getenv("INSUR_KYC_ENABLED", "false").lower() == "true"


def fetch(person_id: str, full_name: str, date_of_birth: str,
          address: str, document_type: str = "passport") -> dict[str, Any]:
    """Run KYC verification against the configured provider.

    Returns a structured response with:
      - kyc_id              — unique tracking id
      - decision            — pass | fail | review
      - confidence          — 0.0..1.0
      - checks_performed    — list of check names
      - synthetic           — True if feature flag off (placeholder data)
      - audit_row_pending   — True (caller MUST write §38.3 audit row)
    """
    kyc_id = str(uuid.uuid4())
    started_at = time.time()

    if not is_enabled():
        return {
            "kyc_id": kyc_id,
            "decision": "pass",
            "confidence": 0.97,
            "checks_performed": ["document_authenticity", "facial_match",
                                 "address_verification", "watchlist", "sanctions"],
            "synthetic": True,
            "audit_row_pending": True,
            "provider": "synthetic",
            "latency_ms": int((time.time() - started_at) * 1000),
            "note": "KYC feature flag OFF — placeholder data returned",
        }

    # Real provider wiring (lazy-imported to avoid prod-dep cost in dev)
    provider = os.getenv("INSUR_KYC_PROVIDER", "onfido")
    base = os.getenv("INSUR_KYC_API_BASE", "https://api.onfido.com/v3")
    api_key = os.getenv("INSUR_KYC_API_KEY", "")
    timeout = int(os.getenv("INSUR_KYC_TIMEOUT", "30"))

    if not api_key:
        raise RuntimeError("INSUR_KYC_API_KEY is required when INSUR_KYC_ENABLED=true")

    import httpx  # lazy

    headers = {"Authorization": f"Token token={api_key}", "Content-Type": "application/json"}
    payload = {
        "person_id": person_id,
        "full_name": full_name,
        "date_of_birth": date_of_birth,
        "address": address,
        "document_type": document_type,
    }

    try:
        with httpx.Client(timeout=timeout) as client:
            r = client.post(f"{base}/check", headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()
    except httpx.HTTPError as e:
        logger.exception("KYC provider call failed")
        return {
            "kyc_id": kyc_id,
            "decision": "review",
            "confidence": 0.0,
            "error": str(e)[:200],
            "synthetic": False,
            "audit_row_pending": True,
            "provider": provider,
            "latency_ms": int((time.time() - started_at) * 1000),
        }

    return {
        "kyc_id": kyc_id,
        "decision": data.get("status", "review"),
        "confidence": data.get("score", 0.5),
        "checks_performed": data.get("checks", []),
        "synthetic": False,
        "audit_row_pending": True,
        "provider": provider,
        "latency_ms": int((time.time() - started_at) * 1000),
    }
