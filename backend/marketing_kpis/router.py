"""/api/v1/marketing-kpis/* — read-only KPI registry surface.

Per docs/MARKETING_KPI_FRAMEWORK.md. All endpoints return scaffolded
registry data · live data wiring happens incrementally per KPI's
`status` field.

T5.4 · 15 KPIs now wired to DB queries via computer.COMPUTERS.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request

from . import computer, registry

router = APIRouter(prefix="/api/v1/marketing-kpis", tags=["marketing-kpis"])


@router.get("/health")
def health():
    return {"status": "ok", "module": "marketing-kpis", "stats": registry.stats()}


@router.get("/categories")
def list_categories():
    return {"categories": registry.CATEGORIES, "count": len(registry.CATEGORIES)}


@router.get("/kpis")
def list_kpis(category: str | None = None, status: str | None = None):
    """List KPIs · filterable by category or status."""
    items = registry.KPIS
    if category:
        items = [k for k in items if k["category"] == category]
    if status:
        items = [k for k in items if k["status"] == status]
    return {"kpis": items, "count": len(items)}


@router.get("/kpis/{kpi_id}")
def get_kpi(kpi_id: str):
    item = next((k for k in registry.KPIS if k["id"] == kpi_id), None)
    if not item:
        raise HTTPException(404, {"detail": "KPI not in registry",
                                    "error_code": "KPI_404"})
    return item


@router.get("/dashboards")
def list_dashboards():
    """6 dashboard tiers · each maps to KPI IDs."""
    out: list[dict[str, Any]] = []
    by_id = {k["id"]: k for k in registry.KPIS}
    for d in registry.DASHBOARDS:
        out.append({
            **d,
            "kpi_details": [by_id.get(kpi_id, {"id": kpi_id, "missing": True})
                              for kpi_id in d["kpis"]],
        })
    return {"dashboards": out, "count": len(out)}


@router.get("/ai-agents")
def list_ai_agents():
    return {"agents": registry.AI_AGENTS, "count": len(registry.AI_AGENTS)}


@router.get("/maturity")
def maturity():
    return {"levels": registry.MATURITY_LEVELS,
            "this_project_level": "L2-L3",
            "next_step": "Wire AI-driven _decide_next (T4.1) · multi-cohort fairness (T3.2)"}


@router.get("/scorecard")
def scorecard():
    """Marketing Command Center 8-category scorecard."""
    return {"scorecard": registry.SCORECARD,
            "weight_total": sum(s["weight"] for s in registry.SCORECARD),
            "note": "Final Marketing Health Score = weighted sum across categories"}


@router.get("/stats")
def stats():
    return registry.stats()


@router.get("/values")
def values():
    """T5.4 · compute all wired KPIs against live DB.

    Returns dict of {kpi_id: value} for the 15 KPIs that have a computer.
    """
    return {"values": computer.compute_all(),
            "computed_count": len(computer.COMPUTERS),
            "registry_count": len(registry.KPIS)}


@router.get("/values/{kpi_id}")
def value(kpi_id: str):
    """Compute a single KPI's live value."""
    if kpi_id not in computer.COMPUTERS:
        # Check if it's even a known KPI
        kpi = next((k for k in registry.KPIS if k["id"] == kpi_id), None)
        if not kpi:
            raise HTTPException(404, {"detail": "KPI not in registry",
                                        "error_code": "KPI_404"})
        return {"kpi_id": kpi_id, "value": None,
                "status": kpi["status"],
                "note": f"No computer for this KPI · status='{kpi['status']}' · "
                          "value computation not yet wired"}
    return {"kpi_id": kpi_id, "value": computer.compute_value(kpi_id)}
