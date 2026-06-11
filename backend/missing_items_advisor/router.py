"""/api/v1/missing-items-advisor/* · Iter 80 · scans platform for gaps."""
from __future__ import annotations

from datetime import datetime, timezone

import psycopg2
import psycopg2.extras
from fastapi import APIRouter

from core.config import get_settings
from enterprise_ai_domains.domains import all_domains
from missing_offices.offices import all_offices
from blueprint_library.blueprints import BLUEPRINTS

router = APIRouter(prefix="/api/v1/missing-items-advisor", tags=["missing-items-advisor"])


def _conn():
    return psycopg2.connect(get_settings().database_url)


def _agent_active(agent_id: str) -> bool:
    with _conn() as c, c.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM agent_registry WHERE agent_id=%s AND status='Active'",
            (agent_id,))
        return cur.fetchone() is not None


def _table_exists(name: str) -> bool:
    with _conn() as c, c.cursor() as cur:
        cur.execute("""
            SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name=%s)
        """, (name,))
        return cur.fetchone()[0]


# ─────────────────────────────────────────────────────────────────────
# Scanners

def _scan_domains() -> list[dict]:
    """22 §103 domains · find missing agents."""
    findings = []
    for d in all_domains():
        missing = [a for a in d["agents"] if not _agent_active(a)]
        if missing:
            findings.append({
                "severity": "P2" if len(missing) <= 2 else "P1",
                "category": "Agent gap",
                "topic": d["name"],
                "topic_id": d["id"],
                "what_missing": f"{len(missing)} of {len(d['agents'])} agents not registered",
                "items": missing,
                "advice": f"Register {missing[0]} first (sys_supervisor pattern) · "
                          f"then materialize remaining {len(missing)-1}.",
                "effort": "1-2h per agent (INSERT agent_registry + initial smoke)",
                "blast_radius": "low · agents are scaffolds until materialized",
            })
    return findings


def _scan_offices() -> list[dict]:
    """20 §104 offices · find offices with no backing agent."""
    findings = []
    for o in all_offices():
        findings.append({
            "severity": "P3",
            "category": "Office stub · not yet provisioned",
            "topic": o["name"],
            "topic_id": o["id"],
            "what_missing": "No dedicated agents registered for this office",
            "items": [],
            "advice": f"If '{o['name']}' is on this quarter's roadmap, "
                      f"register a supervisor + 2-3 worker agents in agent_registry.",
            "effort": "4-8h to materialize office",
            "blast_radius": "low · scaffold ready",
        })
    return findings[:10]  # cap so list isn't overwhelming


def _scan_blueprints() -> list[dict]:
    """12 blueprints · find ones with sub-100% readiness."""
    findings = []
    for bp_id, bp in BLUEPRINTS.items():
        missing_agents = [a for a in bp["agents"] if not _agent_active(a)]
        missing_tables = [t for t in bp["tables"] if not _table_exists(t)]
        if missing_agents or missing_tables:
            findings.append({
                "severity": "P2",
                "category": "Blueprint not ready to deploy",
                "topic": bp["name"],
                "topic_id": bp_id,
                "what_missing": f"{len(missing_agents)} agents · {len(missing_tables)} tables",
                "items": missing_agents + missing_tables,
                "advice": f"Wire missing items before next deploy of '{bp['name']}'.",
                "effort": f"{(len(missing_agents)+len(missing_tables))*2}h",
                "blast_radius": "deploy/execute will reject this blueprint",
            })
    return findings


def _scan_data_health() -> list[dict]:
    """Check key tables for staleness · empty · or anomaly."""
    findings = []
    checks = [
        ("agent_invocation", "created_at > NOW() - INTERVAL '24 hours'",
         "No invocations in 24h", "P1", "Platform idle · check watchdog cron"),
        ("audit_log", "created_at > NOW() - INTERVAL '24 hours'",
         "No audit events in 24h", "P1", "Audit pipeline may be broken · check writers"),
        ("approval_request", "status='requested'",
         "Approval requests pending > 7 days",
         "P2", "Operator backlog · auto-escalate or auto-approve low-risk"),
        ("agent_incident", "status NOT IN ('resolved','closed') AND created_at < NOW() - INTERVAL '7 days'",
         "Stale incidents not resolved", "P1",
         "Run RCA + close · per §103 incident mgmt blueprint"),
    ]
    with _conn() as c, c.cursor() as cur:
        for table, where, label, sev, advice in checks:
            try:
                cur.execute(f"SELECT COUNT(*) FROM {table} WHERE {where}")
                n = cur.fetchone()[0]
                if (table in ("agent_invocation", "audit_log") and n == 0) or \
                   (table not in ("agent_invocation", "audit_log") and n > 0):
                    findings.append({
                        "severity": sev, "category": "Data health",
                        "topic": table, "topic_id": table,
                        "what_missing": label, "items": [],
                        "count": n, "advice": advice,
                        "effort": "30min-2h diagnosis", "blast_radius": "ops impact",
                    })
            except Exception:
                pass  # table doesn't exist · skip
    return findings


def _scan_governance_compliance() -> list[dict]:
    """Per §101 + §99 · find policy areas / checklist items still ⚠️/❌."""
    findings = []
    # Check §101 mandatory 12 tables
    mandatory = ["workflow_run", "workflow_step", "prompt_log", "model_registry",
                 "notification_log", "error_log", "checkpoint_store", "audit_log",
                 "status_history", "approval_request", "agent_registry", "tool_registry"]
    missing = [t for t in mandatory if not _table_exists(t)]
    if missing:
        findings.append({
            "severity": "P0",
            "category": "§101 mandatory table missing",
            "topic": "Enterprise Standard",
            "topic_id": "enterprise_standard",
            "what_missing": f"{len(missing)} of 12 mandatory tables not created",
            "items": missing,
            "advice": "Run migrations · these tables are §101.E REQUIRED.",
            "effort": "1h per table",
            "blast_radius": "HIGH · §101 non-compliance · release-blocker",
        })
    return findings


# ─────────────────────────────────────────────────────────────────────
# Endpoints

@router.get("/health")
def health():
    return {"status": "ok", "module": "missing-items-advisor",
            "agent_id": "sys_missing_items_advisor",
            "scanners": ["domains", "offices", "blueprints", "data_health", "governance"],
            "spec": "Per operator brief 2026-06-11 · gap-finder agent"}


@router.post("/scan")
def scan():
    """Run all scanners · return prioritized findings list."""
    findings = []
    findings.extend(_scan_governance_compliance())
    findings.extend(_scan_data_health())
    findings.extend(_scan_blueprints())
    findings.extend(_scan_domains())
    findings.extend(_scan_offices())

    # Sort by severity P0 → P3
    sev_order = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}
    findings.sort(key=lambda f: sev_order.get(f["severity"], 99))

    summary = {
        "P0_critical": sum(1 for f in findings if f["severity"] == "P0"),
        "P1_high":     sum(1 for f in findings if f["severity"] == "P1"),
        "P2_medium":   sum(1 for f in findings if f["severity"] == "P2"),
        "P3_low":      sum(1 for f in findings if f["severity"] == "P3"),
        "total":       len(findings),
    }

    return {
        "agent": "sys_missing_items_advisor",
        "scanned_at": datetime.now(timezone.utc).isoformat(),
        "findings": findings,
        "summary": summary,
        "top_3_actions": [f["advice"] for f in findings[:3]],
        "spec_note": "P0 = release blocker · P1 = high · P2 = medium · P3 = low",
    }


@router.get("/advise/{focus}")
def advise(focus: str):
    """Scoped advice: 'domains' · 'offices' · 'blueprints' · 'data' · 'governance'."""
    scanners = {
        "domains":    _scan_domains,
        "offices":    _scan_offices,
        "blueprints": _scan_blueprints,
        "data":       _scan_data_health,
        "governance": _scan_governance_compliance,
    }
    fn = scanners.get(focus)
    if not fn:
        return {"error": f"unknown focus: {focus} · pick from {list(scanners.keys())}"}
    findings = fn()
    return {
        "agent": "sys_missing_items_advisor",
        "focus": focus, "findings": findings, "count": len(findings),
    }


@router.get("/summary")
def summary():
    """Quick rollup · no scanner detail · per-category counts."""
    findings = []
    findings.extend(_scan_governance_compliance())
    findings.extend(_scan_data_health())
    findings.extend(_scan_blueprints())
    findings.extend(_scan_domains())

    by_cat = {}
    for f in findings:
        by_cat[f["category"]] = by_cat.get(f["category"], 0) + 1

    return {
        "total_findings": len(findings),
        "by_severity": {
            "P0": sum(1 for f in findings if f["severity"] == "P0"),
            "P1": sum(1 for f in findings if f["severity"] == "P1"),
            "P2": sum(1 for f in findings if f["severity"] == "P2"),
            "P3": sum(1 for f in findings if f["severity"] == "P3"),
        },
        "by_category": by_cat,
        "recommended_next_action": findings[0]["advice"] if findings else "Nothing critical · platform stable",
    }
