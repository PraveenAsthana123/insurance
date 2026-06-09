#!/usr/bin/env python3
"""Top-1% Iteration 2-6 audit · charts + actions + scaffold.

10 assertions:
  1. /api/v1/ml/shap/{model} returns features array
  2. features have name + importance + direction
  3. /api/v1/ml/eval/{dept}/{process} returns confusion_matrix
  4. confusion_matrix has labels + 2x2 matrix
  5. eval returns roc_curve with points + auc
  6. roc.points have fpr + tpr
  7. /api/v1/data-pipeline/{pid}/{tid}/run returns run_id + outcome
  8. run has library_state probe
  9. invalid task → 404
 10. chart components exist (file probe)
"""
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

    print("Top-1% iteration 2-6 audit · charts + actions\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    # 1. SHAP
    r = c.get("/api/v1/ml/shap/test")
    d = r.json()
    a(f"1. /ml/shap/{{m}} returns {len(d.get('features', []))} features",
      r.status_code == 200 and len(d.get("features", [])) > 0)

    # 2. Feature structure
    feats = d.get("features", [])
    if feats:
        f0 = feats[0]
        a("2. features have name + importance + direction",
          all(k in f0 for k in ["name", "importance", "direction"]))
    else:
        a("2. features structure", False, "empty")

    # 3-5. Eval
    r = c.get("/api/v1/ml/eval/test/proc")
    d = r.json()
    cm = d.get("confusion_matrix") or {}
    roc = d.get("roc_curve") or {}
    a("3. eval returns confusion_matrix",
      r.status_code == 200 and "matrix" in cm)
    a(f"4. confusion_matrix is 2x2 (rows={len(cm.get('matrix', []))})",
      len(cm.get("matrix", [])) == 2 and all(len(row) == 2 for row in cm.get("matrix", [])))
    a(f"5. roc_curve has points + auc ({roc.get('auc')})",
      "points" in roc and "auc" in roc)
    a(f"6. roc.points have fpr+tpr ({len(roc.get('points', []))} pts)",
      all("fpr" in p and "tpr" in p for p in roc.get("points", [])))

    # 7-8. Run task
    r = c.post("/api/v1/data-pipeline/test-proc/smote-balance/run")
    d = r.json()
    a("7. /run returns run_id + outcome",
      r.status_code == 200 and "run_id" in d and "outcome" in d,
      f"http={r.status_code}")
    a("8. run has library_state probe",
      "library_state" in d)

    # 9. Invalid task → 404
    r = c.post("/api/v1/data-pipeline/test-proc/nonexistent-task/run")
    a("9. invalid task → 404", r.status_code == 404, f"http={r.status_code}")

    # 10. Chart components exist
    cm_path = REPO / "frontend/src/components/charts/ConfusionMatrixHeatmap.jsx"
    bar_path = REPO / "frontend/src/components/charts/RechartsBarHorizontal.jsx"
    roc_path = REPO / "frontend/src/components/charts/ROCCurve.jsx"
    a("10. 3 chart components exist",
      cm_path.exists() and bar_path.exists() and roc_path.exists())

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    print(f"  Reference: TOP_1_PCT_PLAN_2026-06-09 · iter 2-6")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
