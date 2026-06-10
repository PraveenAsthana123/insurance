"""/api/v1/agentic-ops/* · Iter 38 · feedback + incident + dep + team + sla + capacity + queue."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

import psycopg2
import psycopg2.extras
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.config import get_settings
from core.role_dependency import require_admin

router = APIRouter(prefix="/api/v1/agentic-ops", tags=["agentic-ops"])


def _conn():
    return psycopg2.connect(get_settings().database_url)


# ──────────────────────────────────────────────────────────────────────
# Pydantic models · one per table

class FeedbackCreate(BaseModel):
    invocation_id: str
    agent_id: str
    user_id: str | None = None
    feedback_type: str = "rating"     # rating/correction/escalation/safety
    rating: int | None = None
    sentiment: str | None = None
    feedback_text: str | None = None
    correction_text: str | None = None
    category: str | None = None
    severity: str = "Low"
    action_required: bool = False
    tenant_id: str = "default"


class IncidentCreate(BaseModel):
    invocation_id: str | None = None
    agent_id: str
    incident_type: str
    severity: str = "P3"
    category: str | None = None
    title: str
    description: str | None = None
    root_cause: str | None = None
    business_impact: str | None = None
    affected_users: int = 0
    affected_systems: list[str] | None = None
    detected_by: str | None = None
    owner_team: str | None = None
    tenant_id: str = "default"


class DependencyCreate(BaseModel):
    agent_id: str
    dependency_type: str             # agent/tool/mcp/model/db/cache/queue/storage
    dependency_name: str
    dependency_category: str | None = None
    criticality: str = "High"        # Critical/High/Medium/Low
    fallback_dependency: str | None = None
    owner_team: str | None = None
    sla_id: str | None = None
    status: str = "Healthy"
    health_score: float | None = None
    tenant_id: str = "default"


class TeamCreate(BaseModel):
    agent_id: str
    business_owner: str | None = None
    technical_owner: str | None = None
    support_team: str | None = None
    platform_team: str | None = None
    security_owner: str | None = None
    compliance_owner: str | None = None
    incident_manager: str | None = None
    release_manager: str | None = None
    escalation_group: str | None = None
    support_model: str = "Business Hours"
    support_hours: str | None = None
    tenant_id: str = "default"


class SLACreate(BaseModel):
    agent_id: str
    sla_name: str
    sla_tier: str = "Tier2"
    availability_target: float = 99.90
    latency_target_ms: int = 5000
    accuracy_target: float = 95.00
    success_rate_target: float = 98.00
    mttr_target_minutes: int = 120
    mtta_target_minutes: int = 15
    max_cost_per_run: float = 0.10
    max_incidents_per_month: int = 5
    support_model: str | None = None
    escalation_policy: str | None = None
    owner_team: str | None = None
    tenant_id: str = "default"


class CapacityCreate(BaseModel):
    agent_id: str
    max_concurrent_requests: int = 50
    max_queue_depth: int = 500
    max_tokens_per_request: int = 8192
    max_memory_mb: int = 4096
    max_cpu_cores: int = 4
    max_gpu_memory_mb: int = 0
    autoscale_min_instances: int = 1
    autoscale_max_instances: int = 10
    autoscale_trigger: str = "cpu_70"
    target_latency_ms: int = 5000
    target_throughput_rps: int = 50
    current_utilization: float = 0.00
    tenant_id: str = "default"


class QueueEnqueue(BaseModel):
    agent_id: str
    job_type: str
    priority: int = 3
    payload: dict[str, Any] | None = None
    max_retries: int = 3
    flow_id: str | None = None
    tenant_id: str = "default"


# ──────────────────────────────────────────────────────────────────────
# Health · counts across all 7 tables

@router.get("/health")
def health():
    counts = {}
    try:
        with _conn() as c, c.cursor() as cur:
            for t in ["agent_feedback", "agent_incident", "agent_dependency",
                      "agent_team", "agent_sla", "agent_capacity", "agent_queue"]:
                cur.execute(f"SELECT COUNT(*) FROM {t}")
                counts[t] = cur.fetchone()[0]
        return {"status": "ok", "module": "agentic-ops", "counts": counts}
    except Exception as e:
        return {"status": "scaffold", "module": "agentic-ops",
                "error": f"{type(e).__name__}: {e}",
                "note": "Run migration 064_agentic_ops_layer.sql"}


# ──────────────────────────────────────────────────────────────────────
# Generic helper · DRY across 7 simple CRUDs

def _insert(table: str, body: dict, id_col: str, id_prefix: str) -> str:
    """Generic upsert · returns the assigned ID."""
    body = dict(body)
    body[id_col] = body.get(id_col) or f"{id_prefix}-{uuid.uuid4().hex[:12]}"
    # JSON serialize any dict/list values
    for k, v in list(body.items()):
        if isinstance(v, (dict, list)):
            body[k] = json.dumps(v)
    cols = ", ".join(body.keys())
    vals = ", ".join(f"%({k})s" for k in body.keys())
    sql = f"INSERT INTO {table} ({cols}) VALUES ({vals}) RETURNING {id_col}"
    with _conn() as c, c.cursor() as cur:
        cur.execute(sql, body)
        return cur.fetchone()[0]


def _list(table: str, filters: dict, limit: int = 50, order_by: str = "created_at DESC") -> list[dict]:
    where_parts = []
    params: list[Any] = []
    for k, v in filters.items():
        if v is not None:
            where_parts.append(f"{k} = %s")
            params.append(v)
    where = " WHERE " + " AND ".join(where_parts) if where_parts else ""
    sql = f"SELECT * FROM {table}{where} ORDER BY {order_by} LIMIT %s"
    params.append(limit)
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(sql, params)
        return [dict(r) for r in cur.fetchall()]


# ──────────────────────────────────────────────────────────────────────
# 23. agent_feedback

@router.post("/feedback")
def create_feedback(body: FeedbackCreate):
    fid = _insert("agent_feedback", body.model_dump(exclude_none=False), "feedback_id", "FB")
    return {"feedback_id": fid}


@router.get("/feedback")
def list_feedback(agent_id: str | None = None, severity: str | None = None,
                  tenant_id: str = "default", limit: int = 50):
    rows = _list("agent_feedback",
                 {"agent_id": agent_id, "severity": severity, "tenant_id": tenant_id},
                 limit=limit)
    return {"feedback": rows, "count": len(rows)}


@router.get("/feedback/stats")
def feedback_stats(agent_id: str | None = None, tenant_id: str = "default"):
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        where = "WHERE tenant_id = %s" + (" AND agent_id = %s" if agent_id else "")
        params = [tenant_id] + ([agent_id] if agent_id else [])
        cur.execute(f"""
            SELECT AVG(rating)::numeric(4,2) AS avg_rating,
                   COUNT(*) AS total,
                   SUM(CASE WHEN action_required THEN 1 ELSE 0 END) AS open_actions,
                   SUM(CASE WHEN severity IN ('High','Critical') THEN 1 ELSE 0 END) AS critical_count
            FROM agent_feedback {where}
        """, params)
        return dict(cur.fetchone())


# ──────────────────────────────────────────────────────────────────────
# 24. agent_incident

@router.post("/incidents")
def create_incident(body: IncidentCreate):
    iid = _insert("agent_incident", body.model_dump(exclude_none=False), "incident_id", "INC")
    return {"incident_id": iid}


@router.get("/incidents")
def list_incidents(agent_id: str | None = None, severity: str | None = None,
                   status: str | None = None, tenant_id: str = "default", limit: int = 50):
    rows = _list("agent_incident",
                 {"agent_id": agent_id, "severity": severity, "status": status, "tenant_id": tenant_id},
                 limit=limit, order_by="opened_at DESC")
    return {"incidents": rows, "count": len(rows)}


@router.get("/incidents/stats")
def incident_stats(tenant_id: str = "default"):
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT severity, status, COUNT(*) AS n
            FROM agent_incident
            WHERE tenant_id = %s
            GROUP BY severity, status
        """, (tenant_id,))
        rows = [dict(r) for r in cur.fetchall()]
        by_severity: dict[str, int] = {}
        by_status: dict[str, int] = {}
        for r in rows:
            by_severity[r["severity"]] = by_severity.get(r["severity"], 0) + r["n"]
            by_status[r["status"]] = by_status.get(r["status"], 0) + r["n"]
        return {"by_severity": by_severity, "by_status": by_status, "total": sum(by_severity.values())}


# ──────────────────────────────────────────────────────────────────────
# 25. agent_dependency

@router.post("/dependencies")
def create_dependency(body: DependencyCreate):
    did = _insert("agent_dependency", body.model_dump(exclude_none=False), "dependency_id", "DEP")
    return {"dependency_id": did}


@router.get("/dependencies")
def list_dependencies(agent_id: str | None = None, criticality: str | None = None,
                      tenant_id: str = "default", limit: int = 50):
    rows = _list("agent_dependency",
                 {"agent_id": agent_id, "criticality": criticality, "tenant_id": tenant_id},
                 limit=limit)
    return {"dependencies": rows, "count": len(rows)}


# ──────────────────────────────────────────────────────────────────────
# 26. agent_team

@router.post("/teams")
def create_team(body: TeamCreate):
    tid = _insert("agent_team", body.model_dump(exclude_none=False), "team_id", "TM")
    return {"team_id": tid}


@router.get("/teams")
def list_teams(agent_id: str | None = None, tenant_id: str = "default", limit: int = 50):
    rows = _list("agent_team",
                 {"agent_id": agent_id, "tenant_id": tenant_id},
                 limit=limit)
    return {"teams": rows, "count": len(rows)}


@router.get("/teams/by-agent/{agent_id}")
def get_team_for_agent(agent_id: str):
    rows = _list("agent_team", {"agent_id": agent_id}, limit=1)
    return rows[0] if rows else {"agent_id": agent_id, "team": None}


# ──────────────────────────────────────────────────────────────────────
# 27. agent_sla

@router.post("/slas")
def create_sla(body: SLACreate):
    sid = _insert("agent_sla", body.model_dump(exclude_none=False), "sla_id", "SLA")
    return {"sla_id": sid}


@router.get("/slas")
def list_slas(agent_id: str | None = None, tier: str | None = None,
              tenant_id: str = "default", limit: int = 50):
    filters = {"agent_id": agent_id, "tenant_id": tenant_id}
    if tier:
        filters["sla_tier"] = tier
    rows = _list("agent_sla", filters, limit=limit)
    return {"slas": rows, "count": len(rows)}


# ──────────────────────────────────────────────────────────────────────
# 28. agent_capacity

@router.post("/capacities")
def create_capacity(body: CapacityCreate):
    cid = _insert("agent_capacity", body.model_dump(exclude_none=False), "capacity_id", "CAP")
    return {"capacity_id": cid}


@router.get("/capacities")
def list_capacities(agent_id: str | None = None, tenant_id: str = "default", limit: int = 50):
    rows = _list("agent_capacity", {"agent_id": agent_id, "tenant_id": tenant_id}, limit=limit)
    return {"capacities": rows, "count": len(rows)}


# ──────────────────────────────────────────────────────────────────────
# 29. agent_queue

@router.post("/queue/enqueue")
def enqueue_job(body: QueueEnqueue):
    qid = _insert("agent_queue", {
        **body.model_dump(exclude_none=False),
        "job_id": f"JOB-{uuid.uuid4().hex[:12]}",
        "scheduled_at": datetime.now(timezone.utc),
    }, "queue_id", "Q")
    return {"queue_id": qid}


@router.get("/queue")
def list_queue(queue_status: str | None = None, agent_id: str | None = None,
               priority: int | None = None, tenant_id: str = "default", limit: int = 50):
    rows = _list("agent_queue",
                 {"queue_status": queue_status, "agent_id": agent_id,
                  "priority": priority, "tenant_id": tenant_id},
                 limit=limit, order_by="priority ASC, created_at ASC")
    return {"queue": rows, "count": len(rows)}


@router.get("/queue/stats")
def queue_stats(tenant_id: str = "default"):
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT queue_status, COUNT(*) AS n
            FROM agent_queue
            WHERE tenant_id = %s
            GROUP BY queue_status
        """, (tenant_id,))
        by_status = {r["queue_status"]: r["n"] for r in cur.fetchall()}
        cur.execute("""
            SELECT priority, COUNT(*) AS n
            FROM agent_queue
            WHERE tenant_id = %s AND queue_status IN ('Pending', 'Running', 'Retrying')
            GROUP BY priority
            ORDER BY priority
        """, (tenant_id,))
        backlog_by_priority = {r["priority"]: r["n"] for r in cur.fetchall()}
        return {
            "by_status": by_status,
            "backlog_by_priority": backlog_by_priority,
            "total": sum(by_status.values()),
        }


@router.post("/queue/{queue_id}/mark", dependencies=[Depends(require_admin)])
def mark_job(queue_id: str, queue_status: str, error_message: str | None = None):
    if queue_status not in ("Cancelled", "Completed", "Failed", "Stuck"):
        raise HTTPException(400, {"detail": "invalid status"})
    with _conn() as c, c.cursor() as cur:
        cur.execute("""
            UPDATE agent_queue
            SET queue_status = %s, error_message = COALESCE(%s, error_message),
                completed_at = CASE WHEN %s IN ('Completed','Cancelled','Failed') THEN CURRENT_TIMESTAMP ELSE completed_at END
            WHERE queue_id = %s
            RETURNING queue_id, queue_status
        """, (queue_status, error_message, queue_status, queue_id))
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, {"detail": "queue_id not found"})
        return {"queue_id": row[0], "queue_status": row[1]}


# ──────────────────────────────────────────────────────────────────────
# Per-agent rollup · single endpoint pulls all 7 surfaces

@router.get("/agent/{agent_id}/rollup")
def agent_rollup(agent_id: str, tenant_id: str = "default"):
    """Single read for the AgenticAdminPanel · pulls all 7 ops surfaces."""
    out: dict[str, Any] = {"agent_id": agent_id, "tenant_id": tenant_id}
    try:
        with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            for label, sql, key in [
                ("feedback", "SELECT * FROM agent_feedback WHERE agent_id = %s ORDER BY created_at DESC LIMIT 10", "feedback"),
                ("incidents", "SELECT * FROM agent_incident WHERE agent_id = %s ORDER BY opened_at DESC LIMIT 10", "incidents"),
                ("dependencies", "SELECT * FROM agent_dependency WHERE agent_id = %s ORDER BY criticality", "dependencies"),
                ("team", "SELECT * FROM agent_team WHERE agent_id = %s LIMIT 1", "team"),
                ("sla", "SELECT * FROM agent_sla WHERE agent_id = %s ORDER BY created_at DESC LIMIT 1", "sla"),
                ("capacity", "SELECT * FROM agent_capacity WHERE agent_id = %s ORDER BY created_at DESC LIMIT 1", "capacity"),
                ("queue", "SELECT * FROM agent_queue WHERE agent_id = %s ORDER BY created_at DESC LIMIT 10", "queue"),
            ]:
                cur.execute(sql, (agent_id,))
                rows = [dict(r) for r in cur.fetchall()]
                # Singletons vs lists
                out[key] = rows[0] if key in ("team", "sla", "capacity") and rows else (rows or None)
        return out
    except Exception as e:
        return {**out, "error": f"{type(e).__name__}: {e}",
                "note": "Migrations may not have run yet."}
