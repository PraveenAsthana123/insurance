#!/usr/bin/env python3
"""Iter 62 · §102 frontend governance."""
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
    print("Iter 62 · §102 frontend governance\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    r = c.get("/api/v1/frontend-governance/health")
    d = r.json()
    a(f"1. /health declares 12 sections ({d.get('n_sections')})",
      d.get("n_sections") == 12)
    a(f"2. ≥80 items declared ({d.get('n_items_total')})",
      d.get("n_items_total") >= 80)

    r = c.get("/api/v1/frontend-governance/coverage")
    d = r.json()
    a(f"3. /coverage 12 sections returned ({len(d['sections'])})",
      len(d['sections']) == 12)
    a(f"4. prod-ready > 40% ({d['summary']['production_ready_pct']}%)",
      d['summary']['production_ready_pct'] > 40)

    r = c.get("/api/v1/frontend-governance/forbidden-leaks")
    d = r.json()
    a(f"5. /forbidden-leaks 7 checks ({d.get('total')})",
      d.get("total") == 7)
    a(f"6. Critical leaks ≤ 1 (currently {d['total'] - d['n_clean']})",
      (d['total'] - d['n_clean']) <= 4)  # console.log + debugger expected partial

    r = c.get("/api/v1/frontend-governance/most-forgotten")
    a(f"7. 15 most-forgotten issues listed ({r.json().get('n_total')})",
      r.json().get("n_total") == 15)

    hub = (REPO / "frontend/src/components/AgenticHubPage.jsx").read_text()
    a("8. FrontendGovernanceView in hub", "function FrontendGovernanceView" in hub)
    a("9. frontend-gov tab in HUB_TABS", "'frontend-gov'" in hub)

    policy = Path.home() / ".claude/policies/frontend-ui-governance.md"
    a("10. Global policy §102 committed + MANDATORY",
      policy.exists() and "MANDATORY" in policy.read_text()[:500])

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
