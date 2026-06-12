"""/api/v1/marketing-kpis/* — read-only KPI registry surface.

Per docs/MARKETING_KPI_FRAMEWORK.md. All endpoints return scaffolded
registry data · live data wiring happens incrementally per KPI's
`status` field.

T5.4 · 15 KPIs now wired to DB queries via computer.COMPUTERS.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from . import alerter, computer, registry

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


@router.get("/e2e-latencies")
def e2e_latencies(audit_kind: str = "marketing-e2e-flow",
                    window_runs: int = 20):
    """T3.4 · per-step latency histogram with percentiles.

    Aggregates the last `window_runs` runs of an audit's per-step
    latencies (persisted by `audit_marketing_e2e_flow.py` into
    `e2e_step_latencies`). Returns per-step p50/p95/p99 + count.
    """
    import psycopg2
    import psycopg2.extras
    from core.config import get_settings
    try:
        with psycopg2.connect(get_settings().database_url) as c, \
             c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Per-step percentile aggregation
            cur.execute(
                """
                WITH recent AS (
                    SELECT DISTINCT run_ref FROM e2e_step_latencies
                    WHERE audit_kind = %s
                    ORDER BY run_ref DESC LIMIT %s
                )
                SELECT
                    step_id,
                    MIN(step_label) AS step_label,
                    COUNT(*) AS n,
                    ROUND(AVG(latency_ms)::numeric, 2) AS avg_ms,
                    ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms)::numeric, 2) AS p50,
                    ROUND(percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms)::numeric, 2) AS p95,
                    ROUND(percentile_cont(0.99) WITHIN GROUP (ORDER BY latency_ms)::numeric, 2) AS p99,
                    SUM(CASE WHEN NOT passed THEN 1 ELSE 0 END) AS fail_count
                FROM e2e_step_latencies
                WHERE audit_kind = %s AND run_ref IN (SELECT run_ref FROM recent)
                GROUP BY step_id
                ORDER BY step_id
                """,
                (audit_kind, window_runs, audit_kind),
            )
            steps = [dict(r) for r in cur.fetchall()]
            for s in steps:
                # Convert Decimal to float
                for k in ("avg_ms", "p50", "p95", "p99"):
                    if s[k] is not None:
                        s[k] = float(s[k])
            cur.execute(
                "SELECT COUNT(DISTINCT run_ref) AS n FROM e2e_step_latencies "
                "WHERE audit_kind = %s",
                (audit_kind,),
            )
            n_runs = cur.fetchone()["n"]
    except Exception as e:
        return {"audit_kind": audit_kind, "error": f"{type(e).__name__}: {e}",
                "steps": [], "n_runs": 0}
    return {
        "audit_kind": audit_kind,
        "window_runs": window_runs,
        "n_runs_available": n_runs,
        "n_steps": len(steps),
        "steps": steps,
    }


@router.get("/alerts")
def alerts(severity: str | None = None):
    """T5.10 · per-KPI target-breach alerter.

    Returns alerts sorted by deviation desc. Filter by severity:
      ?severity=critical  · only ≥50%-off-target
      ?severity=warning   · only <50%-off-target
    """
    d = alerter.compute_all_breaches()
    if severity in ("critical", "warning"):
        d["alerts"] = [a for a in d["alerts"] if a["severity"] == severity]
    return d


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
