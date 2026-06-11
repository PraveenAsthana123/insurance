#!/usr/bin/env python3
"""Iter 74 · §103 Phase 6 · 12 reference blueprints."""
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
    print("Iter 74 · §103 Phase 6 · 12 reference blueprints\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    r = c.get("/api/v1/blueprint-library/health")
    a(f"1. /health · 12 blueprints ({r.json().get('blueprints_total')})",
      r.json().get("blueprints_total") == 12)

    r = c.get("/api/v1/blueprint-library")
    d = r.json()
    a(f"2. /list returns 12 ({d.get('count')})", d.get("count") == 12)
    a(f"3. ≥6 categories ({len(d.get('categories', []))})",
      len(d.get("categories", [])) >= 6)

    # Each blueprint has required fields
    required = ["id", "name", "category", "level", "description",
                "agents", "tables", "endpoints", "ui_tabs",
                "estimated_setup_hours", "risk_level", "dependencies"]
    bp = d["blueprints"][0]
    missing = [f for f in required if f not in bp]
    a(f"4. Required schema fields all present (missing: {missing})",
      not missing)

    # Detail with readiness
    r = c.get("/api/v1/blueprint-library/basic_rag")
    detail = r.json()
    a("5. Detail returns agents_present + tables_present",
      "agents_present" in detail and "tables_present" in detail)
    a(f"6. readiness_pct computed ({detail.get('readiness_pct')}%)",
      isinstance(detail.get("readiness_pct"), (int, float)))

    # Bulk readiness
    r = c.get("/api/v1/blueprint-library/readiness/all")
    d = r.json()
    a(f"7. Bulk readiness · 12 entries ({d.get('count')})",
      d.get("count") == 12)
    a(f"8. ≥6 ready to deploy ({d['summary']['n_ready_to_deploy']})",
      d["summary"]["n_ready_to_deploy"] >= 6)

    # Deploy request → approval_request
    r = c.post("/api/v1/blueprint-library/deploy/request", json={
        "blueprint_id": "basic_rag", "project_name": "audit-test"
    })
    a(f"9. Deploy request creates approval ({r.json().get('approval_id', '')[:15]})",
      r.json().get("status") == "requested")

    # UI tab
    hub = (REPO / "frontend/src/components/AgenticHubPage.jsx").read_text()
    a("10. BlueprintLibraryView in hub UI",
      "BlueprintLibraryView" in hub and "blueprints" in hub)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
