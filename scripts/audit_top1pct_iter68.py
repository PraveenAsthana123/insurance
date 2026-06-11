#!/usr/bin/env python3
"""Iter 68 · §99 push · 7 new tables + 4 new agents."""
import os, sys, logging
from pathlib import Path
REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO)); sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1"); os.environ.setdefault("INSUR_DISABLE_PRESIDIO", "1")
logging.disable(logging.CRITICAL)

def main():
    fails = 0
    def a(label, ok, detail=""):
        nonlocal fails
        mark = "✓" if ok else "✗"
        print(f"  {label[:55]:<55} | {mark} {('PASS' if ok else 'FAIL')}{(' · ' + detail) if detail else ''}")
        if not ok: fails += 1
    print("Iter 68 · §99 push · 7 new tables + 4 new agents\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    import psycopg2
    cx = psycopg2.connect(host='localhost', port=5434, user='insur_user',
                          password='insur_secret_password', dbname='insur_analytics')
    with cx, cx.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) FROM information_schema.tables
            WHERE table_name IN ('mcp_server_registry','eval_registry','dataset_registry',
                                 'access_registry','dead_letter_queue','kill_switch','abac_policy')
        """)
        n_tables = cur.fetchone()[0]
        cur.execute("""
            SELECT COUNT(*) FROM agent_registry
            WHERE agent_id IN ('sys_router_agent','sys_memory_agent','sys_cost_agent','sys_compliance_agent')
        """)
        n_agents = cur.fetchone()[0]
        cur.execute("""
            SELECT COUNT(*) FROM information_schema.columns
            WHERE table_name='agent_invocation' AND column_name='retry_count'
        """)
        has_retry = cur.fetchone()[0]
    cx.close()
    a(f"1. 7 new registry tables ({n_tables})", n_tables == 7)
    a(f"2. 4 dedicated agents ({n_agents})", n_agents == 4)
    a(f"3. retry_count column on agent_invocation ({has_retry})", has_retry == 1)

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    r = c.get("/api/v1/governance-registries/health")
    a(f"4. /health · all_present={r.json().get('all_present')}",
      r.json().get("all_present") is True)

    r = c.get("/api/v1/governance-registries/mcp-registry")
    a(f"5. mcp_server_registry · 4 seeded ({r.json().get('count')})",
      r.json().get("count") == 4)

    r = c.get("/api/v1/governance-registries/eval-registry")
    a(f"6. eval_registry · 5 seeded ({r.json().get('count')})",
      r.json().get("count") == 5)

    # Kill switch
    r = c.post("/api/v1/governance-registries/kill-switch/toggle", json={
        "switch_id": "audit-test", "target_type": "agent",
        "target_id": "test", "kill": True
    })
    a("7. kill-switch toggle works",
      r.json().get("is_killed") is True)

    # ABAC
    r = c.post("/api/v1/governance-registries/abac/evaluate", json={
        "user_role": "analyst", "resource_type": "agent_invocation",
        "resource_pii_classification": "PII", "action": "read"
    })
    a(f"8. ABAC evaluate · decision={r.json().get('decision')}",
      r.json().get("decision") in ("Allow", "Deny"))

    # §99 climbed
    r = c.get("/api/v1/production-checklist/summary")
    s = r.json()
    a(f"9. §99 prod-ready ≥ 88% Grade A- ({s['production_ready_pct']}%)",
      s["production_ready_pct"] >= 88)
    a(f"10. §99 done ≥ 80 ({s['done']})", s["done"] >= 80)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
