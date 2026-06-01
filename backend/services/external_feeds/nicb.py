"""NICB adapter — National Insurance Crime Bureau watchlist + claim history.

Per §56 Stage-1: feature-flag opt-in. Real production wiring would integrate
with NICB ISO ClaimSearch or the NICB API.

ENV:
  INSUR_NICB_ENABLED     — "true" to enable
  INSUR_NICB_API_BASE    — NICB API base URL
  INSUR_NICB_API_KEY     — API key (from secrets manager in prod)
  INSUR_NICB_TIMEOUT     — seconds (default 30)

NICB queries are PER-CLAIM (or per-VIN, per-person, per-incident) and
contribute to fraud detection per [INSUR_PIPELINES.md](../../../global-ai-org/departments/fraud-siu/business-layer/INSUR_PIPELINES.md).
"""
from __future__ import annotations

import logging
import os
import time
import uuid
from typing import Any

logger = logging.getLogger(__name__)


def is_enabled() -> bool:
    return os.getenv("INSUR_NICB_ENABLED", "false").lower() == "true"


def fetch(query_type: str, query_value: str,
          claim_id: str | None = None,
          date_of_loss: str | None = None) -> dict[str, Any]:
    """Query NICB watchlist + claim history.

    query_type: vin | person | incident | address | provider
    query_value: the actual identifier

    Returns:
      - nicb_query_id     — unique tracking id
      - watchlist_match   — True / False
      - claim_history     — list of past claims matched
      - fraud_indicators  — list of NICB-flagged indicators
      - synthetic         — True if feature flag off
      - audit_row_pending — True (caller MUST write §38.3 audit row)
    """
    nicb_query_id = str(uuid.uuid4())
    started_at = time.time()

    if not is_enabled():
        return {
            "nicb_query_id": nicb_query_id,
            "watchlist_match": False,
            "claim_history": [],
            "fraud_indicators": [],
            "synthetic": True,
            "audit_row_pending": True,
            "latency_ms": int((time.time() - started_at) * 1000),
            "note": "NICB feature flag OFF — placeholder data returned",
        }

    base = os.getenv("INSUR_NICB_API_BASE", "https://api.nicb.org/v1")
    api_key = os.getenv("INSUR_NICB_API_KEY", "")
    timeout = int(os.getenv("INSUR_NICB_TIMEOUT", "30"))

    if not api_key:
        raise RuntimeError("INSUR_NICB_API_KEY is required when INSUR_NICB_ENABLED=true")

    import httpx

    headers = {"X-API-Key": api_key, "Accept": "application/json"}
    params = {"type": query_type, "value": query_value}
    if claim_id:
        params["claim_id"] = claim_id
    if date_of_loss:
        params["date_of_loss"] = date_of_loss

    try:
        with httpx.Client(timeout=timeout) as client:
            r = client.get(f"{base}/query", headers=headers, params=params)
            r.raise_for_status()
            data = r.json()
    except httpx.HTTPError as e:
        logger.exception("NICB query failed")
        return {
            "nicb_query_id": nicb_query_id,
            "watchlist_match": False,
            "claim_history": [],
            "fraud_indicators": [],
            "error": str(e)[:200],
            "synthetic": False,
            "audit_row_pending": True,
            "latency_ms": int((time.time() - started_at) * 1000),
        }

    return {
        "nicb_query_id": nicb_query_id,
        "watchlist_match": bool(data.get("watchlist_match", False)),
        "claim_history": data.get("claim_history", []),
        "fraud_indicators": data.get("fraud_indicators", []),
        "synthetic": False,
        "audit_row_pending": True,
        "latency_ms": int((time.time() - started_at) * 1000),
    }
