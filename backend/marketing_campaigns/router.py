"""/api/v1/marketing-campaigns/* — multi-channel marketing campaigns.

Reuses voice_ai_customers + voice_ai_products tables.
"""
from __future__ import annotations

import logging
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Request

from . import services
from .schemas import (
    Campaign,
    CampaignCreate,
    CampaignExecuteRequest,
    CampaignExecuteResponse,
    CampaignMetrics,
    CampaignRun,
    CampaignRunUpdate,
    CampaignUpdate,
    ChannelHelp,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/marketing-campaigns", tags=["marketing-campaigns"])


def _correlation_id(request: Request) -> str:
    return getattr(request.state, "correlation_id", str(uuid.uuid4()))


def _tenant(request: Request) -> str:
    return getattr(request.state, "tenant_id", None) or "default"


@router.get("/health")
def health():
    """Health · DEFINED BEFORE /{campaign_id} so the int-path doesn't shadow it."""
    return {"status": "ok", "module": "marketing-campaigns",
            "spec": "§64.13 + §90 L13/L14 · 4 channels (email/banner/survey/form)"}


@router.get("/channels", response_model=dict[str, ChannelHelp])
def channels():
    """Per-channel config docs for the operator UI."""
    return services.channel_help_all()


@router.get("", response_model=list[Campaign])
def list_campaigns(request: Request, channel: Optional[str] = None):
    return services.list_campaigns(_tenant(request), channel)


@router.post("", response_model=Campaign, status_code=201)
def create_campaign(body: CampaignCreate, request: Request):
    try:
        return services.create_campaign(body, _tenant(request))
    except ValueError as e:
        raise HTTPException(400, {"detail": str(e), "error_code": "INVALID_CHANNEL"})


@router.get("/{campaign_id}", response_model=Campaign)
def get_campaign(campaign_id: int, request: Request):
    c = services.get_campaign(campaign_id, _tenant(request))
    if not c:
        raise HTTPException(404, {"detail": "not found", "error_code": "MKT_404"})
    return c


@router.patch("/{campaign_id}", response_model=Campaign)
def patch_campaign(campaign_id: int, body: CampaignUpdate, request: Request):
    c = services.update_campaign(campaign_id, body, _tenant(request))
    if not c:
        raise HTTPException(404, {"detail": "not found", "error_code": "MKT_404"})
    return c


@router.post("/{campaign_id}/execute", response_model=CampaignExecuteResponse)
def execute(campaign_id: int, body: CampaignExecuteRequest, request: Request):
    try:
        return services.execute_campaign(
            campaign_id, body, _tenant(request), _correlation_id(request),
        )
    except ValueError as e:
        raise HTTPException(404, {"detail": str(e), "error_code": "MKT_404"})


@router.get("/{campaign_id}/runs", response_model=list[CampaignRun])
def runs(campaign_id: int, request: Request):
    return services.list_runs(campaign_id, _tenant(request))


@router.patch("/runs/{run_id}", response_model=CampaignRun)
def patch_run(run_id: int, body: CampaignRunUpdate, request: Request):
    r = services.update_run(run_id, body, _tenant(request))
    if not r:
        raise HTTPException(404, {"detail": "run not found", "error_code": "RUN_404"})
    return r


@router.get("/{campaign_id}/metrics", response_model=CampaignMetrics)
def metrics(campaign_id: int, request: Request):
    return services.campaign_metrics(campaign_id, _tenant(request))
