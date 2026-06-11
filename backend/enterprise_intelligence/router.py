"""/api/v1/enterprise-intelligence/* · Iter 76 · §103 Phase 9 (EIL)."""
from __future__ import annotations

from datetime import datetime, timezone

import psycopg2
import psycopg2.extras
from fastapi import APIRouter
from pydantic import BaseModel

from core.config import get_settings

router = APIRouter(prefix="/api/v1/enterprise-intelligence", tags=["enterprise-intelligence"])


def _conn():
    return psycopg2.connect(get_settings().database_url)


# ─────────────────────────────────────────────────────────────────────
# Digital Twin · live snapshot of the platform

@router.get("/digital-twin")
def digital_twin():
    """Live snapshot · agents · workflows · cost · risk · compliance."""
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # Agents
        cur.execute("""
            SELECT
              COUNT(*) FILTER (WHERE status='Active') AS active_agents,
              COUNT(*) FILTER (WHERE risk_level='High') AS high_risk_agents,
              COUNT(*) FILTER (WHERE autonomy_level='Approval Required') AS hitl_agents,
              COUNT(DISTINCT department_id) AS departments
            FROM agent_registry
        """)
        agents = dict(cur.fetchone())

        # Workflows
        cur.execute("""
            SELECT
              status, COUNT(*) AS n FROM workflow_run
            GROUP BY status
        """)
        wfs = {r["status"]: r["n"] for r in cur.fetchall()}

        # Recent invocations
        cur.execute("""
            SELECT
              COUNT(*) AS total_24h,
              COUNT(*) FILTER (WHERE status='Success') AS success_24h,
              COUNT(*) FILTER (WHERE status IN ('Failed','PartialFailure')) AS failed_24h,
              COALESCE(SUM(cost_usd), 0) AS cost_24h,
              COALESCE(SUM(tokens_in + tokens_out), 0) AS tokens_24h,
              COALESCE(AVG(duration_ms), 0) AS avg_duration_ms
            FROM agent_invocation
            WHERE created_at > NOW() - INTERVAL '24 hours'
        """)
        inv = dict(cur.fetchone())

        # Cost centers
        cur.execute("""
            SELECT
              COUNT(*) AS n_centers,
              COALESCE(SUM(budget_monthly), 0) AS total_budget,
              COALESCE(SUM(spent_mtd), 0) AS spent_mtd
            FROM cost_center
        """)
        cost = dict(cur.fetchone())

        # Risks (kill switches active)
        cur.execute("""
            SELECT COUNT(*) AS n_killed FROM kill_switch WHERE is_killed = true
        """)
        risks = dict(cur.fetchone())

        # Projects provisioned
        cur.execute("""
            SELECT
              COUNT(*) AS n_projects,
              COUNT(*) FILTER (WHERE status='active') AS active_projects
            FROM tenant_project
        """)
        projects = dict(cur.fetchone())

        # Approvals pending
        cur.execute("""
            SELECT COUNT(*) AS n_pending FROM approval_request WHERE status='requested'
        """)
        approvals = dict(cur.fetchone())

        # Incidents
        cur.execute("""
            SELECT COUNT(*) AS open_incidents
            FROM agent_incident
            WHERE status NOT IN ('resolved','closed')
        """)
        incidents = dict(cur.fetchone())

    return {
        "as_of": datetime.now(timezone.utc).isoformat(),
        "spec": "§103.9 · Enterprise Digital Twin",
        "agents": agents,
        "workflows": {"by_status": wfs, "total": sum(wfs.values())},
        "invocations_24h": {
            "total": inv["total_24h"],
            "success": inv["success_24h"],
            "failed": inv["failed_24h"],
            "cost_usd": float(inv["cost_24h"]),
            "tokens": int(inv["tokens_24h"]),
            "avg_duration_ms": round(float(inv["avg_duration_ms"]), 1),
        },
        "cost": {
            "n_centers": cost["n_centers"],
            "monthly_budget_usd": float(cost["total_budget"]),
            "spent_mtd_usd": float(cost["spent_mtd"]),
        },
        "risks": risks,
        "projects": projects,
        "approvals_pending": approvals["n_pending"],
        "open_incidents": incidents["open_incidents"],
    }


# ─────────────────────────────────────────────────────────────────────
# Knowledge Graph (simplified · entity-relationship view)

@router.get("/knowledge-graph")
def knowledge_graph(limit: int = 200):
    """Entity-relationship snapshot · agents → skills → mappings · workflows → steps."""
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT agent_id, department_id, business_domain, risk_level
            FROM agent_registry WHERE status='Active'
            ORDER BY agent_id LIMIT %s
        """, (limit,))
        agents = [dict(r) for r in cur.fetchall()]

        cur.execute("""
            SELECT agent_id, skill_id FROM agent_skill_mapping
            WHERE status='Active' ORDER BY agent_id, skill_id LIMIT %s
        """, (limit * 3,))
        edges_skill = [dict(r) for r in cur.fetchall()]

        cur.execute("""
            SELECT project_id, blueprint_id, artifact_type, artifact_id
            FROM deploy_manifest LIMIT %s
        """, (limit,))
        deploys = [dict(r) for r in cur.fetchall()]

    nodes = []
    seen = set()
    for a in agents:
        nid = f"agent:{a['agent_id']}"
        if nid not in seen:
            nodes.append({"id": nid, "type": "agent", "label": a["agent_id"],
                          "department": a["department_id"], "risk": a["risk_level"]})
            seen.add(nid)
    edges = []
    for e in edges_skill:
        edges.append({"source": f"agent:{e['agent_id']}",
                      "target": f"skill:{e['skill_id']}",
                      "type": "uses"})
        if f"skill:{e['skill_id']}" not in seen:
            nodes.append({"id": f"skill:{e['skill_id']}", "type": "skill",
                          "label": e['skill_id']})
            seen.add(f"skill:{e['skill_id']}")
    for d in deploys:
        pid = f"project:{d['project_id']}"
        if pid not in seen:
            nodes.append({"id": pid, "type": "project", "label": d["project_id"]})
            seen.add(pid)
        edges.append({"source": pid, "target": f"{d['artifact_type']}:{d['artifact_id']}",
                      "type": "contains"})

    return {
        "nodes": nodes[:300],
        "edges": edges[:600],
        "n_nodes": len(nodes), "n_edges": len(edges),
        "spec": "§103.9 · Enterprise Knowledge Graph (simplified)",
    }


# ─────────────────────────────────────────────────────────────────────
# Executive AI Advisor

class AdvisorQuery(BaseModel):
    question: str


@router.post("/advisor/ask")
def advisor_ask(body: AdvisorQuery):
    """Heuristic Executive AI Advisor · routes question → data-backed answer.

    Per §103.9 · acts as Virtual CIO/CTO/COO/CFO/CISO.
    """
    q = body.question.lower()
    answers = []

    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        if any(w in q for w in ["cost", "spend", "budget", "expense", "$"]):
            cur.execute("""
                SELECT SUM(cost_usd) AS spent, COUNT(*) AS n
                FROM agent_invocation WHERE created_at > NOW() - INTERVAL '24 hours'
            """)
            r = dict(cur.fetchone())
            cur.execute("""
                SELECT model_name, COUNT(*) AS n, SUM(cost_usd) AS cost
                FROM agent_invocation WHERE created_at > NOW() - INTERVAL '24 hours'
                GROUP BY model_name ORDER BY cost DESC NULLS LAST LIMIT 5
            """)
            top_models = [dict(x) for x in cur.fetchall()]
            answers.append({
                "lens": "Virtual CFO",
                "answer": f"${float(r['spent'] or 0):.4f} spent in 24h across {r['n']} invocations.",
                "evidence": {"top_models_by_cost": top_models},
            })

        if any(w in q for w in ["risk", "danger", "fail", "broken"]):
            cur.execute("""
                SELECT COUNT(*) AS fails FROM agent_invocation
                WHERE status IN ('Failed','PartialFailure') AND created_at > NOW() - INTERVAL '24 hours'
            """)
            n_fail = cur.fetchone()["fails"]
            cur.execute("""
                SELECT COUNT(*) AS killed FROM kill_switch WHERE is_killed=true
            """)
            n_killed = cur.fetchone()["killed"]
            cur.execute("""
                SELECT COUNT(*) AS open_inc FROM agent_incident
                WHERE status NOT IN ('resolved','closed')
            """)
            open_inc = cur.fetchone()["open_inc"]
            answers.append({
                "lens": "Virtual CRO",
                "answer": f"{n_fail} failed invocations in 24h · {n_killed} active kill-switches · {open_inc} open incidents.",
                "evidence": {"failed_24h": n_fail, "killed": n_killed, "open_incidents": open_inc},
            })

        if any(w in q for w in ["security", "abac", "rbac", "auth", "pii"]):
            cur.execute("SELECT COUNT(*) FROM abac_policy WHERE status='active'")
            n_policies = cur.fetchone()["count"]
            cur.execute("SELECT COUNT(*) FROM access_registry")
            n_grants = cur.fetchone()["count"]
            answers.append({
                "lens": "Virtual CISO",
                "answer": f"{n_policies} active ABAC policies · {n_grants} access grants in registry.",
                "evidence": {"abac_policies": n_policies, "access_grants": n_grants},
            })

        if any(w in q for w in ["agent", "workforce", "headcount", "utilization"]):
            cur.execute("SELECT COUNT(*) AS n FROM agent_registry WHERE status='Active'")
            n_active = cur.fetchone()["n"]
            cur.execute("""
                SELECT agent_id, COUNT(*) AS n FROM agent_invocation
                WHERE created_at > NOW() - INTERVAL '24 hours'
                GROUP BY agent_id ORDER BY n DESC LIMIT 5
            """)
            top = [dict(x) for x in cur.fetchall()]
            answers.append({
                "lens": "Virtual COO",
                "answer": f"{n_active} active agents · top-5 by usage: {[t['agent_id'] for t in top]}",
                "evidence": {"top_5_by_usage": top, "total_active": n_active},
            })

        if any(w in q for w in ["compliance", "audit", "gdpr", "soc2", "iso"]):
            cur.execute("""
                SELECT COUNT(*) FROM audit_log WHERE created_at > NOW() - INTERVAL '24 hours'
            """)
            n_audit = cur.fetchone()["count"]
            cur.execute("SELECT COUNT(*) FROM ai_policy WHERE status='Active'")
            n_pol = cur.fetchone()["count"]
            answers.append({
                "lens": "Virtual Compliance Officer",
                "answer": f"{n_audit} audit events in 24h · {n_pol} active AI policies enforced.",
                "evidence": {"audit_24h": n_audit, "ai_policies": n_pol},
            })

        if any(w in q for w in ["project", "portfolio", "deploy"]):
            cur.execute("""
                SELECT COUNT(*) AS n, COUNT(*) FILTER (WHERE status='active') AS active
                FROM tenant_project
            """)
            r = dict(cur.fetchone())
            cur.execute("""
                SELECT blueprint_id, COUNT(*) AS n FROM tenant_project
                GROUP BY blueprint_id ORDER BY n DESC LIMIT 5
            """)
            by_bp = [dict(x) for x in cur.fetchall()]
            answers.append({
                "lens": "Virtual CIO",
                "answer": f"{r['active']} active projects out of {r['n']} provisioned.",
                "evidence": {"active": r["active"], "total": r["n"], "by_blueprint": by_bp},
            })

    if not answers:
        answers.append({
            "lens": "Default",
            "answer": "Ask about: cost · risk · security · agent utilization · compliance · projects.",
            "evidence": {},
        })

    return {
        "question": body.question,
        "answers": answers,
        "n_answers": len(answers),
        "as_of": datetime.now(timezone.utc).isoformat(),
        "spec": "§103.9 · Executive AI Advisor",
    }


# ─────────────────────────────────────────────────────────────────────
# Predictions

@router.get("/predictions")
def predictions():
    """Forward-looking signals · simple heuristic predictions."""
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # Cost trend
        cur.execute("""
            SELECT
              SUM(cost_usd) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS today,
              SUM(cost_usd) FILTER (WHERE created_at BETWEEN NOW() - INTERVAL '48 hours' AND NOW() - INTERVAL '24 hours') AS yesterday
            FROM agent_invocation
        """)
        c_row = dict(cur.fetchone())
        today = float(c_row["today"] or 0)
        yesterday = float(c_row["yesterday"] or 0)
        cost_trend = "stable"
        if yesterday > 0:
            delta_pct = ((today - yesterday) / yesterday) * 100
            cost_trend = "rising" if delta_pct > 10 else "falling" if delta_pct < -10 else "stable"

        # Failure trend
        cur.execute("""
            SELECT
              COUNT(*) FILTER (WHERE status IN ('Failed','PartialFailure') AND created_at > NOW() - INTERVAL '1 hour') AS recent,
              COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') AS total
            FROM agent_invocation
        """)
        f_row = dict(cur.fetchone())
        recent_fail_rate = (f_row["recent"] / max(f_row["total"], 1)) * 100

        # Queue depth
        cur.execute("""
            SELECT COUNT(*) FROM agent_queue WHERE queue_status IN ('Pending', 'Queued')
        """)
        queue_depth = cur.fetchone()["count"]

        # Approval backlog
        cur.execute("SELECT COUNT(*) FROM approval_request WHERE status='requested'")
        backlog = cur.fetchone()["count"]

    predictions = []
    if cost_trend == "rising":
        predictions.append({
            "severity": "warning",
            "headline": "Cost trending up vs yesterday",
            "detail": f"Today ${today:.4f} vs yesterday ${yesterday:.4f}",
            "action": "Investigate top-cost agents · consider switching to Ollama",
        })
    if recent_fail_rate > 10:
        predictions.append({
            "severity": "critical",
            "headline": f"Failure rate {recent_fail_rate:.1f}% in last hour",
            "detail": "Likely degradation · agent quality or MCP outage",
            "action": "Check sys_watchdog_errors + sys_watchdog_mcp · activate kill-switch if needed",
        })
    if queue_depth > 30:
        predictions.append({
            "severity": "warning",
            "headline": f"Queue depth {queue_depth} · scale risk",
            "detail": "Concurrency control may rate-limit further invocations",
            "action": "Scale workers · or raise concurrency_control max_concurrent",
        })
    if backlog > 10:
        predictions.append({
            "severity": "warning",
            "headline": f"{backlog} approval requests pending",
            "detail": "Operator approval bottleneck",
            "action": "Review queue · auto-approve low-risk · escalate high-risk",
        })
    if not predictions:
        predictions.append({"severity": "info", "headline": "All signals stable", "detail": "", "action": ""})

    return {"predictions": predictions, "count": len(predictions),
            "as_of": datetime.now(timezone.utc).isoformat(),
            "spec": "§103.9 · Predictive Enterprise AI"}


# ─────────────────────────────────────────────────────────────────────
# Scenario Simulation

class Scenario(BaseModel):
    scenario: str  # "double_traffic" / "ollama_only" / "kill_high_risk" / "halve_budget"
    notes: str | None = None


@router.post("/scenarios/simulate")
def simulate(body: Scenario):
    """Simulate · projects current state under hypothetical change."""
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT COUNT(*) AS n, SUM(cost_usd) AS cost
            FROM agent_invocation WHERE created_at > NOW() - INTERVAL '24 hours'
        """)
        r = dict(cur.fetchone())
        baseline_n = r["n"]
        baseline_cost = float(r["cost"] or 0)

    impact = {}
    if body.scenario == "double_traffic":
        impact = {
            "projected_invocations_24h": baseline_n * 2,
            "projected_cost_24h": round(baseline_cost * 2, 4),
            "projected_queue_depth": baseline_n * 2 // 50,
            "concurrency_risk": "high" if baseline_n * 2 > 1000 else "medium",
        }
    elif body.scenario == "ollama_only":
        impact = {
            "projected_invocations_24h": baseline_n,
            "projected_cost_24h": 0.0,
            "savings_per_24h": round(baseline_cost, 4),
            "latency_impact": "+3-5s per LLM call (Ollama local · slower than cloud)",
        }
    elif body.scenario == "kill_high_risk":
        with _conn() as c, c.cursor() as cur:
            cur.execute("""
                SELECT COUNT(*) FROM agent_registry WHERE risk_level='High' AND status='Active'
            """)
            n_high = cur.fetchone()[0]
        impact = {
            "agents_killed": n_high,
            "projected_invocations_24h": int(baseline_n * 0.7),
            "expected_blocked_workflows": "high-risk-only flows",
            "rollback_cost": "low · re-enable via kill-switch UI",
        }
    elif body.scenario == "halve_budget":
        impact = {
            "current_cost_24h": baseline_cost,
            "halved_budget": round(baseline_cost / 2, 4),
            "required_action": "Switch to Ollama + cache + rate-limit + drop low-priority agents",
            "feasibility": "high" if baseline_cost > 0 else "trivial",
        }
    else:
        impact = {"error": "scenario must be one of: double_traffic · ollama_only · kill_high_risk · halve_budget"}

    return {
        "scenario": body.scenario, "notes": body.notes,
        "baseline": {"invocations_24h": baseline_n, "cost_usd_24h": baseline_cost},
        "projected": impact,
        "as_of": datetime.now(timezone.utc).isoformat(),
        "spec": "§103.9 · Scenario Simulation",
    }


@router.get("/health")
def health():
    return {"status": "ok", "module": "enterprise-intelligence",
            "policy_version": "§103.9", "phase": 9,
            "spec": "Enterprise Intelligence Layer (Digital Twin + Advisor + Predictions + Simulation)"}
