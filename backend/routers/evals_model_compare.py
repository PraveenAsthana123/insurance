"""§68.11 Multi-model comparison router.

3 endpoints under /api/v1/holy/evals/model-compare/* federated via
core.holy_audit (surface=evals_model_compare). The POST mutates
disk (manifest persistence) so RBAC restricts it to manager/tester;
GETs are open to _READ_ROLES via the existing /evals/* catch-all.

Composes with §68.8/9/10 (this surface JOINS their data) + §38.3 +
§47.6 + §57.7 + §64.43 #7.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request

from core.holy_audit import log_holy_access
from core.middleware import current_tenant_id
from schemas.model_compare import ModelCompareRequest, ModelCompareResponse
from services import model_compare_service as mcs

router = APIRouter(
    prefix="/api/v1/holy/evals/model-compare",
    tags=["holy", "evals", "model-compare"],
)


@router.post("", response_model=ModelCompareResponse)
def run_compare(
    http_request: Request,
    payload: ModelCompareRequest,
) -> ModelCompareResponse:
    """Execute a multi-model comparison; persist manifest; return scorecard."""
    tenant_id = current_tenant_id(http_request)
    request_id = getattr(http_request.state, "correlation_id", "")
    actor = http_request.headers.get("X-Demo-Role", "unknown")

    log_holy_access(
        http_request, "evals_model_compare", "run_compare",
        extra={"n_models": len(payload.models),
               "eval_set": payload.eval_set,
               "tenant_id": tenant_id},
    )
    # body tenant_id is intentionally ignored — middleware wins per §64.43 #7
    result = mcs.run_comparison(
        payload.models,
        eval_set=payload.eval_set,
        tenant_id=tenant_id,
        metrics=payload.metrics,
        requested_by=actor,
        request_id=request_id,
    )
    if result.get("status") == "validation_error":
        raise HTTPException(400, {"errors": result.get("errors", [])})
    return ModelCompareResponse(**result)


@router.get("/_history")
def history(
    http_request: Request,
    limit: int = Query(50, ge=1, le=200),
) -> dict[str, Any]:
    """List recent comparison runs (newest-first by manifest mtime)."""
    log_holy_access(http_request, "evals_model_compare", "history",
                    extra={"limit": limit})
    return mcs.list_history(limit=limit)


@router.get("/{comparison_id}")
def get_comparison(http_request: Request, comparison_id: str) -> dict[str, Any]:
    """Read back a persisted comparison manifest."""
    if not mcs._COMPARISON_ID_RE.match(comparison_id):
        raise HTTPException(400, f"Malformed comparison_id '{comparison_id}' (expected cmp-…)")
    log_holy_access(
        http_request, "evals_model_compare", "get_comparison",
        extra={"comparison_id": comparison_id},
    )
    result = mcs.get_comparison(comparison_id)
    if result is None:
        raise HTTPException(404, f"Comparison '{comparison_id}' not found")
    if isinstance(result, dict) and result.get("status") == "invalid_comparison_id":
        raise HTTPException(400, "Malformed comparison_id")
    return result
