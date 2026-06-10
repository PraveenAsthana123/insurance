#!/usr/bin/env python3
"""Iter 55 · load test + top-1% achievement."""
import os, sys, logging, subprocess
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
    print("Iter 55 · load test + top-1% achievement\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    runner = REPO / "scripts/load_test_smoke.py"
    a("1. load_test_smoke.py exists + executable",
      runner.exists() and runner.stat().st_mode & 0o111)

    reports = REPO / "jobs/reports/load-testing"
    md_files = list(reports.glob("load-*.md"))
    a(f"2. Load test reports generated ({len(md_files)})",
      len(md_files) >= 1)

    out = subprocess.run(["crontab", "-l"], capture_output=True, text=True).stdout
    a("3. cron INSUR-LOAD-TEST installed", "INSUR-LOAD-TEST" in out)

    insur = (REPO / "scripts/insur").read_text()
    a("4. ./scripts/insur load-test wired", "cmd_load_test" in insur)

    # Scorecard checks
    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())
    d = c.get("/api/v1/test-catalog/top-1pct-report").json()
    s = d["summary"]
    a(f"5. Grade A reached ({s['overall_grade']})", s["overall_grade"] == "A")
    a(f"6. Average score ≥ 95% ({s['average_score']*100:.1f}%)",
      s["average_score"] >= 0.95)
    a(f"7. ≥10/11 dims passing 80% ({s['n_passing_80pct']}/{s['n_dimensions']})",
      s["n_passing_80pct"] >= 10)
    a("8. is_top_1_pct=True", s["is_top_1_pct"])

    # Load testing dim specifically
    load_dim = next(x for x in d["scorecard"] if x["id"] == "load_testing")
    a(f"9. Load testing dim now live · score={load_dim['score']}",
      load_dim["score"] >= 0.5 and not load_dim["scaffold"])

    # No scaffold flags remaining
    n_scaffold = sum(1 for x in d["scorecard"] if x["scaffold"])
    a(f"10. 0 scaffold flags remaining ({n_scaffold})", n_scaffold == 0)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
