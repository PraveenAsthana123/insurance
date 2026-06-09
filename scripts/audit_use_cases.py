#!/usr/bin/env python3
"""Use Case audit · §94 process-use-case-mandatory-structure.

Per ~/.claude/policies/process-use-case-mandatory-structure.md §94.4.

11 assertions:
  1. /use-cases/health 200 + section_groups + 17 total
  2. /use-cases lists ≥ 1 use case
  3. /use-cases/{process_id} returns 5-part structure
  4. Part A.problem has 3 sub-sections (as_is, sub_problems, impact)
  5. Part A.impact has 4 quantified axes (time/cost/productivity/$)
  6. Part B.solution has 4 sub-sections
  7. Part B.ai_options is a scored list (relevance/cost/time/risk)
  8. Part C.analysis has 4 sub-sections (swot/first_principles/ai_capabilities/end_to_end_steps)
  9. Part D.data has data_types list + goal_achievement
 10. Part E.transformation has 4P + six_sigma_bpm + stakeholders + kpi_roi_value
 11. /score returns 0-17 + missing list
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
    print("Use Case audit · §94 (17-section structure)\n")
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

    # 1. /health
    r = client.get("/api/v1/use-cases/health")
    d = r.json() if r.status_code == 200 else {}
    assert_("1. /health 200 + 17 sections in groups",
            r.status_code == 200 and d.get("total_sections") == 17
            and set(d.get("section_groups", {}).keys()) == set("ABCDE"),
            f"http={r.status_code}")

    # 2. List
    r = client.get("/api/v1/use-cases")
    d = r.json() if r.status_code == 200 else {}
    assert_("2. /use-cases lists ≥ 1 process",
            d.get("count", 0) >= 1, f"count={d.get('count')}")

    # 3. Specific use case structure
    r = client.get("/api/v1/use-cases/fraud-ring-detection")
    uc = r.json() if r.status_code == 200 else {}
    expected_parts = {"problem", "solution", "analysis", "data", "transformation"}
    actual_parts = set(uc.keys()) & expected_parts
    assert_("3. /use-cases/{id} returns 5-part structure",
            actual_parts == expected_parts,
            f"got {sorted(actual_parts)}")

    # 4. Part A
    p = uc.get("problem", {})
    expected_a = {"as_is_statement", "sub_problems", "impact"}
    assert_("4. Part A has 3 sub-sections",
            set(p.keys()) == expected_a, f"got {set(p.keys())}")

    # 5. Impact 4 axes
    impact = p.get("impact") or {}
    axes = {"time_hrs_per_week", "cost_per_year_usd", "productivity_pct_loss", "dollar_value_at_risk_usd"}
    assert_("5. impact has 4 axes (time/cost/prod/$)",
            set(impact.keys()) >= axes,
            f"missing={axes - set(impact.keys())}")

    # 6. Part B
    sol = uc.get("solution", {})
    expected_b = {"to_be_narrative", "ai_options", "flowchart_mermaid", "journey_flow"}
    assert_("6. Part B has 4 sub-sections",
            set(sol.keys()) == expected_b)

    # 7. AI options scored
    ai_opts = sol.get("ai_options") or []
    if ai_opts:
        first = ai_opts[0]
        scored = all(k in first for k in ["name", "relevance", "cost", "time", "risk"])
        assert_(f"7. ai_options is scored list ({len(ai_opts)} options)",
                scored)
    else:
        assert_("7. ai_options is scored list", False, "empty")

    # 8. Part C
    a = uc.get("analysis", {})
    expected_c = {"swot", "first_principles", "ai_capabilities", "end_to_end_steps"}
    assert_("8. Part C has 4 sub-sections",
            set(a.keys()) == expected_c)

    # 9. Part D
    d_section = uc.get("data", {})
    assert_("9. Part D has data_types + goal_achievement",
            "data_types" in d_section and "goal_achievement" in d_section)

    # 10. Part E
    t = uc.get("transformation", {})
    expected_e = {"four_p", "six_sigma_bpm", "stakeholders", "kpi_roi_value"}
    assert_("10. Part E has 4P+SixSigma+stakeholders+KPI/ROI",
            set(t.keys()) == expected_e)

    # 11. Score endpoint
    r = client.get("/api/v1/use-cases/fraud-ring-detection/score")
    s = r.json() if r.status_code == 200 else {}
    assert_(f"11. /score · completeness {s.get('completeness_score')}/17 · {s.get('completeness_pct')}%",
            r.status_code == 200 and s.get("completeness_score") is not None
            and "missing_sections" in s,
            f"got {list(s.keys())}")

    print(f"\n  Summary: {11 - fails}/11 pass · {fails} fail")
    print(f"  Reference: §94 process-use-case-mandatory-structure")
    return 0 if fails == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
