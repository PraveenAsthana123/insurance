#!/usr/bin/env python3
"""
Drill: GET /api/v1/agent-platform/cua/audit — tenant-scoped audit readback.

Closes the §38.3 + §64.43 #7 loop: audit rows ARE written on every CUA
session (commit f57b255b), but they were not queryable via API until now.
The readback endpoint reads `data/agent-supervisor/cua_runs.jsonl`, filters
by the middleware-set tenant_id (NEVER a query parameter), and returns
sorted+paginated results.

Steps (10 total; 4 negative):
  1. (+) Empty audit log → 200 with rows=[], total_count=0
  2. (+) After 3 executed calls for tenant-a, audit shows 3 rows
  3. (-) NEGATIVE: tenant-b sees ZERO of tenant-a's rows (federated isolation)
  4. (-) NEGATIVE: no `tenant_id=` query param exists — callers CANNOT
        cross-read by URL manipulation. Pass it anyway → ignored,
        middleware tenant_id wins
  5. (+) limit=2 returns 2 most recent rows (sorted desc by ts)
  6. (+) since_ts filter excludes rows older than the cursor
  7. (-) NEGATIVE: limit=0 → 422 (Pydantic validates ge=1)
  8. (-) NEGATIVE: corrupt line in audit file → skipped (NOT a crash)
  9. (+) total_count counts ALL matching rows, NOT just limit
  10.(+) Response includes tenant_id echo + audit_path

# RESOURCES: disk_io,playwright

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
    """Minimal app with only the middlewares + agent-platform router needed.
    Avoids `from main import app` which is blocked by pre-existing missing
    prophet dep (env issue, not code).
    """
    for mod in ("core.middleware", "core.rbac_middleware", "routers.agent_platform",
                "services.agent_platform_service", "schemas.agent_platform"):
        if mod in sys.modules:
            del sys.modules[mod]

    from fastapi import FastAPI
    from core.middleware import TenantIdMiddleware, CorrelationIdMiddleware
    from routers.agent_platform import router

    app = FastAPI()
    app.add_middleware(TenantIdMiddleware)
    app.add_middleware(CorrelationIdMiddleware)
    app.include_router(router)
    return app


def _seed_audit_rows(audit_path: Path, n_per_tenant: dict[str, int], base_ts: float) -> None:
    """Write seed rows for multiple tenants directly into the jsonl. Bypasses
    the executor so the drill stays fast (no real Chromium launches needed
    for tenant-isolation testing — that's covered by drill_agent_platform_cua).
    """
    audit_path.parent.mkdir(parents=True, exist_ok=True)
    ts = base_ts
    with audit_path.open("a") as fh:
        for tenant_id, count in n_per_tenant.items():
            for i in range(count):
                row = {
                    "ts": ts,
                    "request_id": f"seed-{tenant_id}-{i:02d}",
                    "tenant_id": tenant_id,
                    "actor": "tester",
                    "tool": "playwright",
                    "instruction": f"read homepage iter={i}",
                    "target": "about:blank",
                    "policy_decision": "allow",
                    "policy_reason": "policy passed",
                    "outcome": "executed",
                    "final_url": "about:blank",
                    "page_title": "",
                    "screenshot_sha256": "0" * 64,
                    "screenshot_bytes": 1234,
                    "body_text_excerpt": "",
                    "latency_ms": 100 + i,
                }
                fh.write(json.dumps(row) + "\n")
                ts += 1.0  # monotonic increments so sort is deterministic


def main() -> int:
    from fastapi.testclient import TestClient

    print("\nDRILL: §64.43 #7 cua/audit readback (tenant isolation)\n")
    t0 = time.time()

    with tempfile.TemporaryDirectory() as tmp:
        audit_path = Path(tmp) / "cua_runs.jsonl"
        os.environ["CUA_AUDIT_PATH"] = str(audit_path)
        os.environ.pop("TENANT_ID_STRICT", None)
        os.environ.pop("TENANT_ID_ALLOWLIST", None)

        # ---- Step 1: empty audit log ----
        client = TestClient(_build_app())
        r = client.get("/api/v1/agent-platform/cua/audit", headers={"X-Tenant-ID": "tenant-a"})
        body = r.json()
        step(1, "empty audit log → 200 with rows=[], total_count=0",
             r.status_code == 200 and body["total_count"] == 0 and body["rows"] == [],
             f"status={r.status_code} total={body.get('total_count')} rows={len(body.get('rows', []))}")

        # ---- Seed 3 rows for tenant-a, 2 for tenant-b ----
        _seed_audit_rows(audit_path, {"tenant-a": 3, "tenant-b": 2}, base_ts=1000.0)
        client = TestClient(_build_app())  # rebuild so service picks up file

        # ---- Step 2: tenant-a sees 3 rows ----
        r = client.get("/api/v1/agent-platform/cua/audit", headers={"X-Tenant-ID": "tenant-a"})
        body = r.json()
        step(2, "tenant-a sees 3 of its rows",
             r.status_code == 200 and body["total_count"] == 3 and len(body["rows"]) == 3
             and all(row["tenant_id"] == "tenant-a" for row in body["rows"]),
             f"total={body.get('total_count')} rows_in={set(row['tenant_id'] for row in body.get('rows', []))}")

        # ---- Step 3: NEGATIVE — tenant-b sees ZERO of tenant-a's rows ----
        r = client.get("/api/v1/agent-platform/cua/audit", headers={"X-Tenant-ID": "tenant-b"})
        body = r.json()
        step(3, "NEGATIVE: tenant-b sees ONLY tenant-b rows (federation isolation)",
             r.status_code == 200 and body["total_count"] == 2
             and all(row["tenant_id"] == "tenant-b" for row in body["rows"]),
             f"total={body.get('total_count')} tenants_in_results={set(row['tenant_id'] for row in body.get('rows', []))}")

        # ---- Step 4: NEGATIVE — query-string tenant_id ignored ----
        # Pass tenant_id=tenant-a as a URL param while X-Tenant-ID header says tenant-b
        r = client.get(
            "/api/v1/agent-platform/cua/audit?tenant_id=tenant-a",
            headers={"X-Tenant-ID": "tenant-b"},
        )
        body = r.json()
        step(4, "NEGATIVE: tenant_id query param IGNORED — middleware header wins",
             r.status_code == 200 and body["total_count"] == 2
             and all(row["tenant_id"] == "tenant-b" for row in body["rows"]),
             f"echo_tenant={body.get('tenant_id')!r} (must be tenant-b, NOT tenant-a)")

        # ---- Step 5: limit=2 returns 2 most-recent rows (sorted desc by ts) ----
        r = client.get(
            "/api/v1/agent-platform/cua/audit?limit=2",
            headers={"X-Tenant-ID": "tenant-a"},
        )
        body = r.json()
        ts_list = [row["ts"] for row in body["rows"]]
        step(5, "limit=2 → 2 most-recent rows (sorted desc)",
             r.status_code == 200 and len(body["rows"]) == 2
             and ts_list == sorted(ts_list, reverse=True),
             f"rows={len(body.get('rows', []))} ts_desc={ts_list == sorted(ts_list, reverse=True)}")

        # ---- Step 6: since_ts filter ----
        # tenant-a rows have ts 1000, 1001, 1002. since_ts=1001.5 should leave 1 row (ts=1002).
        r = client.get(
            "/api/v1/agent-platform/cua/audit?since_ts=1001.5",
            headers={"X-Tenant-ID": "tenant-a"},
        )
        body = r.json()
        step(6, "since_ts=1001.5 → only rows with ts >= 1001.5 (tenant-a has 1 such)",
             r.status_code == 200 and body["total_count"] == 1
             and body["rows"][0]["ts"] >= 1001.5,
             f"total={body.get('total_count')} ts={body['rows'][0]['ts'] if body.get('rows') else None}")

        # ---- Step 7: NEGATIVE — limit=0 → 422 ----
        r = client.get(
            "/api/v1/agent-platform/cua/audit?limit=0",
            headers={"X-Tenant-ID": "tenant-a"},
        )
        step(7, "NEGATIVE: limit=0 → 422 (Pydantic Query(ge=1))",
             r.status_code == 422, f"status={r.status_code}")

        # ---- Step 8: NEGATIVE — corrupt JSON line skipped (not a crash) ----
        with audit_path.open("a") as fh:
            fh.write("THIS IS NOT JSON{{{}}}\n")
            fh.write("\n")  # blank line also OK
            fh.write('{"ts":9999.0,"request_id":"seed-tenant-a-99","tenant_id":"tenant-a","actor":"tester","tool":"playwright","instruction":"x","target":"about:blank","policy_decision":"allow","outcome":"executed"}\n')
        client = TestClient(_build_app())
        r = client.get("/api/v1/agent-platform/cua/audit", headers={"X-Tenant-ID": "tenant-a"})
        body = r.json()
        step(8, "NEGATIVE: corrupt line skipped, valid newer row appears",
             r.status_code == 200 and body["total_count"] == 4
             and any(row["request_id"] == "seed-tenant-a-99" for row in body["rows"]),
             f"total={body.get('total_count')} has_new_row={any(row.get('request_id') == 'seed-tenant-a-99' for row in body.get('rows', []))}")

        # ---- Step 9: total_count vs limit independence ----
        r = client.get(
            "/api/v1/agent-platform/cua/audit?limit=1",
            headers={"X-Tenant-ID": "tenant-a"},
        )
        body = r.json()
        step(9, "total_count counts ALL tenant matches, NOT limit",
             r.status_code == 200 and body["total_count"] == 4 and len(body["rows"]) == 1,
             f"total={body.get('total_count')} returned={len(body.get('rows', []))}")

        # ---- Step 10: response echo ----
        step(10, "response echoes tenant_id + audit_path",
             body["tenant_id"] == "tenant-a" and body["audit_path"] == str(audit_path),
             f"tenant_id={body.get('tenant_id')!r} audit_path={body.get('audit_path')!r}")

    print(f"\n\033[32mALL 10 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
