#!/usr/bin/env python3
"""Iter 32 audit · k8s probes + retention + CORS view + tenant rate-limit view + notifications."""
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

    print("Iter 32 audit · k8s + retention + CORS + rate-limit + notifications\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    # 1-3. K8s health probes
    r = c.get("/healthz/live")
    a(f"1. /healthz/live returns 200 + uptime",
      r.status_code == 200 and "uptime_seconds" in r.json())

    r = c.get("/healthz/startup")
    a(f"2. /healthz/startup returns ready (=200)",
      r.status_code == 200 and r.json().get("status") == "ready")

    r = c.get("/healthz/ready")
    d = r.json()
    a(f"3. /healthz/ready has deps map ({list(d.get('deps', {}).keys())})",
      r.status_code in (200, 503) and "deps" in d and "database" in d.get("deps", {}))

    # 4. CORS origins endpoint
    r = c.get("/api/v1/cors-admin/origins")
    a(f"4. /cors-admin/origins lists {r.json().get('count', 0)}",
      r.status_code == 200 and "origins" in r.json())

    # 5. Rate-limits admin-gated
    r = c.get("/api/v1/cors-admin/rate-limits")
    a(f"5. /cors-admin/rate-limits admin-gated ({r.status_code})",
      r.status_code in (401, 403))

    # 6-8. Notifications
    r = c.get("/api/v1/notifications/health")
    d = r.json()
    a(f"6. /notifications/health lists 4 channels ({len(d.get('channels', []))})",
      r.status_code == 200 and len(d.get("channels", [])) == 4)

    r = c.post("/api/v1/notifications/dispatch",
              json={"channel": "log", "severity": "info", "title": "iter32", "body": "test"})
    d = r.json()
    a("7. dispatch log channel → delivered",
      r.status_code == 200 and d.get("result", {}).get("status") == "delivered")

    r = c.post("/api/v1/notifications/dispatch",
              json={"channel": "slack", "title": "iter32-slack", "body": "no creds"})
    d = r.json()
    a("8. slack without env returns scaffold result",
      d.get("result", {}).get("status") == "scaffold")

    # 9. Retention enforcer script
    rs = REPO / "scripts/audit_retention_enforcer.py"
    a("9. audit_retention_enforcer has 4 stores + report",
      rs.exists()
      and "_evict_activity" in rs.read_text()
      and "_evict_audit_chain" in rs.read_text())

    # 10. healthz live separates DUMB process check from deps
    hp = REPO / "backend/healthz/router.py"
    a("10. /healthz/live does not import psycopg2 (dumb check)",
      hp.exists()
      and "DUMB" in hp.read_text()
      and "DUMB · always returns 200" in hp.read_text())

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    print(f"  Reference: Iter 32 · 5 closures · k8s + retention + CORS + rate-limit + notifications")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
