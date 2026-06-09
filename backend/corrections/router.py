"""/api/v1/corrections/* — RLHF correction DB · T7.10."""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Request

from . import services

router = APIRouter(prefix="/api/v1/corrections", tags=["corrections"])


def _corr(r: Request) -> str:
    return getattr(r.state, "correlation_id", str(uuid.uuid4()))


def _tenant(r: Request) -> str:
    return getattr(r.state, "tenant_id", None) or "default"


@router.get("/health")
def health():
    return {"status": "ok", "module": "corrections",
            "spec": "§38.3 + T7.10 + Tier 7 gate #5 + RLHF feed (gate #6)"}


@router.get("", response_model=list[services.Correction])
def list_corrections(request: Request,
                      run_ref: Optional[str] = None,
                      severity: Optional[str] = None,
                      limit: int = 100):
    return services.list_corrections(_tenant(request), run_ref, severity, limit)


@router.post("", response_model=services.Correction, status_code=201)
def create_correction(body: services.CorrectionCreate, request: Request):
    try:
        return services.create_correction(body, _tenant(request), _corr(request))
    except ValueError as e:
        raise HTTPException(400, {"detail": str(e),
                                    "error_code": "INVALID_SEVERITY"})


@router.get("/{correction_ref}", response_model=services.Correction)
def get_correction(correction_ref: str, request: Request):
    c = services.get_correction(correction_ref, _tenant(request))
    if not c:
        raise HTTPException(404, {"detail": "correction not found",
                                    "error_code": "CORR_404"})
    return c


@router.get("/stats/summary", response_model=services.CorrectionStats)
def stats(request: Request):
    return services.stats(_tenant(request))
