"""§68.9 Cost eval router.

4 endpoints under /api/v1/insur/evals/cost/* federated via core.insur_audit
(surface=evals_cost). Sibling of §68.8 functional + §68.10 safety; RBAC
catch-all `/api/v1/insur/evals/*` already gates this surface.

Composes with §38.3 + §41.1 (FinOps) + §41.3 (tenant) + §57.7 + §68.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request

from core.insur_audit import log_insur_access
from services import cost_eval_service as ceval

router = APIRouter(
    prefix="/api/v1/insur/evals/cost",
    tags=["insur", "evals", "cost"],
)


# Literal sub-paths BEFORE parameterized to dodge §66.3 greedy-match trap.
@router.get("/_global")
def cost_global(http_request: Request) -> dict[str, Any]:
    """Total cost across all tenants/models — 24h / 7d / 30d + all-time."""
    log_insur_access(http_request, "evals_cost", "cost_global")
    return ceval.global_summary()


@router.get("/by-model")
def cost_by_model(
    http_request: Request,
    since: float = Query(0.0, ge=0.0),
) -> dict[str, Any]:
    """Per-model cost ranking, highest-cost first."""
    log_insur_access(http_request, "evals_cost", "cost_by_model",
                    extra={"since": since})
    return ceval.by_model_ranking(since_epoch=since)


@router.get("/by-request/{request_id}")
def cost_by_request(http_request: Request, request_id: str) -> dict[str, Any]:
    """Single-request cost detail."""
    if not ceval._REQUEST_ID_RE.match(request_id):
        raise HTTPException(400, f"Malformed request_id '{request_id}'")
    log_insur_access(http_request, "evals_cost", "cost_by_request",
                    extra={"request_id": request_id})
    result = ceval.by_request(request_id)
    if result is None:
        raise HTTPException(404, f"Request '{request_id}' not found in cost log")
    return result


# Parameterized LAST.
@router.get("/{tenant_id}")
def cost_per_tenant(
    http_request: Request,
    tenant_id: str,
    since: float = Query(0.0, ge=0.0),
) -> dict[str, Any]:
    """Per-tenant cost breakdown with per-model totals within the tenant."""
    if not ceval._TENANT_ID_RE.match(tenant_id):
        raise HTTPException(400, f"Malformed tenant_id '{tenant_id}'")
    log_insur_access(http_request, "evals_cost", "cost_per_tenant",
                    extra={"tenant_id": tenant_id, "since": since})
    result = ceval.per_tenant_breakdown(tenant_id, since_epoch=since)
    if result is None:
        raise HTTPException(404, f"Tenant '{tenant_id}' has no cost rows")
    if isinstance(result, dict) and result.get("status") == "invalid_tenant_id":
        raise HTTPException(400, "Malformed tenant_id (regex validation)")
    return result
