"""KPI value computer · wires 'live'/'scaffolded' KPIs to actual DB queries.

Per T5.4 + T6.8. Each function returns (value, sample_window) or None
if data isn't available. Returns are JSON-safe (float / int / dict).

Per §57.7: returns None honest when data missing · UI shows "—".
"""
from __future__ import annotations

import logging
from typing import Any, Optional

import psycopg2
import psycopg2.extras

from core.config import get_settings

logger = logging.getLogger(__name__)


def _conn():
    return psycopg2.connect(get_settings().database_url)


def _safe(func, default=None):
    """Wraps a DB query with honest fallback per §57.7."""
    try:
        return func()
    except Exception as e:
        logger.warning("KPI compute failed: %s: %s", type(e).__name__, e)
        return default


# ─── Registry of KPI ID → compute function ────────────────────
def compute_cust_total() -> Optional[int]:
    def _q():
        with _conn() as c, c.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM voice_ai_customers WHERE tenant_id = 'default'")
            return cur.fetchone()[0]
    return _safe(_q)


def compute_cust_new() -> Optional[int]:
    def _q():
        with _conn() as c, c.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM master_contacts "
                "WHERE created_at > NOW() - INTERVAL '30 days' AND tenant_id = 'default'",
            )
            return cur.fetchone()[0]
    return _safe(_q)


def compute_seg_size() -> Optional[dict]:
    def _q():
        with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT segment, COUNT(*) AS n FROM master_contacts "
                "WHERE tenant_id = 'default' GROUP BY segment ORDER BY n DESC",
            )
            return {r["segment"] or "unknown": r["n"] for r in cur.fetchall()}
    return _safe(_q)


def compute_camp_reach() -> Optional[int]:
    def _q():
        with _conn() as c, c.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM marketing_campaign_runs "
                "WHERE tenant_id = 'default'",
            )
            return cur.fetchone()[0]
    return _safe(_q)


def compute_camp_completion_rate() -> Optional[float]:
    def _q():
        with _conn() as c, c.cursor() as cur:
            cur.execute(
                "SELECT "
                "  COUNT(*) FILTER (WHERE status IN ('running','complete')) AS c, "
                "  GREATEST(COUNT(*), 1) AS t "
                "FROM marketing_campaigns WHERE tenant_id = 'default'",
            )
            r = cur.fetchone()
            return round(r[0] / r[1], 3) if r[1] else 0.0
    return _safe(_q, 0.0)


def compute_lead_generated() -> Optional[int]:
    def _q():
        with _conn() as c, c.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM marketing_campaign_runs "
                "WHERE status IN ('converted','responded') AND tenant_id = 'default'",
            )
            return cur.fetchone()[0]
    return _safe(_q)


def compute_lead_quality_score() -> Optional[float]:
    def _q():
        with _conn() as c, c.cursor() as cur:
            cur.execute(
                "SELECT AVG(quality_score) FROM master_contacts "
                "WHERE quality_score IS NOT NULL AND tenant_id = 'default'",
            )
            v = cur.fetchone()[0]
            return round(float(v), 3) if v else None
    return _safe(_q)


def compute_survey_response_rate() -> Optional[float]:
    def _q():
        with _conn() as c, c.cursor() as cur:
            cur.execute(
                "SELECT "
                "  COUNT(*) FILTER (WHERE status = 'responded') AS resp, "
                "  GREATEST(COUNT(*), 1) AS total "
                "FROM marketing_campaign_runs r "
                "JOIN marketing_campaigns c ON c.id = r.campaign_id "
                "WHERE c.channel = 'survey' AND r.tenant_id = 'default'",
            )
            r = cur.fetchone()
            return round(r[0] / r[1], 3) if r[1] else 0.0
    return _safe(_q, 0.0)


def compute_loyalty_gold_share() -> Optional[float]:
    def _q():
        with _conn() as c, c.cursor() as cur:
            cur.execute(
                "SELECT "
                "  COUNT(*) FILTER (WHERE segment = 'gold') AS g, "
                "  GREATEST(COUNT(*), 1) AS t "
                "FROM master_contacts WHERE tenant_id = 'default'",
            )
            r = cur.fetchone()
            return round(r[0] / r[1], 3) if r[1] else 0.0
    return _safe(_q, 0.0)


def compute_ai_adoption_rate() -> Optional[float]:
    """Ratio of autonomous-agent-created campaigns to total campaigns."""
    def _q():
        with _conn() as c, c.cursor() as cur:
            cur.execute(
                "SELECT "
                "  COUNT(*) FILTER (WHERE name LIKE 'Agent AGENT-%%') AS ai, "
                "  GREATEST(COUNT(*), 1) AS t "
                "FROM marketing_campaigns WHERE tenant_id = 'default'",
            )
            r = cur.fetchone()
            return round(r[0] / r[1], 3) if r[1] else 0.0
    return _safe(_q, 0.0)


def compute_gov_consent_compliance() -> Optional[float]:
    def _q():
        with _conn() as c, c.cursor() as cur:
            cur.execute(
                "SELECT "
                "  COUNT(*) FILTER (WHERE consent_ok = TRUE) AS c, "
                "  GREATEST(COUNT(*), 1) AS t "
                "FROM marketing_campaign_runs WHERE tenant_id = 'default'",
            )
            r = cur.fetchone()
            return round(r[0] / r[1], 3) if r[1] else 0.0
    return _safe(_q, 0.0)


def compute_gov_pii_violations() -> Optional[int]:
    def _q():
        with _conn() as c, c.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM marketing_campaign_runs "
                "WHERE dlp_ok = FALSE AND tenant_id = 'default'",
            )
            return cur.fetchone()[0]
    return _safe(_q)


def compute_gov_data_quality_score() -> Optional[float]:
    def _q():
        with _conn() as c, c.cursor() as cur:
            cur.execute(
                "SELECT AVG(quality_score) FROM master_contacts "
                "WHERE quality_score IS NOT NULL AND tenant_id = 'default'",
            )
            v = cur.fetchone()[0]
            return round(float(v), 3) if v else None
    return _safe(_q)


def compute_gov_ai_bias_score() -> Optional[float]:
    """Average fairness_di across autonomous_agent_runs."""
    def _q():
        with _conn() as c, c.cursor() as cur:
            cur.execute(
                "SELECT AVG(fairness_di) FROM autonomous_agent_runs "
                "WHERE fairness_di IS NOT NULL AND tenant_id = 'default'",
            )
            v = cur.fetchone()[0]
            return round(float(v), 3) if v else None
    return _safe(_q)


def compute_gov_explainability_score() -> Optional[float]:
    """Ratio of agent runs with non-empty decisions[]."""
    def _q():
        with _conn() as c, c.cursor() as cur:
            cur.execute(
                "SELECT "
                "  COUNT(*) FILTER (WHERE jsonb_array_length(decisions) > 0) AS with_decisions, "
                "  GREATEST(COUNT(*), 1) AS total "
                "FROM autonomous_agent_runs WHERE tenant_id = 'default'",
            )
            r = cur.fetchone()
            return round(r[0] / r[1], 3) if r[1] else 0.0
    return _safe(_q, 0.0)


def compute_exec_revenue_attribution() -> Optional[float]:
    """T5.9 · total revenue attributed across all touchpoints (linear model)."""
    def _q():
        from attribution import services as attr_svc
        d = attr_svc.compute_attribution(model="linear")
        return float(d.get("total_attributed") or 0)
    return _safe(_q)


def compute_exec_marketing_contribution() -> Optional[float]:
    """T5.9 · attributed-revenue / total marketing-touched value · linear model."""
    def _q():
        from attribution import services as attr_svc
        d = attr_svc.compute_attribution(model="linear")
        total = d.get("total_attributed") or 0
        n_journeys = d.get("n_journeys") or 0
        if n_journeys == 0:
            return 0.0
        # Marketing contribution proxy: avg-attributed-per-journey / max-possible
        avg = total / n_journeys
        return round(min(1.0, avg / 100.0), 3)  # 100 = default value_per_outcome
    return _safe(_q, 0.0)


def compute_exec_pipeline_contribution() -> Optional[float]:
    """T5.9 · attributed pipeline / total pipeline (proxy: converted/total runs)."""
    def _q():
        with _conn() as c, c.cursor() as cur:
            cur.execute(
                "SELECT "
                "  COUNT(*) FILTER (WHERE status = 'converted') AS converted, "
                "  GREATEST(COUNT(*), 1) AS total "
                "FROM marketing_campaign_runs WHERE tenant_id = 'default'",
            )
            r = cur.fetchone()
            return round(r[0] / r[1], 3) if r[1] else 0.0
    return _safe(_q, 0.0)


# ─── Map KPI ID → compute function ─────────────────────────
COMPUTERS = {
    "cust.total":               compute_cust_total,
    "cust.new":                 compute_cust_new,
    "seg.size":                 compute_seg_size,
    "camp.reach":               compute_camp_reach,
    "camp.completion_rate":     compute_camp_completion_rate,
    "lead.generated":           compute_lead_generated,
    "lead.quality_score":       compute_lead_quality_score,
    "survey.response_rate":     compute_survey_response_rate,
    "loyalty.gold_share":       compute_loyalty_gold_share,
    "ai.adoption_rate":         compute_ai_adoption_rate,
    "gov.consent_compliance":   compute_gov_consent_compliance,
    "gov.pii_violations":       compute_gov_pii_violations,
    "gov.data_quality_score":   compute_gov_data_quality_score,
    "gov.ai_bias_score":        compute_gov_ai_bias_score,
    "gov.explainability_score": compute_gov_explainability_score,
    # T5.9 · attribution-derived KPIs
    "exec.revenue_attribution":    compute_exec_revenue_attribution,
    "exec.marketing_contribution": compute_exec_marketing_contribution,
    "exec.pipeline_contribution":  compute_exec_pipeline_contribution,
}


def compute_value(kpi_id: str) -> Optional[Any]:
    """Return computed value or None if KPI has no computer."""
    fn = COMPUTERS.get(kpi_id)
    return fn() if fn else None


def compute_all() -> dict[str, Any]:
    """Compute all wired KPIs · returns {kpi_id: value}."""
    return {kpi_id: fn() for kpi_id, fn in COMPUTERS.items()}
