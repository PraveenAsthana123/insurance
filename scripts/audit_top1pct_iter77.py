#!/usr/bin/env python3
"""Iter 77 · §103 Phase 8 · autonomous loop · 8 self-* composed."""
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
    print("Iter 77 · §103 Phase 8 · 8 self-* composed\n")

    # Tables
    import psycopg2
    cx = psycopg2.connect(host='localhost', port=5434, user='insur_user',
                          password='insur_secret_password', dbname='insur_analytics')
    with cx, cx.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) FROM information_schema.tables
            WHERE table_name IN ('autonomous_loop_run','autonomous_loop_step')
        """)
        n = cur.fetchone()[0]
    cx.close()
    a(f"1. 2 new tables ({n})", n == 2)

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    r = c.get("/api/v1/autonomous-loop/health")
    a(f"2. /health · 8 capabilities ({len(r.json().get('capabilities', []))})",
      len(r.json().get("capabilities", [])) == 8)

    # Low-risk run
    r = c.post("/api/v1/autonomous-loop/run", json={
        "blueprint_id": "copilot", "project_name": "audit-loop-1"
    })
    d = r.json()
    a(f"3. Low-risk run completes ({d.get('status')})",
      d.get("status") == "completed")
    a(f"4. ≥7 steps passed ({d.get('n_steps_passed')})",
      d.get("n_steps_passed", 0) >= 7)
    a(f"5. Project created ({d.get('project_id', '')[:14]})",
      d.get("project_id", "").startswith("PRJ-"))

    # Trace shape
    trace = d.get("trace", [])
    capabilities_seen = {t["capability"] for t in trace}
    expected = {"self-monitoring", "self-building", "self-governing",
                "self-deploying", "self-testing", "self-healing",
                "self-optimizing", "self-improving"}
    a(f"6. All 8 capabilities in trace ({len(capabilities_seen)})",
      capabilities_seen == expected)

    # Get the loop detail
    loop_id = d.get("loop_id")
    r = c.get(f"/api/v1/autonomous-loop/runs/{loop_id}")
    a(f"7. /runs/{{id}} returns 8 steps ({r.json().get('n_steps')})",
      r.json().get("n_steps") == 8)

    # High-risk run · should halt at governing
    r = c.post("/api/v1/autonomous-loop/run", json={
        "blueprint_id": "compliance_assistant", "project_name": "audit-loop-2"
    })
    d2 = r.json()
    a(f"8. High-risk halts at governing ({d2.get('halted_at_step')})",
      d2.get("halted_at_step") == 3 or d2.get("n_steps_passed", 0) <= 3)

    # List
    r = c.get("/api/v1/autonomous-loop/runs")
    a(f"9. /runs lists ≥2 ({r.json().get('count')})",
      r.json().get("count", 0) >= 2)

    # Lesson learned recorded
    cx = psycopg2.connect(host='localhost', port=5434, user='insur_user',
                          password='insur_secret_password', dbname='insur_analytics')
    with cx, cx.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM lesson_learned WHERE category='autonomous-loop'")
        n_lessons = cur.fetchone()[0]
    cx.close()
    a(f"10. Lessons learned recorded ({n_lessons})", n_lessons >= 1)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
