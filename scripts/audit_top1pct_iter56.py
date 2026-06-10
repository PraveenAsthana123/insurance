#!/usr/bin/env python3
"""Iter 56 · 22-stage production pipeline."""
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
    print("Iter 56 · 22-stage production pipeline\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    r = c.get("/api/v1/production-pipeline/health")
    a("1. /health · 22 stages declared",
      r.status_code == 200 and r.json().get("n_stages") == 22)

    r = c.get("/api/v1/production-pipeline/stages")
    d = r.json()
    a(f"2. /stages returns 22 ({d.get('count')})", d.get("count") == 22)

    r = c.post("/api/v1/production-pipeline/run",
               json={"user_input": "test", "severity": "info"})
    d = r.json()
    a(f"3. /run returns run_id ({d.get('run_id', '')[:20]})", "run_id" in d)
    a(f"4. All 22 stages executed ({len(d.get('stages', []))})",
      len(d.get("stages", [])) == 22)

    n_ok = sum(1 for s in d.get('stages', []) if s.get('status') == 'ok')
    a(f"5. Most stages OK ({n_ok}/22)", n_ok >= 20)

    a(f"6. Overall confidence > 0.5 ({d.get('overall_confidence')})",
      (d.get('overall_confidence') or 0) > 0.5)

    a(f"7. final_response composed ({(d.get('final_response') or '')[:30]}...)",
      d.get("final_response") is not None)

    # HITL trigger
    r = c.post("/api/v1/production-pipeline/run",
               json={"user_input": "alert ops", "severity": "critical"})
    d = r.json()
    hitl = next(s for s in d['stages'] if s['stage_no'] == 22)
    a(f"8. HITL stage flags critical input ({hitl['output'].get('hitl_required')})",
      hitl['output'].get('hitl_required') is True)

    # Stage agents registered
    import psycopg2
    cx = psycopg2.connect(host='localhost', port=5434, user='insur_user',
                          password='insur_secret_password', dbname='insur_analytics')
    with cx, cx.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM agent_registry WHERE agent_id LIKE 'stage_%'")
        n = cur.fetchone()[0]
    cx.close()
    a(f"9. 22 stage agents in registry ({n})", n == 22)

    hub = REPO / "frontend/src/components/AgenticHubPage.jsx"
    a("10. ProductionPipelineView in hub UI",
      "function ProductionPipelineView" in hub.read_text())

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
