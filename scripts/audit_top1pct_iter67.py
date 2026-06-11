#!/usr/bin/env python3
"""Iter 67 · §99 + §101 · 10 mandatory tables + Text2SQL + checkpoint."""
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
    print("Iter 67 · 10 mandatory tables · §99 + §101 climb\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    # Tables exist
    import psycopg2
    cx = psycopg2.connect(host='localhost', port=5434, user='insur_user',
                          password='insur_secret_password', dbname='insur_analytics')
    with cx, cx.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) FROM information_schema.tables
            WHERE table_name IN ('workflow_run','workflow_step','prompt_log',
                                 'model_registry','notification_log','error_log',
                                 'checkpoint_store','audit_log','status_history',
                                 'approval_request')
        """)
        n = cur.fetchone()[0]
    cx.close()
    a(f"1. 10 new mandatory tables created ({n})", n == 10)

    r = c.get("/api/v1/governance-tables/health")
    d = r.json()
    a(f"2. /health · 12/12 mandatory tables present ({d.get('present')})",
      d.get("present") == 12)

    # Create workflow
    r = c.post("/api/v1/governance-tables/workflow-run",
               json={"user_id": "audit", "owner": "test"})
    wf_id = r.json().get("workflow_id")
    a(f"3. POST /workflow-run creates WF ({wf_id})", wf_id and wf_id.startswith("WF-"))

    # Status transition
    r = c.patch(f"/api/v1/governance-tables/workflow-run/{wf_id}/status",
                json={"to_status": "PLANNED"})
    a("4. PATCH /status moves to PLANNED",
      r.json().get("to") == "PLANNED")

    # Read back
    r = c.get(f"/api/v1/governance-tables/workflow-run/{wf_id}")
    a(f"5. GET /workflow-run returns history ({len(r.json().get('history', []))})",
      len(r.json().get("history", [])) >= 2)

    # Checkpoint
    r = c.post("/api/v1/governance-tables/checkpoint",
               json={"workflow_id": wf_id, "step_no": 1, "state": {"k": "v"}})
    a("6. POST /checkpoint returns id", r.json().get("checkpoint_id") is not None)

    # Text2SQL
    r = c.post("/api/v1/governance-tables/text2sql/translate",
               json={"natural_language": "count agents"})
    d = r.json()
    a("7. Text2SQL · safety gates declared",
      d.get("all_passed") is True and "RLS_ENFORCED" in str(d).upper())

    # Model registry
    r = c.get("/api/v1/governance-tables/model-registry")
    a(f"8. model_registry seeded ({r.json().get('count')})",
      r.json().get("count") >= 3)

    # §101 coverage climbed
    r = c.get("/api/v1/enterprise-standard/coverage")
    p = r.json()["policy_summary"]
    t = r.json()["tables_summary"]
    a(f"9. §101 prod-ready ≥ 85% ({p['production_ready_pct']}%)",
      p["production_ready_pct"] >= 85)
    a(f"10. §101 tables ≥ 12/12 ({t['present']})",
      t["present"] == 12)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
