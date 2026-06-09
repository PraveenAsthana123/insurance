"""/api/v1/voice-ai/* — REST surface for the voice AI demo."""
from __future__ import annotations

import logging
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Request

from .schemas import (
    MonitoringSnapshot,
    Order,
    Product,
    ProductCreate,
    SessionStartRequest,
    TurnRequest,
    TurnResponse,
    WelcomeTemplate,
    WelcomeTemplateUpdate,
)
from . import services

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/voice-ai", tags=["voice-ai"])


def _correlation_id(request: Request) -> str:
    return getattr(request.state, "correlation_id", str(uuid.uuid4()))


def _tenant(request: Request) -> str:
    return getattr(request.state, "tenant_id", None) or "default"


# ── products ─────────────────────────────────────────────────────
@router.get("/products", response_model=list[Product])
def get_products(request: Request, category: Optional[str] = None):
    return services.list_products(_tenant(request), category=category)


@router.post("/products", response_model=Product, status_code=201)
def post_product(body: ProductCreate, request: Request):
    try:
        return services.create_product(body.model_dump(), _tenant(request))
    except Exception as exc:
        raise HTTPException(400, {"detail": str(exc), "error_code": "PRODUCT_CREATE_FAILED"})


@router.delete("/products/{product_id}", status_code=204)
def del_product(product_id: int, request: Request):
    if not services.delete_product(product_id, _tenant(request)):
        raise HTTPException(404, {"detail": "product not found",
                                  "error_code": "PRODUCT_NOT_FOUND"})


# ── customers ────────────────────────────────────────────────────
@router.get("/customers")
def get_customers(request: Request):
    return {"items": [c.model_dump() for c in services.list_customers(_tenant(request))]}


# ── welcome templates ────────────────────────────────────────────
@router.get("/welcome-templates", response_model=list[WelcomeTemplate])
def get_welcome_templates(request: Request):
    return services.list_welcome_templates(_tenant(request))


@router.patch("/welcome-templates/{template_id}", response_model=WelcomeTemplate)
def patch_welcome_template(template_id: int, body: WelcomeTemplateUpdate, request: Request):
    return services.update_welcome(template_id, body, _tenant(request))


# ── sessions / conversation ──────────────────────────────────────
@router.post("/sessions/start")
def start_session(body: SessionStartRequest, request: Request):
    return services.start_session(
        body.customer_ref, body.phone, body.email,
        _tenant(request), _correlation_id(request),
    )


@router.post("/sessions/turn", response_model=TurnResponse)
def session_turn(body: TurnRequest, request: Request):
    try:
        return services.process_turn(body, _tenant(request), _correlation_id(request))
    except ValueError as exc:
        raise HTTPException(404, {"detail": str(exc), "error_code": "SESSION_NOT_FOUND"})


# ── orders ───────────────────────────────────────────────────────
@router.get("/orders")
def get_orders(request: Request):
    import psycopg2.extras
    from core.config import get_settings
    s = get_settings()
    import psycopg2
    with psycopg2.connect(s.database_url) as c, \
         c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM voice_ai_orders WHERE tenant_id = %s "
            "ORDER BY created_at DESC LIMIT 50",
            (_tenant(request),),
        )
        rows = cur.fetchall()
    return {"items": [Order(**dict(r)).model_dump(mode="json") for r in rows]}


# ── monitoring ───────────────────────────────────────────────────
@router.get("/monitoring", response_model=MonitoringSnapshot)
def monitoring(request: Request):
    return services.monitoring_snapshot(_tenant(request))


# ── health ───────────────────────────────────────────────────────
@router.get("/health")
def health():
    return {"status": "ok", "module": "voice-ai-e2e",
            "spec": "§90 L15 + §91 + §64.2/.3/.4"}


# ─── Outbound Campaign endpoints (migration 053) ─────────────────
from .campaign_schemas import (
    Campaign, CampaignCreate, CampaignUpdate,
    CampaignExecuteRequest, CampaignExecuteResponse,
    CampaignRun, CampaignRunUpdate, CampaignMetrics,
)
from . import campaign_services as cs


@router.get("/campaigns", response_model=list[Campaign])
def list_campaigns(request: Request):
    return cs.list_campaigns(_tenant(request))


@router.post("/campaigns", response_model=Campaign, status_code=201)
def create_campaign(body: CampaignCreate, request: Request):
    return cs.create_campaign(body, _tenant(request))


@router.get("/campaigns/{campaign_id}", response_model=Campaign)
def get_one_campaign(campaign_id: int, request: Request):
    c = cs.get_campaign(campaign_id, _tenant(request))
    if not c:
        raise HTTPException(404, {"detail": "campaign not found", "error_code": "CAMP_404"})
    return c


@router.patch("/campaigns/{campaign_id}", response_model=Campaign)
def patch_campaign(campaign_id: int, body: CampaignUpdate, request: Request):
    c = cs.update_campaign(campaign_id, body, _tenant(request))
    if not c:
        raise HTTPException(404, {"detail": "campaign not found", "error_code": "CAMP_404"})
    return c


@router.post("/campaigns/{campaign_id}/execute", response_model=CampaignExecuteResponse)
def execute_campaign(campaign_id: int, body: CampaignExecuteRequest, request: Request):
    try:
        return cs.execute_campaign(
            campaign_id, body, _tenant(request), _correlation_id(request),
        )
    except ValueError as e:
        raise HTTPException(404, {"detail": str(e), "error_code": "CAMP_404"})


@router.get("/campaigns/{campaign_id}/runs", response_model=list[CampaignRun])
def list_runs(campaign_id: int, request: Request):
    return cs.list_runs(campaign_id, _tenant(request))


@router.patch("/campaign-runs/{run_id}", response_model=CampaignRun)
def patch_run(run_id: int, body: CampaignRunUpdate, request: Request):
    r = cs.update_run(run_id, body, _tenant(request))
    if not r:
        raise HTTPException(404, {"detail": "run not found", "error_code": "RUN_404"})
    return r


@router.get("/campaigns/{campaign_id}/metrics", response_model=CampaignMetrics)
def campaign_metrics(campaign_id: int, request: Request):
    return cs.campaign_metrics(campaign_id, _tenant(request))


# ─── End-to-end observability + explainability + voice catalog ────
from . import e2e_services as e2e


@router.get("/e2e/phases")
def e2e_phase_breakdown(request: Request):
    """8-phase × component breakdown with live metrics. Per §64.34."""
    return e2e.phase_breakdown(_tenant(request))


@router.get("/e2e/sessions/{session_id}/tracking")
def e2e_session_tracking(session_id: str, request: Request):
    """Per-session timeline · date/timestamp/user/correlation_id."""
    return e2e.session_tracking(session_id, _tenant(request))


@router.get("/e2e/benchmark")
def e2e_benchmark(request: Request):
    """Manual vs Automatic per-phase comparison. Per §64.3 + §64.4."""
    return e2e.benchmark(_tenant(request))


@router.get("/e2e/quality")
def e2e_quality(request: Request):
    """Per-phase quality scoring · 0..1. Per §75."""
    return e2e.quality_scoring(_tenant(request))


@router.get("/e2e/sessions/{session_id}/explainability")
def e2e_explainability(session_id: str, request: Request):
    """Per-turn attribution + product match scoring. Per §48 XAI MANDATORY."""
    return e2e.explainability_trace(session_id, _tenant(request))


@router.get("/e2e/voices")
def e2e_voice_catalog():
    """Language + voice quality catalog · 23 langs · 12 Indian. Per §46 + §76."""
    return e2e.voice_catalog()
