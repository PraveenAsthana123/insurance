"""/api/v1/outbound-audit/* · Iter 35 · log all outbound HTTP calls.

Per §47.6 + §38.3 · cross-service audit visibility.
Other modules call log_outbound(url, method, status, ms) explicitly.
This module surfaces the log + aggregate stats.
"""
from __future__ import annotations

import time
from collections import deque
from datetime import datetime, timezone
from typing import Deque

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/outbound-audit", tags=["outbound-audit"])

_LOG: Deque[dict] = deque(maxlen=500)


class OutboundEntry(BaseModel):
    url: str
    method: str = "GET"
    status_code: int | None = None
    latency_ms: float | None = None
    error: str | None = None
    actor: str | None = None
    target_module: str | None = None


def log_outbound(entry: dict) -> dict:
    """Record an outbound call · usable from any module."""
    rec = {
        **entry,
        "at": datetime.now(timezone.utc).isoformat(),
        "ts": time.time(),
    }
    _LOG.append(rec)
    return rec


@router.get("/health")
def health():
    return {"status": "ok", "module": "outbound-audit", "n_logged": len(_LOG)}


@router.post("/log")
def log_endpoint(body: OutboundEntry):
    rec = log_outbound(body.model_dump(exclude_none=True))
    return rec


@router.get("")
def list_log(limit: int = 50, target_module: str | None = None, status_lt: int | None = None):
    rows = list(_LOG)
    if target_module:
        rows = [r for r in rows if r.get("target_module") == target_module]
    if status_lt is not None:
        rows = [r for r in rows if r.get("status_code") is not None and r["status_code"] < status_lt]
    rows.sort(key=lambda r: r["ts"], reverse=True)
    return {"log": rows[:limit], "count": len(rows)}


@router.get("/stats")
def stats():
    rows = list(_LOG)
    by_status: dict[str, int] = {}
    by_module: dict[str, int] = {}
    by_method: dict[str, int] = {}
    n_errors = 0
    total_ms = 0.0
    n_ms = 0
    for r in rows:
        sc = r.get("status_code")
        if sc is not None:
            bucket = f"{sc // 100}xx"
            by_status[bucket] = by_status.get(bucket, 0) + 1
            if sc >= 400:
                n_errors += 1
        if r.get("target_module"):
            by_module[r["target_module"]] = by_module.get(r["target_module"], 0) + 1
        if r.get("method"):
            by_method[r["method"]] = by_method.get(r["method"], 0) + 1
        if r.get("latency_ms") is not None:
            total_ms += r["latency_ms"]
            n_ms += 1
        if r.get("error"):
            n_errors += 1
    return {
        "total": len(rows),
        "by_status": by_status,
        "by_module": by_module,
        "by_method": by_method,
        "n_errors": n_errors,
        "avg_latency_ms": round(total_ms / n_ms, 2) if n_ms else None,
    }
