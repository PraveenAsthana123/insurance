#!/usr/bin/env python3
"""Iter 36 audit · httpx hook + heatmap + well-known + cron registry + body size."""
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

    print("Iter 36 audit · httpx + heatmap + well-known + cron + body size\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    # Warm middleware
    for _ in range(3):
        c.get("/api/v1/alerts/counts")
        c.post("/api/v1/audit-chain/append", json={"actor": "iter36", "action": "warm"})

    # 1-2. Endpoint heatmap
    r = c.get("/api/v1/heatmap?top=5")
    d = r.json()
    a(f"1. /heatmap returns top routes ({d.get('n_total_routes')})",
      r.status_code == 200 and d.get("n_total_routes", 0) >= 1)

    r = c.get("/api/v1/heatmap/by-status")
    d = r.json()
    a(f"2. /heatmap/by-status aggregates ({list(d.get('by_status', {}).keys())})",
      r.status_code == 200 and "2xx" in d.get("by_status", {}))

    # 3. Body sizes endpoint
    r = c.get("/api/v1/heatmap/body-sizes")
    d = r.json()
    a(f"3. /heatmap/body-sizes has POST routes ({d.get('n_routes')})",
      r.status_code == 200 and d.get("n_routes", 0) >= 1)

    # 4. robots.txt
    r = c.get("/robots.txt")
    a("4. /robots.txt serves text",
      r.status_code == 200 and "User-agent" in r.text)

    # 5. security.txt
    r = c.get("/.well-known/security.txt")
    a("5. /.well-known/security.txt serves text (RFC 9116)",
      r.status_code == 200 and "Contact:" in r.text)

    # 6. OIDC discovery
    r = c.get("/.well-known/openid-configuration")
    d = r.json()
    a("6. /.well-known/openid-configuration returns scaffold",
      r.status_code == 200 and "issuer" in d and d.get("scaffold") is True)

    # 7-8. Cron registry
    r = c.get("/api/v1/cron-registry")
    d = r.json()
    a(f"7. /cron-registry lists INSUR jobs ({d.get('n_insur')})",
      r.status_code == 200 and "insur_jobs" in d)

    r = c.get("/api/v1/cron-registry/by-tag")
    d = r.json()
    a(f"8. /cron-registry/by-tag aggregates",
      r.status_code == 200 and "by_tag" in d)

    # 9. httpx hook installed
    from core.httpx_audit_hook import is_installed
    a("9. httpx auto-audit hook installed",
      is_installed())

    # 10. Body size monitor populated by POST traffic
    from middleware.body_size_monitor import snapshot
    s = snapshot()
    a(f"10. body size monitor captured ({s.get('total_samples', 0)} samples)",
      s.get("total_samples", 0) >= 1)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    print(f"  Reference: Iter 36 · 5 closures · httpx + heatmap + well-known + cron + body")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
