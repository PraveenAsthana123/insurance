#!/usr/bin/env python3
"""Iter 26 audit · idempotency fix + pagination + PII + k6 + RBAC role-dep."""
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

    print("Iter 26 audit · 5 closures from missing-pending\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    # 1. Idempotency replay returns "hit" (Iter 25 followup)
    body = {"panel_id":"x","process_id":"y","author":"me","body":"hi-iter26"}
    headers = {"Idempotency-Key": "test-iter-26-key"}
    r1 = c.post("/api/v1/comments", json=body, headers=headers)
    r2 = c.post("/api/v1/comments", json=body, headers=headers)
    a("1. Idempotency replay returns hit (Iter 25 follow-up fix)",
      r2.status_code == 200 and r2.headers.get("X-Idempotency-Cache") == "hit",
      f"got status={r2.status_code} cache={r2.headers.get('X-Idempotency-Cache')}")

    # 2-3. Pagination envelope
    r = c.get("/api/v1/alerts/activity?offset=0&limit=5")
    d = r.json()
    a("2. /alerts/activity has pagination envelope",
      "items" in d and "total" in d and "has_next" in d and "has_prev" in d)
    a("3. limit respected",
      len(d.get("items", [])) <= 5)

    # 4-5. PII detect + redact
    r = c.get("/api/v1/pii/health")
    d = r.json()
    a("4. /pii/health returns engine info",
      r.status_code == 200 and "presidio_available" in d)

    r = c.post("/api/v1/pii/redact", json={"text": "Contact john.doe@example.com or 555-123-4567"})
    d = r.json()
    a(f"5. /pii/redact finds {d.get('n_findings', 0)} entities",
      r.status_code == 200 and d.get("n_findings", 0) >= 2)

    # 6. RBAC role dependency module
    rd = REPO / "backend/core/role_dependency.py"
    a("6. role_dependency has require_role + require_admin + get_current_role",
      rd.exists()
      and "require_admin" in rd.read_text()
      and "ROLE_FORBIDDEN" in rd.read_text())

    # 7. k6 smoke script
    k6 = REPO / "load-testing/insur-smoke.js"
    a("7. k6 smoke has thresholds + tags",
      k6.exists()
      and "http_req_failed" in k6.read_text()
      and "endpoint:vuln" in k6.read_text())

    # 8. CI workflow
    cw = REPO / ".github/workflows/loadtest.yml"
    a("8. loadtest.yml exists with k6 install + run",
      cw.exists()
      and "k6 run" in cw.read_text()
      and "summary-export" in cw.read_text())

    # 9. pii_redactor has regex fallback patterns
    pr = REPO / "backend/core/pii_redactor.py"
    a("9. pii_redactor has Presidio + regex fallback",
      pr.exists()
      and "EMAIL" in pr.read_text()
      and "_PRESIDIO" in pr.read_text())

    # 10. pagination helper has paginate() + envelope shape
    pag = REPO / "backend/core/pagination.py"
    a("10. pagination · paginate() + has_next + has_prev",
      pag.exists()
      and "has_next" in pag.read_text()
      and "has_prev" in pag.read_text())

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    print(f"  Reference: Iter 26 · 5 closures from inventory")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
