"""Endpoint heat map middleware · Iter 36.

Per-route request count + per-status histogram + by-tenant breakdown.
Exposed via /api/v1/heatmap.
"""
from __future__ import annotations

import time
from collections import defaultdict
from typing import Any

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

_COUNTS: dict[str, dict[str, Any]] = defaultdict(lambda: {
    "total": 0,
    "by_status": defaultdict(int),
    "by_tenant": defaultdict(int),
    "last_seen_ts": 0,
    "first_seen_ts": 0,
})


class EndpointHeatmapMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        resp = await call_next(request)
        # Bucket by route-template if available
        route = request.scope.get("route", None)
        path = getattr(route, "path", request.url.path)
        key = f"{request.method} {path}"
        rec = _COUNTS[key]
        if rec["first_seen_ts"] == 0:
            rec["first_seen_ts"] = time.time()
        rec["last_seen_ts"] = time.time()
        rec["total"] += 1
        rec["by_status"][f"{resp.status_code // 100}xx"] += 1
        # Bucket per-tenant if present
        tenant = getattr(request.state, "tenant_id", None) or "default"
        rec["by_tenant"][tenant] += 1
        return resp


def snapshot() -> dict:
    """Return current heatmap snapshot."""
    rows = []
    for key, rec in _COUNTS.items():
        rows.append({
            "route": key,
            "total": rec["total"],
            "by_status": dict(rec["by_status"]),
            "by_tenant": dict(rec["by_tenant"]),
            "last_seen_ts": rec["last_seen_ts"],
            "first_seen_ts": rec["first_seen_ts"],
        })
    rows.sort(key=lambda r: r["total"], reverse=True)
    return {
        "routes": rows,
        "n_routes": len(rows),
        "n_total_requests": sum(r["total"] for r in rows),
    }
