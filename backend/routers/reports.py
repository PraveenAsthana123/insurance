"""HOLY reports-catalog router — dept-level rollup of standard reports.

Sibling to the per-role reports at
    global-ai-org/departments/<dept>/reports-by-role/<role>/HOLY_REPORTS.md
This endpoint surfaces the DEPT-level unified catalog: every standard
report the dept publishes (15 archetypes per §64.37.2) with cadence,
format, owner role, and audience.

Composes with global §38 (audit per report generation) + §47.6 (RBAC
per audience) + §57.6 (canonical envelope) + §59 MDD + §64.37 (per-role
reports sibling) + §66.

Endpoints:
  GET /api/v1/holy/reports/{dept}
  GET /api/v1/holy/reports/{dept}/{report_id}
  GET /api/v1/holy/reports/_global
"""
from __future__ import annotations

import re
import time
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from core.holy_audit import log_holy_access

router = APIRouter(prefix="/api/v1/holy/reports", tags=["holy", "reports"])

HOLY_DEPTS = [
    "digital-marketing", "customer-experience", "supply-chain", "manufacturing",
    "product-rd", "retail-operations", "sales", "finance", "hr", "procurement",
    "executive-leadership", "e-commerce", "customer-support", "engineering",
    "it-operations", "legal", "marketing", "operations", "security-operations",
]

# Canonical 15 owner roles per global §63 scaffold (15 roles per dept).
KNOWN_ROLES = {
    "admin", "manager", "team-member", "tester", "security", "devops",
    "ai-reviewer", "digital-transformation", "system-architect",
    "test-architect", "database-architect", "api-architect", "data-owner",
    "ai-strategy", "information-security",
}

# The 15 standard report archetypes per global §64.37.2 — same shape
# every dept, dept-specific titles. KEEP ALIGNED with the scaffolder's
# standard_reports list in scaffold-holy-reports-catalog.py.
STANDARD_REPORTS: list[dict[str, str]] = [
    {"report_id": "daily_ops_digest",        "cadence": "daily 08:00",     "format": "PDF + Slack",  "owner_role": "admin",                  "audience": "admin / devops / manager"},
    {"report_id": "weekly_business_review",  "cadence": "weekly Monday",   "format": "PDF + email",  "owner_role": "manager",                "audience": "manager / dept staff"},
    {"report_id": "daily_my_work",           "cadence": "daily 07:00",     "format": "email",        "owner_role": "team-member",            "audience": "team-member (per user)"},
    {"report_id": "pre_release_test_report", "cadence": "per release",     "format": "HTML",         "owner_role": "tester",                 "audience": "tester / engineering / manager"},
    {"report_id": "weekly_security_posture", "cadence": "weekly Monday",   "format": "PDF",          "owner_role": "security",               "audience": "security / information-security / manager"},
    {"report_id": "dora_weekly",             "cadence": "weekly",          "format": "Grafana JSON", "owner_role": "devops",                 "audience": "devops / engineering / manager"},
    {"report_id": "monthly_model_review",    "cadence": "monthly",         "format": "PDF + Notion", "owner_role": "ai-reviewer",            "audience": "ai-reviewer / ai-strategy / manager"},
    {"report_id": "quarterly_dt_scorecard",  "cadence": "quarterly",       "format": "PDF",          "owner_role": "digital-transformation", "audience": "digital-transformation / executive-leadership"},
    {"report_id": "monthly_arch_review",     "cadence": "monthly",         "format": "Markdown",     "owner_role": "system-architect",       "audience": "system-architect / engineering / devops"},
    {"report_id": "quarterly_test_strategy", "cadence": "quarterly",       "format": "PDF",          "owner_role": "test-architect",         "audience": "test-architect / engineering / tester"},
    {"report_id": "weekly_db_health",        "cadence": "weekly",          "format": "Grafana",      "owner_role": "database-architect",     "audience": "database-architect / devops"},
    {"report_id": "weekly_api_contract",     "cadence": "weekly",          "format": "Markdown",     "owner_role": "api-architect",          "audience": "api-architect / engineering"},
    {"report_id": "monthly_data_steward",    "cadence": "monthly",         "format": "PDF",          "owner_role": "data-owner",             "audience": "data-owner / ai-strategy / manager"},
    {"report_id": "quarterly_dt_strategy",   "cadence": "quarterly",       "format": "PDF + slides", "owner_role": "ai-strategy",            "audience": "ai-strategy / executive-leadership / manager"},
    {"report_id": "monthly_infosec",         "cadence": "monthly",         "format": "PDF",          "owner_role": "information-security",   "audience": "information-security / security / executive-leadership"},
]

REQUIRED_FIELDS = {"report_id", "cadence", "format", "owner_role", "audience"}


def _validate_dept(dept: str) -> None:
    if dept not in HOLY_DEPTS:
        raise HTTPException(404, f"Unknown dept '{dept}' — must be one of {len(HOLY_DEPTS)} HOLY depts")


def _title_for(dept: str, report_id: str) -> str:
    pretty = dept.replace("-", " ").title()
    base = {
        "daily_ops_digest":        "Daily Operations Digest",
        "weekly_business_review":  "Weekly Business Review",
        "daily_my_work":           "My-Work Brief",
        "pre_release_test_report": "Pre-Release Test Report",
        "weekly_security_posture": "Weekly Security Posture",
        "dora_weekly":             "DORA Metrics (Deploy/MTTR/etc.)",
        "monthly_model_review":    "Monthly Model-Card Review",
        "quarterly_dt_scorecard":  "Quarterly DT Scorecard",
        "monthly_arch_review":     "Monthly Architecture Review",
        "quarterly_test_strategy": "Quarterly Test Strategy Report",
        "weekly_db_health":        "Weekly DB Health Report",
        "weekly_api_contract":     "Weekly API Contract Review",
        "monthly_data_steward":    "Monthly Data Steward Report",
        "quarterly_dt_strategy":   "Quarterly DT Strategy Report",
        "monthly_infosec":         "Monthly InfoSec Report",
    }.get(report_id, report_id.replace("_", " ").title())
    return f"{pretty} {base}"


def _enrich(dept: str, base: dict[str, Any]) -> dict[str, Any]:
    """Decorate a standard-report row with dept-specific title."""
    return {**base, "title": _title_for(dept, base["report_id"])}


# IMPORTANT — _global BEFORE /{dept} per §66.3 FastAPI greedy-match trap.
@router.get("/_global")
def global_inventory(http_request: Request) -> dict[str, Any]:
    """Cross-dept report inventory + counts."""
    log_holy_access(http_request, "reports", "global_inventory")
    inventory = {
        dept: [r["report_id"] for r in STANDARD_REPORTS]
        for dept in HOLY_DEPTS
    }
    return {
        "n_depts": len(HOLY_DEPTS),
        "depts": HOLY_DEPTS,
        "n_standard_reports_per_dept": len(STANDARD_REPORTS),
        "n_reports_total": len(STANDARD_REPORTS) * len(HOLY_DEPTS),
        "per_dept_report_ids": inventory,
        "scanned_at": time.time(),
    }


@router.get("/{dept}")
def dept_catalog(http_request: Request, dept: str) -> dict[str, Any]:
    """Per-dept catalog — 15 standard reports with full envelope."""
    _validate_dept(dept)
    log_holy_access(http_request, "reports", "dept_catalog", dept=dept)
    return {
        "dept": dept,
        "n_reports": len(STANDARD_REPORTS),
        "reports": [_enrich(dept, base) for base in STANDARD_REPORTS],
        "scanned_at": time.time(),
    }


@router.get("/{dept}/{report_id}")
def report_detail(http_request: Request, dept: str, report_id: str) -> dict[str, Any]:
    """Single report detail."""
    _validate_dept(dept)
    if not re.match(r"^[a-z0-9_]+$", report_id):
        raise HTTPException(400, f"Malformed report_id '{report_id}' (must be lowercase + underscores)")
    base = next((r for r in STANDARD_REPORTS if r["report_id"] == report_id), None)
    if base is None:
        available = [r["report_id"] for r in STANDARD_REPORTS]
        raise HTTPException(404, f"Unknown report '{report_id}' — available: {available}")
    log_holy_access(http_request, "reports", "report_detail",
                    dept=dept, extra={"report_id": report_id})
    return {
        "dept": dept,
        "report": _enrich(dept, base),
        # Audit summary stub — wire to real audit table per §38.3 when available
        "audit_summary": {
            "last_generated_at": None,
            "next_scheduled_at": None,
            "n_generations_30d": 0,
            "n_failures_30d": 0,
        },
        "scanned_at": time.time(),
    }
