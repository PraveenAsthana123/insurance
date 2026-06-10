"""/api/v1/health-history/* · Iter 35 · keep last N health probes."""
from __future__ import annotations

import time
from collections import deque
from datetime import datetime, timezone
from typing import Deque

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/health-history", tags=["health-history"])

_SNAPSHOTS: Deque[dict] = deque(maxlen=200)


def _take_snapshot() -> dict:
    """Take one health snapshot · runs probes from service_health."""
    from service_health.router import aggregate
    snap = aggregate()
    snap["taken_at"] = datetime.now(timezone.utc).isoformat()
    snap["taken_at_ts"] = time.time()
    _SNAPSHOTS.append(snap)
    return snap


@router.get("/health")
def health():
    return {
        "status": "ok",
        "module": "health-history",
        "n_snapshots": len(_SNAPSHOTS),
        "max": _SNAPSHOTS.maxlen,
    }


@router.post("/take")
def take_snapshot():
    """Capture a snapshot now · operator triggers manually or via cron."""
    snap = _take_snapshot()
    return {"snapshot": snap, "n_total": len(_SNAPSHOTS)}


@router.get("/recent")
def recent(limit: int = 50):
    rows = list(_SNAPSHOTS)
    rows.reverse()
    return {"snapshots": rows[:limit], "n_total": len(_SNAPSHOTS)}


@router.get("/availability")
def availability(component: str = "database"):
    """Compute % uptime for one component across history."""
    rows = list(_SNAPSHOTS)
    if not rows:
        return {"component": component, "availability_pct": None, "samples": 0}
    ok_count = sum(
        1 for r in rows
        if r.get("components", {}).get(component, {}).get("status") == "ok"
    )
    return {
        "component": component,
        "availability_pct": round(100 * ok_count / len(rows), 2),
        "samples": len(rows),
        "ok_samples": ok_count,
    }
