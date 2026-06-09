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


@router.get("/dlp/status")
def dlp_status():
    """T6.10 · Presidio Stage-1 adapter status."""
    from services import dlp_presidio
    return dlp_presidio.status()


@router.get("/dlp/test")
def dlp_test(text: str):
    """T6.10 · operator-facing DLP scan (use this to test what entities
    Presidio/fallback detects in arbitrary text).
    """
    from services import dlp_presidio
    return dlp_presidio.scan(text)


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


# ─── Autonomous AI agent endpoints (declared BEFORE /{campaign_id} so they
#     don't get shadowed by FastAPI route-precedence)
from . import autonomous_agent as aa
from .autonomous_agent import AgentObjective, AgentRunResult


@router.post("/autonomous/run", response_model=AgentRunResult)
def autonomous_run(body: AgentObjective, request: Request):
    """Run the autonomous decision loop · returns full audit trail."""
    return aa.run_agent(body, _tenant(request), _correlation_id(request))


@router.get("/autonomous/runs")
def autonomous_runs(request: Request, limit: int = 50):
    """List recent agent runs · for the decision-loop dashboard."""
    return {"items": aa.list_runs(_tenant(request), limit)}


@router.get("/autonomous/runs/{run_ref}")
def autonomous_run_one(run_ref: str, request: Request):
    """Single agent run · full decisions trail."""
    r = aa.get_run(run_ref, _tenant(request))
    if not r:
        raise HTTPException(404, {"detail": "agent run not found",
                                    "error_code": "AGENT_404"})
    return r


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


# ─── Public submission endpoints · survey + form ─────────────────
# These are reachable by the END CUSTOMER from the survey_url / form_url
# in the rendered_payload. NO authentication required (public links) but:
#   - DLP-gated (responses with SSN/CC patterns rejected)
#   - Token-based lookup by campaign_ref + customer_id
#   - Marks the matching campaign_run as 'responded' with the response_data
#
# Per §82.21 (Secure AI DLP) + §47.6 (CORS · public surface)

from pydantic import BaseModel
import re
import psycopg2
import psycopg2.extras
import json
from core.config import get_settings


class PublicResponse(BaseModel):
    responses: dict  # {field_id: value} or {question_id: value}


def _public_dlp_ok(data: dict) -> bool:
    """Same DLP shape as services._dlp_scan · 7 jurisdictions per T3.5."""
    s = json.dumps(data) if not isinstance(data, str) else data
    if re.search(r"\b\d{3}-\d{2}-\d{4}\b", s):              # US SSN
        return False
    if re.search(r"\b\d{13,19}\b", s):                      # CC
        return False
    if re.search(r"\b[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]"
                  r"\s*\d{2}\s*\d{2}\s*\d{2}\s*[A-D]\b", s):  # UK NINO
        return False
    if re.search(r"\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b", s):   # EU IBAN
        return False
    if re.search(r"\b\d{3}[-\s]\d{3}[-\s]\d{3}\b", s):      # CA SIN
        return False
    if re.search(r"\b\d{4}\s\d{4}\s\d{4}\b", s):            # IN Aadhaar
        return False
    if re.search(r"\b\d{3}\.\d{3}\.\d{3}-\d{2}\b", s):      # BR CPF
        return False
    return True


def _find_pending_run(campaign_ref: str, customer_id: int):
    settings = get_settings()
    with psycopg2.connect(settings.database_url) as c, \
         c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            SELECT r.* FROM marketing_campaign_runs r
            JOIN marketing_campaigns c ON c.id = r.campaign_id
            WHERE c.campaign_ref = %s AND r.customer_id = %s
              AND r.status = 'pending'
            ORDER BY r.id DESC LIMIT 1
            """,
            (campaign_ref, customer_id),
        )
        return cur.fetchone()


@router.get("/public/{kind}/{campaign_ref}/{customer_id}/preview")
def public_preview(kind: str, campaign_ref: str, customer_id: int):
    """Public GET · returns campaign metadata + rendered_payload for the consumer page.

    No auth · just lookup by (campaign_ref, customer_id, pending status).
    """
    if kind not in ("survey", "form"):
        raise HTTPException(404, {"detail": "unknown kind", "error_code": "KIND_404"})
    settings = get_settings()
    with psycopg2.connect(settings.database_url) as c, \
         c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            SELECT r.id AS run_id, r.rendered_payload, r.status,
                   c.name AS campaign_name, c.channel,
                   c.product_pitch, c.call_to_action
            FROM marketing_campaign_runs r
            JOIN marketing_campaigns c ON c.id = r.campaign_id
            WHERE c.campaign_ref = %s AND r.customer_id = %s
              AND c.channel = %s
            ORDER BY r.id DESC LIMIT 1
            """,
            (campaign_ref, customer_id, kind),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(404, {"detail": "no run for this token",
                                    "error_code": "RUN_404"})
    return {
        "kind": kind,
        "campaign_ref": campaign_ref,
        "campaign_name": row["campaign_name"],
        "product_pitch": row["product_pitch"],
        "call_to_action": row["call_to_action"],
        "status": row["status"],
        "payload": row["rendered_payload"],
    }


@router.post("/public/survey/{campaign_ref}/{customer_id}/respond")
def public_survey_respond(campaign_ref: str, customer_id: int, body: PublicResponse):
    """Public survey response submission · DLP-gated."""
    if not _public_dlp_ok(body.responses):
        raise HTTPException(400, {"detail": "Response contains restricted patterns",
                                    "error_code": "DLP_REJECTED"})
    run = _find_pending_run(campaign_ref, customer_id)
    if not run:
        raise HTTPException(404, {"detail": "no pending survey run for that token",
                                    "error_code": "RUN_404"})

    settings = get_settings()
    with psycopg2.connect(settings.database_url) as c, c.cursor() as cur:
        cur.execute(
            "UPDATE marketing_campaign_runs SET status = 'responded', "
            "response_data = %s::jsonb, outcome_score = 0.85, "
            "completed_at = NOW() WHERE id = %s",
            (json.dumps(body.responses), run["id"]),
        )
        c.commit()
    return {"status": "ok", "run_id": run["id"], "outcome_score": 0.85}


@router.post("/public/form/{campaign_ref}/{customer_id}/submit")
def public_form_submit(campaign_ref: str, customer_id: int, body: PublicResponse):
    """Public form submission · DLP-gated · creates lead handoff."""
    if not _public_dlp_ok(body.responses):
        raise HTTPException(400, {"detail": "Submission contains restricted patterns",
                                    "error_code": "DLP_REJECTED"})
    run = _find_pending_run(campaign_ref, customer_id)
    if not run:
        raise HTTPException(404, {"detail": "no pending form run for that token",
                                    "error_code": "RUN_404"})

    settings = get_settings()
    with psycopg2.connect(settings.database_url) as c, c.cursor() as cur:
        cur.execute(
            "UPDATE marketing_campaign_runs SET status = 'converted', "
            "response_data = %s::jsonb, outcome_score = 1.0, "
            "completed_at = NOW() WHERE id = %s",
            (json.dumps(body.responses), run["id"]),
        )
        c.commit()
    return {"status": "ok", "run_id": run["id"], "outcome_score": 1.0,
            "next_step": "agent_callback"}