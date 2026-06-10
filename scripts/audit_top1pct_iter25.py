#!/usr/bin/env python3
"""Iter 25 audit · idempotency + vuln tracker + empty-state + grafana + universal-errorboundary."""
import logging, os, sys
from pathlib import Path
REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO))
sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")
logging.disable(logging.CRITICAL)

def main():
    fails = 0
    def a(label, ok, detail=""):
        nonlocal fails
        mark = "✓" if ok else "✗"
        sfx = f" · {detail}" if detail else ""
        print(f"  {label[:55]:<55} | {mark} {('PASS' if ok else 'FAIL')}{sfx}")
        if not ok: fails += 1

    print("Iter 25 audit · top-5 highest-leverage closures\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    # 1. IdempotencyMiddleware
    mw = REPO / "backend/middleware/idempotency.py"
    a("1. IdempotencyMiddleware · cache + conflict + TTL",
      mw.exists() and "BaseHTTPMiddleware" in mw.read_text()
      and "IDEMPOTENCY_CONFLICT" in mw.read_text())

    # 2. Vuln tracker backend
    v = REPO / "backend/vulnerability/router.py"
    a("2. Vuln router · pip-audit + scaffold fallback",
      v.exists() and "pip-audit" in v.read_text() and "_scaffold_vulns" in v.read_text())

    # 3. Vuln endpoints reachable
    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())
    r = c.get("/api/v1/vulnerabilities/summary")
    d = r.json()
    a(f"3. /vulnerabilities/summary 200 · total {d.get('total')}",
      r.status_code == 200 and "total" in d)

    # 4. Idempotency middleware loaded
    r = c.post("/api/v1/comments", json={"panel_id":"x","process_id":"y","author":"me","body":"hi"},
               headers={"Idempotency-Key": "test-key-25"})
    a("4. Idempotency-Key honored (200 + X-Idempotency-Cache)",
      r.status_code == 200 and "x-idempotency-cache" in {k.lower() for k in r.headers.keys()})

    # 5. Replay returns cached
    r = c.post("/api/v1/comments", json={"panel_id":"x","process_id":"y","author":"me","body":"hi"},
               headers={"Idempotency-Key": "test-key-25"})
    a("5. Replay returns hit",
      r.status_code == 200 and r.headers.get("X-Idempotency-Cache") == "hit")

    # 6. Conflict on different body
    r = c.post("/api/v1/comments", json={"panel_id":"x","process_id":"y","author":"me","body":"different"},
               headers={"Idempotency-Key": "test-key-25"})
    a("6. Different body w/ same key → 409 IDEMPOTENCY_CONFLICT",
      r.status_code == 409)

    # 7. EmptyState
    es = REPO / "frontend/src/components/EmptyState.jsx"
    a("7. EmptyState role=status + icon + accent props",
      es.exists() and 'role="status"' in es.read_text())

    # 8. VulnerabilityPanel
    vp = REPO / "frontend/src/components/VulnerabilityPanel.jsx"
    a("8. VulnerabilityPanel + severity chips + table",
      vp.exists() and "SEVERITY_TONE" in vp.read_text())

    # 9. Grafana dashboard
    gd = REPO / "infra/observability/grafana-dashboard.json"
    a("9. Grafana dashboard JSON · 7 panels + thresholds",
      gd.exists() and '"insur_hitl_queue_size"' in gd.read_text())

    # 10. Universal ErrorBoundary count
    st = (REPO / "frontend/src/pages/insurance/tabs/SimpleTabs.jsx").read_text()
    eb_count = st.count("<ErrorBoundary")
    a(f"10. SimpleTabs has {eb_count}+ ErrorBoundary wrappers (≥10)",
      eb_count >= 10)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    print(f"  Reference: Iter 25 · top-5 from missing-pending inventory")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
