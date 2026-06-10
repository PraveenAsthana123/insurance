"""/api/v1/notifications/* · Iter 32 · multi-channel dispatcher."""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


_DELIVERIES: list[dict[str, Any]] = []
_MAX = 200


class Notify(BaseModel):
    channel: str  # 'slack' | 'email' | 'webhook' | 'log'
    severity: str = "info"
    title: str
    body: str
    target: str | None = None  # channel-specific (URL, email addr, etc.)


def _slack_dispatch(payload: Notify) -> dict:
    url = payload.target or os.environ.get("INSUR_SLACK_WEBHOOK")
    if not url:
        return {"status": "scaffold",
                "reason": "no INSUR_SLACK_WEBHOOK env var and no target",
                "would_send": {"text": f"[{payload.severity.upper()}] {payload.title}\n{payload.body}"}}
    try:
        import httpx
        r = httpx.post(url, json={"text": f"[{payload.severity.upper()}] {payload.title}\n{payload.body}"}, timeout=10)
        return {"status": "delivered" if r.status_code < 400 else "error",
                "http_status": r.status_code}
    except Exception as e:
        return {"status": "error", "error": f"{type(e).__name__}: {e}"}


def _email_dispatch(payload: Notify) -> dict:
    target = payload.target or os.environ.get("INSUR_EMAIL_TO")
    if not target:
        return {"status": "scaffold",
                "reason": "no email target provided",
                "would_send": {"to": "ops@example.com", "subject": payload.title}}
    # Per §57.7: real SMTP wiring is operator decision (creds + verification)
    return {"status": "scaffold",
            "reason": "SMTP not wired · operator provides creds",
            "would_send": {"to": target, "subject": payload.title}}


def _webhook_dispatch(payload: Notify) -> dict:
    url = payload.target
    if not url:
        return {"status": "scaffold", "reason": "no target URL"}
    try:
        import httpx
        r = httpx.post(url, json=payload.model_dump(), timeout=10)
        return {"status": "delivered" if r.status_code < 400 else "error",
                "http_status": r.status_code}
    except Exception as e:
        return {"status": "error", "error": f"{type(e).__name__}: {e}"}


def _log_dispatch(payload: Notify) -> dict:
    logger.info("notification [%s] %s · %s", payload.severity, payload.title, payload.body)
    return {"status": "delivered", "destination": "logger"}


_HANDLERS = {
    "slack":   _slack_dispatch,
    "email":   _email_dispatch,
    "webhook": _webhook_dispatch,
    "log":     _log_dispatch,
}


@router.get("/health")
def health():
    return {
        "status": "ok",
        "module": "notifications",
        "channels": list(_HANDLERS.keys()),
        "n_deliveries": len(_DELIVERIES),
    }


@router.post("/dispatch")
def dispatch(payload: Notify):
    handler = _HANDLERS.get(payload.channel)
    if not handler:
        return {"status": "error",
                "error": f"unknown channel: {payload.channel}",
                "valid": list(_HANDLERS.keys())}
    result = handler(payload)
    delivery = {
        "id": f"N-{len(_DELIVERIES) + 1}",
        "channel": payload.channel,
        "severity": payload.severity,
        "title": payload.title,
        "result": result,
        "at": datetime.now(timezone.utc).isoformat(),
    }
    _DELIVERIES.append(delivery)
    if len(_DELIVERIES) > _MAX:
        del _DELIVERIES[: len(_DELIVERIES) - _MAX]
    return delivery


@router.get("/deliveries")
def list_deliveries(limit: int = 20, channel: str | None = None):
    rows = list(reversed(_DELIVERIES))
    if channel:
        rows = [r for r in rows if r["channel"] == channel]
    return {"deliveries": rows[:limit], "count": len(rows)}
