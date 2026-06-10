"""/api/v1/agentic-adapter/* · Iter 45 · coverage status + manual register."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from agentic_adapter.discovery import discover_all
from agentic_adapter.registrar import coverage_stats, run_coverage_loop
from core.role_dependency import require_admin

router = APIRouter(prefix="/api/v1/agentic-adapter", tags=["agentic-adapter"])


@router.get("/health")
def health():
    return {
        "status": "ok",
        "module": "agentic-adapter",
        "spec": "Iter 45 · register non-agentic routers as System Agents · cron-driven",
    }


@router.get("/coverage")
def coverage():
    """Current coverage stats · system agents + skills + per-category breakdown."""
    return coverage_stats()


@router.get("/discovery")
def discovery():
    """List every non-agentic router · endpoint inventory + category."""
    rows = discover_all()
    return {
        "routers": rows,
        "count": len(rows),
        "n_endpoints_total": sum(r.get("n_endpoints", 0) for r in rows),
    }


@router.post("/register-all", dependencies=[Depends(require_admin)])
def register_all():
    """Run the coverage loop manually · same code path as the cron job."""
    return run_coverage_loop()
