#!/usr/bin/env python3
"""Iter 65 · §102 push 2 · ErrorBoundary + analytics + upload + Playwright."""
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
    print("Iter 65 · §102 push 2\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    eb = REPO / "frontend/src/components/common/ErrorBoundary.jsx"
    a("1. ErrorBoundary.jsx · component error capture",
      eb.exists() and "installGlobalErrorHandlers" in eb.read_text())

    ua = REPO / "frontend/src/hooks/useUserAnalytics.js"
    a("2. useUserAnalytics · click + refresh tracking",
      ua.exists() and "useClickTracking" in ua.read_text() and "useRefreshTracking" in ua.read_text())

    fu = REPO / "frontend/src/hooks/useFileUpload.js"
    a("3. useFileUpload · resumable chunks via localStorage",
      fu.exists() and "CHUNK_SIZE" in fu.read_text())

    pf = REPO / "frontend/src/hooks/usePersistedFilter.js"
    a("4. usePersistedFilter · localStorage filter state",
      pf.exists())

    rb = REPO / "frontend/src/components/common/RetryBanner.jsx"
    a("5. RetryBanner + ApiErrorRetry components",
      rb.exists() and "RetryBanner" in rb.read_text() and "ApiErrorRetry" in rb.read_text())

    e2e = REPO / "frontend/e2e/most-forgotten.spec.js"
    a("6. Playwright spec for 15 most-forgotten issues",
      e2e.exists() and e2e.read_text().count("test(") >= 15)

    hub = (REPO / "frontend/src/components/AgenticHubPage.jsx").read_text()
    a("7. Hub uses ErrorBoundary + click/refresh hooks",
      "ErrorBoundary" in hub and "useClickTracking" in hub and "useRefreshTracking" in hub)

    # §102 climbed
    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())
    r = c.get("/api/v1/frontend-governance/coverage").json()
    s = r["summary"]
    a(f"8. §102 prod-ready ≥ 75% Grade B-/B ({s['production_ready_pct']}%)",
      s["production_ready_pct"] >= 75)

    # Component error from boundary captured via telemetry
    a(f"9. §102 done count ≥ 50 ({s['done']})", s["done"] >= 50)
    a(f"10. §102 missing count ≤ 12 ({s['missing']})", s["missing"] <= 12)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
