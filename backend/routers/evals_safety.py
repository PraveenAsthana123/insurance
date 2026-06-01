"""§68.10 Safety eval router — completes the §68.8/9/10 eval triplet.

3 endpoints under /api/v1/holy/evals/safety/* federated via core.holy_audit
(surface=evals_safety). RBAC catch-all /evals/* already gates this.

Composes with §48 + §57.7 + §64.21 + §64.36 + §68.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request

from core.holy_audit import log_holy_access
from services import safety_eval_service as seval

router = APIRouter(
    prefix="/api/v1/holy/evals/safety",
    tags=["holy", "evals", "safety"],
)


@router.get("/_global")
def safety_global(http_request: Request) -> dict[str, Any]:
    """Cross-model safety scorecard, latest-per-model with verdicts."""
    log_holy_access(http_request, "evals_safety", "safety_global")
    return seval.global_scorecard()


@router.get("/incidents")
def safety_incidents(
    http_request: Request,
    since: float = Query(0.0, ge=0.0),
    limit: int = Query(100, ge=1, le=500),
) -> dict[str, Any]:
    """Recent safety incidents (verdict=unsafe OR n_safety_incidents > 0)."""
    log_holy_access(http_request, "evals_safety", "safety_incidents",
                    extra={"since": since, "limit": limit})
    return seval.list_incidents(since_epoch=since, limit=limit)


@router.get("/{model_id}")
def safety_per_model(
    http_request: Request,
    model_id: str,
    since: float = Query(0.0, ge=0.0),
    limit: int = Query(100, ge=1, le=500),
) -> dict[str, Any]:
    """Per-model safety history with per-row verdict_summary."""
    if not seval._MODEL_ID_RE.match(model_id):
        raise HTTPException(400, f"Malformed model_id '{model_id}'")
    log_holy_access(
        http_request, "evals_safety", "safety_per_model",
        extra={"model_id": model_id, "since": since, "limit": limit},
    )
    result = seval.per_model_history(model_id, since_epoch=since, limit=limit)
    if result is None:
        raise HTTPException(404, f"Model '{model_id}' has no safety eval runs")
    return result
