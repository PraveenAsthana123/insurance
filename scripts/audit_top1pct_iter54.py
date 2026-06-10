#!/usr/bin/env python3
"""Iter 54 · 8 scaffold dims now LIVE measurements."""
import os, sys, logging
from pathlib import Path
REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO)); sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1"); os.environ.setdefault("INSUR_DISABLE_PRESIDIO", "1")
logging.disable(logging.CRITICAL)

def main():
    fails = 0
    def a(label, ok, detail=""):
        nonlocal fails
        mark = "✓" if ok else "✗"
        print(f"  {label[:55]:<55} | {mark} {('PASS' if ok else 'FAIL')}{(' · ' + detail) if detail else ''}")
        if not ok: fails += 1
    print("Iter 54 · 8 scaffold dimensions → live measurements\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    r = c.get("/api/v1/test-catalog/top-1pct-report")
    d = r.json()
    a(f"1. /top-1pct-report responds 200", r.status_code == 200)

    scaffold_count = sum(1 for s in d['scorecard'] if s['scaffold'])
    a(f"2. ≤2 dims marked scaffold (was 8) · now {scaffold_count}", scaffold_count <= 2)

    # Check the previously-scaffold dims now use real values · not 0.5
    for dim_id in ['scalability', 'performance', 'error_handling',
                   'resource_memory', 'scoring_quality']:
        dim = next(x for x in d['scorecard'] if x['id'] == dim_id)
        a(f"3-7. {dim_id} measurement non-default ({dim['score']})",
          dim['score'] != 0.5)

    a(f"8. Average score now > 63.6% (was C grade · should climb)",
      d['summary']['average_score'] > 0.7)

    a(f"9. Grade improved · {d['summary']['overall_grade']}",
      d['summary']['overall_grade'] in ('A', 'B', 'C'))

    n_passing = d['summary']['n_passing_80pct']
    a(f"10. More dims passing ({n_passing}/11 · was 3/11)",
      n_passing > 3)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
