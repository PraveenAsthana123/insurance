#!/usr/bin/env python3
"""Iter 35 audit · deprecation + settings reload + health history + OpenAPI diff + outbound audit."""
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

    print("Iter 35 audit · deprecation + settings + health hist + diff + outbound\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    # 1-2. Deprecation
    r = c.get("/api/v1/deprecation")
    a(f"1. /deprecation lists (count={r.json().get('count')})",
      r.status_code == 200 and "deprecations" in r.json())

    r = c.get("/api/v1/deprecation/check?path=/api/v1/old")
    a("2. /deprecation/check returns deprecated bool",
      r.status_code == 200 and "deprecated" in r.json())

    # 3. Settings reload (admin-gated)
    r = c.get("/api/v1/settings")
    a(f"3. /settings admin-gated (status={r.status_code})",
      r.status_code in (401, 403))

    # 4-5. Health history
    r = c.post("/api/v1/health-history/take")
    d = r.json()
    a(f"4. /health-history/take captures snapshot",
      r.status_code == 200 and "snapshot" in d)

    r = c.get("/api/v1/health-history/availability?component=database")
    d = r.json()
    a(f"5. /availability returns pct (db={d.get('availability_pct')})",
      r.status_code == 200 and d.get("samples", 0) >= 1)

    # 6-7. OpenAPI diff
    r = c.get("/api/v1/openapi-diff/diff")
    d = r.json()
    a(f"6. /openapi-diff before snapshot returns hint",
      r.status_code == 200 and (d.get("baseline_exists") is False or "drift_detected" in d))

    # Take snapshot (admin-gated · skip if blocked)
    r = c.post("/api/v1/openapi-diff/snapshot")
    a(f"7. /openapi-diff/snapshot admin-gated (got {r.status_code})",
      r.status_code in (401, 403))

    # 8-10. Outbound audit
    r = c.post("/api/v1/outbound-audit/log",
              json={"url": "https://api.example.com/test", "method": "POST",
                    "status_code": 200, "latency_ms": 45.2,
                    "target_module": "demo", "actor": "iter35"})
    d = r.json()
    a("8. /outbound-audit/log records entry",
      r.status_code == 200 and "at" in d)

    r = c.get("/api/v1/outbound-audit")
    d = r.json()
    a(f"9. /outbound-audit lists (count={d.get('count')})",
      r.status_code == 200 and d.get("count", 0) >= 1)

    r = c.get("/api/v1/outbound-audit/stats")
    d = r.json()
    a(f"10. /outbound-audit/stats has by_status + avg ({d.get('avg_latency_ms')}ms)",
      r.status_code == 200 and "by_status" in d and "avg_latency_ms" in d)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    print(f"  Reference: Iter 35 · 5 closures · deprecation + settings + hist + diff + outbound")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
