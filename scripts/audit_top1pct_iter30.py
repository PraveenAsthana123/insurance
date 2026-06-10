#!/usr/bin/env python3
"""Iter 30 audit · JWT session + API version + audit search + service registry + drill-down chart."""
import logging, os, sys
from pathlib import Path
REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO))
sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")
os.environ.setdefault("INSUR_DISABLE_PRESIDIO", "1")
logging.disable(logging.CRITICAL)

def main():
    fails = 0
    def a(label, ok, detail=""):
        nonlocal fails
        mark = "✓" if ok else "✗"
        sfx = f" · {detail}" if detail else ""
        print(f"  {label[:55]:<55} | {mark} {('PASS' if ok else 'FAIL')}{sfx}")
        if not ok: fails += 1

    print("Iter 30 audit · JWT + API version + search + registry + drill-down\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    # 1-3. JWT session
    r = c.post("/api/v1/session/issue", json={"actor": "test", "role": "admin", "tenant_id": "t1"})
    d = r.json()
    token = d.get("access_token")
    a("1. /session/issue returns access_token", token and r.status_code == 200)

    r = c.post("/api/v1/session/verify", json={"token": token})
    d = r.json()
    a("2. /session/verify decodes payload",
      r.status_code == 200 and d.get("payload", {}).get("sub") == "test")

    r = c.post("/api/v1/session/verify", json={"token": "garbage.invalid.token"})
    a("3. /session/verify rejects bad token (401)",
      r.status_code == 401)

    # 4. X-API-Version response header (APIVersionMiddleware)
    r = c.get("/api/v1/alerts/counts")
    a(f"4. X-API-Version header set (={r.headers.get('x-api-version')})",
      r.headers.get("x-api-version") in ("1.0", "1"))

    # 5-6. Audit search
    # First seed activity + chain
    c.post("/api/v1/audit-chain/append", json={"actor": "iter30", "action": "search-seed"})
    c.post("/api/v1/alerts/activity", json={"actor": "iter30", "action": "search-test", "target": "audit-search"})

    r = c.get("/api/v1/audit-search?q=iter30")
    d = r.json()
    a(f"5. /audit-search?q=iter30 returns ≥1 item ({d.get('total', 0)})",
      r.status_code == 200 and d.get("total", 0) >= 1)

    r = c.get("/api/v1/audit-search/stats")
    d = r.json()
    a("6. /audit-search/stats has counts",
      r.status_code == 200 and "audit_chain_rows" in d)

    # 7. Service registry
    r = c.get("/api/v1/service-registry?prefix=/api/v1/session")
    d = r.json()
    a(f"7. /service-registry?prefix= filters ({d.get('count')} routes)",
      r.status_code == 200 and d.get("count", 0) >= 1)

    r = c.get("/api/v1/service-registry/by-tag")
    d = r.json()
    a(f"8. /by-tag returns aggregation ({d.get('n_tags')} tags)",
      r.status_code == 200 and d.get("n_tags", 0) >= 10)

    # 9. DrillDownBar component exists
    dd = REPO / "frontend/src/components/charts/DrillDownBar.jsx"
    a("9. DrillDownBar · onDrillDown prop + table render",
      dd.exists() and "onDrillDown" in dd.read_text() and "rowKeys" in dd.read_text())

    # 10. API version negotiation honors Accept header
    r = c.get("/api/v1/alerts/counts",
              headers={"Accept": "application/vnd.insur.v1.0+json"})
    a("10. Accept vnd.insur.v1.0+json honored",
      r.headers.get("x-api-version") == "1.0")

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    print(f"  Reference: Iter 30 · 5 closures · JWT + API version + search + registry + drill-down")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
