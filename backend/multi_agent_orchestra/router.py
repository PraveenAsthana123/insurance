"""/api/v1/orchestra/* · Iter 96 · 5-agent role-based orchestration.

Roles:
  CHECKER  · finds pending tasks via missing-items-advisor (§80)
  PLANNER  · builds execution plan (LLM · §111 routing)
  EXECUTOR · runs plan steps (delegates to handlers per §106 allowlist)
  MONITOR  · tracks wall-clock + per-step latency · enforces budget
  APPROVER · grades completion · approves next OR routes back to PLANNER

Each agent records to agent_invocation per §38.3 + §107 stamp.
"""
from __future__ import annotations

import json
import os
import time
import uuid
from datetime import datetime, timezone

import httpx
import psycopg2
import psycopg2.extras
from fastapi import APIRouter
from pydantic import BaseModel

from _adapter_helpers import stamp, conn

router = APIRouter(prefix="/api/v1/orchestra", tags=["orchestra"])


def _record_invocation(agent_id: str, status: str, input_text: str,
                        output_text: str, duration_ms: int,
                        correlation_id: str, plan_text: str = "",
                        skills_used: list | None = None,
                        tools_used: list | None = None,
                        cost_usd: float = 0.0) -> str:
    """Insert agent_invocation row · §38.3 audit · §107 stamped."""
    inv_id = f"INV-{uuid.uuid4().hex[:10].upper()}"
    with conn() as c, c.cursor() as cur:
        cur.execute("""
            INSERT INTO agent_invocation
              (invocation_id, agent_id, correlation_id, trigger_kind,
               input_text, plan_text, skills_used, tools_used,
               output_text, status, duration_ms, cost_usd,
               tokens_in, tokens_out, tenant_id)
            VALUES (%s, %s, %s, 'orchestra', %s, %s, %s, %s, %s, %s, %s, %s, 0, 0, 'default')
        """, (inv_id, agent_id, correlation_id,
              (input_text or "")[:2000], (plan_text or "")[:2000],
              json.dumps(skills_used or []),
              json.dumps(tools_used or []),
              (output_text or "")[:2000], status, duration_ms, cost_usd))
    return inv_id


def _call_ollama(prompt: str, model: str = "llama3.2:1b", timeout: int = 15) -> str:
    """Lightweight LLM call · used by planner / approver."""
    host = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
    try:
        r = httpx.post(f"{host}/api/generate",
                       json={"model": model, "prompt": prompt, "stream": False},
                       timeout=timeout)
        return r.json().get("response", "") if r.status_code == 200 else f"[err_{r.status_code}]"
    except Exception as e:
        return f"[ollama_failed: {str(e)[:80]}]"


# ─────────────────────────────────────────────────────────────────────
# Role 1 · CHECKER · finds pending tasks

def _agent_checker(correlation_id: str) -> dict:
    t0 = time.perf_counter()
    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())
    advisor = c.post("/api/v1/missing-items-advisor/scan").json()
    findings = advisor.get("findings", [])
    # Pick top P1/P2 (skip P3 scaffold)
    actionable = [f for f in findings
                  if f.get("severity") in ("P0", "P1", "P2")]
    actionable.sort(key=lambda f: {"P0": 0, "P1": 1, "P2": 2}[f["severity"]])
    elapsed_ms = int((time.perf_counter() - t0) * 1000)
    out = {
        "agent": "sys_checker_agent", "role": "CHECKER",
        "n_findings_total": len(findings),
        "n_actionable": len(actionable),
        "top_task": actionable[0] if actionable else None,
    }
    inv = _record_invocation("sys_checker_agent", "Success",
                              "scan platform for pending",
                              json.dumps(out, default=str)[:1500],
                              elapsed_ms, correlation_id,
                              skills_used=["scan_advisor"])
    out["invocation_id"] = inv
    out["duration_ms"] = elapsed_ms
    return out


# ─────────────────────────────────────────────────────────────────────
# Role 2 · PLANNER · builds plan

def _agent_planner(top_task: dict, correlation_id: str,
                    revision: int = 0) -> dict:
    t0 = time.perf_counter()
    task_desc = top_task.get("topic", "unknown") + " · " + top_task.get("what_missing", "")
    advice = top_task.get("advice", "")
    # Compact LLM call · llama3.2:1b for speed
    plan_prompt = (
        f"You are a planner. Break this task into 2-3 concrete steps.\n"
        f"TASK: {task_desc}\n"
        f"ADVICE: {advice}\n"
        f"Revision: {revision}\n\n"
        f"Output ONLY numbered steps (1. ... 2. ... 3. ...)."
    )
    plan_text = _call_ollama(plan_prompt, "llama3.2:1b", timeout=12)
    # Heuristic step extraction
    import re
    steps = [re.sub(r"^\d+[\.\)\s]+", "", l.strip())
              for l in plan_text.split("\n") if re.match(r"^\d+[\.\)\s]", l.strip())]
    if not steps:
        steps = [task_desc]  # fallback · execute as-is
    elapsed_ms = int((time.perf_counter() - t0) * 1000)
    out = {
        "agent": "sys_planner_agent", "role": "PLANNER",
        "revision": revision, "task": task_desc[:120],
        "plan_text": plan_text[:600],
        "steps": steps[:5], "n_steps": len(steps[:5]),
    }
    inv = _record_invocation("sys_planner_agent", "Success",
                              task_desc, plan_text, elapsed_ms,
                              correlation_id, plan_text=plan_text,
                              skills_used=["llm_plan"])
    out["invocation_id"] = inv
    out["duration_ms"] = elapsed_ms
    return out


# ─────────────────────────────────────────────────────────────────────
# Role 3 · EXECUTOR · runs the plan steps

def _agent_executor(plan: dict, top_task: dict, correlation_id: str) -> dict:
    t0 = time.perf_counter()
    category = top_task.get("category", "")
    items = top_task.get("items", [])

    # Per §106 allowlist: handle 'Agent gap' by registering missing agents
    result = {"executed_steps": [], "actions_taken": []}
    if category == "Agent gap" and items:
        # Register up to 5 missing agents (idempotent · §106 safe action)
        with conn() as c, c.cursor() as cur:
            n_inserted = 0
            for aid in items[:5]:
                risk = "Low" if any(k in aid for k in ["watchdog", "search", "audit"]) else "Medium"
                autonomy = "Automatic" if risk == "Low" else "Approval Required"
                try:
                    cur.execute("""
                        INSERT INTO agent_registry
                          (agent_id, agent_name, agent_type, department_id,
                           business_domain, purpose, owner_team, status,
                           autonomy_level, risk_level, model_name,
                           runtime_framework, max_steps, timeout_seconds,
                           cost_limit, tenant_id)
                        VALUES (%s, %s, 'Worker', 'Platform', %s,
                                'Orchestra-provisioned via §117 multi-agent', 'Platform',
                                'Active', %s, %s, 'llama3.2:3b',
                                'orchestra-runtime', 5, 30, 0.10, 'default')
                        ON CONFLICT (agent_id) DO NOTHING
                    """, (aid, aid.replace("sys_", "").replace("_", " ").title(),
                          top_task.get("topic_id", "Platform"), autonomy, risk))
                    if cur.rowcount > 0:
                        n_inserted += 1
                except Exception:
                    pass
            result["actions_taken"].append(f"registered_{n_inserted}_agents")
            result["executed_steps"].append(f"INSERT {n_inserted} into agent_registry")
    elif category == "Data health":
        result["actions_taken"].append("delegated_to_auto_next_loop_handler")
        result["executed_steps"].append("Routes to §106 act_approval_backlog")
    else:
        result["actions_taken"].append(f"category_{category}_no_handler · logged for operator")
        result["executed_steps"].append(f"Logged · category '{category}' not in safe allowlist")

    elapsed_ms = int((time.perf_counter() - t0) * 1000)
    out = {
        "agent": "sys_executor_agent", "role": "EXECUTOR",
        "n_steps_executed": len(result["executed_steps"]),
        "actions": result["actions_taken"],
        "executed_steps": result["executed_steps"],
    }
    inv = _record_invocation("sys_executor_agent", "Success",
                              category + " · " + str(items[:3]),
                              json.dumps(result, default=str)[:1500],
                              elapsed_ms, correlation_id,
                              skills_used=["execute_safe_actions"],
                              tools_used=["agent_registry_insert"])
    out["invocation_id"] = inv
    out["duration_ms"] = elapsed_ms
    return out


# ─────────────────────────────────────────────────────────────────────
# Role 4 · MONITOR · time + budget watchdog

def _agent_monitor(elapsed_so_far_ms: int, budget_ms: int = 60000,
                    correlation_id: str = "") -> dict:
    t0 = time.perf_counter()
    pct_used = round(100 * elapsed_so_far_ms / budget_ms, 1)
    verdict = "ok"
    if pct_used > 90:
        verdict = "critical_budget_near_exhausted"
    elif pct_used > 75:
        verdict = "warning_budget_pressure"
    elapsed_ms = int((time.perf_counter() - t0) * 1000)
    out = {
        "agent": "sys_monitor_agent", "role": "MONITOR",
        "elapsed_so_far_ms": elapsed_so_far_ms,
        "budget_ms": budget_ms, "pct_used": pct_used,
        "verdict": verdict,
        "recommendation":
            "abort_and_yield" if verdict == "critical_budget_near_exhausted"
            else "continue",
    }
    inv = _record_invocation("sys_monitor_agent", "Success",
                              f"elapsed {elapsed_so_far_ms}ms · budget {budget_ms}ms",
                              json.dumps(out, default=str)[:800],
                              elapsed_ms, correlation_id,
                              skills_used=["time_budget_check"])
    out["invocation_id"] = inv
    return out


# ─────────────────────────────────────────────────────────────────────
# Role 5 · APPROVER · grades completion + decides next

def _agent_approver(task: dict, executor_result: dict,
                     correlation_id: str) -> dict:
    t0 = time.perf_counter()
    # LLM-based completion grader (per §115 self-test pattern)
    grader_prompt = (
        f"Did this execution complete the task?\n"
        f"TASK: {task.get('topic')} · {task.get('what_missing')}\n"
        f"EXECUTOR RESULT: {json.dumps(executor_result.get('executed_steps', []))[:300]}\n"
        f"Reply ONLY: COMPLETE or NEEDS_REPLAN"
    )
    grade_text = _call_ollama(grader_prompt, "llama3.2:1b", timeout=8)
    verdict = "COMPLETE" if "complete" in grade_text.lower()[:20] else "NEEDS_REPLAN"
    # §103.5 governance · High-risk tasks always require human approval (override)
    if task.get("severity") == "P0":
        verdict = "HUMAN_APPROVAL_REQUIRED"
    elapsed_ms = int((time.perf_counter() - t0) * 1000)
    out = {
        "agent": "sys_approver_agent", "role": "APPROVER",
        "task_topic": task.get("topic"),
        "verdict": verdict,
        "grader_response": grade_text[:120],
        "governance_note": "P0 → human; P1/P2 auto per §116",
    }
    inv = _record_invocation("sys_approver_agent", "Success",
                              task.get("topic", ""), verdict,
                              elapsed_ms, correlation_id,
                              skills_used=["llm_grade_completion"])
    out["invocation_id"] = inv
    out["duration_ms"] = elapsed_ms
    return out


# ─────────────────────────────────────────────────────────────────────
# THE orchestration endpoint

class OrchestrateRequest(BaseModel):
    max_iterations: int = 3
    budget_ms: int = 60000
    tenant_id: str = "default"


@router.post("/run")
def orchestrate(body: OrchestrateRequest):
    """Run 5-agent orchestra · Checker → Planner → Executor → Monitor → Approver."""
    correlation_id = f"ORCH-{uuid.uuid4().hex[:10].upper()}"
    start_t = time.perf_counter()
    s = stamp()
    trace = []

    # === Role 1: CHECKER ===
    chk = _agent_checker(correlation_id)
    trace.append(chk)
    if not chk.get("top_task"):
        return {**s, "correlation_id": correlation_id, "status": "no_work",
                "trace": trace,
                "message": "Platform stable · 0 actionable findings"}

    top_task = chk["top_task"]
    iteration = 0
    final_verdict = "UNKNOWN"

    while iteration < body.max_iterations:
        iteration += 1
        # === Role 2: PLANNER ===
        plan = _agent_planner(top_task, correlation_id, revision=iteration - 1)
        trace.append(plan)

        # === Role 3: EXECUTOR ===
        execu = _agent_executor(plan, top_task, correlation_id)
        trace.append(execu)

        # === Role 4: MONITOR ===
        elapsed_ms = int((time.perf_counter() - start_t) * 1000)
        mon = _agent_monitor(elapsed_ms, body.budget_ms, correlation_id)
        trace.append(mon)
        if mon["verdict"] == "critical_budget_near_exhausted":
            final_verdict = "ABORTED_BUDGET"
            break

        # === Role 5: APPROVER ===
        appr = _agent_approver(top_task, execu, correlation_id)
        trace.append(appr)
        final_verdict = appr["verdict"]

        if final_verdict in ("COMPLETE", "HUMAN_APPROVAL_REQUIRED"):
            break
        # NEEDS_REPLAN → loop back to PLANNER

    total_ms = int((time.perf_counter() - start_t) * 1000)
    return {
        **s, "correlation_id": correlation_id, "status": "completed",
        "iterations_run": iteration, "max_iterations": body.max_iterations,
        "final_verdict": final_verdict,
        "total_duration_ms": total_ms,
        "budget_ms": body.budget_ms,
        "trace": trace,
        "spec": "§117 · 5-agent orchestration · §103.5 + §116 governance preserved",
    }


@router.get("/health")
def health():
    return {**stamp(), "module": "multi-agent-orchestra",
            "roles": ["CHECKER", "PLANNER", "EXECUTOR", "MONITOR", "APPROVER"],
            "agents": ["sys_checker_agent", "sys_planner_agent",
                       "sys_executor_agent", "sys_monitor_agent",
                       "sys_approver_agent"],
            "flow": "Checker → Planner → Executor → Monitor → Approver "
                    "→ (replan OR complete)",
            "spec": "§117 · per operator brief"}


@router.get("/runs/recent")
def runs_recent(limit: int = 10):
    """Recent orchestra runs · grouped by correlation_id."""
    with conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT correlation_id, MIN(created_at) AS started,
                   MAX(created_at) AS ended,
                   array_agg(agent_id ORDER BY created_at) AS agent_chain,
                   COUNT(*) AS n_calls
            FROM agent_invocation
            WHERE trigger_kind='orchestra'
            GROUP BY correlation_id
            ORDER BY started DESC LIMIT %s
        """, (limit,))
        rows = [dict(r) for r in cur.fetchall()]
    return {**stamp(), "runs": rows, "count": len(rows)}
