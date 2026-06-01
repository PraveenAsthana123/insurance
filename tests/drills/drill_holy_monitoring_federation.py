#!/usr/bin/env python3
"""
Drill: §64.43 #7 federation extended to /api/v1/holy/monitoring/* — first
of 9 holy/* router federations.

Monitoring DATA is fleet-wide infrastructure telemetry (ML pipeline +
cron job health across all depts). It is NOT tenant-scoped data — the
data layout stays dept-scoped. What IS tenant-scoped is the ACCESS
TRAIL: every monitoring read writes a §38.3 audit row attributing the
read to the caller's tenant_id + actor.

This is the right pattern for fleet telemetry under multi-tenant
governance — auditors can answer "which tenant looked at the pricing
model accuracy curve last week?" without artificially partitioning
infrastructure data per tenant.

Steps (10 total; 4 negative):
  1. (+) GET /_global with X-Tenant-ID=tenant-a → 200, X-Tenant-ID echo
        header set, monitoring_reads.jsonl row written with tenant_id=tenant-a
  2. (+) GET /{dept} → audit row tagged with dept
  3. (+) GET /{dept}/jobs/{job}/runs → audit row tagged with dept + job
  4. (+) GET /{dept}/jobs/{job}/runs/{run_id} → row tagged with dept+job+run_id
  5. (-) NEG: invalid dept name → 400 (existing validator preserved); NO
        audit row written (validator runs before _log_monitoring_access)
  6. (-) NEG: invalid job name → 400 (existing validator preserved);
        audit row count unchanged
  7. (-) NEG: default tenant when no X-Tenant-ID header → row tagged
        with tenant_id='default'
  8. (+) Cross-tenant reads ARE allowed (fleet telemetry is intentionally
        non-tenant-scoped); both tenants see same payload — only the
        audit trail distinguishes them
  9. (+) Audit row schema: every row has §38.3 fields
        (ts, tenant_id, actor, tool, request_id, endpoint, outcome)
  10.(-) NEG: disk failure when writing audit row → request STILL
        succeeds (best-effort persistence; observability never breaks
        the read path)

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
    os.environ["HOLY_MONITORING_AUDIT_PATH"] = str(audit_path)
    os.environ.pop("TENANT_ID_STRICT", None)

    for mod in (
        "core.middleware", "core.rbac_middleware",
        "routers.monitoring",
    ):
        if mod in sys.modules:
            del sys.modules[mod]

    from fastapi import FastAPI
    from core.middleware import TenantIdMiddleware, CorrelationIdMiddleware
    from routers.monitoring import router

    app = FastAPI()
    app.add_middleware(TenantIdMiddleware)
    app.add_middleware(CorrelationIdMiddleware)
    app.include_router(router)
    return app


def _audit_rows(path: Path):
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def main() -> int:
    from fastapi.testclient import TestClient

    print("\nDRILL: §64.43 #7 federation — HOLY/monitoring (first of 9 holy routers)\n")
    t0 = time.time()

    with tempfile.TemporaryDirectory() as tmp:
        audit_path = Path(tmp) / "monitoring_reads.jsonl"
        client = TestClient(_build_app(audit_path))

        # ---- Step 1: /_global with X-Tenant-ID → echo + audit row ----
        r = client.get("/api/v1/holy/monitoring/_global",
                       headers={"X-Tenant-ID": "tenant-a", "X-Demo-Role": "manager"})
        rows = _audit_rows(audit_path)
        step(1, "/_global → X-Tenant-ID echoed + audit row with tenant_id='tenant-a'",
             r.status_code == 200
             and r.headers.get("X-Tenant-ID") == "tenant-a"
             and len(rows) == 1
             and rows[0]["tenant_id"] == "tenant-a"
             and rows[0]["endpoint"] == "global_rollup",
             f"status={r.status_code} echo={r.headers.get('X-Tenant-ID')!r} rows={len(rows)}")

        # ---- Step 2: /{dept} → audit row with dept ----
        r = client.get("/api/v1/holy/monitoring/sales",
                       headers={"X-Tenant-ID": "tenant-a", "X-Demo-Role": "manager"})
        rows = _audit_rows(audit_path)
        last = rows[-1]
        step(2, "/{dept} → audit row tagged with dept",
             r.status_code == 200
             and last["endpoint"] == "dept_monitoring"
             and last.get("dept") == "sales",
             f"status={r.status_code} dept={last.get('dept')!r}")

        # ---- Step 3: /{dept}/jobs/{job}/runs → dept + job tags ----
        r = client.get("/api/v1/holy/monitoring/sales/jobs/data_refresh/runs",
                       headers={"X-Tenant-ID": "tenant-a", "X-Demo-Role": "manager"})
        rows = _audit_rows(audit_path)
        last = rows[-1]
        step(3, "/{dept}/jobs/{job}/runs → audit row tagged with dept + job",
             r.status_code == 200
             and last["endpoint"] == "list_runs"
             and last.get("dept") == "sales"
             and last.get("job") == "data_refresh",
             f"dept={last.get('dept')!r} job={last.get('job')!r}")

        # ---- Step 4: /{dept}/jobs/{job}/runs/{run_id} → dept+job+run_id tags ----
        # Hits 404 (no manifest on disk in tmpdir) but audit row written BEFORE the 404.
        r = client.get("/api/v1/holy/monitoring/sales/jobs/data_refresh/runs/run-xyz",
                       headers={"X-Tenant-ID": "tenant-a", "X-Demo-Role": "manager"})
        rows = _audit_rows(audit_path)
        last = rows[-1]
        step(4, "/{dept}/jobs/{job}/runs/{run_id} → audit row written with all 3 path params",
             last["endpoint"] == "get_run"
             and last.get("dept") == "sales"
             and last.get("job") == "data_refresh"
             and last.get("run_id") == "run-xyz",
             f"endpoint={last['endpoint']} run_id={last.get('run_id')!r}")

        # ---- Step 5: NEG invalid dept → 404 (anti-info-leakage), NO new audit row ----
        rows_before = len(_audit_rows(audit_path))
        r = client.get("/api/v1/holy/monitoring/BOGUS-DEPT",
                       headers={"X-Tenant-ID": "tenant-a", "X-Demo-Role": "manager"})
        rows_after = len(_audit_rows(audit_path))
        step(5, "NEG: invalid dept → 404 (anti-info-leakage), NO audit row (validator runs first)",
             r.status_code == 404 and rows_after == rows_before,
             f"status={r.status_code} rows_delta={rows_after - rows_before}")

        # ---- Step 6: NEG invalid job → 404, NO new audit row ----
        rows_before = len(_audit_rows(audit_path))
        r = client.get("/api/v1/holy/monitoring/sales/jobs/BOGUS_JOB/runs",
                       headers={"X-Tenant-ID": "tenant-a", "X-Demo-Role": "manager"})
        rows_after = len(_audit_rows(audit_path))
        step(6, "NEG: invalid job → 404, audit row count unchanged",
             r.status_code == 404 and rows_after == rows_before,
             f"status={r.status_code} rows_delta={rows_after - rows_before}")

        # ---- Step 7: NEG default tenant when no header ----
        r = client.get("/api/v1/holy/monitoring/_global",
                       headers={"X-Demo-Role": "manager"})
        rows = _audit_rows(audit_path)
        last = rows[-1]
        step(7, "NEG: no X-Tenant-ID → row tagged with tenant_id='default'",
             r.status_code == 200 and last["tenant_id"] == "default",
             f"tenant_id={last['tenant_id']!r}")

        # ---- Step 8: cross-tenant reads ARE allowed; payload identical ----
        r_a = client.get("/api/v1/holy/monitoring/_global",
                         headers={"X-Tenant-ID": "tenant-a", "X-Demo-Role": "manager"})
        r_b = client.get("/api/v1/holy/monitoring/_global",
                         headers={"X-Tenant-ID": "tenant-b", "X-Demo-Role": "manager"})
        # Strip scanned_at (timestamp differs across calls)
        body_a = {k: v for k, v in r_a.json().items() if k != "scanned_at"}
        body_b = {k: v for k, v in r_b.json().items() if k != "scanned_at"}
        rows = _audit_rows(audit_path)
        tenants_in_rows = {row["tenant_id"] for row in rows[-2:]}
        step(8, "cross-tenant reads allowed (fleet telemetry); audit distinguishes",
             body_a == body_b
             and tenants_in_rows == {"tenant-a", "tenant-b"},
             f"payloads_match={body_a == body_b} tenants_audited={tenants_in_rows}")

        # ---- Step 9: audit row schema (§38.3 required fields) ----
        required = {"ts", "tenant_id", "actor", "tool", "request_id", "endpoint", "outcome"}
        rows = _audit_rows(audit_path)
        bad_rows = [r for r in rows if not required.issubset(r.keys())]
        step(9, f"all {len(rows)} audit rows have required §38.3 fields",
             not bad_rows,
             f"{len(bad_rows)} bad rows; first: {bad_rows[0] if bad_rows else None}")

        # ---- Step 10: NEG disk failure → read still succeeds ----
        # Point audit path at a location we can't write to (existing file as
        # directory parent). Then call → should succeed (best-effort persistence).
        bad_audit_path = Path(tmp) / "nonexistent_parent" / "file.jsonl"
        # Create a FILE at where the parent dir would be — so mkdir-with-parents fails
        (Path(tmp) / "blocker.file").write_text("")
        os.environ["HOLY_MONITORING_AUDIT_PATH"] = str(Path(tmp) / "blocker.file" / "audit.jsonl")
        client2 = TestClient(_build_app(Path(tmp) / "blocker.file" / "audit.jsonl"))
        r = client2.get("/api/v1/holy/monitoring/_global",
                        headers={"X-Tenant-ID": "tenant-a", "X-Demo-Role": "manager"})
        step(10, "NEG: disk-write failure → read STILL succeeds (best-effort audit)",
             r.status_code == 200,
             f"status={r.status_code} (read survived disk failure)")

    print(f"\n\033[32mALL 10 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
