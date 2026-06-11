#!/usr/bin/env python3
"""Iter 75 · Phase 7 depth · blueprint deploy provisioner."""
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
    print("Iter 75 · Phase 7 deploy provisioner\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    # Tables
    import psycopg2
    cx = psycopg2.connect(host='localhost', port=5434, user='insur_user',
                          password='insur_secret_password', dbname='insur_analytics')
    with cx, cx.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) FROM information_schema.tables
            WHERE table_name IN ('tenant_project','deploy_manifest')
        """)
        n = cur.fetchone()[0]
    cx.close()
    a(f"1. 2 new tables ({n})", n == 2)

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    # Request
    r = c.post("/api/v1/blueprint-library/deploy/request",
               json={"blueprint_id": "copilot", "project_name": "audit-deploy-test"})
    req = r.json()
    aid = req.get("approval_id")
    a(f"2. Deploy request created ({aid[:18]})", aid and aid.startswith("DEPLOY-"))

    # Reject path · execute without approval should fail
    r = c.post(f"/api/v1/blueprint-library/deploy/execute?approval_id={aid}")
    a("3. Execute on pending rejects",
      r.json().get("error", "").startswith("approval status"))

    # Approve
    cx = psycopg2.connect(host='localhost', port=5434, user='insur_user',
                          password='insur_secret_password', dbname='insur_analytics')
    with cx, cx.cursor() as cur:
        cur.execute("UPDATE approval_request SET status='approved' WHERE approval_id=%s",
                    (aid,))
    cx.close()

    # Execute
    r = c.post(f"/api/v1/blueprint-library/deploy/execute?approval_id={aid}")
    d = r.json()
    a(f"4. Execute provisions ({d.get('project_id', '')[:18]})",
      d.get("project_id", "").startswith("PRJ-"))
    a(f"5. Manifest has artifacts ({d.get('n_artifacts')})",
      d.get("n_artifacts", 0) >= 2)
    a(f"6. Status=active", d.get("status") == "active")

    # Idempotency
    r = c.post(f"/api/v1/blueprint-library/deploy/execute?approval_id={aid}")
    a(f"7. Idempotent re-run",
      r.json().get("idempotent") is True)

    # List
    r = c.get("/api/v1/blueprint-library/projects")
    a(f"8. /projects lists ≥1 ({r.json().get('count')})",
      r.json().get("count", 0) >= 1)

    # Manifest
    pid = d["project_id"]
    r = c.get(f"/api/v1/blueprint-library/projects/{pid}/manifest")
    a(f"9. /manifest returns artifacts ({r.json().get('n_artifacts')})",
      r.json().get("n_artifacts", 0) >= 2)

    # Cloned agent exists in agent_registry
    cx = psycopg2.connect(host='localhost', port=5434, user='insur_user',
                          password='insur_secret_password', dbname='insur_analytics')
    with cx, cx.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM agent_registry WHERE agent_id LIKE %s",
                    (pid.lower() + "%",))
        n_cloned = cur.fetchone()[0]
    cx.close()
    a(f"10. Agents cloned into agent_registry ({n_cloned})", n_cloned >= 1)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
