#!/usr/bin/env python3
"""Register a supervisor agent per §104 missing office.

Per §106 safe-action allowlist: INSERT agent_registry (status='Active' ·
ON CONFLICT idempotent). Closes P3 findings from missing-items-advisor
without crossing §103.5 gates.

Output JSON to stdout: {"registered": n_new, "already_present": n_existing,
"offices": [...]}
"""
from __future__ import annotations
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path("/mnt/deepa/insur_project")
sys.path.insert(0, str(ROOT / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")
os.environ.setdefault("INSUR_DISABLE_PRESIDIO", "1")

import psycopg2  # noqa: E402
import psycopg2.extras  # noqa: E402
from missing_offices.offices import all_offices  # noqa: E402
from core.config import get_settings  # noqa: E402

TZ = ZoneInfo("America/Edmonton")


def stamp() -> str:
    return datetime.now(TZ).strftime("%Y-%m-%d %H:%M:%S MDT")


def register_office_supervisor(cur, office: dict) -> dict:
    """Idempotent insert per §106. Returns {action, agent_id}."""
    agent_id = f"sys_{office['id']}_supervisor"
    purpose = office.get("purpose", "")
    kpis = office.get("kpis", [])
    payload = {
        "office_id": office["id"],
        "office_name": office["name"],
        "category": office.get("category", ""),
        "kpis": kpis,
        "questions": office.get("questions", []),
        "registered_by": "sys_office_provisioner",
        "registered_at": stamp(),
        "policy_ref": "§104 + §106 safe-allowlist + §150 watchdog drilled",
    }
    cur.execute(
        """
        INSERT INTO agent_registry (
            agent_id, agent_name, agent_type, department_id, business_domain,
            purpose, owner_team, status, version, autonomy_level, risk_level,
            model_name, runtime_framework, max_steps, timeout_seconds, cost_limit,
            tenant_id, created_at
        ) VALUES (
            %s, %s, 'Supervisor', NULL, %s,
            %s, %s, 'Active', 'v1.0', 'Approval Required', 'Low',
            'llama3.2:1b', 'LangGraph', 5, 30, 1.00,
            'default', NOW()
        )
        ON CONFLICT (agent_id) DO NOTHING
        RETURNING agent_id;
        """,
        (
            agent_id,
            f"{office['name']} · Supervisor",
            office.get("category", "Operations"),
            purpose,
            office.get("category", "Operations") + " Office Team",
        ),
    )
    result = cur.fetchone()
    return {
        "action": "registered" if result else "already_present",
        "agent_id": agent_id,
        "office_id": office["id"],
        "office_name": office["name"],
    }


def main() -> None:
    conn = psycopg2.connect(get_settings().database_url)
    conn.autocommit = False

    n_new = 0
    n_existing = 0
    results = []

    try:
        with conn.cursor() as cur:
            for office in all_offices():
                r = register_office_supervisor(cur, office)
                results.append(r)
                if r["action"] == "registered":
                    n_new += 1
                else:
                    n_existing += 1
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(json.dumps({"error": f"{type(e).__name__}: {e}", "ts_local": stamp()}, indent=2))
        sys.exit(1)
    finally:
        conn.close()

    report = {
        "registered": n_new,
        "already_present": n_existing,
        "total_offices": len(results),
        "ts_local": stamp(),
        "actor_user": os.getenv("USER", "unknown"),
        "actor_host": os.uname().nodename,
        "policy_refs": ["§104 missing offices", "§106 safe-allowlist", "§107 timestamps"],
        "offices": results,
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
