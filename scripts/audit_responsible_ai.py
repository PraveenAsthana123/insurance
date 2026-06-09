#!/usr/bin/env python3
"""Responsible AI 12-lens audit · per-process structure.

Per operator brief 2026-06-09 · 12 lens cards in ResAI tab.

11 assertions:
  1. /health 200 + 12 lenses listed
  2. /lenses catalog returns 12 entries
  3. each lens has required fields (id · name · icon · purpose · library
     · input · process · output · section_color)
  4. /{process_id}/lenses materializes for one process (12 entries)
  5. each materialized lens has score in [0..1]
  6. each has final_outcome in {pass, partial, fail, scaffold}
  7. each has library_state (installed or reason)
  8. each has summary_report string
  9. /{process_id}/{lens_id} returns single lens
 10. /{process_id}/{lens_id} returns 404 for invalid lens
 11. /{process_id}/summary/report aggregates correctly
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
    print("Responsible AI 12-lens audit · per-process\n")
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
    r = client.get("/api/v1/responsible-ai/health")
    d = r.json() if r.status_code == 200 else {}
    assert_("1. /health 200 + 12 lenses",
            r.status_code == 200 and d.get("n_lenses") == 12,
            f"got {d.get('n_lenses')}")

    # 2. /lenses catalog
    r = client.get("/api/v1/responsible-ai/lenses")
    d = r.json() if r.status_code == 200 else {}
    assert_(f"2. /lenses returns 12 entries",
            d.get("count") == 12, f"got {d.get('count')}")

    # 3. Each lens has required fields
    required = {"id", "name", "icon", "purpose", "library",
                "input", "process", "output", "section_color"}
    lenses = d.get("lenses", [])
    bad = [l for l in lenses if not required.issubset(set(l.keys()))]
    assert_("3. each catalog lens has required fields",
            len(bad) == 0, f"bad={len(bad)}")

    # 4. Materialized for process
    r = client.get("/api/v1/responsible-ai/test-proc/lenses")
    d = r.json() if r.status_code == 200 else {}
    materialized = d.get("lenses", [])
    assert_(f"4. /{{pid}}/lenses returns 12 materialized",
            len(materialized) == 12, f"got {len(materialized)}")

    # 5. Score in [0,1]
    if materialized:
        scores_ok = all(0 <= m.get("score", -1) <= 1 for m in materialized)
        assert_("5. each lens score in [0,1]", scores_ok)
    else:
        assert_("5. each lens score in [0,1]", False, "no lenses")

    # 6. final_outcome valid
    if materialized:
        valid = {"pass", "partial", "fail", "scaffold"}
        outcomes_ok = all(m.get("final_outcome") in valid for m in materialized)
        assert_("6. each lens final_outcome valid", outcomes_ok)
    else:
        assert_("6. each lens final_outcome valid", False, "no lenses")

    # 7. library_state present
    if materialized:
        ls_ok = all("library_state" in m for m in materialized)
        assert_("7. each lens has library_state", ls_ok)
    else:
        assert_("7. each lens has library_state", False, "no lenses")

    # 8. summary_report string
    if materialized:
        sr_ok = all(isinstance(m.get("summary_report"), str) for m in materialized)
        assert_("8. each lens has summary_report string", sr_ok)
    else:
        assert_("8. each lens has summary_report string", False, "no lenses")

    # 9. Single lens
    r = client.get("/api/v1/responsible-ai/test-proc/fairness")
    d = r.json() if r.status_code == 200 else {}
    assert_("9. /{pid}/{lens_id} returns single lens",
            r.status_code == 200 and d.get("id") == "fairness",
            f"got id={d.get('id')}")

    # 10. Invalid lens returns 404
    r = client.get("/api/v1/responsible-ai/test-proc/nonexistent")
    assert_("10. invalid lens returns 404", r.status_code == 404,
            f"http={r.status_code}")

    # 11. Summary report
    r = client.get("/api/v1/responsible-ai/test-proc/summary/report")
    d = r.json() if r.status_code == 200 else {}
    expected_keys = {"process_id", "n_lenses", "passing", "partial", "failing", "scaffold",
                       "libraries_active", "aggregate_score", "per_lens_summary"}
    assert_("11. /summary/report aggregates",
            r.status_code == 200 and expected_keys.issubset(set(d.keys())),
            f"missing={expected_keys - set(d.keys())}")

    print(f"\n  Summary: {11 - fails}/11 pass · {fails} fail")
    print(f"  Reference: §94-adjacent · 12-lens ResAI structure")
    return 0 if fails == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
