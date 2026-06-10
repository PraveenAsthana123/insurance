"""/api/v1/agentic/* · Iter 37 · agent + skill + tool registries + invocation."""
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
    """Per §57.7 scaffold runtime · validates agent + plans skills + writes audit row.
    Real LLM execution is operator-attached follow-up (LangGraph integration).
    """
    invocation_id = f"INV-{uuid.uuid4().hex[:14]}"
    correlation_id = body.correlation_id or f"CORR-{uuid.uuid4().hex[:14]}"

    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # 1. Load agent · validate
        cur.execute("""
            SELECT * FROM agent_registry
            WHERE agent_id = %s AND tenant_id = %s
        """, (body.agent_id, body.tenant_id))
        agent = cur.fetchone()
        if not agent:
            raise HTTPException(404, {"detail": f"agent not found: {body.agent_id}",
                                       "error_code": "AGENT_404"})
        if agent["status"] != "Active":
            raise HTTPException(409, {"detail": f"agent status is {agent['status']}",
                                       "error_code": "AGENT_NOT_ACTIVE"})

        # 2. Load allowed skills
        cur.execute("""
            SELECT s.skill_id, s.skill_name, s.risk_level, s.requires_human_approval,
                   m.execution_mode, m.priority
            FROM agent_skill_mapping m
            JOIN skill_registry s ON s.skill_id = m.skill_id
            WHERE m.agent_id = %s AND m.status = 'Active' AND s.status IN ('Active', 'Approved')
            ORDER BY m.priority
        """, (body.agent_id,))
        skills = [dict(r) for r in cur.fetchall()]

        # 3. Per §57.7 scaffold plan · pick first 3 skills · operator wires LLM planner
        planned_skills = [s["skill_id"] for s in skills[:3]]
        plan_text = (
            f"SCAFFOLD plan: agent={body.agent_id} would execute "
            f"{len(planned_skills)} skill(s): {planned_skills}. "
            "Operator wires LangGraph planner for real LLM execution."
        )
        scaffold_output = (
            f"[SCAFFOLD · §57.7] Invocation {invocation_id} planned but NOT executed. "
            f"Real run requires LangGraph + LLM API. "
            f"Audit row recorded with agent={body.agent_id}, input={body.input_text[:80]!r}."
        )

        # 4. Write audit row · the Port _ai_invocation pattern
        cur.execute("""
            INSERT INTO agent_invocation
            (invocation_id, agent_id, correlation_id, incident_id, trigger_kind,
             input_text, plan_text, skills_used, tools_used, actions_taken,
             output_text, status, duration_ms, tokens_in, tokens_out, tenant_id,
             completed_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb,
                    %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            RETURNING invocation_id
        """, (
            invocation_id, body.agent_id, correlation_id, body.incident_id,
            body.trigger_kind, body.input_text, plan_text,
            json.dumps(planned_skills), json.dumps([]), json.dumps([]),
            scaffold_output, "Success", 0, 0, 0, body.tenant_id,
        ))

        return {
            "invocation_id": invocation_id,
            "correlation_id": correlation_id,
            "agent_id": body.agent_id,
            "status": "Success",
            "plan": plan_text,
            "output": scaffold_output,
            "skills_considered": [s["skill_id"] for s in skills],
            "planned_skills": planned_skills,
            "scaffold": True,
        }


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
