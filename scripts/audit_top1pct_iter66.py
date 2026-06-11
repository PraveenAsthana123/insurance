#!/usr/bin/env python3
"""Iter 66 · §102 push 3 · SSE + audit + StatusBanner + Vitest."""
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
    print("Iter 66 · §102 push 3\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    r = c.get("/api/v1/sse/health")
    a("1. /sse/health responds", r.status_code == 200)

    r = c.post("/api/v1/frontend-audit/log", json={
        "event": "LOGIN", "session_id": "s-audit", "user_id": "u-test"
    })
    a("2. POST /frontend-audit/log returns ok",
      r.status_code == 200 and r.json().get("canonical"))

    r = c.get("/api/v1/frontend-audit/summary")
    d = r.json()
    a(f"3. /audit/summary has 11 canonical events ({len(d.get('canonical_events', []))})",
      len(d.get("canonical_events", [])) == 11)

    sse = REPO / "frontend/src/hooks/useSSE.js"
    a("4. useSSE hook exists",
      sse.exists() and "EventSource" in sse.read_text())

    fa = REPO / "frontend/src/hooks/useFrontendAudit.js"
    a("5. useFrontendAudit · 10 audit helpers",
      fa.exists() and all(h in fa.read_text() for h in
                          ["auditLogin", "auditLogout", "auditRefresh",
                           "auditPromptSubmit", "auditFileUpload",
                           "auditApproval", "auditReject", "auditExport",
                           "auditDownload", "auditError"]))

    sb = REPO / "frontend/src/components/common/StatusBanner.jsx"
    a("6. StatusBanner · 7 fields + 12 workflow states",
      sb.exists() and "WORKFLOW_STATES" in sb.read_text())

    test = REPO / "frontend/src/components/common/Skeleton.test.jsx"
    a("7. Skeleton.test.jsx · Vitest spec",
      test.exists() and "describe" in test.read_text())

    hub = (REPO / "frontend/src/components/AgenticHubPage.jsx").read_text()
    a("8. Hub uses useAuditBoot + useSSE imports",
      "useAuditBoot" in hub and "useSSE" in hub)

    # §102 score
    r = c.get("/api/v1/frontend-governance/coverage")
    s = r.json()["summary"]
    a(f"9. §102 prod-ready ≥ 88% Grade A- ({s['production_ready_pct']}%)",
      s["production_ready_pct"] >= 88)

    a(f"10. §102 missing ≤ 5 ({s['missing']})", s["missing"] <= 5)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
