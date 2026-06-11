"""Agentic runtime · Iter 41.

Replaces the §57.7 scaffold from Iter 37 with REAL end-to-end execution:
  1. Plan via LLM (or honest stub when no API key)
  2. Execute each planned skill via tool_executor
  3. Track per-step timing + tokens + cost
  4. Write COMPLETE audit row to agent_invocation

Operator runs: POST /api/v1/agentic/invoke
Result: a real invocation that returns the full execution trace.
"""
from __future__ import annotations

import hashlib
import json
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any

import psycopg2
import psycopg2.extras

from agentic_core.llm_client import plan as llm_plan, _compute_cost
from core.config import get_settings

logger = logging.getLogger(__name__)


def _conn():
    return psycopg2.connect(get_settings().database_url)


# ──────────────────────────────────────────────────────────────────────
# Tool executor · honest stub that simulates tool work
# Real tools wire via _TOOL_REGISTRY · operator extends per tool_id

_TOOL_REGISTRY: dict[str, callable] = {}


def register_tool(skill_id: str, fn) -> None:
    """Operator registers a real implementation for a skill."""
    _TOOL_REGISTRY[skill_id] = fn


def _execute_step(skill_id: str, args: dict, agent_id: str) -> dict:
    """Execute one skill · returns result + timing + status."""
    t0 = time.perf_counter()
    if skill_id in _TOOL_REGISTRY:
        try:
            result = _TOOL_REGISTRY[skill_id](args, agent_id=agent_id)
            status = "ok"
            err = None
        except Exception as e:
            result = None
            status = "error"
            err = f"{type(e).__name__}: {e}"
    else:
        # Honest deterministic stub · seeded by args + skill
        seed = int(hashlib.sha256(f"{skill_id}|{json.dumps(args, sort_keys=True, default=str)}".encode()).hexdigest()[:8], 16)
        result = {
            "skill_id": skill_id,
            "stub": True,
            "deterministic_output_id": f"OUT-{seed:08x}",
            "echo_args": args,
            "note": f"Stub executor · {skill_id} not registered · op wires real impl via register_tool()",
        }
        status = "stub"
        err = None
    return {
        "skill_id": skill_id,
        "status": status,
        "duration_ms": round((time.perf_counter() - t0) * 1000, 2),
        "result": result,
        "error": err,
    }


# ──────────────────────────────────────────────────────────────────────
# Main runtime entry point

def _emit_event(cur, invocation_id: str, trace_id: str, event_name: str,
                started: datetime, duration_ms: float, status: str,
                parent_span_id: str | None = None,
                attributes: dict | None = None, error: str | None = None) -> str:
    """Iter 43 · Tier-1 #4 · write one trace event (OTel-style span)."""
    span_id = uuid.uuid4().hex[:16]
    cur.execute("""
        INSERT INTO agent_trace_event
        (event_id, invocation_id, trace_id, span_id, parent_span_id,
         event_name, event_kind, started_at, completed_at, duration_ms,
         status, attributes, error_text)
        VALUES (%s, %s, %s, %s, %s, %s, 'internal', %s, %s, %s, %s, %s::jsonb, %s)
    """, (
        f"EV-{uuid.uuid4().hex[:14]}",
        invocation_id, trace_id, span_id, parent_span_id,
        event_name, started, datetime.now(timezone.utc), duration_ms,
        status, json.dumps(attributes or {}, default=str), error,
    ))
    return span_id


def invoke(
    agent_id: str,
    input_text: str,
    trigger_kind: str = "api",
    incident_id: str | None = None,
    correlation_id: str | None = None,
    tenant_id: str = "default",
) -> dict[str, Any]:
    """End-to-end invocation · LLM plan → tool execution → audit row + trace.

    Returns full execution trace · also persisted to agent_invocation table
    AND per-step events to agent_trace_event (Iter 43 · Tier-1 #4).
    """
    invocation_id = f"INV-{uuid.uuid4().hex[:14]}"
    correlation_id = correlation_id or f"CORR-{uuid.uuid4().hex[:14]}"
    trace_id = uuid.uuid4().hex
    t_total = time.perf_counter()

    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # 1. Load agent
        cur.execute("""
            SELECT * FROM agent_registry
            WHERE agent_id = %s AND tenant_id = %s
        """, (agent_id, tenant_id))
        agent = cur.fetchone()
        if not agent:
            raise ValueError(f"agent not found: {agent_id}")
        if agent["status"] != "Active":
            raise ValueError(f"agent status is {agent['status']} · not Active")

        # 2. Load skills available to this agent
        cur.execute("""
            SELECT s.skill_id, s.skill_name, s.risk_level, s.requires_human_approval,
                   m.execution_mode, m.priority
            FROM agent_skill_mapping m
            JOIN skill_registry s ON s.skill_id = m.skill_id
            WHERE m.agent_id = %s AND m.status = 'Active' AND s.status IN ('Active', 'Approved')
            ORDER BY m.priority
        """, (agent_id,))
        skill_rows = [dict(r) for r in cur.fetchall()]
        available_skills = [s["skill_id"] for s in skill_rows]

    # 3. Plan via LLM (or stub) · emit plan span
    plan_started = datetime.now(timezone.utc)
    t_plan = time.perf_counter()
    plan_result = llm_plan(
        agent_id=agent_id,
        agent_model=agent.get("model_name") or "",
        input_text=input_text,
        skills=available_skills,
    )
    plan_duration_ms = round((time.perf_counter() - t_plan) * 1000, 2)

    plan_text = json.dumps(plan_result["plan"], default=str)
    plan_steps = plan_result["plan"].get("steps", []) or []

    # Emit plan span
    plan_span_id = None
    with _conn() as c, c.cursor() as cur:
        plan_span_id = _emit_event(
            cur, invocation_id, trace_id, "plan",
            started=plan_started, duration_ms=plan_duration_ms,
            status="ok" if not plan_result["scaffold"] else "stub",
            attributes={
                "provider": plan_result["provider"],
                "model": plan_result["model"],
                "tokens_in": plan_result["tokens_in"],
                "tokens_out": plan_result["tokens_out"],
                "cost_usd": plan_result["cost_usd"],
                "n_steps_planned": len(plan_steps),
            },
            error=plan_result.get("error"),
        )

    # 4. Execute each planned step (respecting autonomy_level)
    skills_used: list[str] = []
    tools_used: list[str] = []
    step_results: list[dict] = []
    hitl_required = False

    for step in plan_steps:
        # Iter 74.2 fix · Ollama sometimes returns steps as strings · normalize.
        if isinstance(step, str):
            step = {"skill_id": step, "args": {}}
        elif not isinstance(step, dict):
            continue
        skill_id = step.get("skill_id") or step.get("skill") or step.get("action")
        if not skill_id:
            continue
        # Find the skill in the mapping to check risk + execution mode
        skill_meta = next((s for s in skill_rows if s["skill_id"] == skill_id), None)
        if skill_meta and skill_meta.get("requires_human_approval"):
            # Don't execute · queue for HITL
            step_results.append({
                "skill_id": skill_id, "status": "hitl_pending",
                "result": None, "duration_ms": 0.0,
                "note": "requires_human_approval=true · queued",
            })
            hitl_required = True
            continue
        if skill_meta and skill_meta.get("execution_mode") == "Approval Required":
            if (agent.get("autonomy_level") or "").lower() != "automatic":
                step_results.append({
                    "skill_id": skill_id, "status": "approval_required",
                    "result": None, "duration_ms": 0.0,
                })
                hitl_required = True
                continue

        # Execute · emit per-skill span
        step_started = datetime.now(timezone.utc)
        result = _execute_step(skill_id, step.get("args") or {}, agent_id)
        step_results.append(result)
        skills_used.append(skill_id)
        tools_used.append(skill_id)
        # Emit trace event
        try:
            with _conn() as c, c.cursor() as cur:
                _emit_event(
                    cur, invocation_id, trace_id, f"skill.{skill_id}",
                    started=step_started, duration_ms=result["duration_ms"],
                    status=result["status"], parent_span_id=plan_span_id,
                    attributes={
                        "skill_id": skill_id,
                        "args": step.get("args") or {},
                    },
                    error=result.get("error"),
                )
        except Exception:
            pass  # trace failure doesn't block runtime

    duration_ms = round((time.perf_counter() - t_total) * 1000, 2)
    status = "Success" if not hitl_required and all(s["status"] in ("ok", "stub") for s in step_results) \
             else "PendingApproval" if hitl_required else "PartialFailure"

    # 5. Write the audit row (REAL data · not scaffold) · with trace_id
    with _conn() as c, c.cursor() as cur:
        cur.execute("""
            INSERT INTO agent_invocation
            (invocation_id, agent_id, correlation_id, incident_id, trigger_kind,
             input_text, plan_text, skills_used, tools_used, actions_taken,
             output_text, status, duration_ms, tokens_in, tokens_out,
             cost_usd, tenant_id, trace_id, parent_span_id, completed_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
        """, (
            invocation_id, agent_id, correlation_id, incident_id, trigger_kind,
            input_text, plan_text,
            json.dumps(skills_used), json.dumps(tools_used), json.dumps(step_results, default=str),
            json.dumps({"summary": f"{len(skills_used)} step(s) executed · status={status}",
                       "step_results": step_results}, default=str),
            status, int(duration_ms), plan_result["tokens_in"], plan_result["tokens_out"],
            plan_result["cost_usd"], tenant_id, trace_id, plan_span_id,
        ))

    return {
        "invocation_id": invocation_id,
        "correlation_id": correlation_id,
        "trace_id": trace_id,
        "agent_id": agent_id,
        "status": status,
        "duration_ms": duration_ms,
        "plan": plan_result["plan"],
        "plan_provider": plan_result["provider"],
        "plan_model": plan_result["model"],
        "tokens_in": plan_result["tokens_in"],
        "tokens_out": plan_result["tokens_out"],
        "cost_usd": plan_result["cost_usd"],
        "plan_latency_ms": plan_result["latency_ms"],
        "n_skills_planned": len(plan_steps),
        "n_skills_executed": len(skills_used),
        "skills_used": skills_used,
        "tools_used": tools_used,
        "step_results": step_results,
        "hitl_required": hitl_required,
        "scaffold": plan_result["scaffold"]
            or any(s["status"] == "stub" for s in step_results),
        "scaffold_reason": plan_result.get("error")
            or ("plan_provider=stub · no LLM API key set" if plan_result["scaffold"] else None)
            or ("step executor=stub · no tool registered" if any(s["status"] == "stub" for s in step_results) else None),
    }
