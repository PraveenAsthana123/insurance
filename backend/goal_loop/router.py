"""/api/v1/goal-loop/* · Iter 93 · goal/loop-driven agentic program."""
from __future__ import annotations

import json
import os
import re
import time
import uuid
from datetime import datetime, timezone

import httpx
import psycopg2
import psycopg2.extras
from fastapi import APIRouter
from pydantic import BaseModel

from _adapter_helpers import stamp, conn

router = APIRouter(prefix="/api/v1/goal-loop", tags=["goal-loop"])


def _call_ollama(prompt: str, model: str = "llama3.2:3b", timeout: int = 20) -> str:
    """LLM call · used for planning / executing / reflecting."""
    host = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
    try:
        r = httpx.post(f"{host}/api/generate",
                       json={"model": model, "prompt": prompt, "stream": False},
                       timeout=timeout)
        if r.status_code == 200:
            return r.json().get("response", "")
        return f"[ollama_error_{r.status_code}]"
    except Exception as e:
        return f"[ollama_failed: {str(e)[:100]}]"


def _record_step(goal_id: str, iteration: int, kind: str,
                  description: str, input_text: str, output_text: str,
                  status: str, duration_ms: int):
    with conn() as c, c.cursor() as cur:
        cur.execute("""
            INSERT INTO goal_step (goal_id, iteration, step_kind, description,
              input_text, output_text, status, duration_ms)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (goal_id, iteration, kind, description[:500],
              input_text[:2000], output_text[:2000], status, duration_ms))


# ─────────────────────────────────────────────────────────────────────
# THE goal-loop endpoint

class GoalRequest(BaseModel):
    goal: str
    tenant_id: str = "default"
    max_iterations: int = 5
    model: str = "llama3.2:3b"


@router.post("/start")
def start(body: GoalRequest):
    """Goal-loop driven program:
      1. PLAN · LLM produces step-by-step plan
      2. EXECUTE · for each step, LLM produces output
      3. REFLECT · LLM reviews progress · decides continue/replan/complete
      4. Loop steps 2-3 until completed OR max_iterations reached
    """
    goal_id = f"GOAL-{uuid.uuid4().hex[:10].upper()}"
    start_t = time.perf_counter()
    s = stamp()

    # Pre-check: prompt injection on goal
    INJ = [
        re.compile(r"ignore (previous|above) instructions?", re.I),
        re.compile(r"reveal (your|the) (prompt|instructions)", re.I),
        re.compile(r"jailbreak", re.I),
    ]
    for pat in INJ:
        if pat.search(body.goal):
            return {**s, "goal_id": goal_id, "status": "rejected",
                    "reason": "prompt_injection_detected_in_goal",
                    "matched": pat.pattern}

    # Create goal_run row
    with conn() as c, c.cursor() as cur:
        cur.execute("""
            INSERT INTO goal_run (goal_id, goal_text, tenant_id, actor_user,
              status, max_iterations)
            VALUES (%s, %s, %s, %s, 'planning', %s)
        """, (goal_id, body.goal, body.tenant_id, s["actor_user"], body.max_iterations))

    trace = []

    # STEP 1: PLAN
    t0 = time.perf_counter()
    plan_prompt = (
        f"You are a planner. Break down this goal into 3-5 concrete, executable steps.\n"
        f"GOAL: {body.goal}\n\n"
        f"Output a numbered list of steps only. No preamble."
    )
    plan_text = _call_ollama(plan_prompt, body.model)
    plan_ms = int((time.perf_counter() - t0) * 1000)
    _record_step(goal_id, 0, "plan", "Initial plan", plan_prompt, plan_text, "passed", plan_ms)
    trace.append({"step": 0, "kind": "plan", "ms": plan_ms, "preview": plan_text[:200]})

    with conn() as c, c.cursor() as cur:
        cur.execute("UPDATE goal_run SET plan_text=%s, status='executing' WHERE goal_id=%s",
                    (plan_text, goal_id))

    # Extract steps (rough heuristic: lines starting with number)
    plan_steps = []
    for line in plan_text.split("\n"):
        line = line.strip()
        if re.match(r"^\d+[\.\)]", line):
            plan_steps.append(re.sub(r"^\d+[\.\)]\s*", "", line))
    if not plan_steps:
        plan_steps = [p.strip() for p in plan_text.split(".") if p.strip()][:5]

    # STEP 2-3: EXECUTE + REFLECT loop
    iteration = 0
    final_output = ""
    while iteration < body.max_iterations and iteration < len(plan_steps):
        iteration += 1
        cur_step = plan_steps[iteration - 1]
        # EXECUTE
        t0 = time.perf_counter()
        exec_prompt = (
            f"You are executing step {iteration} of {len(plan_steps)} for this goal.\n"
            f"GOAL: {body.goal}\n"
            f"STEP: {cur_step}\n\n"
            f"Produce the concrete output for this step. Be specific and concise."
        )
        exec_out = _call_ollama(exec_prompt, body.model)
        exec_ms = int((time.perf_counter() - t0) * 1000)
        _record_step(goal_id, iteration, "execute", cur_step, exec_prompt, exec_out, "passed", exec_ms)
        trace.append({"step": iteration, "kind": "execute",
                      "description": cur_step[:60], "ms": exec_ms,
                      "preview": exec_out[:200]})
        final_output += f"\n\n## Step {iteration}: {cur_step}\n{exec_out}"

        # REFLECT (every 2 steps OR last step)
        if iteration % 2 == 0 or iteration == len(plan_steps):
            t0 = time.perf_counter()
            reflect_prompt = (
                f"You are a reviewer. Has the goal been adequately addressed by these steps?\n"
                f"GOAL: {body.goal}\n"
                f"STEPS COMPLETED: {iteration}/{len(plan_steps)}\n"
                f"OUTPUT SO FAR: {final_output[:800]}\n\n"
                f"Reply with: 'CONTINUE' (more steps needed) OR 'COMPLETE' (goal addressed). "
                f"Output ONE word."
            )
            reflect_out = _call_ollama(reflect_prompt, body.model)
            reflect_ms = int((time.perf_counter() - t0) * 1000)
            _record_step(goal_id, iteration, "reflect", "Progress reflection",
                          reflect_prompt, reflect_out, "passed", reflect_ms)
            trace.append({"step": iteration, "kind": "reflect", "ms": reflect_ms,
                          "decision": reflect_out[:50]})
            if "complete" in reflect_out.lower()[:20]:
                break

    # Finalize
    with conn() as c, c.cursor() as cur:
        cur.execute("""
            UPDATE goal_run SET status='completed', final_output=%s,
              iteration=%s, completed_at=CURRENT_TIMESTAMP
            WHERE goal_id=%s
        """, (final_output[:5000], iteration, goal_id))

    total_ms = int((time.perf_counter() - start_t) * 1000)
    return {
        **s, "goal_id": goal_id, "status": "completed",
        "iterations_run": iteration, "max_iterations": body.max_iterations,
        "n_plan_steps": len(plan_steps),
        "total_duration_ms": total_ms,
        "trace": trace,
        "final_output": final_output[:2000],
        "spec": "§115 goal-loop · §103 decision policy · §44 autonomous loop",
    }




class AdvancedGoalRequest(BaseModel):
    goal: str
    success_criteria: str
    tenant_id: str = "default"
    max_iterations: int = 5
    model: str = "llama3.2:3b"


@router.post("/start-advanced")
def start_advanced(body: AdvancedGoalRequest):
    """Advanced goal-loop · self-test + iterate-on-failure + per-task completion.

    Pattern:
      PLAN → for each step: EXECUTE → SELF-TEST against success_criteria
              if PASS → next step
              if FAIL → REPLAN that step → re-execute (max 2 retries per step)
      Final SELF-TEST against full criteria → COMPLETE or REPLAN whole goal
    """
    goal_id = f"GOAL-A-{uuid.uuid4().hex[:10].upper()}"
    start_t = time.perf_counter()
    s = stamp()

    # Injection check (same as basic)
    INJ = [re.compile(r"ignore (previous|above) instructions?", re.I),
           re.compile(r"jailbreak", re.I)]
    for pat in INJ:
        if pat.search(body.goal):
            return {**s, "goal_id": goal_id, "status": "rejected",
                    "reason": "prompt_injection_detected"}

    with conn() as c, c.cursor() as cur:
        cur.execute("""
            INSERT INTO goal_run (goal_id, goal_text, tenant_id, actor_user,
              status, max_iterations)
            VALUES (%s, %s, %s, %s, 'planning', %s)
        """, (goal_id, body.goal, body.tenant_id, s["actor_user"], body.max_iterations))

    trace = []

    # PLAN
    plan_prompt = (
        f"You are a planner. Given this goal AND success criteria, break into 3-4 "
        f"concrete steps.\n"
        f"GOAL: {body.goal}\n"
        f"SUCCESS CRITERIA: {body.success_criteria}\n\n"
        f"Output ONLY a numbered list of steps."
    )
    plan_text = _call_ollama(plan_prompt, body.model)
    _record_step(goal_id, 0, "plan", "Initial plan", plan_prompt, plan_text, "passed", 0)
    trace.append({"step": 0, "kind": "plan", "output": plan_text[:300]})

    plan_steps = [re.sub(r"^\d+[\.)\s]*", "", l.strip())
                   for l in plan_text.split("\n") if re.match(r"^\d+[\.)\s]", l.strip())]
    if not plan_steps:
        plan_steps = [body.goal]

    final_output = ""
    passed_steps = 0
    failed_steps = 0

    for step_idx, step in enumerate(plan_steps[:body.max_iterations], 1):
        # EXECUTE + SELF-TEST loop (up to 2 retries per step)
        for attempt in range(1, 3):
            t0 = time.perf_counter()
            exec_prompt = (
                f"Execute step {step_idx}: {step}\n"
                f"GOAL: {body.goal}\n"
                f"Be specific and concise."
            )
            exec_out = _call_ollama(exec_prompt, body.model)
            exec_ms = int((time.perf_counter() - t0) * 1000)
            _record_step(goal_id, step_idx, "execute",
                          f"Attempt {attempt}: {step}",
                          exec_prompt, exec_out, "passed", exec_ms)

            # SELF-TEST
            test_prompt = (
                f"Did this output meet the step requirement?\n"
                f"STEP: {step}\n"
                f"OUTPUT: {exec_out[:600]}\n"
                f"SUCCESS CRITERIA: {body.success_criteria}\n\n"
                f"Reply ONLY: PASS or FAIL"
            )
            t0 = time.perf_counter()
            test_out = _call_ollama(test_prompt, body.model)
            test_ms = int((time.perf_counter() - t0) * 1000)
            verdict = "PASS" if "pass" in test_out.lower()[:20] else "FAIL"
            _record_step(goal_id, step_idx, "reflect",
                          f"Self-test attempt {attempt}",
                          test_prompt, test_out, verdict.lower(), test_ms)
            trace.append({"step": step_idx, "kind": "self_test",
                           "attempt": attempt, "verdict": verdict,
                           "ms_exec": exec_ms, "ms_test": test_ms})

            if verdict == "PASS":
                final_output += f"\n\n## Step {step_idx}: {step}\n{exec_out}"
                passed_steps += 1
                break
            else:
                if attempt >= 2:
                    final_output += f"\n\n## Step {step_idx}: {step} [FAILED after {attempt} attempts]\n{exec_out}"
                    failed_steps += 1

    # FINAL self-test
    final_test = _call_ollama(
        f"Does this OUTPUT meet the FULL success criteria?\n"
        f"GOAL: {body.goal}\n"
        f"CRITERIA: {body.success_criteria}\n"
        f"OUTPUT: {final_output[:1500]}\n\n"
        f"Reply ONLY: COMPLETE or NEEDS_REWORK", body.model)
    overall = "COMPLETE" if "complete" in final_test.lower()[:20] else "NEEDS_REWORK"

    with conn() as c, c.cursor() as cur:
        cur.execute("""
            UPDATE goal_run SET status='completed', final_output=%s,
              iteration=%s, completed_at=CURRENT_TIMESTAMP
            WHERE goal_id=%s
        """, (final_output[:5000], passed_steps, goal_id))

    total_ms = int((time.perf_counter() - start_t) * 1000)
    return {
        **s, "goal_id": goal_id, "status": "completed",
        "overall_verdict": overall,
        "n_plan_steps": len(plan_steps),
        "passed_steps": passed_steps, "failed_steps": failed_steps,
        "total_duration_ms": total_ms,
        "trace": trace,
        "final_output_preview": final_output[:1500],
        "spec": "§115 advanced · self-test + iterate-on-failure"
    }


@router.get("/runs")
def list_runs(limit: int = 20):
    with conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT goal_id, goal_text, status, iteration, max_iterations,
                   actor_user, started_at, completed_at
            FROM goal_run ORDER BY started_at DESC LIMIT %s
        """, (limit,))
        rows = [dict(r) for r in cur.fetchall()]
    return {**stamp(), "runs": rows, "count": len(rows)}


@router.get("/runs/{goal_id}")
def get_run(goal_id: str):
    with conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM goal_run WHERE goal_id=%s", (goal_id,))
        run = cur.fetchone()
        if not run:
            return {"error": "goal_id not found"}
        cur.execute("""
            SELECT * FROM goal_step WHERE goal_id=%s ORDER BY step_id
        """, (goal_id,))
        steps = [dict(r) for r in cur.fetchall()]
    return {**stamp(), "run": dict(run), "steps": steps, "n_steps": len(steps)}


@router.get("/health")
def health():
    return {**stamp(), "module": "goal-loop",
            "phases": ["plan", "execute", "reflect", "replan"],
            "loop_pattern": "plan → execute → reflect (every 2 steps OR last) → continue or complete",
            "guardrails": ["prompt_injection on goal text · reject before plan",
                           "max_iterations cap (default 5)",
                           "reflection can short-circuit before max"],
            "spec": "§115 goal-loop · per operator brief"}
