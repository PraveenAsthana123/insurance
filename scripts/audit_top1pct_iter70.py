#!/usr/bin/env python3
"""Iter 70 · §101 A+ · naming gate + release env gate."""
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
    print("Iter 70 · §101 A+\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    r = c.get("/api/v1/release-gate/health")
    d = r.json()
    a(f"1. release-gate · 4 envs ({d.get('environments')})",
      d.get("environments") == 4)
    a(f"2. naming policies · ≥3 ({d.get('naming_policies')})",
      d.get("naming_policies") >= 3)

    # Validate good vs bad
    r = c.post("/api/v1/naming-policy/validate",
               json={"name": "acme.claims.prod.rag-service", "policy_id": "naming-namespace"})
    a("3. Good namespace validates",
      r.json().get("valid") is True)

    r = c.post("/api/v1/naming-policy/validate",
               json={"name": "BadName_2024", "policy_id": "naming-namespace"})
    a("4. Bad namespace rejected",
      r.json().get("valid") is False)

    # Scan codebase
    r = c.post("/api/v1/naming-policy/scan")
    a(f"5. Codebase scan returns compliance % ({r.json().get('compliance_pct')}%)",
      r.json().get("compliance_pct") is not None)

    # Promote
    r = c.post("/api/v1/release-gate/promote", json={
        "artifact_name": "audit-test", "artifact_version": "1.0",
        "from_env": "qa", "requested_by": "audit"
    })
    pr = r.json()
    a(f"6. Promote QA→UAT creates pending ({pr.get('to_env')})",
      pr.get("to_env") == "uat" and pr.get("status") == "pending")

    # Approve
    r = c.post("/api/v1/release-gate/approve", json={
        "promotion_id": pr["promotion_id"], "decision": "approved"
    })
    a(f"7. Approve transitions to approved",
      r.json().get("status") == "approved")

    # Reject path
    r = c.post("/api/v1/release-gate/promote", json={
        "artifact_name": "reject-test", "artifact_version": "1.0",
        "from_env": "uat", "requested_by": "audit"
    })
    pid = r.json().get("promotion_id")
    r = c.post("/api/v1/release-gate/approve", json={
        "promotion_id": pid, "decision": "rejected"
    })
    a(f"8. Reject path works ({r.json().get('status')})",
      r.json().get("status") == "rejected")

    # §101 score
    r = c.get("/api/v1/enterprise-standard/coverage")
    p = r.json()["policy_summary"]
    a(f"9. §101 prod-ready ≥ 95% A+ ({p['production_ready_pct']}%)",
      p["production_ready_pct"] >= 95)
    a(f"10. §101 done = 15/15 ({p['done']})", p["done"] == 15)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
