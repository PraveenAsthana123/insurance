#!/usr/bin/env python3
"""Drill: INSUR Monitoring AI per-dept (§64 + §65 + §47 + §38).

Steps (10 total; 3 negative):
    1. (+) monitoring router imports + endpoint catalog populated
    2. (+) per-dept GET returns 200 + job catalog with 4 cron jobs
    3. (+) job entries carry task name + cadence_seconds + liveness probe
    4. (+) cross-dept rollup endpoint returns all 19 depts
    5. (-) NEGATIVE — unknown dept → 404 (not 500, no info leak)
    6. (-) NEGATIVE — unknown job → 404 (not 500, lists allowed values)
    7. (+) all 4 cron tasks (refresh_data / retrain / accuracy / analysis)
           are present in the router's CRON_JOBS catalog with correct cadences
    8. (-) NEGATIVE — get_run with bogus run_id → 404 (filesystem-not-found
           must not leak path traversal info)
    9. (+) INSUR_MONITORING_AI.md exists for every dept under global-ai-org/
   10. (+) cron audit dir layout matches what cron tasks write to
           (data/eval/cron/<job_subdir>/) so backend + workers are aligned

# RESOURCES: monitoring_router celery_config disk_io

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

EXPECTED_JOBS = {
    "data_refresh":   ("insur.refresh_data_artifacts", 60 * 60),
    "retrain":        ("insur.retrain_models",         24 * 60 * 60),
    "accuracy_drift": ("insur.eval_accuracy_drift",    4 * 60 * 60),
    "analysis":       ("insur.analysis_rollup",        24 * 60 * 60),
}


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' — ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def main():
    print("\nDRILL: INSUR Monitoring AI (§64 + §65 + §47 + §38)\n")
    t0 = time.time()

    # ----- Step 1: router imports + has expected attributes -----
    try:
        from routers import monitoring as mon
    except Exception as exc:
        step(1, "monitoring router imports", False, f"{type(exc).__name__}: {exc}")
        return
    has_catalog = (
        hasattr(mon, "CRON_JOBS") and isinstance(mon.CRON_JOBS, dict)
        and hasattr(mon, "INSUR_DEPTS") and isinstance(mon.INSUR_DEPTS, list)
        and hasattr(mon, "router")
    )
    step(1, "monitoring router imports + endpoint catalog populated",
         has_catalog, f"{len(mon.CRON_JOBS)} jobs, {len(mon.INSUR_DEPTS)} depts")

    # ----- Step 2: per-dept GET returns 200 + job catalog -----
    # Use FastAPI TestClient directly against the router rather than full app
    # to keep the drill self-contained (no main.py side-effects).
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    app = FastAPI()
    app.include_router(mon.router)
    client = TestClient(app)

    r = client.get("/api/v1/insur/monitoring/sales")
    ok = r.status_code == 200 and "jobs" in r.json() and len(r.json()["jobs"]) == 4
    step(2, "GET /monitoring/sales → 200 + 4-job catalog",
         ok, f"status={r.status_code} jobs={len(r.json().get('jobs', {}))}")

    # ----- Step 3: job entries have canonical fields -----
    body = r.json()
    bad = []
    for job_key, job in body["jobs"].items():
        for required in ("task", "cadence_seconds", "liveness", "readiness"):
            if required not in job:
                bad.append(f"{job_key}: missing '{required}'")
    step(3, "every job entry has task + cadence_seconds + liveness + readiness",
         not bad, "; ".join(bad[:3]) if bad else "")

    # ----- Step 4: cross-dept rollup returns all 19 depts -----
    r = client.get("/api/v1/insur/monitoring/_global")
    payload = r.json() if r.status_code == 200 else {}
    depts_in_rollup = set(payload.get("depts", []))
    missing_depts = EXPECTED_DEPTS - depts_in_rollup
    step(4, f"GET /monitoring/_global → all {len(EXPECTED_DEPTS)} depts",
         r.status_code == 200 and not missing_depts,
         f"status={r.status_code} missing={sorted(missing_depts)[:3]}" if missing_depts else "")

    # ----- Step 5: NEGATIVE — unknown dept → 404 -----
    r = client.get("/api/v1/insur/monitoring/not-a-real-dept")
    step(5, "NEGATIVE: unknown dept → 404 not 500 (no info leak)",
         r.status_code == 404, f"got {r.status_code}: {r.text[:80]}")

    # ----- Step 6: NEGATIVE — unknown job → 404 -----
    r = client.get("/api/v1/insur/monitoring/sales/jobs/not-a-real-job/runs")
    step(6, "NEGATIVE: unknown job → 404 with allowed-values hint",
         r.status_code == 404 and "data_refresh" in r.text,
         f"got {r.status_code}: {r.text[:80]}")

    # ----- Step 7: 4 cron jobs match the celery task contract -----
    bad_catalog = []
    for key, (expected_task, expected_cadence) in EXPECTED_JOBS.items():
        if key not in mon.CRON_JOBS:
            bad_catalog.append(f"{key}: missing")
            continue
        actual_task, actual_cadence, _ = mon.CRON_JOBS[key]
        if actual_task != expected_task:
            bad_catalog.append(f"{key}: task '{actual_task}' != '{expected_task}'")
        if actual_cadence != expected_cadence:
            bad_catalog.append(f"{key}: cadence {actual_cadence} != {expected_cadence}")
    step(7, "all 4 cron jobs catalogued with correct task names + cadences",
         not bad_catalog, "; ".join(bad_catalog[:3]) if bad_catalog else "")

    # ----- Step 8: NEGATIVE — bogus run_id → 404 -----
    r = client.get("/api/v1/insur/monitoring/sales/jobs/data_refresh/runs/0000-deadbeef")
    step(8, "NEGATIVE: bogus run_id → 404 (no path-traversal leak)",
         r.status_code == 404, f"got {r.status_code}: {r.text[:80]}")

    # ----- Step 9: INSUR_MONITORING_AI.md exists per dept -----
    # Locate global-ai-org/ — same candidate pattern the router uses.
    candidates = [
        Path("/global-ai-org"),
        REPO_ROOT / "global-ai-org",
    ]
    gao_root = next((p for p in candidates if p.exists()), None)
    if gao_root is None:
        step(9, "global-ai-org/ root locatable", False, "tried " + str([str(c) for c in candidates]))
        return

    missing_md = []
    for dept in EXPECTED_DEPTS:
        target = gao_root / "departments" / dept / "business-layer" / "INSUR_MONITORING_AI.md"
        if not target.exists():
            missing_md.append(dept)
    step(9, f"INSUR_MONITORING_AI.md exists for all {len(EXPECTED_DEPTS)} depts",
         not missing_md, f"missing: {sorted(missing_md)[:3]}" if missing_md else "")

    # ----- Step 10: cron audit subdir contract matches worker convention -----
    # The worker tasks (backend/workers/tasks.py) write to
    #   data/eval/cron/<subdir>/<run_id>/manifest.json
    # The router reads from the same path.  Mismatch = silent black hole.
    expected_subdirs = {"data_refresh", "retrain", "accuracy", "analysis"}
    actual_subdirs = {subdir for _, _, subdir in mon.CRON_JOBS.values()}
    step(10, "audit-subdir contract aligned between router and workers",
         actual_subdirs == expected_subdirs,
         f"router has {sorted(actual_subdirs)}, expected {sorted(expected_subdirs)}")

    print(f"\n\033[32mALL 10 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")


if __name__ == "__main__":
    main()
