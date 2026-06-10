#!/usr/bin/env python3
"""Iter 48 · 11 quality dimensions + Top-1% report + Ollama wired + fix-pending cron."""
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
    print("Iter 48 · 11 quality dims + scorecard + Ollama + fix cron\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    r = c.get("/api/v1/test-catalog/quality-dimensions")
    d = r.json()
    a(f"1. /quality-dimensions returns 11 ({d.get('count')})", d.get("count") == 11)

    r = c.get("/api/v1/test-catalog/benchmarks")
    a(f"2. /benchmarks returns 11 ({r.json().get('count')})", r.json().get("count") == 11)

    r = c.get("/api/v1/test-catalog/scoring")
    a("3. /scoring rubric per dim", "rubric" in r.json() and len(r.json()["rubric"]) == 11)

    r = c.get("/api/v1/test-catalog/top-1pct-report")
    d = r.json()
    a(f"4. /top-1pct-report has scorecard ({len(d.get('scorecard', []))} dims)",
      len(d.get("scorecard", [])) == 11)
    a(f"5. report has summary + overall_grade ({d['summary'].get('overall_grade')})",
      "overall_grade" in d.get("summary", {}))
    a(f"6. report has is_top_1_pct flag", "is_top_1_pct" in d.get("summary", {}))

    # Ollama wiring in llm_client
    llm = (REPO / "backend/agentic_core/llm_client.py").read_text()
    a("7. llm_client.py wires Ollama backend",
      "_ollama_plan" in llm and "_ollama_reachable" in llm and "llama3.2" in llm)

    # fix_pending_tasks script
    fix = REPO / "scripts/fix_pending_tasks.py"
    a("8. fix_pending_tasks.py exists + executable",
      fix.exists() and fix.stat().st_mode & 0o111)

    # cron installed
    out = subprocess.run(["crontab", "-l"], capture_output=True, text=True).stdout
    a("9. cron INSUR-FIX-PENDING-TASKS installed",
      "INSUR-FIX-PENDING-TASKS" in out)

    # Global policy file
    policy = Path.home() / ".claude/policies/agentic-quality-benchmarks.md"
    a("10. Global policy committed (agentic-quality-benchmarks.md)",
      policy.exists() and policy.stat().st_size > 2000)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
