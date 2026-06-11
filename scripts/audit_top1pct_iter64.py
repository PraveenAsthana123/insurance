#!/usr/bin/env python3
"""Iter 64 · §102 quick wins · skeleton/auto-save/web-vitals/tab-sync/telemetry."""
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
    print("Iter 64 · §102 quick wins\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    # Frontend files
    sk = REPO / "frontend/src/components/common/Skeleton.jsx"
    a("1. Skeleton.jsx component exists",
      sk.exists() and "SkeletonCard" in sk.read_text())

    asv = REPO / "frontend/src/hooks/useAutoSave.js"
    a("2. useAutoSave hook + loadDraft + clearDraft",
      asv.exists() and "loadDraft" in asv.read_text())

    wv = REPO / "frontend/src/hooks/useWebVitals.js"
    a("3. useWebVitals hook · LCP/CLS/FID",
      wv.exists() and all(m in wv.read_text() for m in ["LCP","CLS","FID"]))

    ts = REPO / "frontend/src/hooks/useTabSync.js"
    a("4. useTabSync BroadcastChannel hook",
      ts.exists() and "BroadcastChannel" in ts.read_text())

    hub = REPO / "frontend/src/components/AgenticHubPage.jsx"
    htxt = hub.read_text()
    a("5. Hub uses Skeleton + web-vitals + tab-sync",
      all(s in htxt for s in ["SkeletonCard", "useWebVitals", "useTabSync"]))

    # Backend
    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    r = c.post("/api/v1/frontend-telemetry/vital",
               json={"session_id":"s-audit","metric":"LCP","value":1500,
                     "url":"/test","user_agent":"pytest",
                     "screen_width":1920,"screen_height":1080})
    a("6. POST /frontend-telemetry/vital returns ok",
      r.status_code == 200 and r.json().get("ok"))

    r = c.get("/api/v1/frontend-telemetry/summary")
    a(f"7. GET /summary returns metrics ({r.json().get('n_metrics')})",
      r.status_code == 200 and r.json().get("n_metrics", 0) >= 1)

    r = c.put("/api/v1/drafts/test-key", json={"x": 1})
    a("8. PUT /drafts/{key} returns ok",
      r.status_code == 200 and r.json().get("ok"))

    r = c.get("/api/v1/drafts/test-key")
    a("9. GET /drafts/{key} returns value",
      r.status_code == 200 and r.json().get("value", {}).get("x") == 1)

    # §102 coverage climbed
    r = c.get("/api/v1/frontend-governance/coverage")
    s = r.json()["summary"]
    a(f"10. §102 prod-ready ≥ 60% ({s['production_ready_pct']}%)",
      s["production_ready_pct"] >= 60)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
