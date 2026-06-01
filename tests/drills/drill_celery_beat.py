#!/usr/bin/env python3
"""
Drill: HOLY Celery beat schedule for test-tier auto-dispatch (§43, §65.8.5).

Steps (8 total; 3 negative):
    1. (+) celery_app imports cleanly + beat_schedule populated
    2. (+) All 8 expected test-tier schedules present
    3. (+) Every test-tier schedule has the canonical kwargs (tier, depts, timeout)
    4. (+) holy.dispatch_test_fanout task registered in celery_app
    5. (+) Every schedule references a valid task name
    6. (-) NEGATIVE — bogus tier in dispatch envelope rejected by agent (covered by test_agent drill, asserted indirectly here)
    7. (+) All 19 HOLY depts present in beat-fan-out depts list
    8. (-) NEGATIVE — schedule period MUST be > 0 (catches off-by-one in cadence defs)

# RESOURCES: celery_config disk_io

Exit 0 on PASS, 1 on FAIL.
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))
sys.path.insert(0, str(REPO_ROOT / "agents"))


EXPECTED_TIER_SCHEDULES = {
    "holy-tests-unit-30min",
    "holy-tests-process-30min",
    "holy-tests-api-hourly",
    "holy-tests-integration-hourly",
    "holy-tests-boundary-4h",
    "holy-tests-perf-nightly",
    "holy-tests-smoke-daily",
    "holy-tests-security-weekly",
}

EXPECTED_CRON_SCHEDULES = {
    "holy-data-refresh-hourly",
    "holy-model-retrain-daily",
    "holy-accuracy-eval-4h",
    "holy-analysis-rollup-daily",
}

EXPECTED_CRON_TASKS = {
    "holy.refresh_data_artifacts",
    "holy.retrain_models",
    "holy.eval_accuracy_drift",
    "holy.analysis_rollup",
}

EXPECTED_DEPTS = {
    "digital-marketing", "customer-experience", "supply-chain", "manufacturing",
    "product-rd", "retail-operations", "sales", "finance", "hr", "procurement",
    "executive-leadership", "e-commerce",
    "customer-support", "engineering", "it-operations", "legal", "marketing",
    "operations", "security-operations",
}


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' — ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def main():
    print("\nDRILL: Celery beat schedule for test auto-dispatch (§65.8.5)\n")
    t0 = time.time()

    # ----- Step 1: celery_app + beat_schedule -----
    try:
        from workers.celery_app import celery_app
    except Exception as exc:
        step(1, "celery_app imports", False, f"{type(exc).__name__}: {exc}")
        return
    bs = celery_app.conf.beat_schedule
    step(1, "celery_app imports + beat_schedule populated",
         isinstance(bs, dict) and len(bs) > 0,
         f"{len(bs)} schedules configured")

    # ----- Step 2: all 8 tier schedules present -----
    actual = set(bs.keys())
    missing = EXPECTED_TIER_SCHEDULES - actual
    step(2, f"all {len(EXPECTED_TIER_SCHEDULES)} test-tier schedules present",
         not missing, f"missing: {sorted(missing)}" if missing else "")

    # ----- Step 3: each tier schedule has canonical kwargs -----
    bad = []
    for name in EXPECTED_TIER_SCHEDULES:
        cfg = bs.get(name, {})
        kwargs = cfg.get("kwargs", {})
        for key in ("tier", "depts", "timeout_seconds"):
            if key not in kwargs:
                bad.append(f"{name}: missing kwarg '{key}'")
    step(3, "every tier schedule has tier+depts+timeout_seconds kwargs",
         not bad, "; ".join(bad[:3]) if bad else "")

    # ----- Step 4: holy.dispatch_test_fanout task registered -----
    # Force task discovery
    try:
        from workers import tasks  # noqa: F401
    except Exception as exc:
        step(4, "workers.tasks imports", False, str(exc))
        return
    registered = set(celery_app.tasks.keys())
    step(4, "holy.dispatch_test_fanout registered in celery_app.tasks",
         "holy.dispatch_test_fanout" in registered,
         f"have {len(registered)} tasks total")

    # ----- Step 5: every schedule's task name is a registered task -----
    bad_tasks = []
    for name, cfg in bs.items():
        task_name = cfg.get("task")
        if task_name and task_name not in registered:
            bad_tasks.append(f"{name} → {task_name}")
    step(5, "every schedule references a registered Celery task",
         not bad_tasks, f"unregistered: {bad_tasks[:3]}" if bad_tasks else "")

    # ----- Step 6: NEGATIVE — bogus tier semantics asserted in test_agent drill -----
    # Cross-reference assertion: test_agent's _qualifies rejects bogus tier
    # (we don't re-run test_agent here; we assert the bogus-tier check exists)
    from test_agent import _qualifies
    step(6, "NEGATIVE: test_agent._qualifies rejects bogus tier (cross-drill)",
         not _qualifies("totally-bogus-tier", "all"),
         "test_agent must reject unknown tier names")

    # ----- Step 7: all 19 depts in tier fan-out -----
    bad_dept_lists = []
    for name in EXPECTED_TIER_SCHEDULES:
        cfg = bs.get(name, {})
        depts = set(cfg.get("kwargs", {}).get("depts", []))
        missing_depts = EXPECTED_DEPTS - depts
        if missing_depts:
            bad_dept_lists.append(f"{name}: missing {len(missing_depts)} depts")
    step(7, f"all {len(EXPECTED_DEPTS)} HOLY depts present in every tier fan-out",
         not bad_dept_lists, "; ".join(bad_dept_lists[:3]) if bad_dept_lists else "")

    # ----- Step 8: NEGATIVE — all schedule periods > 0 -----
    bad_period = []
    for name, cfg in bs.items():
        sch = cfg.get("schedule")
        if isinstance(sch, (int, float)) and sch <= 0:
            bad_period.append(f"{name}: schedule={sch}")
    step(8, "NEGATIVE: all schedule periods > 0 (catches off-by-one cadence bugs)",
         not bad_period, "; ".join(bad_period[:3]) if bad_period else "")

    # ----- Step 9: 4 data/model/accuracy/analysis cron schedules present -----
    missing_cron = EXPECTED_CRON_SCHEDULES - actual
    step(9, f"all {len(EXPECTED_CRON_SCHEDULES)} data/model/accuracy/analysis cron schedules present",
         not missing_cron,
         f"missing: {sorted(missing_cron)}" if missing_cron else "")

    # ----- Step 10: matching 4 Celery tasks registered -----
    missing_tasks = EXPECTED_CRON_TASKS - registered
    step(10, f"all {len(EXPECTED_CRON_TASKS)} data/model/accuracy/analysis tasks registered",
         not missing_tasks,
         f"missing: {sorted(missing_tasks)}" if missing_tasks else "")

    print(f"\n\033[32mALL 10 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")


if __name__ == "__main__":
    main()
