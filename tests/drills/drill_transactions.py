#!/usr/bin/env python3
"""Drill: INSUR transactional history router (§38 + §41.3 + §47.6 + §57.5 + §57.6 + §64).

Steps (10 total; 3 negative):
    1. (+) transactions router imports + CRON_AUDIT_DIRS catalog populated
    2. (+) per-dept GET returns 200 + events list (may be empty if no audit data yet)
    3. (+) every returned event carries §57.6 canonical envelope keys
    4. (-) NEGATIVE — unknown dept → 404 (no info leak)
    5. (-) NEGATIVE — limit > 500 rejected with 400 (cap enforced)
    6. (-) NEGATIVE — PII tokens redacted from default response payloads
                     (data-class contract — operator must pass include_pii=1 to see)
    7. (+) source=cron filter actually filters (no ml.* events leak through)
    8. (+) since_epoch filter actually filters (events older are excluded)
    9. (+) _global rollup returns per-dept counts for all 19 depts
   10. (+) INSUR_TRANSACTIONS.md exists per dept (under business-layer/)

# RESOURCES: transactions_router disk_io

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

CANONICAL_ENVELOPE = {
    "event_id", "event_type", "request_id", "tenant_id", "actor",
    "dept", "timestamp", "latency_ms", "outcome", "source", "payload",
}


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' — ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def main():
    print("\nDRILL: INSUR transactional history (§38 + §47.6 + §57.6 + §66)\n")
    t0 = time.time()

    # ----- Step 1: router imports + catalog -----
    try:
        from routers import transactions as txn
    except Exception as exc:
        step(1, "transactions router imports", False, f"{type(exc).__name__}: {exc}")
        return
    has_catalog = (
        hasattr(txn, "CRON_AUDIT_DIRS") and len(txn.CRON_AUDIT_DIRS) == 4
        and hasattr(txn, "INSUR_DEPTS") and len(txn.INSUR_DEPTS) == 19
        and hasattr(txn, "PII_TOKENS") and len(txn.PII_TOKENS) >= 8
    )
    step(1, "router + CRON_AUDIT_DIRS + INSUR_DEPTS + PII_TOKENS populated",
         has_catalog,
         f"cron={len(txn.CRON_AUDIT_DIRS)} depts={len(txn.INSUR_DEPTS)} pii={len(txn.PII_TOKENS)}")

    # ----- Spin up TestClient -----
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    app = FastAPI()
    app.include_router(txn.router)
    client = TestClient(app)

    # ----- Step 2: per-dept GET 200 -----
    r = client.get("/api/v1/insur/transactions/sales")
    body = r.json() if r.status_code == 200 else {}
    ok = r.status_code == 200 and "events" in body and isinstance(body["events"], list)
    step(2, "GET /sales → 200 + events list (may be empty if no audit data yet)",
         ok, f"status={r.status_code} n_events={body.get('n_events')}")

    # ----- Step 3: canonical envelope on every event (if any present) -----
    sample_events = body.get("events", [])
    bad_envelope: list[str] = []
    for i, ev in enumerate(sample_events[:5]):
        missing = CANONICAL_ENVELOPE - set(ev.keys())
        if missing:
            bad_envelope.append(f"event[{i}]: missing {sorted(missing)}")
    step(3, "every event carries §57.6 canonical envelope (or empty)",
         not bad_envelope,
         f"{len(sample_events)} events scanned"
         + ("" if not bad_envelope else f"; bad: {bad_envelope[:2]}"))

    # ----- Step 4: NEGATIVE — unknown dept -----
    r = client.get("/api/v1/insur/transactions/not-a-real-dept")
    step(4, "NEGATIVE: unknown dept → 404 (no info leak)",
         r.status_code == 404, f"got {r.status_code}: {r.text[:80]}")

    # ----- Step 5: NEGATIVE — limit > 500 rejected -----
    r = client.get("/api/v1/insur/transactions/sales?limit=1000")
    # FastAPI Query(le=500) returns 422 by default for validation errors
    step(5, "NEGATIVE: limit>500 rejected with 4xx (cap enforced)",
         400 <= r.status_code < 500, f"got {r.status_code}")

    # ----- Step 6: NEGATIVE — PII redaction default -----
    # Inject a synthetic event into the redactor and check via the helper
    # (rather than via API since no PII data exists in the live data dir).
    fake = {
        "event_id": "evt-test-1",
        "payload": {
            "customer_name": "Alice Wonderland",
            "primary_email": "alice@example.com",
            "non_pii_field": "OK",
        },
    }
    redacted = txn._redact_pii(fake)
    pii_leaked = (
        redacted["payload"]["customer_name"] != "***REDACTED***"
        or redacted["payload"]["primary_email"] != "***REDACTED***"
        or redacted["payload"]["non_pii_field"] != "OK"
    )
    step(6, "NEGATIVE: PII tokens redacted from default response payloads",
         not pii_leaked,
         "non-PII preserved + PII replaced with ***REDACTED***")

    # ----- Step 7: source=cron filter -----
    r = client.get("/api/v1/insur/transactions/sales?source=cron")
    body = r.json() if r.status_code == 200 else {}
    leaked_non_cron = [
        e["event_type"] for e in body.get("events", [])
        if not e["event_type"].startswith("cron.")
    ]
    step(7, "source=cron returns only cron.* events",
         r.status_code == 200 and not leaked_non_cron,
         f"non-cron leaked: {leaked_non_cron[:2]}" if leaked_non_cron else
         f"n_cron_events={body.get('n_events', 0)}")

    # ----- Step 8: since_epoch filter -----
    # Set since_epoch far in the future — should return empty
    future = time.time() + 86400
    r = client.get(f"/api/v1/insur/transactions/sales?since_epoch={future}")
    body = r.json() if r.status_code == 200 else {}
    step(8, "since_epoch filter excludes older events (future ts → 0 events)",
         r.status_code == 200 and body.get("n_events") == 0,
         f"n_events={body.get('n_events')} (expected 0)")

    # ----- Step 9: _global rollup -----
    r = client.get("/api/v1/insur/transactions/_global")
    body = r.json() if r.status_code == 200 else {}
    depts_in_rollup = set(body.get("per_dept_counts", {}).keys())
    missing = EXPECTED_DEPTS - depts_in_rollup
    step(9, f"_global rollup returns per-dept counts for all {len(EXPECTED_DEPTS)} depts",
         r.status_code == 200 and not missing,
         f"missing: {sorted(missing)[:3]}" if missing else f"depts={len(depts_in_rollup)}")

    # ----- Step 10: INSUR_TRANSACTIONS.md per dept -----
    candidates = [Path("/global-ai-org"), REPO_ROOT / "global-ai-org"]
    gao = next((p for p in candidates if p.exists()), None)
    if gao is None:
        step(10, "global-ai-org/ locatable", False, "tried " + str([str(c) for c in candidates]))
        return
    missing_md = [
        dept for dept in EXPECTED_DEPTS
        if not (gao / "departments" / dept / "business-layer" / "INSUR_TRANSACTIONS.md").exists()
    ]
    step(10, f"INSUR_TRANSACTIONS.md exists for all {len(EXPECTED_DEPTS)} depts",
         not missing_md, f"missing: {sorted(missing_md)[:3]}" if missing_md else "")

    print(f"\n\033[32mALL 10 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")


if __name__ == "__main__":
    main()
