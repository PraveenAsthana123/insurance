#!/usr/bin/env python3
"""Iter 78 · 22 enterprise AI governance domains · operator brief."""
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
    print("Iter 78 · 22 enterprise AI domains\n")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    r = c.get("/api/v1/enterprise-ai-domains/health")
    a(f"1. /health · 22 domains ({r.json().get('domains_total')})",
      r.json().get("domains_total") == 22)

    r = c.get("/api/v1/enterprise-ai-domains")
    d = r.json()
    a(f"2. /list returns 22 ({d.get('count')})", d.get("count") == 22)
    a(f"3. ≥7 categories ({len(d.get('categories', []))})",
      len(d.get("categories", [])) >= 7)

    # Each row has a link
    has_link = all("link" in row for row in d.get("domains", []))
    a("4. Every domain row has 'link' field", has_link)

    r = c.get("/api/v1/enterprise-ai-domains/categories")
    a(f"5. /categories returns mapping ({r.json().get('count')})",
      r.json().get("count") >= 7)

    # Specific domains required by operator brief
    must_exist = ["ai_strategy", "ai_governance", "ai_risk", "ai_trust",
                  "ai_economics", "ai_compliance", "ai_knowledge",
                  "ai_portfolio", "ai_workforce", "ai_accountability",
                  "ai_control_tower"]
    have_ids = {row["id"] for row in d.get("domains", [])}
    missing = [m for m in must_exist if m not in have_ids]
    a(f"6. All 11 operator-named domains present (missing: {missing})",
      not missing)

    # Detail returns agent verification
    r = c.get("/api/v1/enterprise-ai-domains/by-id/ai_trust")
    detail = r.json()
    a("7. Detail returns agents_status array",
      "agents_status" in detail and "readiness_pct" in detail)

    # Bulk readiness
    r = c.get("/api/v1/enterprise-ai-domains/readiness/all")
    d2 = r.json()
    a(f"8. Bulk readiness · 22 entries ({len(d2.get('domains', []))})",
      len(d2.get("domains", [])) == 22)
    a(f"9. ≥10 domains ≥50% ready ({d2['summary']['n_ready']})",
      d2["summary"]["n_ready"] >= 10)

    # UI wired
    hub = (REPO / "frontend/src/components/AgenticHubPage.jsx").read_text()
    a("10. UI · EnterpriseAIDomainsView wired",
      "EnterpriseAIDomainsView" in hub and "enterprise-ai-domains" in hub)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
