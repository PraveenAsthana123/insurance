#!/usr/bin/env python3
"""Iter 31 audit · metrics + tenant scope + envelope crypto + CSP nonce + approvals."""
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

    print("Iter 31 audit · metrics + tenant + crypto + CSP + approvals\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    # 1. /metrics returns Prometheus exposition
    r = c.get("/metrics")
    body = r.text
    a(f"1. /metrics returns # HELP lines ({len(body)} chars)",
      r.status_code == 200 and "# HELP" in body and "insur_" in body)

    # 2. /api/v1/metrics also works
    r = c.get("/api/v1/metrics")
    a("2. /api/v1/metrics alias serves same content",
      r.status_code == 200 and "insur_" in r.text)

    # 3-4. CSP nonce + headers
    r = c.get("/api/v1/alerts/counts")
    csp = r.headers.get("content-security-policy", "")
    nonce = r.headers.get("x-csp-nonce", "")
    a(f"3. CSP header contains nonce ({len(nonce)} char nonce)",
      "nonce-" in csp and len(nonce) >= 10)
    a("4. CSP has frame-ancestors 'none'",
      "frame-ancestors 'none'" in csp)

    # 5. Tenant scope helpers
    from core.tenant_scope import require_tenant_filter, ensure_tenant_filter, TenantIsolationError
    try:
        require_tenant_filter("SELECT * FROM autonomous_agent_runs LIMIT 5")
        a("5. require_tenant_filter raises on missing tenant_id", False)
    except TenantIsolationError:
        a("5. require_tenant_filter raises on missing tenant_id", True)

    # 6. ensure_tenant_filter injects
    sql = ensure_tenant_filter("SELECT * FROM x ORDER BY id", "default")
    a("6. ensure_tenant_filter injects WHERE tenant_id",
      "tenant_id = 'default'" in sql)

    # 7-8. Envelope crypto roundtrip
    from core.envelope_crypto import encrypt, decrypt
    env = encrypt("hello world iter31")
    a(f"7. encrypt returns alg + 2 base64 fields (alg={env.get('alg')[:20]})",
      "encrypted_data_key" in env and "ciphertext" in env)
    pt = decrypt(env)
    a(f"8. decrypt recovers plaintext ('{pt.decode()[:20]}')",
      pt == b"hello world iter31")

    # 9-10. Approval workflow
    body = {"title": "Promote model", "kind": "model.promote",
            "requester": "alice", "reviewers": ["bob"]}
    r = c.post("/api/v1/approvals/request", json=body)
    if r.status_code == 200:
        req_id = r.json()["id"]
        a(f"9. /approvals/request creates {req_id}", True)
        r2 = c.get(f"/api/v1/approvals/{req_id}")
        d = r2.json()
        a("10. GET approval returns state=requested",
          r2.status_code == 200 and d.get("state") == "requested")
    else:
        a("9. /approvals/request", False, f"status={r.status_code}")
        a("10. GET approval", False)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    print(f"  Reference: Iter 31 · 5 closures · metrics + tenant + crypto + CSP + approvals")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
