"""§68.8 Functional eval router.

3 endpoints under /api/v1/holy/evals/functional/* federated via
core.holy_audit (surface=evals_functional). Sibling routers for §68.9
cost and §68.10 safety follow the same pattern under
/api/v1/holy/evals/{cost,safety}/*.

Composes with §38.3 + §47.6 + §57.7 + §64.20 + §68.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request

from core.holy_audit import log_holy_access
from services import functional_eval_service as feval

router = APIRouter(
    prefix="/api/v1/holy/evals/functional",
    tags=["holy", "evals", "functional"],
)


# _global BEFORE /{model_id} per §66.3.
@router.get("/_global")
def functional_global(
    http_request: Request,
    since: float = Query(0.0, ge=0.0),
) -> dict[str, Any]:
    """Cross-model leaderboard + dataset coverage."""
    log_holy_access(http_request, "evals_functional", "functional_global",
                    extra={"since": since})
    return feval.global_summary(since_epoch=since)


@router.get("/{model_id}")
def functional_model(
    http_request: Request,
    model_id: str,
    dataset: str | None = Query(None, description="Filter by dataset name"),
    since: float = Query(0.0, ge=0.0),
    limit: int = Query(100, ge=1, le=500),
) -> dict[str, Any]:
    """Per-model eval history with optional dataset filter."""
    if not feval._MODEL_ID_RE.match(model_id):
        raise HTTPException(400, f"Malformed model_id '{model_id}'")
    log_holy_access(
        http_request, "evals_functional", "functional_model",
        extra={"model_id": model_id, "dataset": dataset,
               "since": since, "limit": limit},
    )
    result = feval.model_history(
        model_id, dataset=dataset, since_epoch=since, limit=limit,
    )
    if result is None:
        raise HTTPException(404, f"Model '{model_id}' has no eval runs in log")
    if isinstance(result, dict) and result.get("status") == "invalid_model_id":
        raise HTTPException(400, "Malformed model_id (regex validation)")
    return result


@router.get("/{model_id}/runs/{run_id}")
def functional_run(
    http_request: Request,
    model_id: str,
    run_id: str,
) -> dict[str, Any]:
    """Single eval run detail."""
    if not feval._MODEL_ID_RE.match(model_id):
        raise HTTPException(400, f"Malformed model_id '{model_id}'")
    if not feval._RUN_ID_RE.match(run_id):
        raise HTTPException(400, f"Malformed run_id '{run_id}'")
    log_holy_access(
        http_request, "evals_functional", "functional_run",
        extra={"model_id": model_id, "run_id": run_id},
    )
    result = feval.run_detail(model_id, run_id)
    if result is None:
        raise HTTPException(404, f"Run '{run_id}' not found for model '{model_id}'")
    return result
