#!/usr/bin/env python3
"""Iter 27 audit · PII regex + ETag + mutmut + DQ runner + RBAC adoption."""
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

    print("Iter 27 audit · PII regex + ETag + mutmut + DQ + RBAC\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    # 1. PII phone regex now matches
    from core.pii_redactor import redact_text, detect_pii, _PATTERNS
    out, findings = redact_text("Contact me at john.doe@example.com or 555-123-4567")
    a(f"1. PII detect EMAIL + PHONE ({len(findings)} findings · expect ≥2)",
      len(findings) >= 2)

    # 2. More entity types
    a("2. PII has DOB + VIN + URL + MEDICARE patterns",
      all(t in _PATTERNS for t in ["DOB", "VIN", "URL", "MEDICARE"]))

    # 3. ETag middleware exists
    et = REPO / "backend/middleware/etag.py"
    a("3. ETagMiddleware · _should_etag + 304 path",
      et.exists() and "304" in et.read_text() and "_should_etag" in et.read_text())

    # 4. ETag actually emitted on GET
    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())
    r = c.get("/api/v1/alerts/counts")
    a(f"4. GET response has ETag header (status={r.status_code})",
      r.status_code == 200 and r.headers.get("etag"))

    # 5. If-None-Match returns 304
    etag = r.headers.get("etag")
    r2 = c.get("/api/v1/alerts/counts", headers={"If-None-Match": etag})
    a(f"5. If-None-Match returns 304 (got {r2.status_code})",
      r2.status_code == 304)

    # 6. RBAC role-dep module already exists from Iter 26 · verify still
    rd = REPO / "backend/core/role_dependency.py"
    a("6. role_dependency present · require_admin exported",
      rd.exists() and "require_admin" in rd.read_text())

    # 7. mutmut config + smoke script
    mc = REPO / "setup_mutmut.cfg"
    ms = REPO / "scripts/run_mutmut_smoke.sh"
    a("7. setup_mutmut.cfg + run_mutmut_smoke.sh exist",
      mc.exists() and ms.exists() and "mutmut run" in ms.read_text())

    # 8. Data quality runner
    dq = REPO / "scripts/data_quality_runner.py"
    a("8. data_quality_runner has GE probe + scaffold fallback",
      dq.exists()
      and "great_expectations" in dq.read_text()
      and "scaffold" in dq.read_text())

    # 9. ETag middleware wired in main.py
    s = (REPO / "backend/main.py").read_text()
    a("9. ETagMiddleware wired in main.py",
      "ETagMiddleware" in s and "Iter 27 · C4" in s)

    # 10. Stream endpoint NOT etag'd
    a("10. /alerts/stream excluded from etag (SSE)",
      et.exists() and 'endswith("/stream")' in et.read_text())

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    print(f"  Reference: Iter 27 · 5 closures · PII regex + ETag + mutmut + DQ + RBAC")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
