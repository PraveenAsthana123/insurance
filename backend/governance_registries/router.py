"""/api/v1/governance-registries/* · Iter 68 · 6 registries + DLQ + kill_switch + ABAC."""
from __future__ import annotations

import json
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras
from fastapi import APIRouter
from pydantic import BaseModel

from core.config import get_settings

router = APIRouter(prefix="/api/v1/governance-registries", tags=["governance-registries"])


def _conn():
    return psycopg2.connect(get_settings().database_url)


def _all(table: str, limit: int = 100) -> list[dict]:
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(f"SELECT * FROM {table} ORDER BY created_at DESC LIMIT %s", (limit,))
        return [dict(r) for r in cur.fetchall()]


# ─────────────────────────────────────────────────────────────────────
# READ endpoints

@router.get("/mcp-registry")
def mcp_registry():
    rows = _all("mcp_server_registry")
    return {"count": len(rows), "servers": rows}


@router.get("/eval-registry")
def eval_registry():
    rows = _all("eval_registry")
    return {"count": len(rows), "evals": rows}


@router.get("/dataset-registry")
def dataset_registry():
    rows = _all("dataset_registry")
    return {"count": len(rows), "datasets": rows}


@router.get("/access-registry")
def access_registry():
    rows = _all("access_registry")
    return {"count": len(rows), "grants": rows}


@router.get("/dlq")
def dead_letter_queue():
    rows = _all("dead_letter_queue")
    return {"count": len(rows), "items": rows}


@router.get("/kill-switches")
def kill_switches():
    rows = _all("kill_switch")
    return {"count": len(rows), "switches": rows}


@router.get("/abac-policies")
def abac_policies():
    rows = _all("abac_policy")
    return {"count": len(rows), "policies": rows}


# ─────────────────────────────────────────────────────────────────────
# Kill-switch toggle

class KillToggle(BaseModel):
    switch_id: str
    target_type: str
    target_id: str
    kill: bool
    by: str | None = "operator"
    reason: str | None = None


@router.post("/kill-switch/toggle")
def kill_toggle(body: KillToggle):
    with _conn() as c, c.cursor() as cur:
        cur.execute("""
            INSERT INTO kill_switch (switch_id, target_type, target_id, is_killed, killed_by, killed_at, reason)
            VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP, %s)
            ON CONFLICT (switch_id) DO UPDATE SET
              is_killed = EXCLUDED.is_killed,
              killed_by = EXCLUDED.killed_by,
              killed_at = CURRENT_TIMESTAMP,
              reason = EXCLUDED.reason
        """, (body.switch_id, body.target_type, body.target_id, body.kill,
              body.by, body.reason))
    return {"switch_id": body.switch_id, "is_killed": body.kill,
            "at": datetime.now(timezone.utc).isoformat()}


# ─────────────────────────────────────────────────────────────────────
# DLQ retry

class DlqRetry(BaseModel):
    dlq_id: int


@router.post("/dlq/retry")
def dlq_retry(body: DlqRetry):
    with _conn() as c, c.cursor() as cur:
        cur.execute("""
            UPDATE dead_letter_queue
            SET status='retrying', retry_count = retry_count + 1,
                next_retry_at = CURRENT_TIMESTAMP + INTERVAL '5 seconds'
            WHERE dlq_id = %s AND retry_count < max_retries
            RETURNING dlq_id, retry_count, max_retries
        """, (body.dlq_id,))
        row = cur.fetchone()
        if not row:
            return {"error": "DLQ item not found or max retries exceeded"}
    return {"dlq_id": row[0], "retry_count": row[1], "max_retries": row[2]}


# ─────────────────────────────────────────────────────────────────────
# ABAC evaluation (simplified · for demonstration)

class AbacRequest(BaseModel):
    user_role: str
    user_tenant: str = "default"
    resource_type: str
    resource_tenant: str = "default"
    resource_pii_classification: str | None = None
    action: str


@router.post("/abac/evaluate")
def abac_evaluate(body: AbacRequest):
    """Simplified ABAC eval · matches operator-provided context against active policies.
    Returns Allow/Deny based on highest-priority matching policy.
    """
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT * FROM abac_policy WHERE status='active'
            ORDER BY priority ASC
        """)
        policies = [dict(r) for r in cur.fetchall()]

    decisions = []
    # Highest-priority matching policy wins
    for p in policies:
        applies = True
        cond = p.get("conditions") or {}
        # Resource pattern match
        if p["resource_pattern"] != "*" and p["resource_pattern"] != body.resource_type:
            applies = False
        # Tenant isolation
        if cond.get("resource.tenant_id != user.tenant_id"):
            if body.user_tenant != body.resource_tenant:
                applies = True
            else:
                applies = False
        # PII restriction
        if "resource.pii_classification" in cond:
            req_pii = cond["resource.pii_classification"]
            if body.resource_pii_classification == req_pii and body.user_role != "Compliance":
                applies = True
            else:
                applies = False
        decisions.append({
            "policy_id": p["policy_id"], "effect": p["effect"],
            "applies": applies, "priority": p["priority"],
        })

    # First applying policy wins
    winner = next((d for d in decisions if d["applies"]), None)
    final = winner["effect"] if winner else "Allow"  # default-allow
    return {
        "decision": final,
        "winning_policy": winner,
        "all_evaluations": decisions,
        "request": body.model_dump(),
    }


# ─────────────────────────────────────────────────────────────────────
# Health · summary across the 7 new tables

@router.get("/health")
def health():
    """Per-registry counts · for §99 coverage."""
    out = {}
    with _conn() as c, c.cursor() as cur:
        for t in ["mcp_server_registry", "eval_registry", "dataset_registry",
                  "access_registry", "dead_letter_queue", "kill_switch",
                  "abac_policy"]:
            cur.execute(f"SELECT COUNT(*) FROM {t}")
            out[t] = cur.fetchone()[0]
        # Check new agents
        cur.execute("""
            SELECT COUNT(*) FROM agent_registry
            WHERE agent_id IN ('sys_router_agent','sys_memory_agent',
                              'sys_cost_agent','sys_compliance_agent')
              AND status='Active'
        """)
        out["new_dedicated_agents"] = cur.fetchone()[0]
    return {
        "status": "ok", "module": "governance-registries",
        "spec": "§99 push to Grade A · 7 new tables + 4 new agents",
        "counts": out,
        "all_present": all(v >= 1 for v in out.values()),
    }
