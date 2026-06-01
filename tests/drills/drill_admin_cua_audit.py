#!/usr/bin/env python3
"""
Drill: GET /api/v1/admin/cua/audit — cross-tenant compliance readback.

Complements drill_cua_audit_readback (tenant-scoped) by exercising the
ADMIN cross-tenant path that compliance + reporting-monitoring roles
use. Locks the SOC2 CC4 + CC7 audit-of-audit contract:

  - Admin can see all tenants OR filter to one tenant
  - Non-admin roles (manager/tester/team-member) → 403
  - Every admin read writes ONE admin.cua.audit.read row (audit-of-audit)
  - distinct_tenants enumerates what tenants exist (no need to iterate)
  - audit-of-audit rows are NOT included in result rows when filter=None
    (avoids audit-recursion noise)
  - audit-of-audit rows ARE included if filter='_admin' (explicit)

Steps (11 total; 5 negative):
  1. (-) NEG: manager role → 403 on /admin/cua/audit (NOT in admin set)
  2. (-) NEG: tester role → 403
  3. (-) NEG: team-member role → 403
  4. (+) compliance role + no filter → sees rows from BOTH tenants
  5. (+) reporting-monitoring role also works
  6. (+) ?tenant_id=tenant-a → only tenant-a rows
  7. (+) distinct_tenants enumerates what tenants exist
  8. (+) audit-of-audit row written per admin call
  9. (-) NEG: audit-of-audit rows excluded from default result set
  10. (+) ?tenant_id=_admin explicitly returns the audit-of-audit rows
  11. (-) NEG: limit=0 → 422 (Pydantic Query(ge=1))

# RESOURCES: disk_io

Exit 0 on PASS, 1 on any failure.
"""
from __future__ import annotations

import json
import os
import sys
import tempfile
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' — ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def _build_app():
    """Minimal app: middlewares + admin router. Includes RBAC middleware so
    role-based denials are exercised end-to-end."""
    for mod in (
        "core.middleware", "core.rbac_middleware",
        "routers.admin", "services.agent_platform_service",
        "schemas.agent_platform",
    ):
        if mod in sys.modules:
            del sys.modules[mod]

    from fastapi import FastAPI
    from core.middleware import TenantIdMiddleware, CorrelationIdMiddleware
    from core.rbac_middleware import RBACMiddleware
    from routers.admin import router as admin_router

    app = FastAPI()
    app.add_middleware(TenantIdMiddleware)
    app.add_middleware(RBACMiddleware)
    app.add_middleware(CorrelationIdMiddleware)
    app.include_router(admin_router)
    return app


def _seed_rows(audit_path: Path) -> None:
    """Seed audit rows for 2 tenants + ensure no admin-audit rows yet."""
    audit_path.parent.mkdir(parents=True, exist_ok=True)
    rows = [
        {"ts": 1000.0, "request_id": "a-1", "tenant_id": "tenant-a", "actor": "tester",
         "tool": "playwright", "instruction": "x", "target": "about:blank",
         "policy_decision": "allow", "outcome": "executed"},
        {"ts": 1001.0, "request_id": "a-2", "tenant_id": "tenant-a", "actor": "tester",
         "tool": "playwright", "instruction": "y", "target": "about:blank",
         "policy_decision": "allow", "outcome": "executed"},
        {"ts": 1002.0, "request_id": "b-1", "tenant_id": "tenant-b", "actor": "tester",
         "tool": "playwright", "instruction": "z", "target": "about:blank",
         "policy_decision": "allow", "outcome": "executed"},
    ]
    with audit_path.open("w") as fh:
        for r in rows:
            fh.write(json.dumps(r) + "\n")


def main() -> int:
    from fastapi.testclient import TestClient

    print("\nDRILL: §47.6 admin cross-tenant audit (compliance + audit-of-audit)\n")
    t0 = time.time()

    with tempfile.TemporaryDirectory() as tmp:
        audit_path = Path(tmp) / "cua_runs.jsonl"
        os.environ["CUA_AUDIT_PATH"] = str(audit_path)
        os.environ.pop("TENANT_ID_STRICT", None)
        os.environ.pop("TENANT_ID_ALLOWLIST", None)
        _seed_rows(audit_path)

        client = TestClient(_build_app())

        # ---- Step 1: NEGATIVE — manager 403 ----
        r = client.get("/api/v1/admin/cua/audit",
                       headers={"X-Demo-Role": "manager"})
        step(1, "NEGATIVE: manager role → 403 (not in {compliance, reporting-monitoring})",
             r.status_code == 403, f"status={r.status_code}")

        # ---- Step 2: NEGATIVE — tester 403 ----
        r = client.get("/api/v1/admin/cua/audit",
                       headers={"X-Demo-Role": "tester"})
        step(2, "NEGATIVE: tester role → 403", r.status_code == 403, f"status={r.status_code}")

        # ---- Step 3: NEGATIVE — team-member 403 ----
        r = client.get("/api/v1/admin/cua/audit",
                       headers={"X-Demo-Role": "team-member"})
        step(3, "NEGATIVE: team-member role → 403", r.status_code == 403, f"status={r.status_code}")

        # ---- Step 4: compliance role sees BOTH tenants ----
        r = client.get("/api/v1/admin/cua/audit",
                       headers={"X-Demo-Role": "compliance"})
        body = r.json()
        tenants_in_rows = {row["tenant_id"] for row in body["rows"]}
        step(4, "compliance + no filter → rows from BOTH tenants visible",
             r.status_code == 200 and tenants_in_rows == {"tenant-a", "tenant-b"}
             and body["total_count"] == 3,
             f"status={r.status_code} tenants={tenants_in_rows} total={body.get('total_count')}")

        # ---- Step 5: reporting-monitoring role also works ----
        r = client.get("/api/v1/admin/cua/audit",
                       headers={"X-Demo-Role": "reporting-monitoring"})
        step(5, "reporting-monitoring role also has admin access",
             r.status_code == 200, f"status={r.status_code}")

        # ---- Step 6: tenant_id filter ----
        r = client.get("/api/v1/admin/cua/audit?tenant_id=tenant-a",
                       headers={"X-Demo-Role": "compliance"})
        body = r.json()
        tenants_in_rows = {row["tenant_id"] for row in body["rows"]}
        step(6, "?tenant_id=tenant-a → only tenant-a rows (filter honored at admin level)",
             r.status_code == 200 and tenants_in_rows == {"tenant-a"}
             and body["total_count"] == 2 and body["tenant_filter"] == "tenant-a",
             f"tenants={tenants_in_rows} filter_echo={body.get('tenant_filter')!r}")

        # ---- Step 7: distinct_tenants enumerated ----
        # Note: this counts the audit-of-audit rows we've written too ('_admin' tenant)
        r = client.get("/api/v1/admin/cua/audit",
                       headers={"X-Demo-Role": "compliance"})
        body = r.json()
        step(7, "distinct_tenants enumerates all tenants present in audit log",
             {"tenant-a", "tenant-b"}.issubset(set(body["distinct_tenants"]))
             and "_admin" in body["distinct_tenants"],
             f"distinct={body.get('distinct_tenants')}")

        # ---- Step 8: audit-of-audit rows accumulate ----
        # Count admin.cua.audit.read rows directly from disk
        all_rows = [json.loads(line) for line in audit_path.read_text().splitlines() if line.strip()]
        admin_rows = [r for r in all_rows if r.get("tool") == "admin.cua.audit.read"]
        step(8, "audit-of-audit: every admin call writes one admin.cua.audit.read row",
             len(admin_rows) >= 4,  # 4 admin calls so far (steps 4, 5, 6, 7)
             f"admin_rows_on_disk={len(admin_rows)}")

        # ---- Step 9: NEGATIVE — audit-of-audit excluded from default results ----
        r = client.get("/api/v1/admin/cua/audit",
                       headers={"X-Demo-Role": "compliance"})
        body = r.json()
        has_admin_recursion = any(row.get("tool") == "admin.cua.audit.read" for row in body["rows"])
        step(9, "NEGATIVE: default result excludes admin.cua.audit.read (no recursion noise)",
             not has_admin_recursion,
             f"admin_rows_leaked_into_default={has_admin_recursion}")

        # ---- Step 10: explicit ?tenant_id=_admin DOES return audit-of-audit ----
        r = client.get("/api/v1/admin/cua/audit?tenant_id=_admin",
                       headers={"X-Demo-Role": "compliance"})
        body = r.json()
        all_admin_tool = all(row.get("tool") == "admin.cua.audit.read" for row in body["rows"])
        step(10, "?tenant_id=_admin → explicit access to audit-of-audit rows",
             r.status_code == 200 and len(body["rows"]) >= 4 and all_admin_tool,
             f"rows={len(body.get('rows', []))} all_admin_tool={all_admin_tool}")

        # ---- Step 11: NEGATIVE — limit=0 → 422 ----
        r = client.get("/api/v1/admin/cua/audit?limit=0",
                       headers={"X-Demo-Role": "compliance"})
        step(11, "NEGATIVE: limit=0 → 422 (Pydantic Query(ge=1))",
             r.status_code == 422, f"status={r.status_code}")

    print(f"\n\033[32mALL 11 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
