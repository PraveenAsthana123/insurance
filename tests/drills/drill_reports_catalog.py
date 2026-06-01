#!/usr/bin/env python3
"""Drill: HOLY reports-catalog router (§38 + §47.6 + §57.6 + §64.37 + §66).

Steps (10 total; 3 negative):
    1. (+) reports router imports + STANDARD_REPORTS has exactly 15 rows
    2. (+) every standard-report row carries all required fields
    3. (+) per-dept GET returns 200 + 15 reports + dept-specific titles
    4. (+) per-report detail returns 200 + audit_summary stub present
    5. (-) NEGATIVE — unknown dept → 404 (no info leak)
    6. (-) NEGATIVE — unknown report_id → 404 + lists available
    7. (-) NEGATIVE — malformed report_id (caps/special) → 400
    8. (+) report_id values unique within STANDARD_REPORTS (no dup keys)
    9. (+) every owner_role is one of the 15 known §63 role archetypes
   10. (+) HOLY_REPORTS_CATALOG.md exists per dept + _global rollup
           returns all 19 depts with n_reports_total = 285 (15 × 19)

# RESOURCES: reports_router disk_io

Exit 0 on PASS, 1 on FAIL.
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))

EXPECTED_DEPTS = {
    "digital-marketing", "customer-experience", "supply-chain", "manufacturing",
    "product-rd", "retail-operations", "sales", "finance", "hr", "procurement",
    "executive-leadership", "e-commerce", "customer-support", "engineering",
    "it-operations", "legal", "marketing", "operations", "security-operations",
}

EXPECTED_ROLES = {
    "admin", "manager", "team-member", "tester", "security", "devops",
    "ai-reviewer", "digital-transformation", "system-architect",
    "test-architect", "database-architect", "api-architect", "data-owner",
    "ai-strategy", "information-security",
}

REQUIRED_FIELDS = {"report_id", "cadence", "format", "owner_role", "audience"}


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' — ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def main():
    print("\nDRILL: HOLY reports-catalog per dept (§38 + §47.6 + §57.6 + §64.37 + §66)\n")
    t0 = time.time()

    # ----- Step 1: router imports + 15 standard reports -----
    try:
        from routers import reports as rep
    except Exception as exc:
        step(1, "reports router imports", False, f"{type(exc).__name__}: {exc}")
        return
    has_15 = hasattr(rep, "STANDARD_REPORTS") and len(rep.STANDARD_REPORTS) == 15
    step(1, "router imports + STANDARD_REPORTS has exactly 15 rows (per §64.37.2)",
         has_15, f"n_rows={len(rep.STANDARD_REPORTS)}")

    # ----- Step 2: every row has all required fields -----
    bad_fields: list[str] = []
    for r in rep.STANDARD_REPORTS:
        missing = REQUIRED_FIELDS - set(r.keys())
        if missing:
            bad_fields.append(f"{r.get('report_id', '?')}: missing {sorted(missing)}")
    step(2, f"every row carries all {len(REQUIRED_FIELDS)} required fields",
         not bad_fields, "; ".join(bad_fields[:3]) if bad_fields else "")

    # ----- Spin up TestClient -----
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    app = FastAPI()
    app.include_router(rep.router)
    client = TestClient(app)

    # ----- Step 3: per-dept GET 200 + 15 reports + dept-specific titles -----
    r = client.get("/api/v1/holy/reports/sales")
    body = r.json() if r.status_code == 200 else {}
    reports = body.get("reports", [])
    has_dept_title = (
        len(reports) == 15
        and all(r.get("title", "").startswith("Sales ") for r in reports)
    )
    step(3, "GET /sales → 200 + 15 reports + titles prefixed with 'Sales '",
         r.status_code == 200 and has_dept_title,
         f"status={r.status_code} n={len(reports)} sample_title={reports[0].get('title') if reports else None}")

    # ----- Step 4: per-report detail + audit_summary -----
    r = client.get("/api/v1/holy/reports/sales/daily_ops_digest")
    body = r.json() if r.status_code == 200 else {}
    has_audit = (
        "audit_summary" in body
        and "n_generations_30d" in body["audit_summary"]
        and "n_failures_30d" in body["audit_summary"]
    )
    step(4, "GET /sales/daily_ops_digest → 200 + audit_summary stub present",
         r.status_code == 200 and has_audit,
         f"status={r.status_code} audit_keys={list(body.get('audit_summary', {}).keys())}")

    # ----- Step 5: NEGATIVE — unknown dept -----
    r = client.get("/api/v1/holy/reports/not-a-real-dept")
    step(5, "NEGATIVE: unknown dept → 404 (no info leak)",
         r.status_code == 404, f"got {r.status_code}: {r.text[:80]}")

    # ----- Step 6: NEGATIVE — unknown report_id -----
    r = client.get("/api/v1/holy/reports/sales/totally_bogus_report_xyz")
    step(6, "NEGATIVE: unknown report_id → 404 + lists available",
         r.status_code == 404 and "daily_ops_digest" in r.text,
         f"got {r.status_code}: {r.text[:120]}")

    # ----- Step 7: NEGATIVE — malformed report_id -----
    r = client.get("/api/v1/holy/reports/sales/Bogus-CapitalLetters!")
    step(7, "NEGATIVE: malformed report_id (caps/special) → 400",
         r.status_code == 400, f"got {r.status_code}: {r.text[:80]}")

    # ----- Step 8: report_id uniqueness within STANDARD_REPORTS -----
    ids = [r["report_id"] for r in rep.STANDARD_REPORTS]
    dups = [rid for rid in set(ids) if ids.count(rid) > 1]
    step(8, "report_id values unique within STANDARD_REPORTS (no dup primary keys)",
         not dups, f"duplicates: {dups}" if dups else "")

    # ----- Step 9: owner_roles match known 15-role list -----
    bad_owners = [r["report_id"] for r in rep.STANDARD_REPORTS
                  if r["owner_role"] not in EXPECTED_ROLES]
    step(9, f"every owner_role ∈ {len(EXPECTED_ROLES)}-role §63 archetype set",
         not bad_owners,
         f"unknown roles: {bad_owners}" if bad_owners else
         f"all {len(rep.STANDARD_REPORTS)} owners match")

    # ----- Step 10: per-dept MD + _global rollup -----
    candidates = [Path("/global-ai-org"), REPO_ROOT / "global-ai-org"]
    gao = next((p for p in candidates if p.exists()), None)
    if gao is None:
        step(10, "global-ai-org/ locatable", False, "tried " + str(candidates))
        return
    missing_md = [
        dept for dept in EXPECTED_DEPTS
        if not (gao / "departments" / dept / "business-layer" / "HOLY_REPORTS_CATALOG.md").exists()
    ]
    r = client.get("/api/v1/holy/reports/_global")
    rollup = r.json() if r.status_code == 200 else {}
    expected_total = len(EXPECTED_DEPTS) * 15
    ok = (
        not missing_md
        and r.status_code == 200
        and rollup.get("n_reports_total") == expected_total
        and set(rollup.get("depts", [])) == EXPECTED_DEPTS
    )
    step(10,
         f"HOLY_REPORTS_CATALOG.md present + _global rollup ({len(EXPECTED_DEPTS)} depts × 15 = {expected_total} reports)",
         ok,
         f"missing_md={missing_md[:2]} n_total={rollup.get('n_reports_total')} depts={len(rollup.get('depts', []))}")

    print(f"\n\033[32mALL 10 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")


if __name__ == "__main__":
    main()
