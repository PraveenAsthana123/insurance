"""/api/v1/naming-policy + /api/v1/release-gate · Iter 70 · §101 final."""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras
from fastapi import APIRouter
from pydantic import BaseModel

from core.config import get_settings

router = APIRouter(tags=["release-gate"])


def _conn():
    return psycopg2.connect(get_settings().database_url)


# ─────────────────────────────────────────────────────────────────────
# Naming gate (§101.A.1)

@router.get("/api/v1/naming-policy")
def naming_policies():
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM naming_policy WHERE status='active' ORDER BY policy_id")
        rows = [dict(r) for r in cur.fetchall()]
    return {"policies": rows, "count": len(rows)}


class NamingValidate(BaseModel):
    name: str
    policy_id: str = "naming-namespace"


@router.post("/api/v1/naming-policy/validate")
def validate_name(body: NamingValidate):
    """Check a candidate name against the named policy regex."""
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM naming_policy WHERE policy_id=%s",
                    (body.policy_id,))
        p = cur.fetchone()
    if not p:
        return {"valid": False, "error": f"unknown policy_id: {body.policy_id}"}
    p = dict(p)
    try:
        matched = bool(re.match(p["pattern_regex"], body.name))
    except re.error as e:
        return {"valid": False, "error": f"regex error: {e}"}
    return {
        "valid": matched,
        "name": body.name,
        "policy_id": p["policy_id"],
        "pattern_name": p["pattern_name"],
        "pattern": p["pattern_regex"],
        "example_good": p["example_good"],
        "example_bad": p["example_bad"],
    }


@router.post("/api/v1/naming-policy/scan")
def scan_codebase_names():
    """Scan agent_registry agent_ids against naming-agent policy · returns violations."""
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT pattern_regex FROM naming_policy WHERE policy_id='naming-agent'")
        p = cur.fetchone()
        if not p:
            return {"error": "naming-agent policy missing"}
        pat = re.compile(p["pattern_regex"])
        cur.execute("SELECT agent_id FROM agent_registry WHERE status='Active'")
        ids = [r["agent_id"] for r in cur.fetchall()]
    violations = [aid for aid in ids if not pat.match(aid)]
    return {
        "total_agents": len(ids),
        "violations": violations,
        "n_violations": len(violations),
        "compliance_pct": round(100 * (len(ids) - len(violations)) / max(len(ids), 1), 1),
    }


# ─────────────────────────────────────────────────────────────────────
# Release env-gate (§101.A.15)

@router.get("/api/v1/release-gate/environments")
def list_environments():
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM release_environment ORDER BY env_order")
        rows = [dict(r) for r in cur.fetchall()]
    return {"environments": rows, "count": len(rows)}


class PromoteRequest(BaseModel):
    artifact_name: str
    artifact_version: str
    from_env: str
    requested_by: str = "operator"
    notes: str | None = None


@router.post("/api/v1/release-gate/promote")
def request_promotion(body: PromoteRequest):
    """Create a promotion request · status=pending until approved."""
    with _conn() as c, c.cursor() as cur:
        cur.execute("""
            SELECT promotion_target, requires_approval, approver_role
            FROM release_environment WHERE env_id=%s
        """, (body.from_env,))
        row = cur.fetchone()
        if not row:
            return {"error": f"unknown environment: {body.from_env}"}
        to_env, requires_approval, approver_role = row
        if not to_env:
            return {"error": f"{body.from_env} has no next env (terminal)"}
        pid = f"PROM-{uuid.uuid4().hex[:10].upper()}"
        cur.execute("""
            INSERT INTO release_promotion
              (promotion_id, artifact_name, artifact_version, from_env, to_env,
               status, requested_by, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (pid, body.artifact_name, body.artifact_version,
              body.from_env, to_env,
              "pending" if requires_approval else "approved",
              body.requested_by, body.notes))
    return {
        "promotion_id": pid,
        "from_env": body.from_env, "to_env": to_env,
        "requires_approval": requires_approval,
        "approver_role": approver_role,
        "status": "pending" if requires_approval else "approved",
    }


class ApproveRequest(BaseModel):
    promotion_id: str
    approved_by: str = "operator"
    decision: str = "approved"  # or rejected
    notes: str | None = None


@router.post("/api/v1/release-gate/approve")
def approve_promotion(body: ApproveRequest):
    if body.decision not in ("approved", "rejected"):
        return {"error": "decision must be 'approved' or 'rejected'"}
    with _conn() as c, c.cursor() as cur:
        cur.execute("""
            UPDATE release_promotion
            SET status=%s, approved_by=%s, approved_at=CURRENT_TIMESTAMP,
                notes=COALESCE(notes,'') || COALESCE(' · ' || %s, '')
            WHERE promotion_id=%s AND status='pending'
            RETURNING promotion_id, status, to_env
        """, (body.decision, body.approved_by, body.notes, body.promotion_id))
        row = cur.fetchone()
        if not row:
            return {"error": "promotion not found or not pending"}
    return {"promotion_id": row[0], "status": row[1], "to_env": row[2],
            "decided_at": datetime.now(timezone.utc).isoformat()}


@router.get("/api/v1/release-gate/promotions")
def list_promotions(status: str | None = None, limit: int = 50):
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        if status:
            cur.execute("""
                SELECT * FROM release_promotion WHERE status=%s
                ORDER BY created_at DESC LIMIT %s
            """, (status, limit))
        else:
            cur.execute("""
                SELECT * FROM release_promotion ORDER BY created_at DESC LIMIT %s
            """, (limit,))
        rows = [dict(r) for r in cur.fetchall()]
    return {"promotions": rows, "count": len(rows)}


@router.get("/api/v1/release-gate/health")
def health():
    with _conn() as c, c.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM release_environment")
        n_env = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM naming_policy WHERE status='active'")
        n_pol = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM release_promotion")
        n_prom = cur.fetchone()[0]
    return {
        "status": "ok", "module": "release-gate",
        "environments": n_env, "naming_policies": n_pol,
        "promotions_total": n_prom,
        "spec": "§101.A.1 + §101.A.15 · final 2 partials of Iter 61",
    }
