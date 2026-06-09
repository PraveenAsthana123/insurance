"""Services for marketing_campaigns + per-channel renderers.

Per operator 2026-06-08 (email · banner · survey · form end-to-end).
Top 1% gates per §76 + §82.21 + §38.3.
"""
from __future__ import annotations

import json
import logging
import re
import uuid
from collections import Counter
from typing import Any, Optional

import psycopg2
import psycopg2.extras

from core.config import get_settings
from voice_ai.schemas import Customer, Product
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

ALLOWED_CHANNELS = {"email", "banner", "survey", "form"}


def _conn():
    s = get_settings()
    return psycopg2.connect(s.database_url)


def _row(r):
    return dict(r) if r else {}


# ─────────────────────────────────────────────────────────────────────
# Channel help (operator-facing config docs)
# ─────────────────────────────────────────────────────────────────────
CHANNEL_HELP = {
    "email": ChannelHelp(
        channel="email",
        required_config_keys=["subject", "body_template", "from_email"],
        optional_config_keys=["reply_to"],
        example_config={
            "subject": "Your loyalty discount is ready · {name}",
            "body_template": "Hi {name}, ...{product_name} ...{call_to_action}",
            "from_email": "sarah@insur.example.com",
            "reply_to": "sarah@insur.example.com",
        },
        notes="Template vars: {name} {phone} {product_name} {price} {call_to_action}",
    ),
    "banner": ChannelHelp(
        channel="banner",
        required_config_keys=["image_url", "alt_text", "landing_url"],
        optional_config_keys=["banner_size", "brand_voice_guardrail"],
        example_config={
            "image_url": "/static/banners/home-bundle.png",
            "alt_text": "Bundle home + auto · save 18%",
            "landing_url": "/quote/home-bundle",
            "banner_size": "728x90",
            "brand_voice_guardrail": "helpful · benefit-led · no fear tactics",
        },
        notes="Image generated via Fooocus/ComfyUI per ai-agents/. C2PA watermark MANDATORY per §82.21.",
    ),
    "survey": ChannelHelp(
        channel="survey",
        required_config_keys=["questions"],
        optional_config_keys=["reward"],
        example_config={
            "questions": [
                {"id": "nps", "text": "How likely to recommend?", "type": "nps"},
                {"id": "reason", "text": "Why?", "type": "text"},
                {"id": "pref", "text": "Channel?", "type": "radio",
                 "options": ["voice", "email", "sms"]},
            ],
            "reward": "$5 coffee card",
        },
        notes="Question types: nps · text · radio (with options). Frontend renders the form.",
    ),
    "form": ChannelHelp(
        channel="form",
        required_config_keys=["fields"],
        optional_config_keys=["success_message"],
        example_config={
            "fields": [
                {"id": "full_name", "label": "Full name", "type": "text", "required": True},
                {"id": "email", "label": "Email", "type": "email", "required": True},
                {"id": "coverage", "label": "Coverage", "type": "select",
                 "required": True, "options": ["$250k", "$500k", "$1M"]},
            ],
            "success_message": "Thanks · an agent will call you within 24 hours.",
        },
        notes="Field types: text · email · tel · date · select (with options). Lead capture.",
    ),
}


def channel_help_all() -> dict[str, ChannelHelp]:
    return CHANNEL_HELP


# ─────────────────────────────────────────────────────────────────────
# Top 1% gate helpers (mirror voice campaign · §76 + §82.21)
# ─────────────────────────────────────────────────────────────────────
def _dlp_scan(text: Any) -> bool:
    """Refuse SSN-shape / CC-shape patterns in any string field."""
    if not text:
        return True
    s = json.dumps(text) if not isinstance(text, str) else text
    if re.search(r"\b\d{3}-\d{2}-\d{4}\b", s):  # SSN
        return False
    if re.search(r"\b\d{13,19}\b", s):  # CC
        return False
    return True


def _consent_gate(customer: Customer, require_consent: bool) -> bool:
    return (not require_consent) or bool(customer.consent_marketing)


def _segment_match(customer: Customer, target: Optional[str]) -> bool:
    return target in (None, "") or customer.segment == target


def _substitute(template: str, customer: Customer, product: Optional[Product],
                 call_to_action: str) -> str:
    """Replace {name} {phone} {product_name} {price} {call_to_action}."""
    price = f"{product.price_cents / 100:.2f}" if (product and product.price_cents) else ""
    subs = {
        "name": customer.full_name or "",
        "phone": customer.phone or "",
        "product_name": product.name if product else "",
        "price": price,
        "call_to_action": call_to_action or "",
    }
    out = template
    for k, v in subs.items():
        out = out.replace("{" + k + "}", str(v))
    return out


# ─────────────────────────────────────────────────────────────────────
# Per-channel payload renderers
# ─────────────────────────────────────────────────────────────────────
def render_payload(channel: str, campaign: Campaign, customer: Customer,
                    product: Optional[Product]) -> dict[str, Any]:
    cfg = campaign.config or {}
    cta = campaign.call_to_action

    if channel == "email":
        return {
            "subject": _substitute(cfg.get("subject", ""), customer, product, cta),
            "body": _substitute(cfg.get("body_template", ""), customer, product, cta),
            "from_email": cfg.get("from_email"),
            "reply_to": cfg.get("reply_to"),
            "to_email": customer.email,
        }

    if channel == "banner":
        return {
            "image_url": cfg.get("image_url"),
            "banner_size": cfg.get("banner_size", "728x90"),
            "alt_text": _substitute(cfg.get("alt_text", ""), customer, product, cta),
            "landing_url": cfg.get("landing_url"),
            "served_to_customer_id": customer.id,
            # Per §82.21: watermark provenance attached by image gen pipeline
            "watermark_required": True,
        }

    if channel == "survey":
        return {
            "questions": cfg.get("questions", []),
            "reward": cfg.get("reward"),
            "intro_text": _substitute(campaign.product_pitch, customer, product, cta),
            "for_customer": {"id": customer.id, "name": customer.full_name},
            "survey_url": f"/survey/{campaign.campaign_ref}/{customer.id}",
        }

    if channel == "form":
        return {
            "fields": cfg.get("fields", []),
            "success_message": cfg.get("success_message"),
            "intro_text": _substitute(campaign.product_pitch, customer, product, cta),
            "form_url": f"/form/{campaign.campaign_ref}/{customer.id}",
            "for_customer": {"id": customer.id, "name": customer.full_name},
        }

    return {"error": f"unknown channel: {channel}"}


# ─────────────────────────────────────────────────────────────────────
# Campaign CRUD
# ─────────────────────────────────────────────────────────────────────
def list_campaigns(tenant_id: str = "default",
                     channel: Optional[str] = None) -> list[Campaign]:
    q = "SELECT * FROM marketing_campaigns WHERE tenant_id = %s"
    params: list[Any] = [tenant_id]
    if channel:
        q += " AND channel = %s"
        params.append(channel)
    q += " ORDER BY id DESC"
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(q, params)
        rows = cur.fetchall()
    return [Campaign(**_row(r)) for r in rows]


def get_campaign(campaign_id: int, tenant_id: str = "default") -> Optional[Campaign]:
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM marketing_campaigns WHERE id = %s AND tenant_id = %s",
            (campaign_id, tenant_id),
        )
        row = cur.fetchone()
    return Campaign(**_row(row)) if row else None


def create_campaign(data: CampaignCreate, tenant_id: str = "default") -> Campaign:
    if data.channel not in ALLOWED_CHANNELS:
        raise ValueError(f"channel must be one of {ALLOWED_CHANNELS}")
    ref = f"MKT-{data.channel.upper()}-{uuid.uuid4().hex[:8].upper()}"
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO marketing_campaigns
            (campaign_ref, name, channel, product_id, product_pitch,
             service_description, call_to_action, target_segment,
             require_consent, config, max_attempts_per_customer, tenant_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s)
            RETURNING *
            """,
            (ref, data.name, data.channel, data.product_id, data.product_pitch,
             data.service_description, data.call_to_action, data.target_segment,
             data.require_consent, json.dumps(data.config or {}),
             data.max_attempts_per_customer, tenant_id),
        )
        row = cur.fetchone()
        c.commit()
    return Campaign(**_row(row))


def update_campaign(campaign_id: int, patch: CampaignUpdate,
                    tenant_id: str = "default") -> Optional[Campaign]:
    data = patch.model_dump(exclude_unset=True)
    if not data:
        return get_campaign(campaign_id, tenant_id)
    set_clauses: list[str] = []
    params: list[Any] = []
    for k, v in data.items():
        if k == "config":
            set_clauses.append("config = %s::jsonb")
            params.append(json.dumps(v))
        else:
            set_clauses.append(f"{k} = %s")
            params.append(v)
    set_clauses.append("updated_at = NOW()")
    params.extend([campaign_id, tenant_id])
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            f"UPDATE marketing_campaigns SET {', '.join(set_clauses)} "
            f"WHERE id = %s AND tenant_id = %s RETURNING *",
            params,
        )
        row = cur.fetchone()
        c.commit()
    return Campaign(**_row(row)) if row else None


# ─────────────────────────────────────────────────────────────────────
# Execute · gated · creates marketing_campaign_runs rows
# ─────────────────────────────────────────────────────────────────────
def execute_campaign(campaign_id: int, req: CampaignExecuteRequest,
                      tenant_id: str = "default",
                      correlation_id: Optional[str] = None) -> CampaignExecuteResponse:
    campaign = get_campaign(campaign_id, tenant_id)
    if not campaign:
        raise ValueError(f"campaign {campaign_id} not found")

    product: Optional[Product] = None
    if campaign.product_id:
        with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM voice_ai_products WHERE id = %s AND tenant_id = %s",
                (campaign.product_id, tenant_id),
            )
            r = cur.fetchone()
            if r:
                product = Product(**_row(r))

    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        if req.customer_ids:
            placeholders = ",".join(["%s"] * len(req.customer_ids))
            cur.execute(
                f"SELECT * FROM voice_ai_customers "
                f"WHERE tenant_id = %s AND id IN ({placeholders})",
                [tenant_id] + req.customer_ids,
            )
        else:
            cur.execute(
                "SELECT * FROM voice_ai_customers WHERE tenant_id = %s",
                (tenant_id,),
            )
        rows = cur.fetchall()
    candidates = [Customer(**_row(r)) for r in rows]

    created = skipped_consent = skipped_segment = skipped_dlp = 0
    first_run_id: Optional[int] = None

    with _conn() as c, c.cursor() as cur:
        for customer in candidates:
            if not _segment_match(customer, campaign.target_segment):
                skipped_segment += 1
                continue
            if not _consent_gate(customer, campaign.require_consent):
                skipped_consent += 1
                continue
            payload = render_payload(campaign.channel, campaign, customer, product)
            if not _dlp_scan(payload):
                skipped_dlp += 1
                continue

            run_ref = f"MKR-{uuid.uuid4().hex[:10].upper()}"
            cur.execute(
                """
                INSERT INTO marketing_campaign_runs
                (run_ref, campaign_id, customer_id, rendered_payload,
                 consent_ok, dlp_ok, fairness_cohort, status,
                 correlation_id, tenant_id)
                VALUES (%s, %s, %s, %s::jsonb, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (run_ref, campaign_id, customer.id, json.dumps(payload),
                 True, True, customer.segment, "pending",
                 correlation_id, tenant_id),
            )
            row = cur.fetchone()
            if first_run_id is None:
                first_run_id = row[0]
            created += 1

        cur.execute(
            "UPDATE marketing_campaigns SET status = 'running', "
            "started_at = COALESCE(started_at, NOW()) WHERE id = %s",
            (campaign_id,),
        )
        c.commit()

    return CampaignExecuteResponse(
        campaign_id=campaign_id,
        channel=campaign.channel,
        runs_created=created,
        runs_skipped_no_consent=skipped_consent,
        runs_skipped_segment_mismatch=skipped_segment,
        runs_skipped_dlp=skipped_dlp,
        first_run_id=first_run_id,
    )


def list_runs(campaign_id: int, tenant_id: str = "default") -> list[CampaignRun]:
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM marketing_campaign_runs "
            "WHERE campaign_id = %s AND tenant_id = %s ORDER BY id",
            (campaign_id, tenant_id),
        )
        rows = cur.fetchall()
    return [CampaignRun(**_row(r)) for r in rows]


def update_run(run_id: int, patch: CampaignRunUpdate,
               tenant_id: str = "default") -> Optional[CampaignRun]:
    data = patch.model_dump(exclude_unset=True)
    if not data:
        return None
    set_clauses: list[str] = []
    params: list[Any] = []
    for k, v in data.items():
        if k == "response_data":
            set_clauses.append("response_data = %s::jsonb")
            params.append(json.dumps(v))
        else:
            set_clauses.append(f"{k} = %s")
            params.append(v)
    if data.get("status") in ("sent", "delivered", "opened", "clicked",
                                  "responded", "converted", "failed", "bounced"):
        set_clauses.append("completed_at = NOW()")
    params.extend([run_id, tenant_id])
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            f"UPDATE marketing_campaign_runs SET {', '.join(set_clauses)} "
            f"WHERE id = %s AND tenant_id = %s RETURNING *",
            params,
        )
        row = cur.fetchone()
        c.commit()
    return CampaignRun(**_row(row)) if row else None


def campaign_metrics(campaign_id: int, tenant_id: str = "default") -> CampaignMetrics:
    campaign = get_campaign(campaign_id, tenant_id)
    channel = campaign.channel if campaign else "?"
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT status, consent_ok, outcome_score, fairness_cohort "
            "FROM marketing_campaign_runs "
            "WHERE campaign_id = %s AND tenant_id = %s",
            (campaign_id, tenant_id),
        )
        runs = cur.fetchall()

    by_status = Counter(r["status"] for r in runs)
    total = len(runs)
    consent_pass = sum(1 for r in runs if r["consent_ok"])
    scores = [r["outcome_score"] for r in runs if r.get("outcome_score") is not None]
    cohorts = Counter(r["fairness_cohort"] or "unknown" for r in runs)

    return CampaignMetrics(
        campaign_id=campaign_id,
        channel=channel,
        total_runs=total,
        by_status=dict(by_status),
        consent_gate_rate=round(consent_pass / total, 3) if total else 0.0,
        avg_outcome_score=round(sum(scores) / len(scores), 3) if scores else 0.0,
        cohort_distribution=dict(cohorts),
    )
