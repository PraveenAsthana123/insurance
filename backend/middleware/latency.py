"""Per-route latency histogram · Iter 33.

Records request duration in a sliding window per route · exposes p50/p95/p99
via /api/v1/metrics-latency + adds counters to Prometheus /metrics.
"""
from __future__ import annotations

import time
from collections import deque
from typing import Deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

_WINDOW: dict[str, Deque[float]] = {}  # route → ring buffer of durations (s)
_MAX = 256


def _route_key(method: str, path: str) -> str:
    return f"{method} {path}"


class LatencyHistogramMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        t0 = time.perf_counter()
        resp = await call_next(request)
        dt = time.perf_counter() - t0
        # Bucket by route (FastAPI path param-templated key when available)
        path = request.scope.get("route", None)
        path = getattr(path, "path", request.url.path)
        key = _route_key(request.method, path)
        buf = _WINDOW.setdefault(key, deque(maxlen=_MAX))
        buf.append(dt)
        resp.headers["X-Server-Time-Seconds"] = f"{dt:.4f}"
        return resp


def percentile(values, pct: float) -> float:
    """Linear-interp percentile · pct in 0..100."""
    if not values:
        return 0.0
    sorted_vals = sorted(values)
    k = (len(sorted_vals) - 1) * (pct / 100)
    f = int(k)
    c = min(f + 1, len(sorted_vals) - 1)
    if f == c:
        return sorted_vals[f]
    return sorted_vals[f] + (sorted_vals[c] - sorted_vals[f]) * (k - f)


def snapshot() -> dict:
    """Per-route p50/p95/p99 + sample count for /metrics-latency endpoint."""
    out: dict[str, dict] = {}
    for route, buf in _WINDOW.items():
        values = list(buf)
        if not values:
            continue
        out[route] = {
            "p50_ms": round(percentile(values, 50) * 1000, 2),
            "p95_ms": round(percentile(values, 95) * 1000, 2),
            "p99_ms": round(percentile(values, 99) * 1000, 2),
            "n_samples": len(values),
            "max_ms": round(max(values) * 1000, 2),
            "min_ms": round(min(values) * 1000, 2),
        }
    return out
