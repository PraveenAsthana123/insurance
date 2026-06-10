"""/api/v1/heatmap · Iter 36 · endpoint request heat map."""
from __future__ import annotations

from fastapi import APIRouter

from middleware.endpoint_heatmap import snapshot

router = APIRouter(prefix="/api/v1/heatmap", tags=["heatmap"])


@router.get("/health")
def health():
    return {"status": "ok", "module": "heatmap"}


@router.get("")
def heatmap(top: int = 30, min_count: int = 1):
    s = snapshot()
    rows = [r for r in s["routes"] if r["total"] >= min_count][:top]
    return {
        "top_routes": rows,
        "n_returned": len(rows),
        "n_total_routes": s["n_routes"],
        "n_total_requests": s["n_total_requests"],
    }


@router.get("/by-status")
def by_status_aggregate():
    s = snapshot()
    out: dict[str, int] = {}
    for r in s["routes"]:
        for bucket, count in r["by_status"].items():
            out[bucket] = out.get(bucket, 0) + count
    return {"by_status": dict(sorted(out.items())), "n_routes": s["n_routes"]}


@router.get("/by-tenant")
def by_tenant_aggregate():
    s = snapshot()
    out: dict[str, int] = {}
    for r in s["routes"]:
        for tenant, count in r["by_tenant"].items():
            out[tenant] = out.get(tenant, 0) + count
    return {
        "by_tenant": dict(sorted(out.items(), key=lambda x: x[1], reverse=True)),
        "n_tenants": len(out),
    }


@router.get("/body-sizes")
def body_sizes():
    """Per-route request body size percentiles · Iter 36."""
    from middleware.body_size_monitor import snapshot as bsm_snapshot
    return bsm_snapshot()
