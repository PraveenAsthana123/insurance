#!/usr/bin/env python3
"""Iter 61 · §101 enterprise standard."""
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
    print("Iter 61 · §101 enterprise standard\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    r = c.get("/api/v1/enterprise-standard/health")
    d = r.json()
    a(f"1. /health declares 15 policy areas ({d.get('policy_areas')})",
      d.get("policy_areas") == 15)
    a(f"2. 12 workflow states ({d.get('workflow_states')})",
      d.get("workflow_states") == 12)
    a(f"3. 13 notification events ({d.get('notification_events')})",
      d.get("notification_events") == 13)
    a(f"4. 12 mandatory tables ({d.get('mandatory_tables')})",
      d.get("mandatory_tables") == 12)
    a(f"5. 17 governance gaps ({d.get('governance_gaps')})",
      d.get("governance_gaps") == 17)
    a(f"6. 10-step project-copy gate ({d.get('project_copy_gate_steps')})",
      d.get("project_copy_gate_steps") == 10)
    a(f"7. 12-check production gate ({d.get('production_gate_checks')})",
      d.get("production_gate_checks") == 12)

    r = c.get("/api/v1/enterprise-standard/coverage")
    d = r.json()
    a(f"8. /coverage · production_ready_pct > 50%",
      d["policy_summary"]["production_ready_pct"] > 50)

    r = c.get("/api/v1/enterprise-standard/production-gate")
    a("9. /production-gate returns 12 checks",
      r.json().get("total") == 12)

    # Global policy + UI
    policy = Path.home() / ".claude/policies/enterprise-agentic-platform-standard.md"
    a("10. Global policy §101 committed + MANDATORY",
      policy.exists() and "MANDATORY" in policy.read_text()[:500])

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
