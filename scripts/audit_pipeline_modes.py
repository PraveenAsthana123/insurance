#!/usr/bin/env python3
"""Pipeline manual + automatic modes audit · §93.

Per ~/.claude/policies/process-component-ipo-pattern.md §93.7.
Verifies both modes work end-to-end with the 4-component × 4-sub-section
structure.

11 assertions:
  1. POST /manual/start returns session_id + state
  2. state.components has all 4 (data · model · accuracy · reporting)
  3. each component has 4 sub-sections (Input · Process · Output · Visualization)
  4. POST /manual/{id}/load-data populates data component
  5. POST /manual/{id}/split-data requires data_loaded (400)
  6. POST /manual/{id}/select-model accepts list (one OR multiple)
  7. POST /manual/{id}/set-hyperparams updates dict
  8. POST /manual/{id}/train requires model_selection + split (400)
  9. POST /automatic/run completes all 10 phases
 10. each automatic phase has output + quality_score + completed
 11. overall_quality_score = mean of phase scores
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
    print("Pipeline modes audit · §93 (Manual + Automatic)\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    fails = 0

    def assert_(label: str, ok: bool, detail: str = ""):
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

    # 1. POST /manual/start
    r = client.post("/api/v1/pipeline/manual/start",
                     json={"process_id": "test-proc", "dataset_name": "demo"})
    if r.status_code == 200:
        d = r.json()
        sid = d.get("session_id")
        state = d.get("state", {})
    else:
        sid = None
        state = {}
    assert_("1. POST /manual/start returns session_id + state",
            r.status_code == 200 and sid and state,
            f"http={r.status_code}")

    # 2. state.components has all 4
    components = state.get("components", {})
    expected = {"data", "model", "accuracy", "reporting"}
    actual = set(components.keys())
    assert_(f"2. components has 4 ({expected - actual or 'all'})",
            actual == expected, f"got {actual}")

    # 3. each component has 4 sub-sections
    sub_sections_ok = True
    for comp_name, comp in components.items():
        expected_subs = {"Input", "Process", "Output", "Visualization"}
        actual_subs = set(comp.keys())
        if actual_subs != expected_subs:
            sub_sections_ok = False
            break
    assert_("3. each component has 4 sub-sections IPO+V",
            sub_sections_ok)

    # 4. POST load-data populates data component
    if sid:
        r = client.post(f"/api/v1/pipeline/manual/{sid}/load-data",
                         json={"n_rows": 500, "n_features": 8})
        d = r.json().get("state", {}) if r.status_code == 200 else {}
        data_input = d.get("components", {}).get("data", {}).get("Input", {}).get("content")
        assert_("4. /load-data populates data.Input",
                r.status_code == 200 and data_input is not None,
                f"http={r.status_code}")
    else:
        assert_("4. /load-data populates data.Input", False, "no session")

    # 5. /split-data requires data_loaded
    fresh = client.post("/api/v1/pipeline/manual/start",
                         json={"process_id": "test-fresh", "dataset_name": "demo"})
    fsid = fresh.json().get("session_id") if fresh.status_code == 200 else None
    if fsid:
        r = client.post(f"/api/v1/pipeline/manual/{fsid}/split-data",
                         json={"train": 0.7, "val": 0.15, "test": 0.15})
        assert_("5. /split-data without data → 400",
                r.status_code == 400, f"http={r.status_code}")
    else:
        assert_("5. /split-data without data → 400", False, "no fresh session")

    # 6. /select-model accepts list (multiple)
    if sid:
        # First, split-data (already loaded above)
        client.post(f"/api/v1/pipeline/manual/{sid}/split-data",
                     json={"train": 0.7, "val": 0.15, "test": 0.15})
        r = client.post(f"/api/v1/pipeline/manual/{sid}/select-model",
                         json={"models": ["XGBoost", "LightGBM", "RandomForest"]})
        d = r.json().get("state", {}) if r.status_code == 200 else {}
        assert_("6. /select-model accepts 3 models",
                r.status_code == 200 and len(d.get("model_selection", [])) == 3,
                f"http={r.status_code}")

    # 7. /set-hyperparams
    if sid:
        r = client.post(f"/api/v1/pipeline/manual/{sid}/set-hyperparams",
                         json={"hyperparameters": {"learning_rate": 0.05, "n_estimators": 100},
                               "sigmoid_temperature": 0.8})
        d = r.json().get("state", {}) if r.status_code == 200 else {}
        assert_("7. /set-hyperparams updates dict",
                d.get("hyperparameters", {}).get("learning_rate") == 0.05,
                f"got={d.get('hyperparameters')}")

    # 8. /train requires model_selection + split (test fresh)
    if fsid:
        r = client.post(f"/api/v1/pipeline/manual/{fsid}/train")
        assert_("8. /train without prereqs → 400",
                r.status_code == 400, f"http={r.status_code}")

    # 9-11. Automatic mode
    r = client.post("/api/v1/pipeline/automatic/run",
                     json={"process_id": "test-auto"})
    auto = r.json() if r.status_code == 200 else {}
    phases = auto.get("phases", [])
    assert_(f"9. /automatic/run completes 10 phases ({len(phases)})",
            len(phases) == 10, f"got {len(phases)}")

    # 10. each phase has output + quality_score + completed
    all_have_fields = all(
        p.get("output") is not None
        and p.get("quality_score") is not None
        and p.get("completed") is True
        for p in phases
    )
    assert_("10. each phase has output + quality + completed",
            all_have_fields)

    # 11. overall_quality_score = mean of phase scores
    if phases:
        scores = [p["quality_score"] for p in phases if p.get("quality_score") is not None]
        expected_mean = round(sum(scores) / len(scores), 3)
        actual = auto.get("overall_quality_score")
        assert_(f"11. overall_quality_score = mean ({expected_mean})",
                abs(actual - expected_mean) < 0.01,
                f"got {actual}")
    else:
        assert_("11. overall_quality_score = mean", False, "no phases")

    print(f"\n  Summary: {11 - fails}/11 pass · {fails} fail")
    print(f"  Reference: §93 process-component-ipo-pattern")
    return 0 if fails == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
