#!/usr/bin/env python3
"""
Drill: §64.43 #7 federation extended to the 7 remaining /api/v1/insur/* routers
via the shared `core.insur_audit.log_insur_access` helper.

Closes the federation gap left after the monitoring router landed alone
(drill_insur_monitoring_federation.py). One drill covers ALL 7 surfaces in
one place because the contract is identical:

  - Every read attributes the access to caller's tenant_id + actor
  - Validators (e.g. _validate_dept) MUST run BEFORE log_insur_access so
    failed-enumeration attempts do NOT pollute the audit trail
  - Best-effort disk persistence (read path NEVER broken by audit layer)
  - Audit row schema carries §38.3 required fields

Steps (12 total; ≥4 negative):
  1. (+) Shared helper writes to data/agent-supervisor/insur_reads.jsonl
        (configurable via INSUR_AUDIT_PATH env var). Default location is
        the unified insur-fleet audit trail.
  2. (+) master_data /_global with X-Tenant-ID echoed in row + tenant
        column = "tenant-a"
  3. (+) transactions /{dept} writes row tagged with dept + endpoint
  4. (+) pipelines /{dept}/{process_id} writes row with extra={process_id}
  5. (+) reports /{dept}/{report_id} writes row with extra={report_id}
  6. (+) demo_stories /{dept}/{role} writes row with extra={role}
  7. (+) graph /{dept}/nodes writes row with extra={type}
  8. (+) downloads /_global writes row with surface=downloads
  9. (-) NEG: master_data invalid dept → 404, NO new audit row (validator
        runs BEFORE log_insur_access per §47.6 anti-info-leak)
  10.(-) NEG: pipelines invalid process_id → 400, NO new audit row
        (validator-before-audit ordering preserved)
  11.(-) NEG: default tenant when no X-Tenant-ID header → row tagged
        with tenant_id='default' on the master_data surface
  12.(-) NEG: disk write failure → request STILL succeeds (best-effort
        audit; §57.7 read path never blocked by observability layer)

  Plus invariant: every audit row across the drill carries §38.3 fields
  (ts, tenant_id, actor, tool, request_id, endpoint, surface, outcome).

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
    print(f"  {marker} step {n}: {label}{(' - ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def _build_app(audit_path: Path):
    """Boot a fresh FastAPI with all 7 federated routers + middleware stack."""
    os.environ["INSUR_AUDIT_PATH"] = str(audit_path)
    os.environ.pop("TENANT_ID_STRICT", None)

    for mod in (
        "core.middleware", "core.rbac_middleware", "core.insur_audit",
        "routers.master_data", "routers.transactions", "routers.pipelines",
        "routers.reports", "routers.demo_stories", "routers.graph",
        "routers.downloads",
    ):
        if mod in sys.modules:
            del sys.modules[mod]

    from fastapi import FastAPI
    from core.middleware import TenantIdMiddleware, CorrelationIdMiddleware
    from routers.master_data import router as master_data_router
    from routers.transactions import router as transactions_router
    from routers.pipelines import router as pipelines_router
    from routers.reports import router as reports_router
    from routers.demo_stories import router as demo_stories_router
    from routers.graph import router as graph_router
    from routers.downloads import router as downloads_router

    app = FastAPI()
    app.add_middleware(TenantIdMiddleware)
    app.add_middleware(CorrelationIdMiddleware)
    app.include_router(master_data_router)
    app.include_router(transactions_router)
    app.include_router(pipelines_router)
    app.include_router(reports_router)
    app.include_router(demo_stories_router)
    app.include_router(graph_router)
    app.include_router(downloads_router)
    return app


def _audit_rows(path: Path):
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def main() -> int:
    from fastapi.testclient import TestClient

    print("\nDRILL: §64.43 #7 federation — 7 remaining insur/* routers via shared helper\n")
    t0 = time.time()

    with tempfile.TemporaryDirectory() as tmp:
        audit_path = Path(tmp) / "insur_reads.jsonl"
        client = TestClient(_build_app(audit_path))

        headers = {"X-Tenant-ID": "tenant-a", "X-Demo-Role": "manager"}

        # ---- Step 1: helper-target path created on first write ----
        r = client.get("/api/v1/insur/master-data/_global", headers=headers)
        rows = _audit_rows(audit_path)
        step(1, "shared helper writes to INSUR_AUDIT_PATH (env-configurable)",
             r.status_code == 200 and audit_path.exists() and len(rows) == 1,
             f"status={r.status_code} path_exists={audit_path.exists()} rows={len(rows)}")

        # ---- Step 2: master_data /_global → tenant echo + audit row ----
        last = rows[-1]
        step(2, "master_data /_global → tenant_id='tenant-a' in audit row",
             r.headers.get("X-Tenant-ID") == "tenant-a"
             and last["tenant_id"] == "tenant-a"
             and last["surface"] == "master_data"
             and last["endpoint"] == "global_catalog",
             f"echo={r.headers.get('X-Tenant-ID')!r} surface={last['surface']!r}")

        # ---- Step 3: transactions /{dept} → dept-tagged row ----
        r = client.get("/api/v1/insur/transactions/sales", headers=headers)
        last = _audit_rows(audit_path)[-1]
        step(3, "transactions /{dept} → dept-tagged row",
             r.status_code == 200
             and last["surface"] == "transactions"
             and last["endpoint"] == "list_transactions"
             and last.get("dept") == "sales",
             f"status={r.status_code} dept={last.get('dept')!r}")

        # ---- Step 4: pipelines /{dept}/{process_id} → process_id in extras ----
        r = client.get("/api/v1/insur/pipelines/sales/lead_scoring", headers=headers)
        last = _audit_rows(audit_path)[-1]
        step(4, "pipelines /{dept}/{process_id} → row carries process_id",
             r.status_code == 200
             and last["surface"] == "pipelines"
             and last.get("process_id") == "lead_scoring",
             f"status={r.status_code} process_id={last.get('process_id')!r}")

        # ---- Step 5: reports /{dept}/{report_id} → report_id in extras ----
        r = client.get("/api/v1/insur/reports/sales/weekly_business_review", headers=headers)
        last = _audit_rows(audit_path)[-1]
        step(5, "reports /{dept}/{report_id} → row carries report_id",
             r.status_code == 200
             and last["surface"] == "reports"
             and last.get("report_id") == "weekly_business_review",
             f"status={r.status_code} report_id={last.get('report_id')!r}")

        # ---- Step 6: demo_stories /{dept}/{role} → role in extras ----
        r = client.get("/api/v1/insur/demo-stories/sales/manager", headers=headers)
        last = _audit_rows(audit_path)[-1]
        step(6, "demo_stories /{dept}/{role} → row carries role",
             r.status_code == 200
             and last["surface"] == "demo_stories"
             and last.get("role") == "manager",
             f"status={r.status_code} role={last.get('role')!r}")

        # ---- Step 7: graph /{dept}/nodes?type=role → type in extras ----
        r = client.get("/api/v1/insur/graph/sales/nodes?type=role", headers=headers)
        last = _audit_rows(audit_path)[-1]
        step(7, "graph /{dept}/nodes → row carries type filter",
             r.status_code == 200
             and last["surface"] == "graph"
             and last["endpoint"] == "dept_nodes_filtered"
             and last.get("type") == "role",
             f"status={r.status_code} type={last.get('type')!r}")

        # ---- Step 8: downloads /_global → surface=downloads ----
        r = client.get("/api/v1/insur/downloads/_global", headers=headers)
        last = _audit_rows(audit_path)[-1]
        step(8, "downloads /_global → surface=downloads in audit row",
             r.status_code == 200
             and last["surface"] == "downloads"
             and last["endpoint"] == "global_inventory",
             f"status={r.status_code} surface={last['surface']!r}")

        # ---- Step 9: NEG invalid dept → 404, NO new audit row ----
        rows_before = len(_audit_rows(audit_path))
        r = client.get("/api/v1/insur/master-data/BOGUS-DEPT", headers=headers)
        rows_after = len(_audit_rows(audit_path))
        step(9, "NEG: master_data invalid dept → 404, NO audit row (validator-first)",
             r.status_code == 404 and rows_after == rows_before,
             f"status={r.status_code} rows_delta={rows_after - rows_before}")

        # ---- Step 10: NEG malformed process_id → 400, NO new audit row ----
        rows_before = len(_audit_rows(audit_path))
        r = client.get("/api/v1/insur/pipelines/sales/Bogus-ID", headers=headers)
        rows_after = len(_audit_rows(audit_path))
        step(10, "NEG: pipelines malformed process_id → 400, NO new audit row",
             r.status_code == 400 and rows_after == rows_before,
             f"status={r.status_code} rows_delta={rows_after - rows_before}")

        # ---- Step 11: NEG no X-Tenant-ID → row tagged tenant_id='default' ----
        r = client.get("/api/v1/insur/master-data/_global", headers={"X-Demo-Role": "manager"})
        last = _audit_rows(audit_path)[-1]
        step(11, "NEG: no X-Tenant-ID → row tagged with tenant_id='default'",
             r.status_code == 200 and last["tenant_id"] == "default",
             f"tenant_id={last['tenant_id']!r}")

        # ---- Invariant: every audit row carries §38.3 required fields ----
        required = {"ts", "tenant_id", "actor", "tool", "request_id",
                    "surface", "endpoint", "outcome"}
        rows = _audit_rows(audit_path)
        bad = [row for row in rows if not required.issubset(row.keys())]
        if bad:
            step(99, "§38.3 schema invariant — all rows have required fields",
                 False, f"{len(bad)} rows missing fields; first: {bad[0]}")

        # ---- Step 12: NEG disk write failure → read STILL succeeds ----
        # Point INSUR_AUDIT_PATH at a path whose parent cannot be created
        # (a file blocks the would-be parent dir). The helper swallows OSError
        # so the read path survives the audit-layer disk failure.
        blocker = Path(tmp) / "blocker.file"
        blocker.write_text("")
        bad_path = blocker / "audit.jsonl"        # parent of bad_path is a FILE
        os.environ["INSUR_AUDIT_PATH"] = str(bad_path)
        client2 = TestClient(_build_app(bad_path))
        r = client2.get("/api/v1/insur/master-data/_global",
                        headers={"X-Tenant-ID": "tenant-a", "X-Demo-Role": "manager"})
        step(12, "NEG: disk-write failure → read STILL succeeds (best-effort audit)",
             r.status_code == 200,
             f"status={r.status_code} (read survived disk failure)")

    print(f"\n\033[32mALL 12 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
