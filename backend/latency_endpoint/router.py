"""/api/v1/metrics-latency · Iter 33 · per-route p50/p95/p99 view."""
from __future__ import annotations

from fastapi import APIRouter

from middleware.latency import snapshot

router = APIRouter(prefix="/api/v1/metrics-latency", tags=["metrics-latency"])


@router.get("/health")
def health():
    return {"status": "ok", "module": "metrics-latency"}


@router.get("")
def latency(min_samples: int = 1, sort: str = "p95"):
    """Per-route latency · sort by p50/p95/p99/max/n_samples."""
    s = snapshot()
    rows = [{"route": k, **v} for k, v in s.items() if v["n_samples"] >= min_samples]
    key = sort if sort in ("p50_ms", "p95_ms", "p99_ms", "max_ms", "n_samples") else "p95_ms"
    rows.sort(key=lambda r: r[key], reverse=True)
    # Aggregate overall
    all_samples = [r["n_samples"] for r in rows]
    p95_values = [r["p95_ms"] for r in rows]
    return {
        "routes": rows,
        "n_routes": len(rows),
        "total_samples": sum(all_samples),
        "max_p95_ms": max(p95_values) if p95_values else 0,
        "sort_by": key,
    }
