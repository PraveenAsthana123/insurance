#!/usr/bin/env python3
"""Iter 47 · test agents + pipeline catalog + Ollama runner."""
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
    print("Iter 47 audit · test agents + pipelines + Ollama runner\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    r = c.get("/api/v1/test-catalog/stats")
    d = r.json()
    a(f"1. /test-catalog/stats · n_test_agents={d.get('n_test_agents')}",
      r.status_code == 200 and d.get("n_test_agents", 0) >= 12)
    a(f"2. n_pipeline_categories={d.get('n_pipeline_categories')}",
      d.get("n_pipeline_categories", 0) >= 6)
    a(f"3. n_pipelines_total={d.get('n_pipelines_total')}",
      d.get("n_pipelines_total", 0) >= 20)
    a(f"4. n_responsibility_rows={d.get('n_responsibility_rows')}",
      d.get("n_responsibility_rows", 0) >= 14)

    r = c.get("/api/v1/test-catalog/pipelines")
    a("5. /pipelines categorized (inference/training/data/testing/fallback/job_queue)",
      r.status_code == 200 and all(k in r.json()["categories"] for k in [
        "inference", "training", "data", "testing", "fallback", "job_queue"
      ]))

    r = c.get("/api/v1/test-catalog/top-1pct-plan")
    d = r.json()
    a(f"6. /top-1pct-plan has {len(d.get('phases', []))} phases",
      len(d.get("phases", [])) >= 6)
    a("7. plan declares Ollama as LLM", "Ollama" in d.get("llm", ""))

    r = c.get("/api/v1/test-catalog/test-agents")
    a(f"8. /test-agents lists test_ agents from DB ({r.json().get('count')})",
      r.json().get("count", 0) >= 12)

    a("9. cron INSUR-TOP1PCT-TESTING installed",
      "INSUR-TOP1PCT-TESTING" in subprocess.run(["crontab", "-l"], capture_output=True, text=True).stdout)

    runner = REPO / "scripts/top1pct_testing_pipeline.py"
    a("10. Top-1% testing pipeline runner exists + executable",
      runner.exists() and runner.stat().st_mode & 0o111)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
