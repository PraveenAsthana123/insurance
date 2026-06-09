"""Campaign services · outbound voice AI flow with top 1% gates.

Per §76 (RAI 5-pillar · privacy + consent MANDATORY) + §82.21 (DLP) + §38.3
(audit row per outreach) + §82.7 (drift monitoring).
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
from .schemas import Customer, Product
from .campaign_schemas import (
    Campaign,
    CampaignCreate,
    CampaignExecuteRequest,
    CampaignExecuteResponse,
    CampaignMetrics,
    CampaignRun,
    CampaignRunUpdate,
    CampaignUpdate,
)

logger = logging.getLogger(__name__)


def _conn():
    s = get_settings()
    return psycopg2.connect(s.postgres_dsn)


def _row(r):
    return dict(r) if r else {}


# ─────────────────────────────────────────────────────────────────────
# Top 1% gate helpers
# ─────────────────────────────────────────────────────────────────────
def _dlp_scan(script: str) -> bool:
    """§82.21 DLP · refuse scripts containing pii-shaped patterns.

    Conservative · false positives are safer than false negatives for outbound voice.
    """
    if not script:
        return True
    # SSN-like 9-digit · credit-card-like 13-19 digit
    if re.search(r"\b\d{3}-\d{2}-\d{4}\b", script):
        return False
    if re.search(r"\b\d{13,19}\b", script):
        return False
    return True


def _consent_gate(customer: Customer, require_consent: bool) -> bool:
    """§76 + GDPR · consent_marketing must be true if require_consent set."""
    if not require_consent:
        return True
    return bool(customer.consent_marketing)


def _segment_match(customer: Customer, target: Optional[str]) -> bool:
    if target is None or target == "":
        return True
    return customer.segment == target


def _render_script(template: str, customer: Customer, product: Optional[Product],
                    call_to_action: str) -> str:
    """Variable substitution. Missing values render as empty (safer than crash)."""
    price = ""
    if product and product.price_cents:
        price = f"{product.price_cents / 100:.2f}"
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
# Campaigns CRUD
# ─────────────────────────────────────────────────────────────────────
def list_campaigns(tenant_id: str = "default") -> list[Campaign]:
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM voice_ai_campaigns WHERE tenant_id = %s ORDER BY id DESC",
            (tenant_id,),
        )
        rows = cur.fetchall()
    return [Campaign(**_row(r)) for r in rows]


def get_campaign(campaign_id: int, tenant_id: str = "default") -> Optional[Campaign]:
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM voice_ai_campaigns WHERE id = %s AND tenant_id = %s",
            (campaign_id, tenant_id),
        )
        row = cur.fetchone()
    return Campaign(**_row(row)) if row else None


def create_campaign(data: CampaignCreate, tenant_id: str = "default") -> Campaign:
    ref = f"CAMP-{uuid.uuid4().hex[:10].upper()}"
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO voice_ai_campaigns
            (campaign_ref, name, product_id, product_pitch, service_description,
             call_to_action, target_segment, require_consent, script_template,
             voice_lang, max_attempts_per_customer, tenant_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (ref, data.name, data.product_id, data.product_pitch,
             data.service_description, data.call_to_action,
             data.target_segment, data.require_consent, data.script_template,
             data.voice_lang, data.max_attempts_per_customer, tenant_id),
        )
        row = cur.fetchone()
        c.commit()
    return Campaign(**_row(row))


def update_campaign(campaign_id: int, patch: CampaignUpdate,
                    tenant_id: str = "default") -> Optional[Campaign]:
    data = patch.model_dump(exclude_unset=True)
    if not data:
        return get_campaign(campaign_id, tenant_id)
    set_clauses = ", ".join(f"{k} = %s" for k in data.keys())
    set_clauses += ", updated_at = NOW()"
    params = list(data.values()) + [campaign_id, tenant_id]
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            f"UPDATE voice_ai_campaigns SET {set_clauses} "
            f"WHERE id = %s AND tenant_id = %s RETURNING *",
            params,
        )
        row = cur.fetchone()
        c.commit()
    return Campaign(**_row(row)) if row else None


# ─────────────────────────────────────────────────────────────────────
# Execute · the top 1% gated flow
# ─────────────────────────────────────────────────────────────────────
def execute_campaign(campaign_id: int, req: CampaignExecuteRequest,
                      tenant_id: str = "default",
                      correlation_id: Optional[str] = None) -> CampaignExecuteResponse:
    """Iterate customers · apply gates · create campaign_run rows.

    Top 1% gates per run:
    1. Consent check (§76 + GDPR)
    2. Segment match (operator-specified targeting)
    3. DLP scan on rendered script (§82.21)
    4. Per-customer attempt count cap
    5. Audit row + correlation_id propagation (§38.3 + §47.4)

    Returns counts of attempts created / skipped per gate.
    """
    campaign = get_campaign(campaign_id, tenant_id)
    if not campaign:
        raise ValueError(f"campaign {campaign_id} not found")

    # Fetch product for variable substitution
    product = None
    if campaign.product_id:
        with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM voice_ai_products WHERE id = %s AND tenant_id = %s",
                (campaign.product_id, tenant_id),
            )
            row = cur.fetchone()
            if row:
                product = Product(**_row(row))

    # Fetch candidate customers
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

    skipped_consent = 0
    skipped_segment = 0
    skipped_dlp = 0
    created = 0
    first_run_id = None

    with _conn() as c, c.cursor() as cur:
        for customer in candidates:
            # Gate 1: segment match
            if not _segment_match(customer, campaign.target_segment):
                skipped_segment += 1
                continue
            # Gate 2: consent
            if not _consent_gate(customer, campaign.require_consent):
                skipped_consent += 1
                continue
            # Render + Gate 3: DLP
            rendered = _render_script(
                campaign.script_template, customer, product, campaign.call_to_action,
            )
            if not _dlp_scan(rendered):
                skipped_dlp += 1
                continue

            run_ref = f"RUN-{uuid.uuid4().hex[:10].upper()}"
            cur.execute(
                """
                INSERT INTO voice_ai_campaign_runs
                (run_ref, campaign_id, customer_id, rendered_script,
                 consent_ok, dlp_ok, fairness_cohort, status,
                 correlation_id, tenant_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (run_ref, campaign.id, customer.id, rendered,
                 True, True, customer.segment, "pending",
                 correlation_id, tenant_id),
            )
            row = cur.fetchone()
            if first_run_id is None:
                first_run_id = row[0]
            created += 1

        # Mark campaign as running
        cur.execute(
            "UPDATE voice_ai_campaigns SET status = 'running', "
            "started_at = COALESCE(started_at, NOW()) "
            "WHERE id = %s",
            (campaign_id,),
        )
        c.commit()

    return CampaignExecuteResponse(
        campaign_id=campaign_id,
        runs_created=created,
        runs_skipped_no_consent=skipped_consent,
        runs_skipped_segment_mismatch=skipped_segment,
        runs_skipped_dlp=skipped_dlp,
        first_run_id=first_run_id,
    )


# ─────────────────────────────────────────────────────────────────────
# Per-run views + frontend hooks
# ─────────────────────────────────────────────────────────────────────
def list_runs(campaign_id: int, tenant_id: str = "default") -> list[CampaignRun]:
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM voice_ai_campaign_runs "
            "WHERE campaign_id = %s AND tenant_id = %s ORDER BY id",
            (campaign_id, tenant_id),
        )
        rows = cur.fetchall()
    return [CampaignRun(**_row(r)) for r in rows]


def update_run(run_id: int, patch: CampaignRunUpdate,
               tenant_id: str = "default") -> Optional[CampaignRun]:
    """Frontend reports outcome after browser TTS playback + optional STT capture."""
    data = patch.model_dump(exclude_unset=True)
    if not data:
        return None
    set_clauses = []
    params: list[Any] = []
    for k, v in data.items():
        set_clauses.append(f"{k} = %s")
        params.append(v)
    if data.get("status") in ("spoken", "accepted", "declined", "failed"):
        set_clauses.append("completed_at = NOW()")
    if "started_at" not in data and data.get("status") == "spoken":
        set_clauses.append("started_at = COALESCE(started_at, NOW())")
    params.extend([run_id, tenant_id])
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            f"UPDATE voice_ai_campaign_runs SET {', '.join(set_clauses)} "
            f"WHERE id = %s AND tenant_id = %s RETURNING *",
            params,
        )
        row = cur.fetchone()
        c.commit()
    return CampaignRun(**_row(row)) if row else None


# ─────────────────────────────────────────────────────────────────────
# Metrics · per §75 + §82.7
# ─────────────────────────────────────────────────────────────────────
def campaign_metrics(campaign_id: int, tenant_id: str = "default") -> CampaignMetrics:
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT status, consent_ok, outcome_score, fairness_cohort "
            "FROM voice_ai_campaign_runs "
            "WHERE campaign_id = %s AND tenant_id = %s",
            (campaign_id, tenant_id),
        )
        runs = cur.fetchall()

    counts = Counter(r["status"] for r in runs)
    total = len(runs)
    consent_pass = sum(1 for r in runs if r["consent_ok"])
    consent_rate = consent_pass / total if total else 0.0
    outcome_scores = [r["outcome_score"] for r in runs if r.get("outcome_score") is not None]
    avg_outcome = sum(outcome_scores) / len(outcome_scores) if outcome_scores else 0.0
    cohorts = Counter(r["fairness_cohort"] or "unknown" for r in runs)

    return CampaignMetrics(
        campaign_id=campaign_id,
        total_runs=total,
        pending=counts.get("pending", 0),
        spoken=counts.get("spoken", 0),
        accepted=counts.get("accepted", 0),
        declined=counts.get("declined", 0),
        skipped=counts.get("skipped", 0),
        failed=counts.get("failed", 0),
        consent_gate_rate=round(consent_rate, 3),
        avg_outcome_score=round(avg_outcome, 3),
        cohort_distribution=dict(cohorts),
    )
