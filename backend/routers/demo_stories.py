"""INSUR demo-stories router — per-dept × per-role demo scripts.

Sibling to INSUR_DEMO_STORY (per dept, §64.1). This router surfaces the
15 role-scoped demo scripts catalogued at
    global-ai-org/departments/<dept>/business-layer/INSUR_DEMO_STORIES_BY_ROLE.md

Composes with global §38 (demo runs audit-rowed) + §47.6 (RBAC) +
§57.6 (canonical envelope) + §63 (15-role scaffold) + §64.1 + §66.

Endpoints:
  GET /api/v1/insur/demo-stories/{dept}            — all 15 role demos
  GET /api/v1/insur/demo-stories/{dept}/{role}     — single role demo detail
  GET /api/v1/insur/demo-stories/_global           — cross-dept inventory
"""
from __future__ import annotations

import re
import time
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from core.insur_audit import log_insur_access

router = APIRouter(prefix="/api/v1/insur/demo-stories", tags=["insur", "demo-stories"])

INSUR_DEPTS = [
    "digital-marketing", "customer-experience", "supply-chain", "manufacturing",
    "product-rd", "retail-operations", "sales", "finance", "hr", "procurement",
    "executive-leadership", "e-commerce", "customer-support", "engineering",
    "it-operations", "legal", "marketing", "operations", "security-operations",
]

# Canonical 15 roles per §63 scaffold.
ROLES = [
    "admin", "manager", "team-member", "tester", "security", "devops",
    "ai-reviewer", "digital-transformation", "system-architect",
    "test-architect", "database-architect", "api-architect", "data-owner",
    "ai-strategy", "information-security",
]

# Per-role focus + persona + dashboard route — keep aligned with the
# scaffolder's ROLE_DEMO dict.
ROLE_DEMO: dict[str, tuple[str, str, str]] = {
    "admin":                  ("Admin (System)",          "Tenant onboarding + RBAC drift detection",       "/admin"),
    "manager":                ("Dept Manager",            "KPI surface + approval queue + team perf",       "/dashboard?role=manager"),
    "team-member":            ("Team Member",             "My-work queue + my SLA + personal metrics",      "/dashboard?role=team-member"),
    "tester":                 ("QA / Tester",             "Regression heatmap + flaky-test triage",         "/dashboard?role=tester"),
    "security":               ("SecOps Engineer",         "Alert volume + MTTD/MTTR + vuln backlog",        "/security"),
    "devops":                 ("DevOps",                  "DORA metrics + deploy frequency + cost",         "/dashboard?role=devops"),
    "ai-reviewer":            ("AI Reviewer",             "Model drift + fairness gate + override rate",    "/monitoring + /pipelines"),
    "digital-transformation": ("DT Lead",                 "AS-IS vs TO-BE + automation % per process",      "/dashboard?role=digital-transformation"),
    "system-architect":       ("System Architect",        "Service health + dep graph + capacity",          "/c4-model/deep"),
    "test-architect":         ("Test Architect",          "Test pyramid health + coverage per service",     "/dashboard?role=test-architect"),
    "database-architect":     ("DB Architect",            "Slow-query list + schema drift + replication",   "/dashboard?role=database-architect"),
    "api-architect":          ("API Architect",           "API p95 + version adoption + deprecation",       "/dashboard?role=api-architect"),
    "data-owner":             ("Data Owner",              "Data quality + lineage + freshness SLA",         "/dashboard?role=data-owner"),
    "ai-strategy":            ("AI Strategy Lead",        "Automation backlog + ROI vs plan",               "/dashboard?role=ai-strategy"),
    "information-security":   ("InfoSec / CISO Office",   "Compliance gates + CVE backlog + 3rd-party risk", "/security/deep"),
}

# Per-dept anchor KPI — kept aligned with the scaffolder's DEPT_KPI map.
DEPT_KPI: dict[str, str] = {
    "digital-marketing":   "CAC + attribution accuracy",
    "customer-experience": "CSAT + ticket deflection",
    "supply-chain":        "Forecast MAPE + stockout rate",
    "manufacturing":       "OEE + defect rate",
    "product-rd":          "Concept-to-launch + hit rate",
    "retail-operations":   "Sales/sq-ft + shrink",
    "sales":               "Pipeline conversion + churn",
    "finance":             "Forecast accuracy + fraud loss",
    "hr":                  "Time-to-hire + attrition",
    "procurement":         "Spend visibility + savings",
    "executive-leadership":"Strategic decision throughput",
    "e-commerce":          "Cart conversion + AOV",
    "customer-support":    "FCR + AHT",
    "engineering":         "Deploy frequency + MTTR",
    "it-operations":       "MTTD + incident volume",
    "legal":               "Contract review cycle + risk-flag precision",
    "marketing":           "Content velocity + channel ROI",
    "operations":          "Process cycle + anomaly rate",
    "security-operations": "MTTD + false-positive rate",
}


def _validate_dept(dept: str) -> None:
    if dept not in INSUR_DEPTS:
        raise HTTPException(404, f"Unknown dept '{dept}' — must be one of {len(INSUR_DEPTS)} INSUR depts")


def _validate_role(role: str) -> None:
    if not re.match(r"^[a-z][a-z0-9-]+$", role):
        raise HTTPException(400, f"Malformed role '{role}' (must be lowercase + hyphens)")
    if role not in ROLE_DEMO:
        raise HTTPException(404, f"Unknown role '{role}' — must be one of {sorted(ROLE_DEMO.keys())}")


def _demo_for(dept: str, role: str) -> dict[str, Any]:
    persona, focus, route = ROLE_DEMO[role]
    pretty = dept.replace("-", " ").title()
    kpi = DEPT_KPI.get(dept, "(dept KPI tbd)")
    return {
        "demo_id": f"{role.replace('-', '_')}_demo",
        "role": role,
        "persona": f"{persona} in {pretty}",
        "scenario": f"Demonstrate {focus} on the {pretty} dashboards",
        "kpi_moved": kpi,
        "primary_route": route,
        "steps": [
            f"Navigate to `{route}`",
            "Drill into the top tile",
            "Trigger a representative action (approve / page / refresh)",
            f"Confirm audit row appears in /api/v1/insur/transactions/{dept} within 30s",
        ],
        "talking_points": [
            f"This is {persona}'s view of {pretty}.",
            f"In 90 seconds we move {kpi} by {focus}.",
        ],
        "success_criteria": [
            "Dashboard endpoint p95 < 500ms",
            "Action triggers audit row within 30s",
            f"RBAC denies action when actor lacks `{role}` scope",
        ],
        "gotchas": [
            "Pre-load demo data before recording",
            "Warm Ollama (gemma3:1b) so first inference isn't a cold start",
            "Clear browser cache to avoid stale dashboards",
        ],
        "audit_event_pattern": f"demo.{role.replace('-', '_')}.<action>",
        "related": {
            "dept_demo_md": "INSUR_DEMO_STORY.md",
            "role_reports_md": f"../reports-by-role/{role}/INSUR_REPORTS.md",
            "role_dashboards_md": f"../dashboards-by-role/{role}/INSUR_DASHBOARD.md",
        },
    }


# _global BEFORE /{dept} per §66.3 FastAPI greedy-match trap.
@router.get("/_global")
def global_inventory(http_request: Request) -> dict[str, Any]:
    """Cross-dept demo inventory — counts + per-dept demo_id lists."""
    log_insur_access(http_request, "demo_stories", "global_inventory")
    inventory = {
        dept: [f"{role.replace('-', '_')}_demo" for role in ROLES]
        for dept in INSUR_DEPTS
    }
    return {
        "n_depts": len(INSUR_DEPTS),
        "depts": INSUR_DEPTS,
        "n_roles_per_dept": len(ROLES),
        "n_demos_total": len(INSUR_DEPTS) * len(ROLES),
        "per_dept_demo_ids": inventory,
        "scanned_at": time.time(),
    }


@router.get("/{dept}")
def dept_catalog(http_request: Request, dept: str) -> dict[str, Any]:
    """Per-dept catalog — all 15 role demos for this dept."""
    _validate_dept(dept)
    log_insur_access(http_request, "demo_stories", "dept_catalog", dept=dept)
    demos = [_demo_for(dept, role) for role in ROLES]
    return {
        "dept": dept,
        "n_demos": len(demos),
        "demos": demos,
        "scanned_at": time.time(),
    }


@router.get("/{dept}/{role}")
def role_demo_detail(http_request: Request, dept: str, role: str) -> dict[str, Any]:
    """Single role demo detail for this dept."""
    _validate_dept(dept)
    _validate_role(role)
    log_insur_access(http_request, "demo_stories", "role_demo_detail",
                    dept=dept, extra={"role": role})
    return {
        "dept": dept,
        "demo": _demo_for(dept, role),
        "scanned_at": time.time(),
    }
