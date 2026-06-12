"""/api/v1/hitl/* — Human-in-the-Loop queue · Tier 7 gate #3.

Reads pending decisions from autonomous_agent_runs where routing
== 'human_approval' or 'manual_processing' (from T7.9 confidence routing).

Per §57.7 honest: returns empty when no decisions need human review ·
NEVER fabricates queue entries.
"""
from __future__ import annotations

import json
import logging

import psycopg2
import psycopg2.extras
from fastapi import APIRouter, Request

from core.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/hitl", tags=["hitl"])


def _conn():
    return psycopg2.connect(get_settings().database_url)


@router.get("/health")
def health():
    return {
        "status": "ok",
        "module": "hitl",
        "spec": "§38.3 + §40 + T7.9 + Tier 7 gate #3",
    }


@router.get("/queue")
def get_queue(
    request: Request,
    tier: str | None = None,
    limit: int = 50,
):
    """Pending decisions awaiting human review.

    Pulls from autonomous_agent_runs where decisions contain
    routing == 'human_approval' or 'manual_processing'.
    """
    try:
        with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT run_ref, status, decisions, fairness_di, rai_pass,
                       started_at, halt_reason
                FROM autonomous_agent_runs
                WHERE tenant_id = %s
                ORDER BY id DESC LIMIT %s
                """,
                ("default", limit * 4),  # over-fetch · filter below
            )
            runs = cur.fetchall()
    except Exception as e:
        logger.warning("HITL queue query failed: %s", e)
        return {
            "queue": [],
            "count": 0,
            "tier_filter": tier,
            "runtime_available": False,
            "reason": f"DB query failed: {type(e).__name__}",
        }

    # Filter to decisions needing human review
    pending = []
    for r in runs:
        decisions = r["decisions"] if isinstance(r["decisions"], list) else (
            json.loads(r["decisions"]) if r["decisions"] else []
        )
        for d in decisions:
            routing = d.get("routing")
            if routing in ("human_approval", "manual_processing"):
                if tier and routing != tier:
                    continue
                pending.append({
                    "run_ref": r["run_ref"],
                    "decision_iter": d.get("iteration"),
                    "action": d.get("action"),
                    "confidence": d.get("confidence"),
                    "routing": routing,
                    "reasoning": d.get("reasoning"),
                    "timestamp": d.get("timestamp"),
                    "fairness_di": float(r["fairness_di"]) if r["fairness_di"] else None,
                    "rai_pass": r["rai_pass"],
                    "run_status": r["status"],
                })
                if len(pending) >= limit:
                    break
        if len(pending) >= limit:
            break

    # Aggregate counts by routing tier
    by_tier = {}
    for p in pending:
        by_tier[p["routing"]] = by_tier.get(p["routing"], 0) + 1

    return {
        "queue": pending,
        "count": len(pending),
        "by_tier": by_tier,
        "tier_filter": tier,
        "runtime_available": True,
    }


@router.get("/stats")
def stats(request: Request):
    """Aggregate HITL stats · count by routing tier · overall queue size."""
    try:
        with _conn() as c, c.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM autonomous_agent_runs WHERE tenant_id = %s",
                ("default",),
            )
            total_runs = cur.fetchone()[0]
    except Exception as e:
        return {
            "total_runs": 0,
            "runtime_available": False,
            "reason": f"DB query failed: {type(e).__name__}",
        }

    # Fetch queue + count
    q = get_queue(request, limit=200)  # type: ignore
    return {
        "total_runs": total_runs,
        "queue_size": q["count"],
        "by_tier": q.get("by_tier", {}),
        "runtime_available": True,
    }
