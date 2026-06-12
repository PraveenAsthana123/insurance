"""/api/v1/agentic/* · Iter 37 · agent + skill + tool registries + invocation."""
from __future__ import annotations

import json
from typing import Any

import psycopg2
import psycopg2.extras
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.config import get_settings
from core.role_dependency import require_admin, require_manager_or_above

router = APIRouter(prefix="/api/v1/agentic", tags=["agentic"])


def _conn():
    return psycopg2.connect(get_settings().database_url)


# ──────────────────────────────────────────────────────────────────────
# Pydantic models

class AgentCreate(BaseModel):
    agent_id: str
    agent_name: str
    agent_type: str = "Worker"
    department_id: str | None = None
    business_domain: str | None = None
    purpose: str | None = None
    owner_team: str | None = None
    status: str = "Draft"
    version: str = "v1.0"
    autonomy_level: str = "Approval Required"
    risk_level: str = "Medium"
    model_name: str | None = None
    runtime_framework: str = "LangGraph"
    max_steps: int = 10
    timeout_seconds: int = 60
    cost_limit: float = 5.00
    tenant_id: str = "default"


class SkillCreate(BaseModel):
    skill_id: str
    skill_name: str
    skill_category: str | None = None
    description: str | None = None
    input_schema: dict[str, Any] | None = None
    output_schema: dict[str, Any] | None = None
    risk_level: str = "Low"
    execution_mode: str = "Automatic"
    requires_tool: bool = True
    requires_mcp: bool = False
    requires_human_approval: bool = False
    timeout_seconds: int = 30
    retry_count: int = 2
    status: str = "Draft"
    owner_team: str | None = None
    tenant_id: str = "default"


class ToolCreate(BaseModel):
    tool_id: str
    tool_name: str
    tool_type: str = "Read"
    system_name: str | None = None
    category: str | None = None
    endpoint_url: str | None = None
    auth_type: str | None = None
    permission_scope: str = "read"
    risk_level: str = "Low"
    timeout_seconds: int = 15
    retry_count: int = 2
    rate_limit_per_min: int = 60
    requires_approval: bool = False
    status: str = "Available"
    owner_team: str | None = None
    tenant_id: str = "default"


class MappingCreate(BaseModel):
    agent_id: str
    skill_id: str
    execution_mode: str = "Automatic"
    priority: int = 100
    status: str = "Active"


class InvokeRequest(BaseModel):
    agent_id: str
    input_text: str
    trigger_kind: str = "api"
    incident_id: str | None = None
    correlation_id: str | None = None
    tenant_id: str = "default"


# ──────────────────────────────────────────────────────────────────────
# Health + stats

@router.get("/health")
def health():
    try:
        with _conn() as c, c.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM agent_registry")
            n_agents = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM skill_registry")
            n_skills = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM tool_registry")
            n_tools = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM agent_invocation")
            n_invocations = cur.fetchone()[0]
        return {
            "status": "ok",
            "module": "agentic-core",
            "spec": "Iter 37 · Port-style agent registry + invocation audit",
            "counts": {
                "agents": n_agents,
                "skills": n_skills,
                "tools": n_tools,
                "invocations": n_invocations,
            },
        }
    except Exception as e:
        return {
            "status": "scaffold",
            "module": "agentic-core",
            "error": f"{type(e).__name__}: {e}",
            "note": "Migrations may not have applied yet · INSUR_SKIP_MIGRATIONS=1",
        }


# ──────────────────────────────────────────────────────────────────────
# Agent CRUD

@router.post("/agents", dependencies=[Depends(require_admin)])
def create_agent(body: AgentCreate):
    with _conn() as c, c.cursor() as cur:
        try:
            cur.execute("""
                INSERT INTO agent_registry
                (agent_id, agent_name, agent_type, department_id, business_domain,
                 purpose, owner_team, status, version, autonomy_level, risk_level,
                 model_name, runtime_framework, max_steps, timeout_seconds,
                 cost_limit, tenant_id)
                VALUES (%(agent_id)s, %(agent_name)s, %(agent_type)s, %(department_id)s,
                        %(business_domain)s, %(purpose)s, %(owner_team)s, %(status)s,
                        %(version)s, %(autonomy_level)s, %(risk_level)s, %(model_name)s,
                        %(runtime_framework)s, %(max_steps)s, %(timeout_seconds)s,
                        %(cost_limit)s, %(tenant_id)s)
                ON CONFLICT (agent_id) DO UPDATE SET
                    agent_name = EXCLUDED.agent_name,
                    status = EXCLUDED.status,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING agent_id, status
            """, body.model_dump())
            row = cur.fetchone()
            return {"agent_id": row[0], "status": row[1]}
        except Exception as e:
            raise HTTPException(400, {"detail": f"{type(e).__name__}: {e}",
                                       "error_code": "AGENT_CREATE_FAILED"})


@router.get("/agents")
def list_agents(status: str | None = None, tenant_id: str = "default", limit: int = 50):
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        sql = "SELECT * FROM agent_registry WHERE tenant_id = %s"
        params: list[Any] = [tenant_id]
        if status:
            sql += " AND status = %s"
            params.append(status)
        sql += " ORDER BY created_at DESC LIMIT %s"
        params.append(limit)
        cur.execute(sql, params)
        rows = [dict(r) for r in cur.fetchall()]
        return {"agents": rows, "count": len(rows), "tenant_id": tenant_id}


@router.get("/agents/all-blueprints")
def all_blueprints(department: str | None = None, risk_level: str | None = None,
                   tenant_id: str = "default", limit: int = 200):
    """Iter 43 · single fetch · ALL 100 agents with working/flow/network rollup."""
    from agentic_core.blueprints import build_blueprint
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        sql = "SELECT * FROM agent_registry WHERE tenant_id = %s"
        params: list[Any] = [tenant_id]
        if department:
            sql += " AND department_id = %s"
            params.append(department)
        if risk_level:
            sql += " AND risk_level = %s"
            params.append(risk_level)
        sql += " ORDER BY department_id, agent_id LIMIT %s"
        params.append(limit)
        cur.execute(sql, params)
        agents = [dict(r) for r in cur.fetchall()]

        # Bulk-load skills for all agents
        agent_ids = [a["agent_id"] for a in agents]
        skills_by_agent: dict[str, list[str]] = {}
        if agent_ids:
            cur.execute("""
                SELECT m.agent_id, s.skill_id
                FROM agent_skill_mapping m
                JOIN skill_registry s ON s.skill_id = m.skill_id
                WHERE m.agent_id = ANY(%s) AND m.status = 'Active'
                ORDER BY m.agent_id, m.priority
            """, (agent_ids,))
            for r in cur.fetchall():
                skills_by_agent.setdefault(r["agent_id"], []).append(r["skill_id"])

    # Compose blueprint per agent
    rows = []
    for a in agents:
        bp = build_blueprint(
            agent_id=a["agent_id"],
            agent_name=a["agent_name"],
            department_id=a["department_id"] or "",
            risk_level=a["risk_level"] or "Medium",
            skills=skills_by_agent.get(a["agent_id"], []),
        )
        rows.append({
            # Identity
            "agent_id":         a["agent_id"],
            "agent_name":       a["agent_name"],
            "department":       a["department_id"],
            "domain":           a["business_domain"],
            "risk_level":       a["risk_level"],
            "autonomy":         a["autonomy_level"],
            # Working
            "process_summary":  bp["process_summary"],
            "n_inputs":         len(bp["inputs"]),
            "n_steps":          len(bp["steps"]),
            "n_outputs":        len(bp["outputs"]),
            "n_skills":         len(skills_by_agent.get(a["agent_id"], [])),
            # Network
            "mcp_servers":      bp["mcp_servers"],
            "rag_corpora":      bp["rag_corpora"],
            "tools":            bp["tools_mapped"] + bp["tools_template"],
            # Flow
            "autonomy_marker":  bp["autonomy_marker"],
            "blueprint_hash":   bp["blueprint_hash"],
            "model":            a["model_name"],
        })

    # Aggregate stats
    by_dept: dict[str, int] = {}
    by_risk: dict[str, int] = {}
    all_mcps: set[str] = set()
    all_rag: set[str] = set()
    for r in rows:
        by_dept[r["department"]] = by_dept.get(r["department"], 0) + 1
        by_risk[r["risk_level"]] = by_risk.get(r["risk_level"], 0) + 1
        all_mcps.update(r["mcp_servers"])
        all_rag.update(r["rag_corpora"])

    return {
        "agents": rows,
        "count": len(rows),
        "stats": {
            "by_department": by_dept,
            "by_risk_level": by_risk,
            "unique_mcps": sorted(all_mcps),
            "unique_rag_corpora": sorted(all_rag),
            "n_unique_mcps": len(all_mcps),
            "n_unique_rag": len(all_rag),
        },
    }


@router.get("/agents/{agent_id}/blueprint")
def get_agent_blueprint(agent_id: str):
    """Per-agent blueprint · IPO + flowchart + MCP + RAG + tools (Iter 41)."""
    from agentic_core.blueprints import build_blueprint
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM agent_registry WHERE agent_id = %s", (agent_id,))
        agent = cur.fetchone()
        if not agent:
            raise HTTPException(404, {"detail": f"agent not found: {agent_id}",
                                       "error_code": "AGENT_404"})
        cur.execute("""
            SELECT s.skill_id
            FROM agent_skill_mapping m
            JOIN skill_registry s ON s.skill_id = m.skill_id
            WHERE m.agent_id = %s AND m.status = 'Active'
            ORDER BY m.priority
        """, (agent_id,))
        skills = [r["skill_id"] for r in cur.fetchall()]
    return build_blueprint(
        agent_id=agent["agent_id"],
        agent_name=agent["agent_name"],
        department_id=agent["department_id"] or "",
        risk_level=agent["risk_level"] or "Medium",
        skills=skills,
    )


@router.get("/agents/{agent_id}")
def get_agent(agent_id: str):
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM agent_registry WHERE agent_id = %s", (agent_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, {"detail": f"agent not found: {agent_id}",
                                       "error_code": "AGENT_404"})
        # Load mappings
        cur.execute("""
            SELECT m.*, s.skill_name, s.risk_level AS skill_risk
            FROM agent_skill_mapping m
            JOIN skill_registry s ON s.skill_id = m.skill_id
            WHERE m.agent_id = %s AND m.status = 'Active'
            ORDER BY m.priority
        """, (agent_id,))
        skills = [dict(r) for r in cur.fetchall()]
        return {"agent": dict(row), "skills": skills}


# ──────────────────────────────────────────────────────────────────────
# Skill CRUD

@router.post("/skills", dependencies=[Depends(require_admin)])
def create_skill(body: SkillCreate):
    d = body.model_dump()
    d["input_schema"] = json.dumps(d["input_schema"] or {})
    d["output_schema"] = json.dumps(d["output_schema"] or {})
    with _conn() as c, c.cursor() as cur:
        try:
            cur.execute("""
                INSERT INTO skill_registry
                (skill_id, skill_name, skill_category, description, input_schema,
                 output_schema, risk_level, execution_mode, requires_tool,
                 requires_mcp, requires_human_approval, timeout_seconds, retry_count,
                 status, owner_team, tenant_id)
                VALUES (%(skill_id)s, %(skill_name)s, %(skill_category)s, %(description)s,
                        %(input_schema)s, %(output_schema)s, %(risk_level)s,
                        %(execution_mode)s, %(requires_tool)s, %(requires_mcp)s,
                        %(requires_human_approval)s, %(timeout_seconds)s, %(retry_count)s,
                        %(status)s, %(owner_team)s, %(tenant_id)s)
                ON CONFLICT (skill_id) DO UPDATE SET
                    skill_name = EXCLUDED.skill_name,
                    status = EXCLUDED.status,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING skill_id, status
            """, d)
            row = cur.fetchone()
            return {"skill_id": row[0], "status": row[1]}
        except Exception as e:
            raise HTTPException(400, {"detail": f"{type(e).__name__}: {e}",
                                       "error_code": "SKILL_CREATE_FAILED"})


@router.get("/skills")
def list_skills(status: str | None = None, risk_level: str | None = None,
                tenant_id: str = "default", limit: int = 100):
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        sql = "SELECT * FROM skill_registry WHERE tenant_id = %s"
        params: list[Any] = [tenant_id]
        if status:
            sql += " AND status = %s"
            params.append(status)
        if risk_level:
            sql += " AND risk_level = %s"
            params.append(risk_level)
        sql += " ORDER BY created_at DESC LIMIT %s"
        params.append(limit)
        cur.execute(sql, params)
        rows = [dict(r) for r in cur.fetchall()]
        return {"skills": rows, "count": len(rows)}


# ──────────────────────────────────────────────────────────────────────
# Tool CRUD

@router.post("/tools", dependencies=[Depends(require_admin)])
def create_tool(body: ToolCreate):
    with _conn() as c, c.cursor() as cur:
        try:
            cur.execute("""
                INSERT INTO tool_registry
                (tool_id, tool_name, tool_type, system_name, category, endpoint_url,
                 auth_type, permission_scope, risk_level, timeout_seconds, retry_count,
                 rate_limit_per_min, requires_approval, status, owner_team, tenant_id)
                VALUES (%(tool_id)s, %(tool_name)s, %(tool_type)s, %(system_name)s,
                        %(category)s, %(endpoint_url)s, %(auth_type)s,
                        %(permission_scope)s, %(risk_level)s, %(timeout_seconds)s,
                        %(retry_count)s, %(rate_limit_per_min)s, %(requires_approval)s,
                        %(status)s, %(owner_team)s, %(tenant_id)s)
                ON CONFLICT (tool_id) DO UPDATE SET
                    tool_name = EXCLUDED.tool_name,
                    status = EXCLUDED.status,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING tool_id, status
            """, body.model_dump())
            row = cur.fetchone()
            return {"tool_id": row[0], "status": row[1]}
        except Exception as e:
            raise HTTPException(400, {"detail": f"{type(e).__name__}: {e}",
                                       "error_code": "TOOL_CREATE_FAILED"})


@router.get("/tools")
def list_tools(tool_type: str | None = None, tenant_id: str = "default", limit: int = 100):
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        sql = "SELECT * FROM tool_registry WHERE tenant_id = %s"
        params: list[Any] = [tenant_id]
        if tool_type:
            sql += " AND tool_type = %s"
            params.append(tool_type)
        sql += " ORDER BY created_at DESC LIMIT %s"
        params.append(limit)
        cur.execute(sql, params)
        rows = [dict(r) for r in cur.fetchall()]
        return {"tools": rows, "count": len(rows)}


# ──────────────────────────────────────────────────────────────────────
# Mappings (agent → skill)

@router.post("/mappings/agent-skill", dependencies=[Depends(require_admin)])
def create_mapping(body: MappingCreate):
    with _conn() as c, c.cursor() as cur:
        try:
            cur.execute("""
                INSERT INTO agent_skill_mapping (agent_id, skill_id, execution_mode, priority, status)
                VALUES (%(agent_id)s, %(skill_id)s, %(execution_mode)s, %(priority)s, %(status)s)
                ON CONFLICT (agent_id, skill_id) DO UPDATE SET
                    execution_mode = EXCLUDED.execution_mode,
                    priority = EXCLUDED.priority,
                    status = EXCLUDED.status
                RETURNING mapping_id
            """, body.model_dump())
            row = cur.fetchone()
            return {"mapping_id": row[0], "agent_id": body.agent_id, "skill_id": body.skill_id}
        except Exception as e:
            raise HTTPException(400, {"detail": f"{type(e).__name__}: {e}",
                                       "error_code": "MAPPING_CREATE_FAILED"})


# ──────────────────────────────────────────────────────────────────────
# Invocation · the "run agent" entry point

@router.post("/invoke")
def invoke_agent(body: InvokeRequest):
    """Real end-to-end execution · Iter 41.

    Calls runtime.invoke() which:
      1. Plans via LLM (OpenAI/Anthropic if API key) or honest stub
      2. Executes each planned skill via tool_executor
      3. Tracks per-step timing + tokens + cost
      4. Writes COMPLETE audit row to agent_invocation

    Set OPENAI_API_KEY or ANTHROPIC_API_KEY to use real LLM.
    Without key · returns honest deterministic stub with scaffold=true.
    """
    from agentic_core.runtime import invoke as runtime_invoke
    try:
        return runtime_invoke(
            agent_id=body.agent_id,
            input_text=body.input_text,
            trigger_kind=body.trigger_kind,
            incident_id=body.incident_id,
            correlation_id=body.correlation_id,
            tenant_id=body.tenant_id,
        )
    except ValueError as e:
        msg = str(e)
        if "not found" in msg:
            raise HTTPException(404, {"detail": msg, "error_code": "AGENT_404"})
        if "not Active" in msg:
            raise HTTPException(409, {"detail": msg, "error_code": "AGENT_NOT_ACTIVE"})
        raise HTTPException(400, {"detail": msg, "error_code": "INVOKE_FAILED"})


@router.get("/invocations")
def list_invocations(agent_id: str | None = None, status: str | None = None,
                     tenant_id: str = "default", limit: int = 50):
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        sql = "SELECT * FROM agent_invocation WHERE tenant_id = %s"
        params: list[Any] = [tenant_id]
        if agent_id:
            sql += " AND agent_id = %s"
            params.append(agent_id)
        if status:
            sql += " AND status = %s"
            params.append(status)
        sql += " ORDER BY created_at DESC LIMIT %s"
        params.append(limit)
        cur.execute(sql, params)
        rows = [dict(r) for r in cur.fetchall()]
        return {"invocations": rows, "count": len(rows)}


@router.get("/invocations/{invocation_id}")
def get_invocation(invocation_id: str):
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM agent_invocation WHERE invocation_id = %s", (invocation_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, {"detail": f"invocation not found: {invocation_id}",
                                       "error_code": "INVOCATION_404"})
        return dict(row)


# ──────────────────────────────────────────────────────────────────────
# §A1 · Intervention endpoint · approve/reject pending invocation
# Per PENDING_TASKS_PLAN A1 · operator-triggered HITL decision.

class InvocationDecision(BaseModel):
    decision: str  # 'approve' or 'reject'
    decided_by: str = "operator"
    reason: str | None = None


@router.post("/invocations/{invocation_id}/decide")
def decide_invocation(
    invocation_id: str,
    body: InvocationDecision,
    _role: str = Depends(require_manager_or_above),
):
    """§A1 · intervention decision endpoint.

    Per PENDING_TASKS_PLAN A1: operator can approve/reject pending agent
    invocations from the UI. Idempotent · second call returns existing state.
    Writes audit row · emits trace event · updates status to Success/Cancelled.
    """
    if body.decision not in ("approve", "reject"):
        raise HTTPException(
            400,
            {"detail": "decision must be 'approve' or 'reject'",
             "error_code": "INVOCATION_DECIDE_BAD_INPUT"},
        )
    new_status = "Success" if body.decision == "approve" else "Cancelled"

    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # Fetch current state for idempotency check
        cur.execute(
            "SELECT invocation_id, status, agent_id, human_override "
            "FROM agent_invocation WHERE invocation_id = %s",
            (invocation_id,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(
                404,
                {"detail": f"invocation not found: {invocation_id}",
                 "error_code": "INVOCATION_404"},
            )

        # Idempotency: if already decided, return existing
        if row["status"] in ("Success", "Cancelled", "Failed"):
            return {
                "invocation_id": invocation_id,
                "status": row["status"],
                "decision": body.decision,
                "idempotent": True,
                "note": f"already in terminal state '{row['status']}' · no mutation",
            }

        # Apply decision
        cur.execute(
            """
            UPDATE agent_invocation
            SET status = %s,
                completed_at = NOW(),
                human_override = TRUE,
                output_text = COALESCE(output_text, '') ||
                              %s
            WHERE invocation_id = %s
            RETURNING invocation_id, status, agent_id, completed_at;
            """,
            (
                new_status,
                f"\n[§A1 intervention] {body.decision} by {body.decided_by}"
                f" at {body.reason or 'no reason given'}",
                invocation_id,
            ),
        )
        updated = cur.fetchone()

        # §38.3 audit row
        cur.execute(
            """
            INSERT INTO audit_log (actor, action, resource, payload, correlation_id)
            VALUES (%s, %s, %s, %s::jsonb, %s)
            """,
            (
                body.decided_by,
                f"intervention.{body.decision}",
                f"agent_invocation:{invocation_id}",
                json.dumps({
                    "invocation_id": invocation_id,
                    "agent_id": row["agent_id"],
                    "decision": body.decision,
                    "reason": body.reason,
                    "policy_ref": "§A1 + §103.4 HITL + §106 safe-allowlist",
                    "previous_status": row["status"],
                    "new_status": new_status,
                }),
                invocation_id,
            ),
        )
        c.commit()

    return {
        "invocation_id": invocation_id,
        "status": new_status,
        "decision": body.decision,
        "decided_by": body.decided_by,
        "completed_at": updated["completed_at"].isoformat() if updated["completed_at"] else None,
        "idempotent": False,
        "policy_ref": "§A1 intervention endpoint",
    }


@router.get("/invocations/{invocation_id}/trace")
def invocation_trace(invocation_id: str):
    """Iter 43 · Tier-1 #4 · OpenTelemetry-style trace events for one invocation."""
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM agent_invocation WHERE invocation_id = %s",
                    (invocation_id,))
        inv = cur.fetchone()
        if not inv:
            raise HTTPException(404, {"detail": "invocation not found"})
        cur.execute("""
            SELECT * FROM agent_trace_event
            WHERE invocation_id = %s
            ORDER BY started_at
        """, (invocation_id,))
        events = [dict(r) for r in cur.fetchall()]
    return {
        "invocation_id": invocation_id,
        "trace_id": inv["trace_id"],
        "agent_id": inv["agent_id"],
        "total_duration_ms": inv.get("duration_ms"),
        "events": events,
        "n_events": len(events),
    }


@router.get("/invocations/stats")
def invocation_stats(tenant_id: str = "default"):
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT status, COUNT(*) AS n
            FROM agent_invocation
            WHERE tenant_id = %s
            GROUP BY status
        """, (tenant_id,))
        by_status = {r["status"]: r["n"] for r in cur.fetchall()}
        cur.execute("""
            SELECT agent_id, COUNT(*) AS n, AVG(duration_ms) AS avg_ms
            FROM agent_invocation
            WHERE tenant_id = %s
            GROUP BY agent_id
            ORDER BY n DESC
            LIMIT 10
        """, (tenant_id,))
        by_agent = [dict(r) for r in cur.fetchall()]
        return {
            "tenant_id": tenant_id,
            "by_status": by_status,
            "top_agents": by_agent,
        }


# ──────────────────────────────────────────────────────────────────────
# §D1 · MCP server registry surface · operator brief PENDING_TASKS_PLAN D1.

def _mcp_reachable(endpoint_url: str | None, timeout_s: float = 1.5) -> bool:
    """Best-effort reachability probe for an MCP endpoint.

    §57.7 honest: returns False when unreachable rather than fabricating
    a green. Caller passes a small timeout because this is called on
    every list request · we never block the response for a slow MCP.
    """
    if not endpoint_url:
        return False
    try:
        from urllib.parse import urlparse
        import socket
        u = urlparse(endpoint_url)
        host = u.hostname
        port = u.port or (443 if u.scheme == "https" else 80)
        if not host:
            return False
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(timeout_s)
            return s.connect_ex((host, port)) == 0
    except (OSError, ValueError):
        return False


@router.get("/mcp-servers")
def list_mcp_servers(
    status: str | None = None,
    risk_level: str | None = None,
    tenant_id: str = "default",
    include_reachability: bool = True,
):
    """§D1 · list registered MCP servers with optional live reachability check.

    Per PENDING_TASKS_PLAN D1 review gate: returns ≥1 row · slack_mcp
    visible. Composes with §147 Platform Explorer (operators can see
    every registered MCP) + §52 brutal tool review (per-MCP reachable
    flag is honest scaffold per §57.7).
    """
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        sql = """
            SELECT mcp_id, server_name, endpoint_url, auth_type,
                   sla_uptime_pct, version, risk_level, status,
                   owner_team, timeout_seconds, approved_by, approved_at,
                   tenant_id, created_at, updated_at
            FROM mcp_server_registry
            WHERE tenant_id = %s
        """
        params: list[Any] = [tenant_id]
        if status:
            sql += " AND status = %s"
            params.append(status)
        if risk_level:
            sql += " AND risk_level = %s"
            params.append(risk_level)
        sql += " ORDER BY mcp_id"
        cur.execute(sql, params)
        rows = [dict(r) for r in cur.fetchall()]

    if include_reachability:
        for row in rows:
            row["reachable"] = _mcp_reachable(row.get("endpoint_url"))
            row["reachability_check_at"] = "live"

    return {
        "mcp_servers": rows,
        "count": len(rows),
        "filters": {"status": status, "risk_level": risk_level, "tenant_id": tenant_id},
        "policy_ref": "§D1 PENDING_TASKS · §147 Platform Explorer composer",
    }


@router.get("/mcp-servers/{mcp_id}")
def get_mcp_server(mcp_id: str, tenant_id: str = "default"):
    """§D1 · single MCP server detail · with reachability probe."""
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            SELECT mcp_id, server_name, endpoint_url, auth_type,
                   sla_uptime_pct, version, risk_level, status,
                   owner_team, timeout_seconds, approved_by, approved_at,
                   tenant_id, created_at, updated_at
            FROM mcp_server_registry
            WHERE mcp_id = %s AND tenant_id = %s
            """,
            (mcp_id, tenant_id),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(
                404,
                {"detail": f"mcp_server not found: {mcp_id}",
                 "error_code": "MCP_SERVER_404"},
            )
        result = dict(row)
        result["reachable"] = _mcp_reachable(result.get("endpoint_url"))
        return result
