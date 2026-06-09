"""/api/v1/attribution/* — multi-touch attribution API · T5.9."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from . import services

router = APIRouter(prefix="/api/v1/attribution", tags=["attribution"])


def _tenant(r: Request) -> str:
    return getattr(r.state, "tenant_id", None) or "default"


@router.get("/health")
def health():
    return {"status": "ok", "module": "attribution",
            "models": list(services.ATTRIBUTION_MODELS),
            "spec": "§57.7 + §75 + §76 + T5.9"}


@router.get("/touchpoints")
def touchpoints(request: Request, limit: int = 100):
    """Raw touchpoint feed (recent runs · campaign join)."""
    return {"touchpoints": services.list_touchpoints(_tenant(request), limit),
            "limit": limit}


@router.get("/compute")
def compute(request: Request, model: str = "linear",
              value_per_outcome: float = 100.0):
    """Run one of the 5 attribution models."""
    try:
        return services.compute_attribution(
            model=model, tenant_id=_tenant(request),
            value_per_outcome=value_per_outcome,
        )
    except ValueError as e:
        raise HTTPException(400, {"detail": str(e),
                                    "error_code": "INVALID_MODEL"})


@router.get("/compare")
def compare(request: Request):
    """Run all 5 models · returns per-campaign per-model matrix for diff."""
    return services.compare_models(_tenant(request))
