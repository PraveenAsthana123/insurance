#!/usr/bin/env python3
"""Top-1% Iteration 7-10 audit · final P0 items closure.

10 assertions:
  1. /run returns sample_rows array
  2. sample_rows have 10 items
  3. sample has columns + size
  4. /api/v1/responsible-ai/{pid}/{lens}/timeseries returns series
  5. timeseries has 30 days
  6. timeseries returns drift_delta + drift_alert
  7. /api/v1/use-cases/{pid} accepts POST update
  8. POST updates completeness_score
  9. ResponsibleAIPanel + AutomaticPipelinePanel + UseCasePanel files have new features
 10. TimeSeriesLine + 4 chart utils exist
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

    print("Top-1% iteration 7-10 audit · final P0 closure\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    # 1-3. Sample preview
    r = c.post("/api/v1/data-pipeline/test-proc/smote-balance/run")
    d = r.json()
    a("1. /run returns sample_rows array", "sample_rows" in d)
    a(f"2. sample_rows has 10 items ({len(d.get('sample_rows', []))})",
      len(d.get("sample_rows", [])) == 10)
    a(f"3. sample has columns ({len(d.get('sample_columns', []))}) + size",
      "sample_columns" in d and "sample_size" in d)

    # 4-6. Timeseries
    r = c.get("/api/v1/responsible-ai/test-proc/fairness/timeseries?days=30")
    d = r.json()
    a("4. /timeseries returns series array",
      r.status_code == 200 and "series" in d)
    a(f"5. timeseries has 30 days ({len(d.get('series', []))})",
      len(d.get("series", [])) == 30)
    a(f"6. timeseries has drift_delta + drift_alert",
      "drift_delta" in d and "drift_alert" in d)

    # 7-8. UseCase POST
    body = {"sections": {"problem": {"as_is_statement": "Iter7 test inline edit"}}}
    r = c.post("/api/v1/use-cases/test-uc-iter7", json=body)
    a(f"7. /use-cases POST accepts (http={r.status_code})",
      r.status_code == 200)
    d = r.json()
    a("8. POST updates completeness_score",
      d.get("completeness_score", 0) >= 1)

    # 9-10. UI components exist
    rai = (REPO / "frontend/src/components/ResponsibleAIPanel.jsx").read_text()
    ap = (REPO / "frontend/src/components/AutomaticPipelinePanel.jsx").read_text()
    uc = (REPO / "frontend/src/components/UseCasePanel.jsx").read_text()
    a("9. ResAI has LensTimeseries + AP has compareWith + UC has Edit btn",
      "LensTimeseries" in rai and "compareWith" in ap and "✎ Edit" in uc)

    ts = REPO / "frontend/src/components/charts/TimeSeriesLine.jsx"
    cm = REPO / "frontend/src/components/charts/ConfusionMatrixHeatmap.jsx"
    bar = REPO / "frontend/src/components/charts/RechartsBarHorizontal.jsx"
    roc = REPO / "frontend/src/components/charts/ROCCurve.jsx"
    a("10. 4 chart utils exist (bar/CM/ROC/timeseries)",
      ts.exists() and cm.exists() and bar.exists() and roc.exists())

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    print(f"  Reference: TOP_1_PCT_PLAN_2026-06-09 · iter 7-10 P0 closure")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
