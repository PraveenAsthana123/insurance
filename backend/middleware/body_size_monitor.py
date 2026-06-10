"""Request body size monitor · Iter 36.

Tracks p50/p95/p99 body sizes per route · helps operator decide when to
tune GZip threshold, rate limits, or reject large payloads.
"""
from __future__ import annotations

from collections import deque
from typing import Deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

_BODY_SIZES: dict[str, Deque[int]] = {}
_MAX = 256


class BodySizeMonitorMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Only meaningful for write methods
        if request.method not in ("POST", "PUT", "PATCH"):
            return await call_next(request)
        body = await request.body()
        size = len(body)
        route = request.scope.get("route", None)
        path = getattr(route, "path", request.url.path)
        key = f"{request.method} {path}"
        buf = _BODY_SIZES.setdefault(key, deque(maxlen=_MAX))
        buf.append(size)

        # Rebuild stream so handler can read body
        async def receive():
            return {"type": "http.request", "body": body, "more_body": False}
        request._receive = receive  # type: ignore[attr-defined]

        return await call_next(request)


def _pct(values: list[int], p: float) -> int:
    if not values:
        return 0
    sorted_v = sorted(values)
    idx = min(int(p / 100 * len(sorted_v)), len(sorted_v) - 1)
    return sorted_v[idx]


def snapshot() -> dict:
    rows = []
    for key, buf in _BODY_SIZES.items():
        values = list(buf)
        if not values:
            continue
        rows.append({
            "route": key,
            "n": len(values),
            "p50_bytes": _pct(values, 50),
            "p95_bytes": _pct(values, 95),
            "p99_bytes": _pct(values, 99),
            "max_bytes": max(values),
            "min_bytes": min(values),
        })
    rows.sort(key=lambda r: r["p95_bytes"], reverse=True)
    return {
        "routes": rows,
        "n_routes": len(rows),
        "total_samples": sum(r["n"] for r in rows),
    }
