#!/usr/bin/env python3
"""
Drill: §68.6 PII inventory surface — iteration 2 of HOLY Observability Hub.

The dbviewer iter 1 surface shipped the per-process PII annotations; this
iter 2 surface aggregates them + adds the leak-scan layer that answers
"has PII ever leaked into the audit log?"

Steps (12 total; 4 negative + raw-PII invariant):
  1. (+) GET /pii/_global → 200, policy='§68.6 PII inventory', n_processes
        ≥ 11, distinct_pii_columns non-empty, entity_inventory present
  2. (+) GET /pii/{dept} → 200 with per-process PII slice for the dept
  3. (-) NEG: GET /pii/unknown-dept → 404 (validator-first per §47.6,
        NO audit row written)
  4. (+) GET /pii/leaks → 200, returns envelope even when no audit log
        exists (graceful per §57.7)
  5. (+) Leak-scan with a seeded audit-log line containing a plaintext
        email → 1 hit, pii_type='email', match_redacted is NOT the raw
        email (returns 'X***m' form)
  6. (-) NEG: leak scan MUST NOT return the raw PII string in any field
        of any hit (raw-PII-in-response invariant)
  7. (+) Leak-scan skips false-positive hints (request_id values that
        look like emails do NOT count as leaks)
  8. (+) Leak-scan handles corrupt JSON lines (skipped, doesn't crash)
  9. (+) /pii/_global response carries NO raw PII column VALUES — only
        column NAMES (the catalog never sees a row, just a schema)
  10.(-) NEG: malformed dept name (uppercase) → 404 not 400 (no info
        leak about which validators ran first)
  11.(-) NEG: unknown role → 400 from RBAC (router never sees request)
  12.(+) Tenant attribution preserved on /_global (X-Tenant-ID echoed)

  Plus invariant: every audit row carries §38.3 fields.

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
    os.environ["HOLY_AUDIT_PATH"] = str(audit_path)
    os.environ.pop("TENANT_ID_STRICT", None)

    for mod in list(sys.modules.keys()):
        if mod.startswith(("core.middleware", "core.rbac_middleware",
                            "core.holy_audit",
                            "routers.pii", "services.pii_inventory_service")):
            del sys.modules[mod]
    # Also force pii_inventory_service to re-read _AUDIT_LOG_CANDIDATES
    # against the temp dir audit path.
    if "services.pii_inventory_service" in sys.modules:
        del sys.modules["services.pii_inventory_service"]

    from fastapi import FastAPI
    from core.middleware import TenantIdMiddleware, CorrelationIdMiddleware
    from core.rbac_middleware import RBACMiddleware
    from routers.pii import router

    app = FastAPI()
    app.add_middleware(RBACMiddleware)
    app.add_middleware(TenantIdMiddleware)
    app.add_middleware(CorrelationIdMiddleware)
    app.include_router(router)
    return app


def _audit_rows(path: Path):
    """Tolerant audit-log reader — skips corrupt lines (step 8 seeds one)."""
    if not path.exists():
        return []
    rows = []
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return rows


def main() -> int:
    from fastapi.testclient import TestClient

    print("\nDRILL: §68.6 PII inventory (Observability Hub iter 2)\n")
    t0 = time.time()

    with tempfile.TemporaryDirectory() as tmp:
        audit_path = Path(tmp) / "holy_reads.jsonl"
        client = TestClient(_build_app(audit_path))
        headers = {"X-Tenant-ID": "tenant-a", "X-Demo-Role": "manager"}

        # ---- Step 1: /_global ----
        r = client.get("/api/v1/holy/pii/_global", headers=headers)
        body = r.json() if r.status_code == 200 else {}
        step(1, "/_global → 200, policy stamp + distinct PII columns + entity inventory",
             r.status_code == 200
             and body.get("policy") == "§68.6 PII inventory"
             and body.get("n_processes_total", 0) >= 11
             and len(body.get("distinct_pii_columns", [])) > 0
             and isinstance(body.get("entity_inventory"), list),
             f"status={r.status_code} n_pii_cols={len(body.get('distinct_pii_columns', []))} "
             f"n_entities={len(body.get('entity_inventory', []))}")

        # ---- Step 2: /pii/{dept} ----
        r = client.get("/api/v1/holy/pii/sales", headers=headers)
        body = r.json() if r.status_code == 200 else {}
        step(2, "/pii/sales → per-process slice with PII columns",
             r.status_code == 200
             and body.get("dept") == "sales"
             and body.get("n_processes", 0) >= 1
             and isinstance(body.get("per_process"), list),
             f"status={r.status_code} n_proc={body.get('n_processes')}")

        # ---- Step 3: NEG unknown dept → 404, NO audit row ----
        rows_before = len(_audit_rows(audit_path))
        r = client.get("/api/v1/holy/pii/nonexistent-dept", headers=headers)
        rows_after = len(_audit_rows(audit_path))
        step(3, "NEG: unknown dept → 404, NO audit row (validator-first §47.6)",
             r.status_code == 404 and rows_after == rows_before,
             f"status={r.status_code} rows_delta={rows_after - rows_before}")

        # ---- Step 4: /pii/leaks with NO audit log → graceful empty ----
        # The HOLY_AUDIT_PATH points to a temp file that may or may not exist
        # depending on prior reads. Call with since=now+1 to guarantee 0 hits.
        future = time.time() + 3600
        r = client.get(f"/api/v1/holy/pii/leaks?since={future}", headers=headers)
        body = r.json() if r.status_code == 200 else {}
        step(4, "/pii/leaks → 200 with graceful envelope (no-log path or 0 hits)",
             r.status_code == 200
             and body.get("status") in {"scanned", "no_audit_log"}
             and body.get("n_hits", -1) == 0,
             f"status={r.status_code} svc_status={body.get('status')!r} hits={body.get('n_hits')}")

        # ---- Step 5: leak-scan with seeded email line → 1 hit ----
        # Seed the audit log with a row containing a plaintext email AS A
        # FIELD that isn't a request_id (otherwise it gets allowlisted).
        seed_row = {
            "ts": time.time(),
            "tenant_id": "tenant-a", "actor": "test",
            "tool": "holy.test.seed",
            "request_id": "drill-seed-1",
            "surface": "test", "endpoint": "seed", "outcome": "executed",
            # Plaintext email in the payload — simulates a real leak
            "payload": {"customer_email_raw": "alice@example.com"},
        }
        audit_path.parent.mkdir(parents=True, exist_ok=True)
        with audit_path.open("a") as fh:
            fh.write(json.dumps(seed_row) + "\n")

        r = client.get("/api/v1/holy/pii/leaks?limit=10", headers=headers)
        body = r.json() if r.status_code == 200 else {}
        hits = body.get("hits", [])
        email_hits = [h for h in hits if h.get("pii_type") == "email"]
        step(5, "leak-scan finds seeded email; match returned in REDACTED form",
             r.status_code == 200
             and body.get("n_hits", 0) >= 1
             and len(email_hits) >= 1
             and email_hits[0]["match_redacted"] != "alice@example.com"
             and "***" in email_hits[0]["match_redacted"],
             f"hits={body.get('n_hits')} email_match="
             + (repr(email_hits[0]['match_redacted']) if email_hits else "'none'"))

        # ---- Step 6: NEG raw-PII-in-response invariant ----
        full_response = json.dumps(body)
        step(6, "NEG: raw seeded email NEVER appears in /pii/leaks response",
             "alice@example.com" not in full_response,
             "RAW PII LEAKED IN /pii/leaks response" if "alice@example.com" in full_response else "")

        # ---- Step 7: leak-scan skips false-positive request_id values ----
        # Seed a row whose request_id LOOKS like an email but should be skipped
        # by the false-positive allowlist (request_id values get blanked before
        # the regex runs).
        fp_row = {
            "ts": time.time(),
            "tenant_id": "tenant-a", "actor": "test",
            "tool": "holy.test.fp", "request_id": "fake@test.local",
            "surface": "test", "endpoint": "fp", "outcome": "executed",
        }
        with audit_path.open("a") as fh:
            fh.write(json.dumps(fp_row) + "\n")
        r = client.get("/api/v1/holy/pii/leaks?limit=50", headers=headers)
        body = r.json() if r.status_code == 200 else {}
        # The FP row's only PII-looking content is its request_id ("fake@test.local").
        # After the false-positive blanking, the EMAIL regex MUST NOT find a hit
        # whose row_request_id == 'fake@test.local' AND pii_type == 'email'. Other
        # pii_types (credit_card / iban) catching numeric coincidences in the ts/
        # correlation_id are out of scope for this step — that's the heuristic
        # noise §68.6 explicitly notes is expected.
        fp_email_hits = [
            h for h in body.get("hits", [])
            if h.get("row_request_id") == "fake@test.local"
            and h.get("pii_type") == "email"
        ]
        step(7, "leak-scan allowlists request_id values: no EMAIL hit with FP request_id",
             r.status_code == 200 and len(fp_email_hits) == 0,
             f"unexpected_email_fp_hits={len(fp_email_hits)}")

        # ---- Step 8: leak-scan handles corrupt JSON ----
        with audit_path.open("a") as fh:
            fh.write("{not valid json\n")
        r = client.get("/api/v1/holy/pii/leaks?limit=10", headers=headers)
        step(8, "leak-scan handles corrupt JSON lines (skipped, no crash)",
             r.status_code == 200,
             f"status={r.status_code}")

        # ---- Step 9: /_global response carries NO raw PII values ----
        r = client.get("/api/v1/holy/pii/_global", headers=headers)
        body_text = r.text
        # Catalog should only have column NAMES (e.g. "primary_email") not
        # values (e.g. "alice@example.com")
        leak_terms = ("@example.com", "555-12", "@gmail.com", "@anthropic.com")
        leaked = [t for t in leak_terms if t in body_text]
        step(9, "/_global response carries column NAMES only, no raw PII values",
             r.status_code == 200 and not leaked,
             f"leaked_terms={leaked}")

        # ---- Step 10: NEG malformed dept (uppercase) → 404, no info leak ----
        r = client.get("/api/v1/holy/pii/SALES", headers=headers)
        step(10, "NEG: uppercase dept → 404 (no info leak about validator order)",
             r.status_code == 404,
             f"status={r.status_code}")

        # ---- Step 11: NEG bad role → 400 from RBAC ----
        r = client.get(
            "/api/v1/holy/pii/_global",
            headers={"X-Tenant-ID": "tenant-a", "X-Demo-Role": "intruder"},
        )
        step(11, "NEG: unknown role → 400 from RBAC",
             r.status_code == 400,
             f"status={r.status_code}")

        # ---- Step 12: tenant attribution echoed ----
        r = client.get("/api/v1/holy/pii/_global", headers=headers)
        step(12, "tenant_id from X-Tenant-ID middleware echoed in response header",
             r.status_code == 200 and r.headers.get("X-Tenant-ID") == "tenant-a",
             f"echo={r.headers.get('X-Tenant-ID')!r}")

        # ---- Schema invariant: every audit row carries §38.3 fields ----
        required = {"ts", "tenant_id", "actor", "tool", "request_id",
                    "surface", "endpoint", "outcome"}
        rows = _audit_rows(audit_path)
        # Filter to rows we wrote via the router (not the seeded ones)
        router_rows = [r for r in rows if r.get("tool", "").startswith("holy.pii")]
        bad = [r for r in router_rows if not required.issubset(r.keys())]
        if bad:
            step(99, "§38.3 schema invariant — all router rows have required fields",
                 False, f"{len(bad)} bad rows; first: {bad[0]}")

    print(f"\n\033[32mALL 12 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
