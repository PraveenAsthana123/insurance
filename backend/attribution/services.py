"""Multi-touch attribution computation · 5 models · T5.9.

Models (all conserve total revenue per customer):

  last_touch    · 100% credit to the FINAL touchpoint before conversion
                  · Used by default in most ad analytics platforms
  first_touch   · 100% credit to the FIRST touchpoint
                  · Useful for brand awareness measurement
  linear        · Equal split across all touchpoints
                  · Default fairness baseline
  time_decay    · More weight to recent touchpoints (half-life=7 days)
                  · Weight = 2^(-days_before_conv / half_life)
  position_based · 40% first · 40% last · 20% split across middle
                  · Aka 'U-shaped' · common in B2B

Touchpoints are synthesized from marketing_campaign_runs:
  customer_id + campaign_id + created_at = touchpoint
  outcome_score = revenue proxy (§57.7 honest · operator wires real $ later)
  Conversion = run with status='converted'

Per §57.7: if customer has no converted run · they contribute 0 (no
fabricated attribution to non-converters).
Per §76 RAI: attribution is segment-aware (cohort_distribution returned).
"""
from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime
from typing import Any, Optional

import psycopg2
import psycopg2.extras

from core.config import get_settings

logger = logging.getLogger(__name__)


# ─── Notional value (operator-overridable) ────────────────────
DEFAULT_VALUE_PER_OUTCOME = 100.0  # USD · per §57.7 honest proxy


def _conn():
    return psycopg2.connect(get_settings().database_url)


# ─── Load raw touchpoints from marketing_campaign_runs ────────
def _load_touchpoints(tenant_id: str = "default",
                       value_per_outcome: float = DEFAULT_VALUE_PER_OUTCOME) -> dict:
    """Build customer journey · returns {customer_id: {touchpoints, converted_at, total_value}}.

    A customer journey is the ordered list of touchpoints (marketing_campaign_runs)
    that touched a customer · only customers with at least one CONVERTED run
    are eligible for attribution (per §57.7).
    """
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            SELECT r.id, r.customer_id, r.campaign_id, r.status, r.outcome_score,
                   r.created_at, r.completed_at,
                   c.channel, c.name AS campaign_name
            FROM marketing_campaign_runs r
            JOIN marketing_campaigns c ON c.id = r.campaign_id
            WHERE r.tenant_id = %s
            ORDER BY r.customer_id, r.created_at
            """,
            (tenant_id,),
        )
        rows = cur.fetchall()

    by_customer: dict[int, dict] = defaultdict(lambda: {
        "touchpoints": [], "converted_at": None, "total_value": 0.0,
        "channels_seen": set(),
    })
    for r in rows:
        cust = by_customer[r["customer_id"]]
        cust["touchpoints"].append({
            "id": r["id"],
            "campaign_id": r["campaign_id"],
            "campaign_name": r["campaign_name"],
            "channel": r["channel"],
            "status": r["status"],
            "outcome_score": float(r["outcome_score"] or 0),
            "created_at": r["created_at"],
            "completed_at": r["completed_at"],
        })
        cust["channels_seen"].add(r["channel"])
        if r["status"] == "converted" and not cust["converted_at"]:
            cust["converted_at"] = r["completed_at"] or r["created_at"]
            cust["total_value"] += float(r["outcome_score"] or 1.0) * value_per_outcome

    # Filter to customers with at least one conversion (per §57.7)
    return {cid: data for cid, data in by_customer.items() if data["converted_at"]}


# ─── 5 Attribution models ──────────────────────────────────────
def _attr_last_touch(touchpoints: list, total_value: float) -> dict[int, float]:
    if not touchpoints:
        return {}
    last = touchpoints[-1]
    return {last["campaign_id"]: total_value}


def _attr_first_touch(touchpoints: list, total_value: float) -> dict[int, float]:
    if not touchpoints:
        return {}
    first = touchpoints[0]
    return {first["campaign_id"]: total_value}


def _attr_linear(touchpoints: list, total_value: float) -> dict[int, float]:
    if not touchpoints:
        return {}
    per_touch = total_value / len(touchpoints)
    out: dict[int, float] = defaultdict(float)
    for tp in touchpoints:
        out[tp["campaign_id"]] += per_touch
    return dict(out)


def _attr_time_decay(touchpoints: list, total_value: float,
                       conv_at: Optional[datetime] = None,
                       half_life_days: float = 7.0) -> dict[int, float]:
    if not touchpoints or not conv_at:
        return _attr_linear(touchpoints, total_value)
    # Weight = 2^(-days_before / half_life)
    weights: list[float] = []
    for tp in touchpoints:
        ts = tp["created_at"]
        if ts is None:
            weights.append(1.0)
            continue
        days_before = max((conv_at - ts).total_seconds() / 86400.0, 0.0)
        weights.append(2 ** (-days_before / half_life_days))
    total_w = sum(weights) or 1.0
    out: dict[int, float] = defaultdict(float)
    for tp, w in zip(touchpoints, weights):
        out[tp["campaign_id"]] += total_value * (w / total_w)
    return dict(out)


def _attr_position_based(touchpoints: list, total_value: float,
                           first_pct: float = 0.4,
                           last_pct: float = 0.4) -> dict[int, float]:
    if not touchpoints:
        return {}
    n = len(touchpoints)
    if n == 1:
        return {touchpoints[0]["campaign_id"]: total_value}
    if n == 2:
        # Split 50/50 across first + last
        out: dict[int, float] = defaultdict(float)
        out[touchpoints[0]["campaign_id"]] += total_value * 0.5
        out[touchpoints[-1]["campaign_id"]] += total_value * 0.5
        return dict(out)
    middle_pct = 1.0 - first_pct - last_pct
    middle_n = n - 2
    per_middle = (total_value * middle_pct) / middle_n if middle_n else 0
    out = defaultdict(float)
    out[touchpoints[0]["campaign_id"]] += total_value * first_pct
    out[touchpoints[-1]["campaign_id"]] += total_value * last_pct
    for tp in touchpoints[1:-1]:
        out[tp["campaign_id"]] += per_middle
    return dict(out)


ATTRIBUTION_MODELS = {
    "last_touch":     _attr_last_touch,
    "first_touch":    _attr_first_touch,
    "linear":         _attr_linear,
    "time_decay":     _attr_time_decay,
    "position_based": _attr_position_based,
}


def compute_attribution(model: str = "linear",
                          tenant_id: str = "default",
                          value_per_outcome: float = DEFAULT_VALUE_PER_OUTCOME) -> dict[str, Any]:
    """Run a single attribution model · returns per-campaign aggregate."""
    if model not in ATTRIBUTION_MODELS:
        raise ValueError(f"unknown model: {model} · choices={list(ATTRIBUTION_MODELS)}")
    journeys = _load_touchpoints(tenant_id, value_per_outcome)

    fn = ATTRIBUTION_MODELS[model]
    per_campaign: dict[int, float] = defaultdict(float)
    cohort_dist: dict[str, int] = defaultdict(int)
    per_channel: dict[str, float] = defaultdict(float)
    total_attributed = 0.0
    n_journeys = 0

    for cid, data in journeys.items():
        touchpoints = data["touchpoints"]
        total_value = data["total_value"]
        if not total_value:
            continue
        n_journeys += 1
        # Cohort fingerprint (e.g. 'email→survey→form')
        cohort = "→".join(sorted(set(tp["channel"] for tp in touchpoints)))
        cohort_dist[cohort] += 1
        # Call the model
        if model == "time_decay":
            attr = fn(touchpoints, total_value, data["converted_at"])
        else:
            attr = fn(touchpoints, total_value)
        for campaign_id, value in attr.items():
            per_campaign[campaign_id] += value
            total_attributed += value
        for tp in touchpoints:
            # For channel rollup · share each touchpoint's attributed value
            ch_share = attr.get(tp["campaign_id"], 0.0) / max(
                len([t for t in touchpoints if t["campaign_id"] == tp["campaign_id"]]), 1,
            )
            per_channel[tp["channel"]] += ch_share

    return {
        "model": model,
        "value_per_outcome": value_per_outcome,
        "tenant_id": tenant_id,
        "n_journeys": n_journeys,
        "total_attributed": round(total_attributed, 2),
        "per_campaign": {str(k): round(v, 2) for k, v in per_campaign.items()},
        "per_channel": {k: round(v, 2) for k, v in per_channel.items()},
        "journey_cohort_distribution": dict(cohort_dist),
    }


def compare_models(tenant_id: str = "default") -> dict[str, Any]:
    """Run all 5 models · return per-campaign per-model matrix for operator
    diff-style comparison."""
    out = {}
    for model in ATTRIBUTION_MODELS:
        out[model] = compute_attribution(model, tenant_id)
    return {"models": list(ATTRIBUTION_MODELS), "results": out}


def list_touchpoints(tenant_id: str = "default", limit: int = 100) -> list[dict]:
    """Read-only · raw touchpoint feed for operator inspection."""
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            SELECT r.id, r.customer_id, r.campaign_id, r.status, r.outcome_score,
                   r.created_at, r.completed_at,
                   c.channel, c.name AS campaign_name
            FROM marketing_campaign_runs r
            JOIN marketing_campaigns c ON c.id = r.campaign_id
            WHERE r.tenant_id = %s
            ORDER BY r.created_at DESC LIMIT %s
            """,
            (tenant_id, limit),
        )
        rows = cur.fetchall()
    out = []
    for r in rows:
        d = dict(r)
        for k in ("created_at", "completed_at"):
            if d.get(k):
                d[k] = d[k].isoformat()
        if d.get("outcome_score") is not None:
            d["outcome_score"] = float(d["outcome_score"])
        out.append(d)
    return out
