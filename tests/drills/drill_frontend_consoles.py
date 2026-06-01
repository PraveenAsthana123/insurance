#!/usr/bin/env python3
"""
Drill: AgenticConsole + TestingDashboard backend endpoints (§43, §64.40.5 + §65.8.3).

These are frontend-only components consuming existing backend endpoints
(already drilled separately by drill_agentic_stack + drill_test_tier_dispatch).
This drill is the contract drill — proves the wire-up the frontend depends
on hasn't regressed.

Steps (8 total; 3 negative):
    1. (+) GET /agentic/runs returns list (may be empty)
    2. (+) POST /agentic/execute on a valid goal returns full run manifest with required fields
    3. (+) The just-created run is retrievable by request_id
    4. (+) GET /testing/tiers returns all 8 tiers + assigned agent roles
    5. (+) POST /testing/dispatch enqueues a test task
    6. (-) NEGATIVE: POST /agentic/execute with empty goal returns 400
    7. (-) NEGATIVE: POST /testing/dispatch with bogus tier returns 400
    8. (-) NEGATIVE: GET /agentic/runs/<bogus-id> returns 404

# RESOURCES: http_local

Requires insur_backend reachable. Skips if not.

Exit 0 on PASS, 1 on FAIL.
"""
from __future__ import annotations

import sys
import time

import httpx


BACKEND = "http://localhost:8000"
API_AGENTIC = f"{BACKEND}/api/v1/holy/agentic"
API_TESTING = f"{BACKEND}/api/v1/holy/testing"
DEPT = "drill_consoles"


def step(n, label, ok, detail=""):
    marker = "\033[32mOK\033[0m" if ok else "\033[31mFAIL\033[0m"
    print(f"  {marker} step {n}: {label}{(' - ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def main():
    print("\nDRILL: AgenticConsole + TestingDashboard backend contracts\n")
    t0 = time.time()

    try:
        httpx.get(BACKEND, timeout=2)
    except httpx.ConnectError:
        print(f"  WARN prereq: backend not reachable at {BACKEND}; skipping drill")
        sys.exit(0)

    # ----- Step 1: list runs -----
    r = httpx.get(f"{API_AGENTIC}/runs?dept={DEPT}&limit=5", timeout=5)
    data = r.json() if r.status_code == 200 else {}
    step(1, "GET /agentic/runs returns runs list",
         r.status_code == 200 and isinstance(data.get("runs"), list),
         f"status={r.status_code} n_runs={len(data.get('runs', []))}")

    # ----- Step 2: execute on a valid read goal -----
    r = httpx.post(
        f"{API_AGENTIC}/execute",
        json={
            "goal": "list the 5 most recent leads from CRM",
            "dept": DEPT,
            "granted_scopes": ["public:read", f"read:{DEPT}"],
            "budget_usd": 0.10,
        },
        timeout=30,
    )
    run = r.json() if r.status_code == 200 else {}
    required = {"request_id", "goal", "tasks", "layers_traversed", "final_status"}
    has_all = required.issubset(set(run.keys() if isinstance(run, dict) else []))
    step(2, "POST /agentic/execute returns required fields",
         r.status_code == 200 and has_all,
         f"status={r.status_code} keys={sorted(run.keys())[:5]}…")
    new_run_id = run.get("request_id", "")

    # ----- Step 3: retrieve by id -----
    r = httpx.get(f"{API_AGENTIC}/runs/{new_run_id}", timeout=5)
    step(3, "GET /agentic/runs/<id> returns the just-created run",
         r.status_code == 200 and r.json().get("request_id") == new_run_id,
         f"status={r.status_code}")

    # ----- Step 4: testing tiers -----
    r = httpx.get(f"{API_TESTING}/tiers", timeout=5)
    tiers_data = r.json() if r.status_code == 200 else {}
    tiers = tiers_data.get("tiers", [])
    expected_tiers = {"unit", "integration", "api", "boundary", "process", "perf", "smoke", "security"}
    actual_tiers = {t.get("tier") for t in tiers}
    step(4, "GET /testing/tiers returns all 8 tiers with agent assignments",
         expected_tiers.issubset(actual_tiers) and all("agent" in t for t in tiers),
         f"got {sorted(actual_tiers)}")

    # ----- Step 5: dispatch -----
    r = httpx.post(
        f"{API_TESTING}/dispatch",
        json={"dept": DEPT, "tier": "unit", "timeout_seconds": 60},
        timeout=5,
    )
    dispatch_resp = r.json() if r.status_code == 200 else {}
    step(5, "POST /testing/dispatch enqueues a unit-tier task",
         r.status_code == 200 and "task_id" in dispatch_resp,
         f"status={r.status_code} task_id={dispatch_resp.get('task_id')}")

    # ----- Step 6: NEGATIVE empty goal -----
    r = httpx.post(
        f"{API_AGENTIC}/execute",
        json={"goal": "", "dept": DEPT},
        timeout=10,
    )
    step(6, "NEGATIVE: empty goal returns 400",
         r.status_code == 400, f"status={r.status_code}")

    # ----- Step 7: NEGATIVE bogus tier -----
    r = httpx.post(
        f"{API_TESTING}/dispatch",
        json={"dept": DEPT, "tier": "totally-bogus-tier"},
        timeout=5,
    )
    step(7, "NEGATIVE: bogus tier returns 400",
         r.status_code == 400, f"status={r.status_code}")

    # ----- Step 8: NEGATIVE bogus request_id -----
    r = httpx.get(f"{API_AGENTIC}/runs/does-not-exist-xyz-123", timeout=5)
    step(8, "NEGATIVE: bogus request_id returns 404",
         r.status_code == 404, f"status={r.status_code}")

    print(f"\n\033[32mALL 8 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")


if __name__ == "__main__":
    main()
