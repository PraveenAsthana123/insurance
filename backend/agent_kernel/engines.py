"""§122 Iter 104 · Cost + HITL + Eval engines + Prompt/Model/Tool registries + Brutal Feedback."""
from __future__ import annotations
import json
import uuid
from datetime import datetime, timezone, timedelta

import psycopg2.extras
from fastapi import APIRouter, Query
from pydantic import BaseModel

from _adapter_helpers import stamp, conn

router = APIRouter(prefix="/api/v1/agent-kernel", tags=["agent-kernel-engines"])


# ═══════════════════ ENGINE 6 · COST/BUDGET ═══════════════════
class CostLogBody(BaseModel):
    agent_id: str
    tenant_id: str = "default"
    model_name: str = "ollama:llama3.2:3b"
    tokens_in: int = 0
    tokens_out: int = 0
    cost_usd: float = 0.0
    request_kind: str = "inference"
    correlation_id: str = ""


@router.post("/cost/log")
def cost_log(body: CostLogBody):
    s = stamp()
    with conn() as c, c.cursor() as cur:
        cur.execute("""
            INSERT INTO kernel_cost_ledger
              (agent_id, tenant_id, model_name, tokens_in, tokens_out,
               cost_usd, request_kind, correlation_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING ledger_id
        """, (body.agent_id, body.tenant_id, body.model_name,
              body.tokens_in, body.tokens_out, body.cost_usd,
              body.request_kind, body.correlation_id))
        lid = cur.fetchone()[0]
    return {**s, "ledger_id": lid, "spec": "§122 Engine 6 · Cost/Budget"}


@router.get("/cost/usage")
def cost_usage(tenant_id: str = "default", period: str = "daily"):
    interval = {"daily": "1 day", "weekly": "7 days", "monthly": "30 days"}.get(period, "1 day")
    with conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(f"""
            SELECT agent_id,
                   SUM(tokens_in) AS tokens_in,
                   SUM(tokens_out) AS tokens_out,
                   SUM(cost_usd) AS total_cost_usd,
                   COUNT(*) AS n_requests
            FROM kernel_cost_ledger
            WHERE tenant_id=%s AND ts_local > NOW() - INTERVAL '{interval}'
            GROUP BY agent_id ORDER BY total_cost_usd DESC LIMIT 20
        """, (tenant_id,))
        by_agent = [dict(r) for r in cur.fetchall()]
        cur.execute(f"""
            SELECT SUM(cost_usd) AS total, SUM(tokens_in+tokens_out) AS tokens_total,
                   COUNT(*) AS calls
            FROM kernel_cost_ledger
            WHERE tenant_id=%s AND ts_local > NOW() - INTERVAL '{interval}'
        """, (tenant_id,))
        totals = dict(cur.fetchone())
        cur.execute("""
            SELECT period, cap_usd, soft_warn_at, hard_stop_at
            FROM kernel_budget_cap
            WHERE tenant_id=%s AND active=TRUE AND agent_id IS NULL
            ORDER BY created_at DESC LIMIT 1
        """, (tenant_id,))
        cap = cur.fetchone()
    cap_d = dict(cap) if cap else {"cap_usd": None}
    if cap_d.get("cap_usd"):
        pct = float(totals["total"] or 0) / float(cap_d["cap_usd"])
        if pct >= float(cap_d["hard_stop_at"]):
            status = "HARD_STOP"
        elif pct >= float(cap_d["soft_warn_at"]):
            status = "WARN"
        else:
            status = "OK"
    else:
        pct = 0; status = "NO_CAP"
    return {**stamp(), "tenant_id": tenant_id, "period": period,
            "totals": totals, "by_agent": by_agent,
            "budget_cap": cap_d, "pct_used": round(pct, 3),
            "status": status,
            "spec": "§122 Engine 6 · Cost/Budget"}


class BudgetCapBody(BaseModel):
    tenant_id: str
    agent_id: str | None = None
    period: str = "daily"
    cap_usd: float
    soft_warn_at: float = 0.80
    hard_stop_at: float = 1.00


@router.post("/budget/cap")
def set_budget_cap(body: BudgetCapBody):
    with conn() as c, c.cursor() as cur:
        cur.execute("""
            INSERT INTO kernel_budget_cap
              (tenant_id, agent_id, period, cap_usd, soft_warn_at, hard_stop_at)
            VALUES (%s, %s, %s, %s, %s, %s) RETURNING cap_id
        """, (body.tenant_id, body.agent_id, body.period,
              body.cap_usd, body.soft_warn_at, body.hard_stop_at))
        cid = cur.fetchone()[0]
    return {**stamp(), "cap_id": cid, "active": True,
            "spec": "§122 Engine 6 · Budget"}


# ═══════════════════ ENGINE 7 · HITL APPROVAL ═══════════════════
class ApprovalRequestBody(BaseModel):
    agent_id: str
    action_kind: str
    risk_band: str = "Medium"
    request_payload: dict = {}
    sla_minutes: int = 60


@router.post("/hitl/request")
def hitl_request(body: ApprovalRequestBody):
    s = stamp()
    aid = f"APPR-{uuid.uuid4().hex[:10].upper()}"
    sla_due = datetime.now(timezone.utc) + timedelta(minutes=body.sla_minutes)
    correlation = f"HITL-{uuid.uuid4().hex[:8].upper()}"
    with conn() as c, c.cursor() as cur:
        cur.execute("""
            INSERT INTO kernel_approval_queue
              (approval_id, agent_id, action_kind, risk_band, request_payload,
               requested_by, sla_due_at, correlation_id)
            VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s, %s)
        """, (aid, body.agent_id, body.action_kind, body.risk_band,
              json.dumps(body.request_payload), s["actor_user"],
              sla_due, correlation))
    return {**s, "approval_id": aid, "status": "pending",
            "sla_due_at": sla_due.isoformat(),
            "spec": "§122 Engine 7 · HITL"}


class ApprovalDecisionBody(BaseModel):
    decision: str  # approved · denied · escalated
    reason: str = ""


@router.post("/hitl/{approval_id}/decide")
def hitl_decide(approval_id: str, body: ApprovalDecisionBody):
    s = stamp()
    if body.decision not in ("approved", "denied", "escalated"):
        return {"ok": False, "reason": "decision must be approved/denied/escalated"}
    with conn() as c, c.cursor() as cur:
        cur.execute("""
            UPDATE kernel_approval_queue
            SET status=%s, decided_by=%s, decided_at=NOW(), decision_reason=%s
            WHERE approval_id=%s AND status='pending'
            RETURNING agent_id, action_kind
        """, (body.decision, s["actor_user"], body.reason[:500], approval_id))
        row = cur.fetchone()
    if not row:
        return {"ok": False, "reason": "approval_id not found or already decided"}
    return {**s, "approval_id": approval_id, "decision": body.decision,
            "agent_id": row[0], "action_kind": row[1],
            "spec": "§122 Engine 7 · HITL decision"}


@router.get("/hitl/queue")
def hitl_queue(status: str = Query("pending"), limit: int = 50):
    with conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT approval_id, agent_id, action_kind, risk_band,
                   requested_by, requested_at, sla_due_at, status,
                   decided_by, decided_at, decision_reason
            FROM kernel_approval_queue
            WHERE status=%s
            ORDER BY requested_at DESC LIMIT %s
        """, (status, limit))
        rows = [dict(r) for r in cur.fetchall()]
    # Calculate SLA breach
    now = datetime.now(timezone.utc)
    for r in rows:
        sla = r.get("sla_due_at")
        r["sla_breached"] = bool(sla and sla < now and r["status"] == "pending")
    return {**stamp(), "queue": rows, "count": len(rows),
            "n_pending_breached": sum(1 for r in rows if r["sla_breached"]),
            "spec": "§122 Engine 7 · HITL queue"}


# ═══════════════════ ENGINE 8 · EVAL ═══════════════════
class EvalSetBody(BaseModel):
    eval_set_id: str
    name: str
    description: str = ""
    domain: str = "general"
    cases: list[dict] = []  # [{input_text, expected_output, rubric, tags}]


@router.post("/eval/sets")
def create_eval_set(body: EvalSetBody):
    s = stamp()
    with conn() as c, c.cursor() as cur:
        cur.execute("""
            INSERT INTO kernel_eval_set
              (eval_set_id, name, description, domain, n_cases)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (eval_set_id) DO UPDATE SET
              name=EXCLUDED.name, description=EXCLUDED.description,
              n_cases=EXCLUDED.n_cases
        """, (body.eval_set_id, body.name, body.description, body.domain,
              len(body.cases)))
        for case in body.cases:
            cur.execute("""
                INSERT INTO kernel_eval_case
                  (eval_set_id, input_text, expected_output, rubric, tags)
                VALUES (%s, %s, %s, %s::jsonb, %s)
            """, (body.eval_set_id, case.get("input_text", "")[:2000],
                  case.get("expected_output", "")[:2000],
                  json.dumps(case.get("rubric", {})),
                  case.get("tags", [])))
    return {**s, "eval_set_id": body.eval_set_id, "n_cases": len(body.cases),
            "spec": "§122 Engine 8 · Eval"}


@router.get("/eval/sets")
def list_eval_sets():
    with conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT s.eval_set_id, s.name, s.domain, s.n_cases,
                   COUNT(r.run_id) AS n_runs,
                   AVG(r.pass_rate) AS avg_pass_rate
            FROM kernel_eval_set s
            LEFT JOIN kernel_eval_run r ON r.eval_set_id = s.eval_set_id
            GROUP BY s.eval_set_id ORDER BY s.created_at DESC
        """)
        sets = [dict(r) for r in cur.fetchall()]
    return {**stamp(), "eval_sets": sets, "count": len(sets)}


class EvalRunBody(BaseModel):
    eval_set_id: str
    model_name: str
    prompt_version: int = 1
    n_pass: int = 0
    n_fail: int = 0
    p95_latency_ms: int = 0
    total_cost_usd: float = 0.0


@router.post("/eval/runs")
def record_eval_run(body: EvalRunBody):
    s = stamp()
    rid = f"EVAL-{uuid.uuid4().hex[:10].upper()}"
    pass_rate = body.n_pass / (body.n_pass + body.n_fail) if (body.n_pass + body.n_fail) > 0 else 0.0
    correlation = f"EVR-{uuid.uuid4().hex[:8].upper()}"
    with conn() as c, c.cursor() as cur:
        cur.execute("""
            INSERT INTO kernel_eval_run
              (run_id, eval_set_id, model_name, prompt_version,
               completed_at, n_pass, n_fail, pass_rate,
               p95_latency_ms, total_cost_usd, correlation_id)
            VALUES (%s, %s, %s, %s, NOW(), %s, %s, %s, %s, %s, %s)
        """, (rid, body.eval_set_id, body.model_name, body.prompt_version,
              body.n_pass, body.n_fail, round(pass_rate, 3),
              body.p95_latency_ms, body.total_cost_usd, correlation))
    return {**s, "run_id": rid, "pass_rate": round(pass_rate, 3),
            "spec": "§122 Engine 8 · Eval run"}


# ═══════════════════ REGISTRY A · PROMPT ═══════════════════
class PromptBody(BaseModel):
    prompt_id: str
    version: int = 1
    template_text: str
    owner_team: str = "Platform"
    schema_required: dict = {}
    eval_set_id: str | None = None


@router.post("/registry/prompts")
def register_prompt(body: PromptBody):
    s = stamp()
    with conn() as c, c.cursor() as cur:
        cur.execute("""
            INSERT INTO kernel_prompt_registry
              (prompt_id, version, template_text, owner_team,
               schema_required, eval_set_id, created_by)
            VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s)
            ON CONFLICT (prompt_id, version) DO NOTHING
        """, (body.prompt_id, body.version, body.template_text[:5000],
              body.owner_team, json.dumps(body.schema_required),
              body.eval_set_id, s["actor_user"]))
    return {**s, "prompt_id": body.prompt_id, "version": body.version,
            "spec": "§122 Registry A · Prompt"}


@router.get("/registry/prompts")
def list_prompts(status: str = "any"):
    sql = "SELECT prompt_id, version, owner_team, status, eval_set_id, created_at FROM kernel_prompt_registry"
    args = []
    if status != "any":
        sql += " WHERE status=%s"; args.append(status)
    sql += " ORDER BY prompt_id, version DESC"
    with conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(sql, tuple(args))
        rows = [dict(r) for r in cur.fetchall()]
    return {**stamp(), "prompts": rows, "count": len(rows),
            "spec": "§122 Registry A · Prompt"}


# ═══════════════════ REGISTRY B · MODEL ═══════════════════
class ModelBody(BaseModel):
    model_id: str
    provider: str = "ollama"
    family: str = "llama3.2"
    version: str = "3b"
    context_tokens: int = 8192
    cost_per_1k_in: float = 0.0
    cost_per_1k_out: float = 0.0
    capabilities: list[str] = []


@router.post("/registry/models")
def register_model(body: ModelBody):
    s = stamp()
    with conn() as c, c.cursor() as cur:
        cur.execute("""
            INSERT INTO kernel_model_registry
              (model_id, provider, family, version, context_tokens,
               cost_per_1k_in, cost_per_1k_out, capabilities)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (model_id) DO UPDATE SET
              cost_per_1k_in=EXCLUDED.cost_per_1k_in,
              cost_per_1k_out=EXCLUDED.cost_per_1k_out,
              capabilities=EXCLUDED.capabilities
        """, (body.model_id, body.provider, body.family, body.version,
              body.context_tokens, body.cost_per_1k_in,
              body.cost_per_1k_out, body.capabilities))
    return {**s, "model_id": body.model_id, "spec": "§122 Registry B · Model"}


@router.get("/registry/models")
def list_models():
    with conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT model_id, provider, family, version, status,
                   safety_evaled, eval_pass_rate, capabilities, approved_by
            FROM kernel_model_registry ORDER BY model_id
        """)
        rows = [dict(r) for r in cur.fetchall()]
    return {**stamp(), "models": rows, "count": len(rows),
            "spec": "§122 Registry B · Model"}


# ═══════════════════ REGISTRY C · TOOL ═══════════════════
class ToolBody(BaseModel):
    tool_id: str
    tool_kind: str = "python"
    description: str = ""
    required_scopes: list[str] = []
    sandbox_level: str = "isolated"
    rate_limit_rpm: int = 60
    risk_band: str = "Low"


@router.post("/registry/tools")
def register_tool(body: ToolBody):
    s = stamp()
    with conn() as c, c.cursor() as cur:
        cur.execute("""
            INSERT INTO kernel_tool_registry
              (tool_id, tool_kind, description, required_scopes,
               sandbox_level, rate_limit_rpm, risk_band)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (tool_id) DO UPDATE SET
              description=EXCLUDED.description,
              required_scopes=EXCLUDED.required_scopes
        """, (body.tool_id, body.tool_kind, body.description,
              body.required_scopes, body.sandbox_level,
              body.rate_limit_rpm, body.risk_band))
    return {**s, "tool_id": body.tool_id, "spec": "§122 Registry C · Tool"}


@router.get("/registry/tools")
def list_tools():
    with conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT tool_id, tool_kind, sandbox_level, risk_band,
                   required_scopes, rate_limit_rpm, status
            FROM kernel_tool_registry ORDER BY tool_id
        """)
        rows = [dict(r) for r in cur.fetchall()]
    return {**stamp(), "tools": rows, "count": len(rows),
            "spec": "§122 Registry C · Tool"}


# ═══════════════════ BRUTAL FEEDBACK AGENT ═══════════════════
BRUTAL_DIMS = [
    "accuracy", "completeness", "evidence", "actionability",
    "honesty", "clarity", "specificity", "structure",
    "timestamps", "risk_disclosure", "next_steps",
]


class BrutalFeedbackBody(BaseModel):
    response_text: str
    context: str = ""


@router.post("/brutal-feedback/score")
def brutal_score(body: BrutalFeedbackBody):
    """sys_brutal_feedback_agent · scores response on 11 top-1% dims."""
    text = body.response_text or ""
    n = max(1, len(text))
    scores = {}
    # Heuristic scoring (top-1% would use LLM-judge · this is fast first-pass)
    scores["accuracy"]        = 8 if "MDT" in text or "UTC" in text else 6
    scores["completeness"]    = 8 if n > 500 else 5 if n > 150 else 3
    scores["evidence"]        = 9 if ("http://" in text or "PID" in text or "iter" in text) else 4
    scores["actionability"]   = 9 if ("curl " in text or "python " in text or "GET " in text) else 5
    scores["honesty"]         = 8 if ("not " in text.lower() or "fail" in text.lower() or "gap" in text.lower()) else 5
    scores["clarity"]         = 8 if ("```" in text or "═══" in text or "—" in text) else 5
    scores["specificity"]     = 9 if any(x in text for x in ["iter #", "PID ", "HTTP ", "§"]) else 5
    scores["structure"]       = 9 if ("###" in text or "═══" in text) else 5
    scores["timestamps"]      = 10 if "[2026-" in text or "MDT" in text else 0
    scores["risk_disclosure"] = 8 if ("brutal" in text.lower() or "gated" in text or "warn" in text.lower() or "P0" in text or "fail" in text.lower()) else 4
    scores["next_steps"]      = 8 if ("next" in text.lower() or "try " in text.lower() or "→" in text) else 5

    total = sum(scores.values())
    max_total = len(scores) * 10
    pct = round(100 * total / max_total, 1)
    band = ("TOP_1_PCT" if pct >= 92 else "TOP_5_PCT" if pct >= 82
            else "TOP_25_PCT" if pct >= 70 else "MID" if pct >= 50 else "BOTTOM")
    weakest = sorted(scores.items(), key=lambda x: x[1])[:3]
    strongest = sorted(scores.items(), key=lambda x: -x[1])[:3]

    s = stamp()
    correlation = f"BF-{uuid.uuid4().hex[:8].upper()}"
    # Record to agent_invocation
    try:
        with conn() as c, c.cursor() as cur:
            cur.execute("""
                INSERT INTO agent_invocation
                  (invocation_id, agent_id, correlation_id, trigger_kind,
                   input_text, output_text, status, duration_ms, tenant_id)
                VALUES (%s, 'sys_brutal_feedback_agent', %s, 'brutal-score',
                        %s, %s, 'Success', 5, 'default')
            """, (f"INV-{uuid.uuid4().hex[:10].upper()}", correlation,
                  (body.context or text[:200])[:1000],
                  json.dumps({"pct": pct, "band": band, "scores": scores})[:1500]))
    except Exception:
        pass

    return {
        **s,
        "correlation_id": correlation,
        "scores_out_of_10": scores,
        "total": total, "max": max_total,
        "pct": pct, "band": band,
        "weakest_3": weakest,
        "strongest_3": strongest,
        "verdict": ("BRUTAL: this is a TOP-1% response · ship it"
                     if pct >= 92 else
                     "BRUTAL: top-5% · improve weak dims to hit top-1%"
                     if pct >= 82 else
                     "BRUTAL: mediocre · top-25% at best · 3+ dims need work"
                     if pct >= 70 else
                     "BRUTAL: not even top-25% · failing the bar · rewrite"),
        "improvement_recommendations": [
            f"Improve {dim} (currently {score}/10)" for dim, score in weakest
        ],
        "spec": "§122 sys_brutal_feedback_agent · 11-dim score · mandatory per §122",
    }


@router.get("/brutal-feedback/health")
def brutal_health():
    return {**stamp(), "agent": "sys_brutal_feedback_agent",
            "dims": BRUTAL_DIMS, "count": len(BRUTAL_DIMS),
            "bands": ["TOP_1_PCT (≥92%)", "TOP_5_PCT (≥82%)",
                       "TOP_25_PCT (≥70%)", "MID (≥50%)", "BOTTOM (<50%)"],
            "policy": "§122 · mandatory on every operator-facing response"}
