"""Register non-agentic routers as System Agents · idempotent · cron-safe."""
from __future__ import annotations

from typing import Any

import psycopg2
import psycopg2.extras

from core.config import get_settings
from agentic_adapter.discovery import discover_all


def _conn():
    return psycopg2.connect(get_settings().database_url)


def _slug(s: str) -> str:
    return s.lower().replace("-", "_").replace(" ", "_")


def register_router_as_agent(mod_info: dict[str, Any]) -> dict[str, Any]:
    """Upsert one System Agent for the router · plus skills per endpoint."""
    if mod_info.get("error"):
        return {"module": mod_info["module"], "skipped": True, "reason": mod_info["error"]}

    mod_name = mod_info["module"]
    agent_id = f"sys_{_slug(mod_name)}"
    category = mod_info.get("category", "Platform")

    n_skills_added = 0
    with _conn() as c, c.cursor() as cur:
        # 1. Upsert the system agent
        cur.execute("""
            INSERT INTO agent_registry
              (agent_id, agent_name, agent_type, department_id, business_domain,
               purpose, owner_team, status, autonomy_level, risk_level,
               model_name, runtime_framework, max_steps, timeout_seconds,
               cost_limit, tenant_id)
            VALUES (%s, %s, 'Worker', 'Platform', %s, %s, %s, 'Active',
                    'Automatic', 'Low', NULL, 'native-router', 10, 30, 0.00, 'default')
            ON CONFLICT (agent_id) DO UPDATE SET
              status        = 'Active',
              business_domain = EXCLUDED.business_domain,
              updated_at    = CURRENT_TIMESTAMP
        """, (
            agent_id,
            f"System Agent · {mod_name}",
            category,
            f"Native router · {mod_name} · {mod_info.get('n_endpoints')} endpoint(s)",
            f"{category} Platform Team",
        ))

        # 2. Upsert one skill per endpoint · map to agent
        for ep in mod_info.get("endpoints", []):
            for method in ep["methods"]:
                skill_id = f"sys_{_slug(mod_name)}_{method.lower()}_{_slug(ep['path']).strip('_')[:40]}"
                skill_id = skill_id[:100]  # max 100 chars per schema

                # Risk · Write/Delete are higher · Read is Low
                risk = "Medium" if method in ("POST", "PUT", "PATCH") else \
                       "High" if method == "DELETE" else "Low"

                cur.execute("""
                    INSERT INTO skill_registry
                      (skill_id, skill_name, skill_category, description,
                       risk_level, execution_mode, status, owner_team, tenant_id)
                    VALUES (%s, %s, %s, %s, %s,
                            CASE WHEN %s = 'High' THEN 'Approval Required' ELSE 'Automatic' END,
                            'Active', %s, 'default')
                    ON CONFLICT (skill_id) DO UPDATE SET
                      status     = 'Active',
                      updated_at = CURRENT_TIMESTAMP
                """, (
                    skill_id,
                    f"{method} {ep['path']}",
                    "Endpoint",
                    (ep.get("doc") or f"Endpoint {method} {ep['path']}")[:200],
                    risk, risk,
                    f"{category} Platform Team",
                ))

                # 3. Map agent → skill
                cur.execute("""
                    INSERT INTO agent_skill_mapping
                      (agent_id, skill_id, execution_mode, priority, status)
                    VALUES (%s, %s,
                            CASE WHEN %s = 'High' THEN 'Approval Required' ELSE 'Automatic' END,
                            100, 'Active')
                    ON CONFLICT (agent_id, skill_id) DO NOTHING
                """, (agent_id, skill_id, risk))
                n_skills_added += 1

    return {
        "module": mod_name,
        "agent_id": agent_id,
        "n_endpoints": mod_info.get("n_endpoints"),
        "n_skills_registered": n_skills_added,
        "category": category,
        "ok": True,
    }


def run_coverage_loop() -> dict[str, Any]:
    """Discover + register every non-agentic router. Idempotent. Cron-safe."""
    all_routers = discover_all()
    results = []
    for r in all_routers:
        try:
            res = register_router_as_agent(r)
        except Exception as e:
            res = {"module": r.get("module"), "ok": False, "error": str(e)[:200]}
        results.append(res)

    n_ok = sum(1 for r in results if r.get("ok"))
    n_skipped = sum(1 for r in results if r.get("skipped"))
    n_failed = sum(1 for r in results if not r.get("ok") and not r.get("skipped"))
    total_skills = sum(r.get("n_skills_registered", 0) for r in results if r.get("ok"))

    return {
        "results": results,
        "n_routers_scanned": len(all_routers),
        "n_agents_registered": n_ok,
        "n_skipped": n_skipped,
        "n_failed": n_failed,
        "total_skills_registered": total_skills,
    }


def coverage_stats() -> dict[str, Any]:
    """Current coverage · agentic + system agents counted separately."""
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT
              COUNT(*) FILTER (WHERE agent_id LIKE 'sys_%' AND status='Active') AS system_agents,
              COUNT(*) FILTER (WHERE agent_id NOT LIKE 'sys_%' AND status='Active') AS business_agents,
              COUNT(*) FILTER (WHERE status='Active') AS total_active,
              COUNT(*) AS total_all
            FROM agent_registry
        """)
        agents = dict(cur.fetchone())
        cur.execute("""
            SELECT
              COUNT(*) FILTER (WHERE skill_id LIKE 'sys_%' AND status='Active') AS system_skills,
              COUNT(*) FILTER (WHERE skill_id NOT LIKE 'sys_%' AND status='Active') AS business_skills,
              COUNT(*) FILTER (WHERE status='Active') AS total_active
            FROM skill_registry
        """)
        skills = dict(cur.fetchone())
        cur.execute("""
            SELECT category, COUNT(*) AS n
            FROM (
              SELECT agent_id,
                     SPLIT_PART(business_domain, ' ', 1) AS category
              FROM agent_registry
              WHERE agent_id LIKE 'sys_%' AND status='Active'
            ) sub
            GROUP BY category
            ORDER BY n DESC
        """)
        by_cat = [dict(r) for r in cur.fetchall()]

    routers_scanned = len(discover_all())
    coverage_pct = round(100 * agents.get("system_agents", 0) / max(routers_scanned, 1), 1)

    return {
        "agents": agents,
        "skills": skills,
        "non_agentic_routers_detected": routers_scanned,
        "coverage_pct": coverage_pct,
        "system_agents_by_category": by_cat,
    }
