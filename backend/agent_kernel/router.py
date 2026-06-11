"""/api/v1/agent-kernel/* · Iter 103 · OS-for-agents.

5 engines:
  1. LIFECYCLE  · created → scheduled → running → shutdown/failed/retried/retired
  2. IDENTITY   · credentials + scopes + revocation
  3. WORKFLOW   · references §97/§115/§117 workflow patterns
  4. MEMORY     · short-term / long-term / episodic / semantic
  5. TRUST      · 0.00-1.00 score · feeds §103.5 governance

State transitions per §103.5 governance · audited via §107 stamp.
"""
from __future__ import annotations
import json
import time
import uuid
from datetime import datetime, timezone, timedelta

import psycopg2
import psycopg2.extras
from fastapi import APIRouter, Query
from pydantic import BaseModel

from _adapter_helpers import stamp, conn

router = APIRouter(prefix="/api/v1/agent-kernel", tags=["agent-kernel"])


VALID_STATES = ("created", "scheduled", "running", "shutdown",
                "failed", "retrying", "retired", "suspended")
ALLOWED_TRANSITIONS = {
    None:         ["created"],
    "created":    ["scheduled", "shutdown", "retired"],
    "scheduled":  ["running", "shutdown", "failed"],
    "running":    ["shutdown", "failed", "suspended"],
    "failed":     ["retrying", "retired"],
    "retrying":   ["scheduled", "running", "failed"],
    "shutdown":   ["scheduled", "retired"],
    "suspended":  ["running", "shutdown", "retired"],
    "retired":    [],
}


def _current_state(agent_id: str):
    with conn() as c, c.cursor() as cur:
        cur.execute("""
            SELECT state FROM agent_lifecycle_state
            WHERE agent_id=%s ORDER BY entered_at DESC LIMIT 1
        """, (agent_id,))
        r = cur.fetchone()
        return r[0] if r else None


def _transition(agent_id: str, new_state: str, reason: str = ""):
    cur = _current_state(agent_id)
    if new_state not in ALLOWED_TRANSITIONS.get(cur, []):
        return {"ok": False, "reason": f"invalid_transition {cur} → {new_state}",
                "allowed_from_current": ALLOWED_TRANSITIONS.get(cur, [])}
    s = stamp()
    correlation = f"KRN-{uuid.uuid4().hex[:10].upper()}"
    with conn() as c, c.cursor() as cur_db:
        cur_db.execute("""
            INSERT INTO agent_lifecycle_state
              (agent_id, state, prior_state, reason, actor_user, actor_host,
               correlation_id, entered_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
            RETURNING state_id, entered_at
        """, (agent_id, new_state, cur, reason[:500],
              s["actor_user"], s["actor_host"], correlation))
        sid, when = cur_db.fetchone()
    return {"ok": True, "agent_id": agent_id, "prior_state": cur,
            "new_state": new_state, "state_id": sid,
            "transition_at": when.astimezone().isoformat(),
            "correlation_id": correlation, **s}


# ──────────────── LIFECYCLE ────────────────
class LifecycleBody(BaseModel):
    reason: str = ""


@router.post("/agents/{agent_id}/create")
def create_agent(agent_id: str, body: LifecycleBody):
    """Engine 1 (Lifecycle) · agent enters CREATED state."""
    return _transition(agent_id, "created", body.reason or "agent created by operator")


@router.post("/agents/{agent_id}/schedule")
def schedule_agent(agent_id: str, body: LifecycleBody):
    return _transition(agent_id, "scheduled", body.reason or "scheduled for next pickup")


@router.post("/agents/{agent_id}/run")
def run_agent(agent_id: str, body: LifecycleBody):
    return _transition(agent_id, "running", body.reason or "execution started")


@router.post("/agents/{agent_id}/shutdown")
def shutdown_agent(agent_id: str, body: LifecycleBody):
    return _transition(agent_id, "shutdown", body.reason or "shutdown requested")


@router.post("/agents/{agent_id}/fail")
def fail_agent(agent_id: str, body: LifecycleBody):
    return _transition(agent_id, "failed", body.reason or "execution failed")


@router.post("/agents/{agent_id}/retry")
def retry_agent(agent_id: str, body: LifecycleBody):
    return _transition(agent_id, "retrying", body.reason or "retry triggered")


@router.post("/agents/{agent_id}/retire")
def retire_agent(agent_id: str, body: LifecycleBody):
    return _transition(agent_id, "retired", body.reason or "permanently retired")


@router.get("/agents/{agent_id}/lifecycle")
def get_lifecycle(agent_id: str, limit: int = Query(20, le=100)):
    with conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT state_id, agent_id, state, prior_state, reason,
                   actor_user, actor_host, entered_at, correlation_id
            FROM agent_lifecycle_state WHERE agent_id=%s
            ORDER BY entered_at DESC LIMIT %s
        """, (agent_id, limit))
        rows = [dict(r) for r in cur.fetchall()]
    return {**stamp(), "agent_id": agent_id,
            "current_state": rows[0]["state"] if rows else None,
            "history": rows,
            "allowed_next": ALLOWED_TRANSITIONS.get(
                rows[0]["state"] if rows else None, []),
            "spec": "§121 Engine 1 · Lifecycle"}


# ──────────────── IDENTITY ────────────────
class IssueIdentityBody(BaseModel):
    scopes: list[str] = []
    valid_hours: int = 24


@router.post("/agents/{agent_id}/identity/issue")
def issue_identity(agent_id: str, body: IssueIdentityBody):
    """Engine 2 (Identity) · issue credential with scopes."""
    cred_id = f"CRED-{uuid.uuid4().hex[:12].upper()}"
    s = stamp()
    expires = datetime.now(timezone.utc) + timedelta(hours=body.valid_hours)
    pk_sha = uuid.uuid4().hex  # placeholder · real impl signs
    with conn() as c, c.cursor() as cur:
        cur.execute("""
            INSERT INTO agent_identity_credential
              (credential_id, agent_id, public_key_sha, scopes,
               issued_by, expires_at)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (cred_id, agent_id, pk_sha, body.scopes,
              s["actor_user"], expires))
    return {**s, "credential_id": cred_id, "agent_id": agent_id,
            "scopes": body.scopes, "expires_at": expires.isoformat(),
            "valid_hours": body.valid_hours,
            "spec": "§121 Engine 2 · Identity"}


@router.post("/agents/{agent_id}/identity/revoke")
def revoke_identity(agent_id: str, reason: str = "operator revoked"):
    with conn() as c, c.cursor() as cur:
        cur.execute("""
            UPDATE agent_identity_credential
            SET revoked_at=NOW(), revoked_reason=%s
            WHERE agent_id=%s AND revoked_at IS NULL
            RETURNING credential_id
        """, (reason, agent_id))
        revoked = [r[0] for r in cur.fetchall()]
    return {**stamp(), "agent_id": agent_id, "revoked": revoked,
            "n_revoked": len(revoked)}


@router.get("/agents/{agent_id}/identity")
def get_identity(agent_id: str):
    with conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT credential_id, scopes, issued_by, issued_at,
                   expires_at, revoked_at, revoked_reason,
                   (revoked_at IS NULL AND expires_at > NOW()) AS is_valid
            FROM agent_identity_credential
            WHERE agent_id=%s ORDER BY issued_at DESC LIMIT 10
        """, (agent_id,))
        creds = [dict(r) for r in cur.fetchall()]
    return {**stamp(), "agent_id": agent_id, "credentials": creds,
            "active_count": sum(1 for c in creds if c["is_valid"]),
            "spec": "§121 Engine 2 · Identity"}


# ──────────────── WORKFLOW (refs §97/§115/§117) ────────────────
WORKFLOW_ENGINES = [
    {"id": "goal_loop",       "policy": "§115", "type": "4-phase loop",
     "endpoint": "POST /api/v1/goal-loop/start"},
    {"id": "orchestra",       "policy": "§117", "type": "5-role hand-off",
     "endpoint": "POST /api/v1/orchestra/run"},
    {"id": "council",         "policy": "§97",  "type": "3-stage author/reviewer/chair",
     "endpoint": "POST /api/v1/council/deliberate"},
    {"id": "autonomous_loop", "policy": "§103.8", "type": "8-self-* blueprint",
     "endpoint": "POST /api/v1/autonomous-loop/run"},
    {"id": "production_pipeline", "policy": "§103", "type": "22-stage linear",
     "endpoint": "POST /api/v1/production-pipeline/run"},
]


@router.get("/workflow-engine/list")
def list_workflows():
    return {**stamp(), "engines": WORKFLOW_ENGINES, "count": len(WORKFLOW_ENGINES),
            "spec": "§121 Engine 3 · Workflow · references existing §97/§115/§117"}


@router.get("/workflow-engine/health")
def workflow_health():
    return {**stamp(), "engine": "workflow", "patterns": len(WORKFLOW_ENGINES),
            "kernel_policy": "§121"}


# ──────────────── MEMORY ────────────────
class MemoryWriteBody(BaseModel):
    content: str
    kind: str = "short_term"
    ttl_hours: int = 24


@router.post("/agents/{agent_id}/memory/write")
def memory_write(agent_id: str, body: MemoryWriteBody):
    """Engine 4 (Memory) · write to agent's memory."""
    s = stamp()
    expires = (datetime.now(timezone.utc) + timedelta(hours=body.ttl_hours)
               if body.ttl_hours > 0 else None)
    correlation = f"MEM-{uuid.uuid4().hex[:10].upper()}"
    with conn() as c, c.cursor() as cur:
        cur.execute("""
            INSERT INTO agent_memory_blob
              (agent_id, memory_kind, content_text, expires_at, correlation_id)
            VALUES (%s, %s, %s, %s, %s) RETURNING memory_id
        """, (agent_id, body.kind, body.content[:5000], expires, correlation))
        mid = cur.fetchone()[0]
    return {**s, "memory_id": mid, "agent_id": agent_id,
            "kind": body.kind, "correlation_id": correlation,
            "expires_at": expires.isoformat() if expires else "never",
            "spec": "§121 Engine 4 · Memory"}


@router.get("/agents/{agent_id}/memory")
def memory_read(agent_id: str, kind: str = Query("any"),
                 limit: int = Query(20, le=100)):
    sql = """
        SELECT memory_id, memory_kind, content_text, ts_local,
               expires_at, correlation_id
        FROM agent_memory_blob
        WHERE agent_id=%s
          AND (expires_at IS NULL OR expires_at > NOW())
    """
    params = [agent_id]
    if kind != "any":
        sql += " AND memory_kind=%s"
        params.append(kind)
    sql += " ORDER BY ts_local DESC LIMIT %s"
    params.append(limit)
    with conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(sql, tuple(params))
        rows = [dict(r) for r in cur.fetchall()]
    return {**stamp(), "agent_id": agent_id, "count": len(rows),
            "memories": rows}


# ──────────────── TRUST ────────────────
@router.get("/agents/{agent_id}/trust")
def get_trust(agent_id: str):
    """Engine 5 (Trust) · compute live trust score from agent_invocation history."""
    with conn() as c, c.cursor() as cur:
        cur.execute("""
            SELECT
              COUNT(*) FILTER (WHERE status='Success') AS ok,
              COUNT(*) FILTER (WHERE status IN ('Failed','PartialFailure')) AS bad,
              COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS recent_count,
              MAX(created_at) FILTER (WHERE status IN ('Failed','PartialFailure')) AS last_failure
            FROM agent_invocation WHERE agent_id=%s
        """, (agent_id,))
        ok, bad, recent, last_fail = cur.fetchone()
        ok = ok or 0; bad = bad or 0; recent = recent or 0
        total = ok + bad
        if total == 0:
            score = 0.50  # neutral · no history
        else:
            base = ok / total
            # Recency penalty if recent failure
            if last_fail:
                hours_since = (datetime.now(timezone.utc) -
                               last_fail).total_seconds() / 3600
                penalty = max(0, 0.20 - hours_since * 0.01)
                base -= penalty
            score = max(0.00, min(1.00, base))

        # Store snapshot
        cur.execute("""
            INSERT INTO agent_trust_score
              (agent_id, trust_score, successful_runs, failed_runs)
            VALUES (%s, %s, %s, %s)
        """, (agent_id, round(score, 2), ok, bad))

    band = ("HIGH" if score >= 0.80 else "MEDIUM" if score >= 0.60
            else "LOW" if score >= 0.30 else "REVOKE")
    return {**stamp(), "agent_id": agent_id,
            "trust_score": round(score, 2), "band": band,
            "successful_runs": ok, "failed_runs": bad,
            "recent_24h": recent,
            "last_failure_at": last_fail.astimezone().isoformat() if last_fail else None,
            "policy": "§121 Engine 5 · Trust · feeds §103.5 governance",
            "auto_decision_allowed": score >= 0.60,
            "human_required": score < 0.30}


# ──────────────── HEALTH ────────────────
@router.get("/health")
def health():
    return {**stamp(),
            "engines": {
                "lifecycle": "live · 7 states + 1 suspended · §103.5 transitions",
                "identity":  "live · cred issue/revoke · scopes · expiry",
                "workflow":  f"live · {len(WORKFLOW_ENGINES)} patterns registered",
                "memory":    "live · short/long/episodic/semantic kinds",
                "trust":     "live · 0.00-1.00 · auto/human gates",
            },
            "policy": "§121 Agent Kernel",
            "valid_states": list(VALID_STATES),
            "lifecycle_diagram": ("created → scheduled → running → "
                                   "shutdown/failed → retrying → retired")}


@router.get("/overview")
def overview():
    """Cross-engine summary across all agents."""
    with conn() as c, c.cursor() as cur:
        cur.execute("""
            SELECT state, COUNT(DISTINCT agent_id) AS n
            FROM (
              SELECT DISTINCT ON (agent_id) agent_id, state
              FROM agent_lifecycle_state ORDER BY agent_id, entered_at DESC
            ) t GROUP BY state ORDER BY n DESC
        """)
        states = [{"state": r[0], "n_agents": r[1]} for r in cur.fetchall()]

        cur.execute("SELECT COUNT(*) FROM agent_identity_credential WHERE revoked_at IS NULL AND expires_at > NOW()")
        active_creds = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM agent_memory_blob WHERE expires_at IS NULL OR expires_at > NOW()")
        live_memories = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*), AVG(trust_score) FROM agent_trust_score")
        n_trust, avg_trust = cur.fetchone()
    return {**stamp(),
            "lifecycle_by_state": states,
            "active_credentials": active_creds,
            "live_memories": live_memories,
            "trust_snapshots": n_trust,
            "avg_trust_score": float(avg_trust) if avg_trust else 0.0,
            "policy": "§121 Agent Kernel cross-engine view"}
