#!/usr/bin/env python3
"""Top-1% Iter 11-15 audit · P1 batch closure."""
import logging, os, sys
from pathlib import Path
REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO))
sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")
logging.disable(logging.CRITICAL)

def main():
    fails = 0
    def a(label, ok, detail=""):
        nonlocal fails
        mark = "✓" if ok else "✗"
        sfx = f" · {detail}" if detail else ""
        print(f"  {label[:55]:<55} | {mark} {('PASS' if ok else 'FAIL')}{sfx}")
        if not ok: fails += 1

    print("Top-1% iter 11-15 audit · P1 closure batch\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    # 1-3. Model card + promote/rollback (P1 #11 + #14)
    r = c.get("/api/v1/ml/models/test-model/card")
    d = r.json()
    a("1. /models/{m}/card returns model card",
      r.status_code == 200 and "intended_use" in d and "performance" in d)
    a("2. card has performance + fairness + limitations",
      "performance" in d and "fairness" in d and "limitations" in d)

    r = c.post("/api/v1/ml/models/test-model/promote?to_stage=Production")
    d = r.json()
    a("3. /promote moves stage", r.status_code == 200 and d.get("current_stage") == "Production")

    r = c.post("/api/v1/ml/models/test-model/rollback")
    d = r.json()
    a("4. /rollback reverses promotion", r.status_code == 200 and d.get("ok"))

    # 5. Cohort fairness (P1 #13)
    r = c.get("/api/v1/ml/fairness/test-model/cohorts")
    d = r.json()
    a(f"5. /fairness/cohorts returns {len(d.get('cohorts', []))} cohorts",
      r.status_code == 200 and len(d.get("cohorts", [])) >= 5)

    # 6. Counterfactual (P1 #15)
    r = c.get("/api/v1/ml/shap/test-model/counterfactual")
    d = r.json()
    a(f"6. /counterfactual returns {len(d.get('examples', []))} examples",
      r.status_code == 200 and len(d.get("examples", [])) >= 3)
    if d.get("examples"):
        ex = d["examples"][0]
        a("7. counterfactual has minimal+actionable+plausible flags",
          all(k in ex for k in ["minimal", "actionable", "plausible"]))
    else:
        a("7. counterfactual flags", False)

    # 8-9. 12-tier test status (P1 #12)
    r = c.get("/api/v1/test-status/test-proc")
    d = r.json()
    a(f"8. /test-status returns 12 tiers ({len(d.get('tiers', []))})",
      r.status_code == 200 and len(d.get("tiers", [])) == 12)
    a("9. tiers have pass_rate + flaky_count + trend_7d",
      all("pass_rate" in t and "flaky_count" in t and "trend_7d" in t
          for t in d.get("tiers", [])))

    # 10. 4 new panels exist
    panels = [
        REPO / "frontend/src/components/ModelCardPanel.jsx",
        REPO / "frontend/src/components/TestStatusTier12Panel.jsx",
        REPO / "frontend/src/components/CounterfactualPanel.jsx",
        REPO / "frontend/src/components/CohortFairnessPanel.jsx",
    ]
    a("10. 4 new panels exist on disk",
      all(p.exists() for p in panels))

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    print(f"  Reference: TOP_1_PCT_PLAN · P1 #11-15 closure")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
