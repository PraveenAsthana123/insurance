"""/api/v1/governance/* · Iter 39 · 8 enterprise tables + endpoints."""
from __future__ import annotations

import uuid

import psycopg2
import psycopg2.extras
from fastapi import APIRouter
from pydantic import BaseModel

from core.config import get_settings

router = APIRouter(prefix="/api/v1/governance", tags=["governance"])


def _conn():
    return psycopg2.connect(get_settings().database_url)


# Pydantic shells per table · operator may PATCH any field optionally on create

class ValueStream(BaseModel):
    value_stream_name: str
    value_stream_category: str | None = None
    customer_type: str | None = None
    business_owner: str | None = None
    executive_owner: str | None = None
    value_stream_description: str | None = None
    annual_revenue: float | None = None
    annual_cost: float | None = None
    annual_business_value: float | None = None
    customer_count: int | None = None
    process_count: int | None = None
    capability_count: int | None = None
    automation_rate: float | None = None
    ai_maturity_score: float | None = None
    tenant_id: str = "default"


class Department(BaseModel):
    department_name: str
    business_unit: str | None = None
    executive_owner: str | None = None
    department_head: str | None = None
    annual_budget: float | None = None
    employee_count: int | None = None
    department_description: str | None = None
    primary_value_stream: str | None = None
    strategic_objectives: str | None = None
    maturity_level: str = "L2"
    tenant_id: str = "default"


class Team(BaseModel):
    department_id: str | None = None
    team_name: str
    team_type: str | None = None
    manager_name: str | None = None
    technical_lead: str | None = None
    team_size: int | None = None
    primary_responsibility: str | None = None
    support_level: str = "L2"
    on_call_enabled: bool = False
    budget: float | None = None
    maturity_level: str = "L2"
    tenant_id: str = "default"


class Role(BaseModel):
    team_id: str | None = None
    role_name: str
    role_category: str | None = None
    role_description: str | None = None
    seniority_level: str | None = None
    primary_responsibilities: str | None = None
    required_skills: str | None = None
    required_certifications: str | None = None
    approval_authority: bool = False
    production_access: bool = False
    on_call_eligible: bool = False
    tenant_id: str = "default"


class RACI(BaseModel):
    object_type: str
    object_id: str
    role_id: str | None = None
    responsibility_type: str  # R/A/C/I
    responsibility_description: str | None = None
    escalation_level: int = 1
    approval_required: bool = False
    tenant_id: str = "default"


class Stakeholder(BaseModel):
    stakeholder_name: str
    stakeholder_type: str | None = None
    department_id: str | None = None
    role_id: str | None = None
    influence_level: str | None = None
    interest_level: str | None = None
    decision_authority: bool = False
    funding_authority: bool = False
    approval_authority: bool = False
    communication_preference: str | None = None
    stakeholder_risk_score: float | None = None
    stakeholder_notes: str | None = None
    tenant_id: str = "default"


class AIPolicy(BaseModel):
    policy_name: str
    policy_category: str | None = None
    policy_description: str | None = None
    policy_owner: str | None = None
    executive_owner: str | None = None
    compliance_requirement: str | None = None
    enforcement_level: str = "Mandatory"
    approval_required: bool = False
    exception_allowed: bool = True
    review_frequency: str = "Quarterly"
    version: str = "v1.0"
    tenant_id: str = "default"


class AIStandard(BaseModel):
    policy_id: str | None = None
    standard_name: str
    standard_category: str | None = None
    standard_description: str | None = None
    implementation_requirements: str | None = None
    validation_method: str | None = None
    enforcement_level: str = "Mandatory"
    owner: str | None = None
    review_frequency: str = "Quarterly"
    version: str = "v1.0"
    tenant_id: str = "default"


# Generic helpers

def _insert(table: str, body: dict, id_col: str, id_prefix: str) -> str:
    body = {k: v for k, v in body.items() if v is not None}
    body[id_col] = body.get(id_col) or f"{id_prefix}-{uuid.uuid4().hex[:12]}"
    cols = ", ".join(body.keys())
    vals = ", ".join(f"%({k})s" for k in body.keys())
    sql = f"INSERT INTO {table} ({cols}) VALUES ({vals}) RETURNING {id_col}"
    with _conn() as c, c.cursor() as cur:
        cur.execute(sql, body)
        return cur.fetchone()[0]


def _list(table: str, filters: dict, limit: int = 50, order_by: str = "created_at DESC") -> list[dict]:
    where_parts, params = [], []
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
# Health

@router.get("/health")
def health():
    counts = {}
    try:
        with _conn() as c, c.cursor() as cur:
            for t in ["business_value_stream", "department", "team", "role",
                      "responsibility_matrix", "stakeholder", "ai_policy", "ai_standard"]:
                cur.execute(f"SELECT COUNT(*) FROM {t}")
                counts[t] = cur.fetchone()[0]
        return {"status": "ok", "module": "governance", "counts": counts}
    except Exception as e:
        return {"status": "scaffold", "module": "governance",
                "error": f"{type(e).__name__}: {e}",
                "note": "Run migration 065_enterprise_governance.sql"}


# ──────────────────────────────────────────────────────────────────────
# 65. value streams

@router.post("/value-streams")
def create_value_stream(body: ValueStream):
    return {"value_stream_id": _insert("business_value_stream",
                                       body.model_dump(), "value_stream_id", "VS")}


@router.get("/value-streams")
def list_value_streams(tenant_id: str = "default", limit: int = 50):
    rows = _list("business_value_stream", {"tenant_id": tenant_id}, limit=limit)
    return {"value_streams": rows, "count": len(rows)}


# ──────────────────────────────────────────────────────────────────────
# 66. departments

@router.post("/departments")
def create_department(body: Department):
    return {"department_id": _insert("department", body.model_dump(),
                                      "department_id", "DEPT")}


@router.get("/departments")
def list_departments(tenant_id: str = "default", limit: int = 100):
    rows = _list("department", {"tenant_id": tenant_id}, limit=limit)
    return {"departments": rows, "count": len(rows)}


# ──────────────────────────────────────────────────────────────────────
# 67. teams

@router.post("/teams")
def create_team(body: Team):
    return {"team_id": _insert("team", body.model_dump(), "team_id", "TEAM")}


@router.get("/teams")
def list_teams(department_id: str | None = None, tenant_id: str = "default", limit: int = 100):
    rows = _list("team", {"department_id": department_id, "tenant_id": tenant_id}, limit=limit)
    return {"teams": rows, "count": len(rows)}


# ──────────────────────────────────────────────────────────────────────
# 68. roles

@router.post("/roles")
def create_role(body: Role):
    return {"role_id": _insert("role", body.model_dump(), "role_id", "ROLE")}


@router.get("/roles")
def list_roles(team_id: str | None = None, role_category: str | None = None,
               tenant_id: str = "default", limit: int = 200):
    rows = _list("role",
                 {"team_id": team_id, "role_category": role_category, "tenant_id": tenant_id},
                 limit=limit)
    return {"roles": rows, "count": len(rows)}


# ──────────────────────────────────────────────────────────────────────
# 69. RACI

@router.post("/raci")
def create_raci(body: RACI):
    return {"raci_id": _insert("responsibility_matrix", body.model_dump(),
                                "raci_id", "RACI")}


@router.get("/raci")
def list_raci(object_type: str | None = None, object_id: str | None = None,
              role_id: str | None = None, tenant_id: str = "default", limit: int = 200):
    rows = _list("responsibility_matrix",
                 {"object_type": object_type, "object_id": object_id,
                  "role_id": role_id, "tenant_id": tenant_id},
                 limit=limit)
    return {"raci": rows, "count": len(rows)}


@router.get("/raci/for-object/{object_type}/{object_id}")
def raci_for_object(object_type: str, object_id: str, tenant_id: str = "default"):
    rows = _list("responsibility_matrix",
                 {"object_type": object_type, "object_id": object_id, "tenant_id": tenant_id},
                 limit=200)
    by_type: dict[str, list[dict]] = {"R": [], "A": [], "C": [], "I": []}
    for r in rows:
        by_type.setdefault(r.get("responsibility_type", "R"), []).append(r)
    return {"object_type": object_type, "object_id": object_id,
            "by_type": by_type, "n": len(rows)}


# ──────────────────────────────────────────────────────────────────────
# 70. stakeholders

@router.post("/stakeholders")
def create_stakeholder(body: Stakeholder):
    return {"stakeholder_id": _insert("stakeholder", body.model_dump(),
                                       "stakeholder_id", "SH")}


@router.get("/stakeholders")
def list_stakeholders(department_id: str | None = None, influence_level: str | None = None,
                      tenant_id: str = "default", limit: int = 100):
    rows = _list("stakeholder",
                 {"department_id": department_id, "influence_level": influence_level,
                  "tenant_id": tenant_id},
                 limit=limit)
    return {"stakeholders": rows, "count": len(rows)}


@router.get("/stakeholders/influence-matrix")
def influence_matrix(tenant_id: str = "default"):
    """Power×Interest matrix · 4 quadrants per stakeholder mgmt."""
    rows = _list("stakeholder", {"tenant_id": tenant_id}, limit=1000)
    quadrants = {
        "manage_closely": [], "keep_satisfied": [],
        "keep_informed": [], "monitor": [],
    }
    for s in rows:
        i, inf = s.get("interest_level", ""), s.get("influence_level", "")
        if inf == "High" and i == "High":   quadrants["manage_closely"].append(s)
        elif inf == "High":                  quadrants["keep_satisfied"].append(s)
        elif i == "High":                    quadrants["keep_informed"].append(s)
        else:                                 quadrants["monitor"].append(s)
    return {"quadrants": {k: len(v) for k, v in quadrants.items()},
            "sample_per_quadrant": {k: v[:3] for k, v in quadrants.items()}}


# ──────────────────────────────────────────────────────────────────────
# 71. ai_policy

@router.post("/policies")
def create_policy(body: AIPolicy):
    return {"policy_id": _insert("ai_policy", body.model_dump(),
                                  "policy_id", "POL")}


@router.get("/policies")
def list_policies(category: str | None = None, enforcement: str | None = None,
                  tenant_id: str = "default", limit: int = 100):
    rows = _list("ai_policy",
                 {"policy_category": category, "enforcement_level": enforcement,
                  "tenant_id": tenant_id},
                 limit=limit)
    return {"policies": rows, "count": len(rows)}


# ──────────────────────────────────────────────────────────────────────
# 72. ai_standard

@router.post("/standards")
def create_standard(body: AIStandard):
    return {"standard_id": _insert("ai_standard", body.model_dump(),
                                    "standard_id", "STD")}


@router.get("/standards")
def list_standards(policy_id: str | None = None, category: str | None = None,
                   tenant_id: str = "default", limit: int = 100):
    rows = _list("ai_standard",
                 {"policy_id": policy_id, "standard_category": category,
                  "tenant_id": tenant_id},
                 limit=limit)
    return {"standards": rows, "count": len(rows)}


# ──────────────────────────────────────────────────────────────────────
# Org tree rollup · single fetch for the UI

@router.get("/org-tree")
def org_tree(tenant_id: str = "default"):
    """Org tree: value_stream → department → team → role (4-level nest)."""
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM business_value_stream WHERE tenant_id = %s ORDER BY value_stream_name", (tenant_id,))
        vs_rows = [dict(r) for r in cur.fetchall()]
        cur.execute("SELECT * FROM department WHERE tenant_id = %s ORDER BY department_name", (tenant_id,))
        dept_rows = [dict(r) for r in cur.fetchall()]
        cur.execute("SELECT * FROM team WHERE tenant_id = %s ORDER BY team_name", (tenant_id,))
        team_rows = [dict(r) for r in cur.fetchall()]
        cur.execute("SELECT * FROM role WHERE tenant_id = %s ORDER BY role_name", (tenant_id,))
        role_rows = [dict(r) for r in cur.fetchall()]

    teams_by_dept: dict[str, list[dict]] = {}
    for t in team_rows:
        teams_by_dept.setdefault(t.get("department_id"), []).append(t)
    roles_by_team: dict[str, list[dict]] = {}
    for r in role_rows:
        roles_by_team.setdefault(r.get("team_id"), []).append(r)

    depts_by_vs: dict[str, list[dict]] = {}
    for d in dept_rows:
        vs_key = d.get("primary_value_stream")
        depts_by_vs.setdefault(vs_key, []).append({
            **d,
            "teams": [
                {**t, "roles": roles_by_team.get(t["team_id"], [])}
                for t in teams_by_dept.get(d["department_id"], [])
            ],
        })

    return {
        "value_streams": [
            {**v, "departments": depts_by_vs.get(v["value_stream_id"], [])}
            for v in vs_rows
        ],
        "orphan_departments": depts_by_vs.get(None, []),
        "n_value_streams": len(vs_rows),
        "n_departments": len(dept_rows),
        "n_teams": len(team_rows),
        "n_roles": len(role_rows),
    }
