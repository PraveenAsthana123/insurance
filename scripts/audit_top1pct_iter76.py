#!/usr/bin/env python3
"""Iter 76 · §103 Phase 9 · Enterprise Intelligence Layer."""
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
    print("Iter 76 · §103 Phase 9 · EIL\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    r = c.get("/api/v1/enterprise-intelligence/health")
    d = r.json()
    a(f"1. /health · phase=9 ({d.get('phase')})", d.get("phase") == 9)

    r = c.get("/api/v1/enterprise-intelligence/digital-twin")
    d = r.json()
    a("2. /digital-twin returns agents · invocations · cost",
      all(k in d for k in ["agents", "invocations_24h", "cost", "projects"]))
    a(f"3. Digital twin · ≥100 active agents ({d['agents']['active_agents']})",
      d["agents"]["active_agents"] >= 100)

    r = c.get("/api/v1/enterprise-intelligence/knowledge-graph")
    d = r.json()
    a(f"4. Knowledge graph · ≥10 nodes ({d.get('n_nodes')})",
      d.get("n_nodes", 0) >= 10)
    a(f"5. Knowledge graph · ≥5 edges ({d.get('n_edges')})",
      d.get("n_edges", 0) >= 5)

    # Advisor
    for q, lens_must_contain in [
        ("What is our cost?", "CFO"),
        ("Any security concerns?", "CISO"),
        ("Agent utilization?", "COO"),
    ]:
        r = c.post("/api/v1/enterprise-intelligence/advisor/ask",
                   json={"question": q})
        d = r.json()
        ok = any(lens_must_contain in ans.get("lens", "") for ans in d.get("answers", []))
        a(f"6-8. Advisor '{q[:25]}' → {lens_must_contain}", ok)

    # Predictions
    r = c.get("/api/v1/enterprise-intelligence/predictions")
    a(f"9. /predictions returns ≥1 ({r.json().get('count')})",
      r.json().get("count", 0) >= 1)

    # Scenario simulation
    r = c.post("/api/v1/enterprise-intelligence/scenarios/simulate",
               json={"scenario": "ollama_only"})
    a("10. /scenarios/simulate · ollama_only returns savings",
      "savings_per_24h" in r.json().get("projected", {}))

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
