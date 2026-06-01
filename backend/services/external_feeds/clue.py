"""CLUE adapter — LexisNexis Comprehensive Loss Underwriting Exchange.

Per §56 Stage-1: feature-flag opt-in. Real production wiring would integrate
with LexisNexis CLUE Auto / CLUE Property API.

ENV:
  INSUR_CLUE_ENABLED     — "true" to enable
  INSUR_CLUE_API_BASE    — LexisNexis CLUE API base URL
  INSUR_CLUE_CLIENT_ID   — OAuth client id
  INSUR_CLUE_CLIENT_SECRET — OAuth secret
  INSUR_CLUE_TIMEOUT     — seconds (default 30)

CLUE provides 7-year loss history for personal-lines underwriting.
Used by [INSUR_PIPELINES.md (underwriting)](../../../global-ai-org/departments/underwriting/business-layer/INSUR_PIPELINES.md).
"""
from __future__ import annotations

import logging
import os
import time
import uuid
from typing import Any

logger = logging.getLogger(__name__)


def is_enabled() -> bool:
    return os.getenv("INSUR_CLUE_ENABLED", "false").lower() == "true"


def fetch(line_of_business: str, full_name: str, address: str,
          date_of_birth: str | None = None,
          vin: str | None = None) -> dict[str, Any]:
    """Pull CLUE loss history.

    line_of_business: auto | property
    Returns:
      - clue_query_id     — unique tracking id
      - claim_count_7y    — number of claims in 7-year window
      - claims            — list of {date, type, severity, paid_amount}
      - risk_signals      — flags (e.g. fire, water_damage, glass_only)
      - synthetic         — True if feature flag off
      - audit_row_pending — True (caller MUST write §38.3 audit row)
    """
    clue_query_id = str(uuid.uuid4())
    started_at = time.time()

    if not is_enabled():
        return {
            "clue_query_id": clue_query_id,
            "claim_count_7y": 0,
            "claims": [],
            "risk_signals": [],
            "synthetic": True,
            "audit_row_pending": True,
            "latency_ms": int((time.time() - started_at) * 1000),
            "note": "CLUE feature flag OFF — placeholder data returned",
        }

    base = os.getenv("INSUR_CLUE_API_BASE", "https://risk.lexisnexis.com/clue/v1")
    client_id = os.getenv("INSUR_CLUE_CLIENT_ID", "")
    client_secret = os.getenv("INSUR_CLUE_CLIENT_SECRET", "")
    timeout = int(os.getenv("INSUR_CLUE_TIMEOUT", "30"))

    if not (client_id and client_secret):
        raise RuntimeError("INSUR_CLUE_CLIENT_ID + INSUR_CLUE_CLIENT_SECRET required when enabled")

    import httpx

    # OAuth token (cached in real impl; here per-call for simplicity)
    try:
        with httpx.Client(timeout=timeout) as client:
            token_r = client.post(
                f"{base}/oauth/token",
                data={"grant_type": "client_credentials",
                      "client_id": client_id, "client_secret": client_secret},
            )
            token_r.raise_for_status()
            access_token = token_r.json()["access_token"]

            payload = {
                "line_of_business": line_of_business,
                "full_name": full_name,
                "address": address,
                "date_of_birth": date_of_birth,
                "vin": vin,
            }
            r = client.post(
                f"{base}/query",
                headers={"Authorization": f"Bearer {access_token}"},
                json=payload,
            )
            r.raise_for_status()
            data = r.json()
    except httpx.HTTPError as e:
        logger.exception("CLUE query failed")
        return {
            "clue_query_id": clue_query_id,
            "claim_count_7y": 0,
            "claims": [],
            "risk_signals": [],
            "error": str(e)[:200],
            "synthetic": False,
            "audit_row_pending": True,
            "latency_ms": int((time.time() - started_at) * 1000),
        }

    return {
        "clue_query_id": clue_query_id,
        "claim_count_7y": data.get("claim_count", 0),
        "claims": data.get("claims", []),
        "risk_signals": data.get("risk_signals", []),
        "synthetic": False,
        "audit_row_pending": True,
        "latency_ms": int((time.time() - started_at) * 1000),
    }
