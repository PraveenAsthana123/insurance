#!/usr/bin/env python3
"""Iter 28 audit · feature flags + HMAC + bandit dashboard + snapshot tests + RBAC adoption."""
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

    print("Iter 28 audit · feature flags + HMAC + scanner + snapshots\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    # 1-3. Feature flags
    r = c.get("/api/v1/feature-flags")
    d = r.json()
    a(f"1. /feature-flags lists ≥5 flags ({len(d.get('flags', {}))})",
      r.status_code == 200 and len(d.get("flags", {})) >= 5)

    r = c.get("/api/v1/feature-flags/etag.enabled")
    a("2. GET single flag returns enabled state",
      r.status_code == 200 and "enabled" in r.json())

    r = c.get("/api/v1/feature-flags/check/ui.cmdk_facets_enabled")
    a("3. /check returns {enabled, rollout_pct}",
      r.status_code == 200 and "rollout_pct" in r.json())

    # 4. PUT requires admin role · denied without
    r = c.put("/api/v1/feature-flags/test.x", json={"enabled": True})
    a(f"4. PUT without admin denied (got {r.status_code})",
      r.status_code in (403, 401))

    # 5-6. HMAC sign + verify roundtrip
    from core.hmac_sign import sign, verify
    headers = sign("POST", "/api/v1/comments", b'{"x":1}', secret="test-secret-28")
    a("5. sign() returns X-Insur-Signature header",
      "X-Insur-Signature" in headers and headers["X-Insur-Signature"].startswith("v1="))

    ok = verify(
        "POST", "/api/v1/comments", b'{"x":1}',
        headers["X-Insur-Signature"], headers["X-Insur-Signature-Timestamp"],
        secret="test-secret-28",
    )
    a("6. verify() accepts valid signature", ok)

    bad = verify(
        "POST", "/api/v1/comments", b'{"x":2}',  # different body
        headers["X-Insur-Signature"], headers["X-Insur-Signature-Timestamp"],
        secret="test-secret-28",
    )
    a("7. verify() rejects tampered body", not bad)

    # 8. Security scanner
    r = c.get("/api/v1/security-scanner/findings")
    d = r.json()
    a(f"8. /security-scanner/findings returns rows ({d.get('count', 0)})",
      r.status_code == 200 and d.get("count", 0) >= 1)

    # 9. Vitest config + snapshot test file
    vc = REPO / "frontend/vitest.config.js"
    st = REPO / "frontend/src/components/__tests__/Skeleton.test.jsx"
    a("9. vitest.config.js + Skeleton snapshot test exist",
      vc.exists() and st.exists()
      and "toMatchSnapshot" in st.read_text())

    # 10. Feature-flag PUT uses require_admin (C1 adoption)
    fr = REPO / "backend/feature_flags/router.py"
    a("10. feature_flags PUT uses require_admin (C1 adoption)",
      fr.exists() and "Depends(require_admin)" in fr.read_text())

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    print(f"  Reference: Iter 28 · 5 closures · feature flags + HMAC + scanner + snapshots + RBAC")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
