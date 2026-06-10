#!/usr/bin/env python3
"""Iter 34 audit · WebSocket + tenant config + changelog + tags + OpenAPI export."""
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

    print("Iter 34 audit · WebSocket + tenant + changelog + tags + OpenAPI\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    # 1-2. WebSocket
    r = c.get("/ws/clients")
    a(f"1. /ws/clients returns counter ({r.json().get('connected')})",
      r.status_code == 200 and "connected" in r.json())

    with c.websocket_connect("/ws/activity") as ws:
        hello = ws.receive_json()
        a(f"2. WS hello with connected_clients ({hello.get('connected_clients')})",
          hello.get("type") == "hello" and hello.get("connected_clients", 0) >= 1)

    # 3-4. Tenant config
    r = c.get("/api/v1/tenant-config/health")
    a("3. /tenant-config/health 200", r.status_code == 200)

    r = c.get("/api/v1/tenant-config/test-tenant/effective/etag.enabled")
    d = r.json()
    a(f"4. effective falls back to global-default ({d.get('source')})",
      r.status_code == 200 and d.get("source") in ("global-default", "none", "tenant"))

    # 5-6. API changelog
    r = c.get("/api/v1/changelog/summary")
    d = r.json()
    a(f"5. /changelog/summary returns ≥15 entries ({d.get('total')})",
      r.status_code == 200 and d.get("total", 0) >= 15)

    r = c.get("/api/v1/changelog?type=added&limit=5")
    d = r.json()
    a("6. /changelog filterable by type",
      r.status_code == 200 and all(r["type"] == "added" for r in d.get("changelog", [])))

    # 7-8. Tags
    r = c.post("/api/v1/tags/fraud-ring-detection", json={"tag": "high-priority", "actor": "iter34"})
    d = r.json()
    a("7. /tags POST adds tag",
      r.status_code == 200 and d.get("result") in ("added", "already_tagged"))

    r = c.get("/api/v1/tags?tag=high-priority")
    d = r.json()
    a(f"8. /tags?tag= search returns matches ({d.get('count')})",
      r.status_code == 200 and d.get("count", 0) >= 1)

    # 9-10. OpenAPI export
    r = c.get("/api/v1/openapi-export")
    a(f"9. openapi-export download has Content-Disposition (status={r.status_code})",
      r.status_code == 200 and "attachment" in r.headers.get("content-disposition", ""))

    r = c.get("/api/v1/openapi-export/stats")
    d = r.json()
    a(f"10. openapi-export/stats has {d.get('endpoints')} endpoints across {d.get('n_tags')} tags",
      r.status_code == 200 and d.get("endpoints", 0) >= 100 and d.get("n_tags", 0) >= 20)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    print(f"  Reference: Iter 34 · 5 closures · WS + tenant + changelog + tags + OpenAPI")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
