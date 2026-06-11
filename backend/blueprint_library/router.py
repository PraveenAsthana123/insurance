"""/api/v1/blueprint-library/* · Iter 74 · Phase 6 reference architectures."""
from __future__ import annotations

import json
from datetime import datetime, timezone

import psycopg2
from fastapi import APIRouter
from pydantic import BaseModel

from core.config import get_settings
from blueprint_library.blueprints import (
    all_blueprints, get_blueprint, categories, BLUEPRINTS,
)

router = APIRouter(prefix="/api/v1/blueprint-library", tags=["blueprint-library"])


def _conn():
    return psycopg2.connect(get_settings().database_url)


@router.get("/health")
def health():
    return {
        "status": "ok", "module": "blueprint-library",
        "blueprints_total": len(BLUEPRINTS),
        "spec": "§103.6 · 12 reference architecture blueprints",
    }


@router.get("")
def list_blueprints(category: str | None = None):
    bps = all_blueprints()
    if category:
        bps = [bp for bp in bps if bp["category"].lower() == category.lower()]
    return {
        "blueprints": bps, "count": len(bps),
        "categories": list({bp["category"] for bp in bps}),
    }


@router.get("/categories")
def list_categories():
    return {"categories": categories(), "count": len(categories())}


@router.get("/{bp_id}")
def get_one(bp_id: str):
    bp = get_blueprint(bp_id)
    if not bp:
        return {"error": f"unknown blueprint: {bp_id}"}
    # Live · verify which referenced agents/tables exist in this project
    with _conn() as c, c.cursor() as cur:
        agents_present = []
        for aid in bp["agents"]:
            cur.execute(
                "SELECT 1 FROM agent_registry WHERE agent_id=%s AND status='Active'",
                (aid,))
            agents_present.append({"agent_id": aid, "present": cur.fetchone() is not None})
        tables_present = []
        for t in bp["tables"]:
            cur.execute("""
                SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name=%s)
            """, (t,))
            tables_present.append({"table": t, "present": cur.fetchone()[0]})
    n_agents_ok = sum(1 for a in agents_present if a["present"])
    n_tables_ok = sum(1 for t in tables_present if t["present"])
    readiness_pct = round(100 * (n_agents_ok + n_tables_ok) /
                          max(len(agents_present) + len(tables_present), 1), 1)
    return {
        **bp,
        "agents_present": agents_present,
        "tables_present": tables_present,
        "readiness_pct": readiness_pct,
        "ready_to_deploy": readiness_pct >= 80,
    }


class DeployRequest(BaseModel):
    blueprint_id: str
    project_name: str
    tenant_id: str = "default"
    notes: str | None = None


@router.post("/deploy/request")
def deploy_request(body: DeployRequest):
    """Create an approval_request to deploy a blueprint into a project.

    Per §103.7 (Marketplace) + §99.6 (approval gates) · NEVER auto-deploys.
    Approval workflow required before actual provisioning.
    """
    bp = get_blueprint(body.blueprint_id)
    if not bp:
        return {"error": f"unknown blueprint: {body.blueprint_id}"}

    import uuid
    pid = f"DEPLOY-{uuid.uuid4().hex[:10].upper()}"
    with _conn() as c, c.cursor() as cur:
        cur.execute("""
            INSERT INTO approval_request
              (approval_id, requested_by, approver_role, risk_level, reason,
               status, payload)
            VALUES (%s, %s, %s, %s, %s, 'requested', %s::jsonb)
        """, (
            pid, "operator", "platform-architect",
            bp["risk_level"],
            f"Deploy blueprint '{bp['name']}' to project '{body.project_name}'",
            json.dumps({
                "blueprint_id": bp["id"], "blueprint_name": bp["name"],
                "project_name": body.project_name, "tenant_id": body.tenant_id,
                "notes": body.notes,
                "estimated_setup_hours": bp["estimated_setup_hours"],
                "estimated_monthly_cost_usd": bp["estimated_monthly_cost_usd"],
                "dependencies": bp["dependencies"],
            }),
        ))
    return {
        "approval_id": pid,
        "blueprint": bp["name"],
        "project": body.project_name,
        "status": "requested",
        "approver_role": "platform-architect",
        "estimated_setup_hours": bp["estimated_setup_hours"],
        "estimated_monthly_cost_usd": bp["estimated_monthly_cost_usd"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/readiness/all")
def readiness_all():
    """Bulk readiness · all 12 blueprints · per-blueprint readiness % live."""
    results = []
    with _conn() as c, c.cursor() as cur:
        for bp in all_blueprints():
            agents_ok = 0
            for aid in bp["agents"]:
                cur.execute(
                    "SELECT 1 FROM agent_registry WHERE agent_id=%s AND status='Active'",
                    (aid,))
                if cur.fetchone():
                    agents_ok += 1
            tables_ok = 0
            for t in bp["tables"]:
                cur.execute("""
                    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name=%s)
                """, (t,))
                if cur.fetchone()[0]:
                    tables_ok += 1
            total = len(bp["agents"]) + len(bp["tables"])
            pct = round(100 * (agents_ok + tables_ok) / max(total, 1), 1)
            results.append({
                "id": bp["id"], "name": bp["name"], "category": bp["category"],
                "level": bp["level"], "risk_level": bp["risk_level"],
                "readiness_pct": pct,
                "ready": pct >= 80,
                "estimated_setup_hours": bp["estimated_setup_hours"],
                "estimated_monthly_cost_usd": bp["estimated_monthly_cost_usd"],
            })
    n_ready = sum(1 for r in results if r["ready"])
    avg = round(sum(r["readiness_pct"] for r in results) / len(results), 1)
    return {
        "blueprints": results, "count": len(results),
        "summary": {"n_ready_to_deploy": n_ready,
                    "average_readiness_pct": avg},
    }
