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


@router.post("/deploy/execute")
def deploy_execute(approval_id: str, deployed_by: str = "operator"):
    """Provisioner · runs after approval_request status='approved'.

    Per §103.7 + §99.6 · creates tenant_project + clones agents + records
    deploy_manifest. NEVER bypasses approval. Idempotent · re-running with
    same approval_id returns same project_id.
    """
    with _conn() as c, c.cursor() as cur:
        cur.execute("""
            SELECT status, payload FROM approval_request WHERE approval_id=%s
        """, (approval_id,))
        row = cur.fetchone()
        if not row:
            return {"error": "approval not found"}
        status, payload = row
        if status != "approved":
            return {"error": f"approval status is '{status}' · must be 'approved'"}
        if isinstance(payload, str):
            payload = json.loads(payload)

        bp_id = payload.get("blueprint_id")
        bp = get_blueprint(bp_id)
        if not bp:
            return {"error": f"blueprint {bp_id} not found"}

        # Check idempotency
        cur.execute("""
            SELECT project_id FROM tenant_project WHERE approval_id=%s
        """, (approval_id,))
        existing = cur.fetchone()
        if existing:
            return {"project_id": existing[0], "idempotent": True,
                    "status": "already-provisioned"}

        import uuid
        project_id = f"PRJ-{uuid.uuid4().hex[:10].upper()}"
        target_tenant = payload.get("tenant_id", "default")
        project_name = payload.get("project_name", "unnamed")

        cur.execute("""
            INSERT INTO tenant_project
              (project_id, tenant_id, project_name, blueprint_id, deployed_by,
               approval_id, status, config)
            VALUES (%s, %s, %s, %s, %s, %s, 'provisioning', %s::jsonb)
        """, (project_id, target_tenant, project_name, bp_id, deployed_by,
              approval_id, json.dumps(payload)))

        manifest = []

        # 1. Clone agents into the tenant
        for source_aid in bp["agents"]:
            cur.execute("SELECT * FROM agent_registry WHERE agent_id=%s", (source_aid,))
            cur2 = c.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur2.execute("SELECT * FROM agent_registry WHERE agent_id=%s", (source_aid,))
            src = cur2.fetchone()
            cur2.close()
            if not src:
                manifest.append({"artifact_type": "agent", "artifact_id": source_aid,
                                 "status": "SKIPPED · source not found"})
                continue
            new_aid = f"{project_id.lower()}__{source_aid}"
            cur.execute("""
                INSERT INTO agent_registry
                  (agent_id, agent_name, agent_type, department_id, business_domain,
                   purpose, owner_team, status, autonomy_level, risk_level,
                   model_name, runtime_framework, max_steps, timeout_seconds,
                   cost_limit, tenant_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'Active', %s, %s, %s, %s,
                        %s, %s, %s, %s)
                ON CONFLICT (agent_id) DO NOTHING
            """, (
                new_aid, f"{src['agent_name']} [{project_name}]",
                src["agent_type"], src["department_id"], src["business_domain"],
                f"Cloned for project {project_id}: {src['purpose']}",
                src["owner_team"], src["autonomy_level"], src["risk_level"],
                src["model_name"], src["runtime_framework"], src["max_steps"],
                src["timeout_seconds"], src["cost_limit"], target_tenant,
            ))
            cur.execute("""
                INSERT INTO deploy_manifest (project_id, artifact_type, artifact_id, parent_artifact)
                VALUES (%s, 'agent', %s, %s)
            """, (project_id, new_aid, source_aid))
            manifest.append({"artifact_type": "agent", "artifact_id": new_aid,
                             "parent": source_aid, "status": "PROVISIONED"})

        # 2. Verify tables exist (don't create · they're shared)
        for t in bp["tables"]:
            cur.execute("""
                SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name=%s)
            """, (t,))
            present = cur.fetchone()[0]
            cur.execute("""
                INSERT INTO deploy_manifest (project_id, artifact_type, artifact_id)
                VALUES (%s, 'table', %s)
            """, (project_id, t))
            manifest.append({"artifact_type": "table", "artifact_id": t,
                             "status": "VERIFIED" if present else "MISSING"})

        # 3. Record endpoints + ui_tabs as references
        for ep in bp["endpoints"]:
            cur.execute("""
                INSERT INTO deploy_manifest (project_id, artifact_type, artifact_id)
                VALUES (%s, 'endpoint', %s)
            """, (project_id, ep))
            manifest.append({"artifact_type": "endpoint", "artifact_id": ep,
                             "status": "REGISTERED"})
        for tab in bp["ui_tabs"]:
            cur.execute("""
                INSERT INTO deploy_manifest (project_id, artifact_type, artifact_id)
                VALUES (%s, 'tab', %s)
            """, (project_id, tab))
            manifest.append({"artifact_type": "tab", "artifact_id": tab,
                             "status": "REGISTERED"})

        # 4. Transition tenant_project to active
        cur.execute("""
            UPDATE tenant_project SET status='active' WHERE project_id=%s
        """, (project_id,))

    return {
        "project_id": project_id,
        "blueprint_id": bp_id,
        "blueprint_name": bp["name"],
        "tenant_id": target_tenant,
        "deployed_by": deployed_by,
        "approval_id": approval_id,
        "status": "active",
        "manifest": manifest,
        "n_artifacts": len(manifest),
        "deployed_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/projects")
def list_projects():
    """All blueprint-provisioned projects."""
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT tp.*,
              (SELECT COUNT(*) FROM deploy_manifest WHERE project_id=tp.project_id) AS n_artifacts
            FROM tenant_project tp ORDER BY deployed_at DESC LIMIT 100
        """)
        rows = [dict(r) for r in cur.fetchall()]
    return {"projects": rows, "count": len(rows)}


@router.get("/projects/{project_id}/manifest")
def project_manifest(project_id: str):
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM tenant_project WHERE project_id=%s", (project_id,))
        tp = cur.fetchone()
        if not tp:
            return {"error": "project not found"}
        cur.execute("""
            SELECT * FROM deploy_manifest WHERE project_id=%s ORDER BY created_at
        """, (project_id,))
        m = [dict(r) for r in cur.fetchall()]
    return {"project": dict(tp), "manifest": m, "n_artifacts": len(m)}


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
