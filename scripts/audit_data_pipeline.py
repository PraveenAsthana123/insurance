#!/usr/bin/env python3
"""Data Pipeline structure audit · 5-phase per-process.

Per operator brief 2026-06-09: Data tab must have one-row-per-task
with info vs action cards + IPO + flowchart + status one-liner.

11 assertions:
  1. /health 200 + 5 phases + n_tasks > 15
  2. /tasks catalog returns ≥ 15 tasks
  3. each catalog task has required fields (id · card_kind · title · phase · input · process · output · library)
  4. card_kind in {'info', 'action'}
  5. phase in {Inventory · EDA · Quality · Image · Conversion}
  6. /{pid}/tasks returns same N materialized
  7. each materialized has score in [0,1]
  8. each has status in {complete · running · pending · scaffold}
  9. each has status_one_liner string
 10. /{pid}/{task_id} returns single task
 11. /summary/journey-flow returns ordered phases
"""
import logging
import os
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO))
sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")
logging.disable(logging.CRITICAL)


def main() -> int:
    print("Data Pipeline audit · 5-phase per-process\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    fails = 0
    def assert_(label, ok, detail=""):
        nonlocal fails
        mark = "✓" if ok else "✗"
        sfx = f" · {detail}" if detail else ""
        print(f"  {label[:55]:<55} | {mark} {('PASS' if ok else 'FAIL')}{sfx}")
        if not ok:
            fails += 1

    try:
        from main import create_app
        from fastapi.testclient import TestClient
        client = TestClient(create_app())
    except Exception as e:
        print(f"  ✗ FATAL · {e}")
        return 1

    # 1. /health
    r = client.get("/api/v1/data-pipeline/health")
    d = r.json() if r.status_code == 200 else {}
    assert_(f"1. /health 200 + 5 phases + n_tasks={d.get('n_tasks')}",
            r.status_code == 200 and d.get("n_tasks", 0) > 15
            and len(d.get("phases", [])) == 5)

    # 2. /tasks catalog
    r = client.get("/api/v1/data-pipeline/tasks")
    d = r.json() if r.status_code == 200 else {}
    n = d.get("count", 0)
    assert_(f"2. /tasks catalog ≥ 15 ({n})",
            n >= 15)

    # 3. Required fields
    required = {"id", "card_kind", "title", "phase", "input",
                "process", "output", "library"}
    tasks_list = d.get("tasks", [])
    bad = [t for t in tasks_list if not required.issubset(set(t.keys()))]
    assert_(f"3. each catalog task has required fields",
            len(bad) == 0, f"bad={len(bad)}")

    # 4. card_kind in valid set
    valid_kinds = {"info", "action"}
    kinds_ok = all(t.get("card_kind") in valid_kinds for t in tasks_list)
    assert_("4. card_kind in {info, action}", kinds_ok)

    # 5. phase valid
    valid_phases = {"Inventory", "EDA", "Quality", "Image", "Conversion"}
    phases_ok = all(t.get("phase") in valid_phases for t in tasks_list)
    assert_("5. phase in valid set", phases_ok)

    # 6. Materialized for process
    r = client.get("/api/v1/data-pipeline/test-proc/tasks")
    d = r.json() if r.status_code == 200 else {}
    mat = d.get("tasks", [])
    assert_(f"6. /{{pid}}/tasks returns {n} materialized",
            len(mat) == n, f"got {len(mat)}")

    # 7. Score in [0,1]
    if mat:
        scores_ok = all(0 <= m.get("score", -1) <= 1 for m in mat)
        assert_("7. each score in [0,1]", scores_ok)
    else:
        assert_("7. each score in [0,1]", False, "no tasks")

    # 8. Status valid
    if mat:
        valid_status = {"complete", "running", "pending", "scaffold"}
        status_ok = all(m.get("status") in valid_status for m in mat)
        assert_("8. each status valid", status_ok)
    else:
        assert_("8. each status valid", False, "no tasks")

    # 9. status_one_liner
    if mat:
        sl_ok = all(isinstance(m.get("status_one_liner"), str) for m in mat)
        assert_("9. each has status_one_liner string", sl_ok)
    else:
        assert_("9. each has status_one_liner string", False, "no tasks")

    # 10. Single task
    r = client.get("/api/v1/data-pipeline/test-proc/smote-balance")
    d = r.json() if r.status_code == 200 else {}
    assert_("10. /{pid}/{task_id} returns single task",
            r.status_code == 200 and d.get("id") == "smote-balance",
            f"got id={d.get('id')}")

    # 11. Journey flow
    r = client.get("/api/v1/data-pipeline/test-proc/summary/journey-flow")
    d = r.json() if r.status_code == 200 else {}
    assert_("11. /journey-flow returns 5 phases",
            r.status_code == 200 and len(d.get("phases", [])) == 5,
            f"got {len(d.get('phases', []))}")

    print(f"\n  Summary: {11 - fails}/11 pass · {fails} fail")
    print(f"  Reference: operator brief 2026-06-09 · Data tab structure")
    return 0 if fails == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
