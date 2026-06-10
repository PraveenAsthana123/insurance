"""/api/v1/heartbeat/* · Iter 33 · per-module last-success ping + stale detection."""
from __future__ import annotations

import time
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/heartbeat", tags=["heartbeat"])

# module → {ts, count, last_status}
_HB: dict[str, dict] = {}
_STALE_THRESHOLD_S = 600  # 10 minutes


class PingBody(BaseModel):
    module: str
    status: str = "ok"
    note: str | None = None


@router.get("/health")
def health():
    return {
        "status": "ok",
        "module": "heartbeat",
        "n_modules": len(_HB),
        "stale_threshold_seconds": _STALE_THRESHOLD_S,
    }


@router.post("/ping")
def ping(body: PingBody):
    """Any module pings here · operator sees stale heartbeats in /list."""
    now = time.time()
    if body.module not in _HB:
        _HB[body.module] = {"first_seen_ts": now, "count": 0}
    _HB[body.module].update({
        "last_ts": now,
        "last_status": body.status,
        "last_note": body.note,
        "count": _HB[body.module]["count"] + 1,
    })
    return _HB[body.module]


@router.get("")
def list_heartbeats():
    now = time.time()
    rows = []
    for module, d in _HB.items():
        last = d.get("last_ts", 0)
        age = now - last if last else None
        rows.append({
            "module": module,
            "last_status": d.get("last_status"),
            "last_note": d.get("last_note"),
            "count": d.get("count", 0),
            "age_seconds": round(age, 1) if age is not None else None,
            "stale": age is not None and age > _STALE_THRESHOLD_S,
            "last_seen_utc": datetime.fromtimestamp(last, tz=timezone.utc).isoformat() if last else None,
        })
    rows.sort(key=lambda r: r["age_seconds"] or 0, reverse=True)
    stale = [r for r in rows if r["stale"]]
    return {
        "heartbeats": rows,
        "count": len(rows),
        "stale_count": len(stale),
        "stale_modules": [r["module"] for r in stale],
    }
