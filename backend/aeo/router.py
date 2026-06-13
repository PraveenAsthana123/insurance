"""/api/v1/aeo/* · Autonomous Enterprise Orchestrator · Layer 10.

Per operator 2026-06-12 23-level brief.

Endpoints:
  GET /dashboard       · top-of-pyramid KPIs (autonomy · decisions · trust)
  GET /goals           · enterprise_goal rows
  GET /objectives      · enterprise_objective rows (goal hierarchy)
  GET /policies        · enterprise_policy rows
  GET /decisions       · recent enterprise_decision rows
  GET /actions         · recent enterprise_action rows
  GET /constraints     · enterprise_constraint rows
  GET /scenarios       · enterprise_scenario rows
  GET /trust           · enterprise_trust rows (radar input)
  GET /health          · enterprise_health rows (radar input)
  GET /autonomy        · enterprise_autonomy daily rollup
"""
from __future__ import annotations
from datetime import datetime

import psycopg2
import psycopg2.extras
from fastapi import APIRouter, Depends

from core.config import get_settings
from core.role_dependency import require_manager_or_above

router = APIRouter(prefix="/api/v1/aeo", tags=["aeo"])


def _conn():
    return psycopg2.connect(get_settings().database_url)


def _rows(sql: str, params: tuple = ()) -> list[dict]:
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(sql, params)
        return [dict(r) for r in cur.fetchall()]


@router.get("/dashboard")
def dashboard(_role: str = Depends(require_manager_or_above)):
    """Top-of-pyramid KPIs · all engines roll up here."""
    autonomy = _rows("SELECT * FROM enterprise_autonomy ORDER BY measured_at DESC LIMIT 1")
    trust = _rows("SELECT source, trust_score FROM enterprise_trust")
    health = _rows("SELECT dimension, score, trend FROM enterprise_health")
    counts = {
        "goals":      _rows("SELECT COUNT(*) AS n FROM enterprise_goal")[0]["n"],
        "objectives": _rows("SELECT COUNT(*) AS n FROM enterprise_objective")[0]["n"],
        "policies":   _rows("SELECT COUNT(*) AS n FROM enterprise_policy WHERE status='active'")[0]["n"],
        "decisions":  _rows("SELECT COUNT(*) AS n FROM enterprise_decision")[0]["n"],
        "actions":    _rows("SELECT COUNT(*) AS n FROM enterprise_action")[0]["n"],
        "constraints":_rows("SELECT COUNT(*) AS n FROM enterprise_constraint")[0]["n"],
        "scenarios":  _rows("SELECT COUNT(*) AS n FROM enterprise_scenario")[0]["n"],
    }
    a = autonomy[0] if autonomy else {}
    return {
        "policy_ref": "§AEO Layer 10 · operator 2026-06-12 23-level brief",
        "ts_utc": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "autonomy_score": float(a.get("autonomy_score") or 0),
        "summary": {
            "automated_decisions_today": int(a.get("automated_decisions") or 0),
            "human_approvals":           int(a.get("human_approvals") or 0),
            "autonomous_actions":        int(a.get("autonomous_actions") or 0),
            "policy_compliance":         float(a.get("policy_compliance") or 0),
            "trust_score":               float(a.get("trust_score") or 0),
            "learning_velocity":         float(a.get("learning_velocity") or 0),
        },
        "counts": counts,
        "trust_radar": trust,
        "health_radar": health,
    }


@router.get("/goals")
def goals(_role: str = Depends(require_manager_or_above)):
    rows = _rows("SELECT * FROM enterprise_goal ORDER BY priority, goal_id")
    objectives = _rows("SELECT * FROM enterprise_objective ORDER BY goal_id, objective_id")
    return {"goals": rows, "objectives": objectives, "count": len(rows)}


@router.get("/objectives")
def objectives(_role: str = Depends(require_manager_or_above)):
    rows = _rows("""SELECT o.*, g.goal AS parent_goal FROM enterprise_objective o
                    LEFT JOIN enterprise_goal g USING (goal_id) ORDER BY o.goal_id""")
    return {"objectives": rows, "count": len(rows)}


@router.get("/policies")
def policies(_role: str = Depends(require_manager_or_above)):
    rows = _rows("SELECT * FROM enterprise_policy ORDER BY category, policy_id")
    return {"policies": rows, "count": len(rows)}


@router.get("/decisions")
def decisions(limit: int = 50,
              _role: str = Depends(require_manager_or_above)):
    rows = _rows("SELECT * FROM enterprise_decision ORDER BY created_at DESC LIMIT %s",
                 (limit,))
    return {"decisions": rows, "count": len(rows)}


@router.get("/actions")
def actions(limit: int = 50,
            _role: str = Depends(require_manager_or_above)):
    rows = _rows("""SELECT a.*, d.summary AS decision_summary FROM enterprise_action a
                    LEFT JOIN enterprise_decision d USING (decision_id)
                    ORDER BY a.created_at DESC LIMIT %s""", (limit,))
    return {"actions": rows, "count": len(rows)}


@router.get("/constraints")
def constraints(_role: str = Depends(require_manager_or_above)):
    rows = _rows("SELECT * FROM enterprise_constraint ORDER BY constraint_id")
    return {"constraints": rows, "count": len(rows)}


@router.get("/scenarios")
def scenarios(_role: str = Depends(require_manager_or_above)):
    rows = _rows("SELECT * FROM enterprise_scenario ORDER BY severity DESC, impact_estimate DESC")
    return {"scenarios": rows, "count": len(rows)}


@router.get("/trust")
def trust(_role: str = Depends(require_manager_or_above)):
    rows = _rows("SELECT * FROM enterprise_trust ORDER BY trust_id")
    return {"trust": rows, "count": len(rows)}


@router.get("/health")
def health(_role: str = Depends(require_manager_or_above)):
    rows = _rows("SELECT * FROM enterprise_health ORDER BY dimension")
    return {"health": rows, "count": len(rows)}


@router.get("/autonomy")
def autonomy(limit: int = 30,
             _role: str = Depends(require_manager_or_above)):
    rows = _rows("SELECT * FROM enterprise_autonomy ORDER BY period DESC LIMIT %s",
                 (limit,))
    return {"autonomy": rows, "count": len(rows)}
