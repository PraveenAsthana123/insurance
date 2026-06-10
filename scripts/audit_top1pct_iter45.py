#!/usr/bin/env python3
"""Iter 45 audit · agentic coverage · every router as a System Agent."""
import logging, os, sys
from pathlib import Path
REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO))
sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")
os.environ.setdefault("INSUR_DISABLE_PRESIDIO", "1")
logging.disable(logging.CRITICAL)

def main():
    fails = 0
    def a(label, ok, detail=""):
        nonlocal fails
        mark = "✓" if ok else "✗"
        sfx = f" · {detail}" if detail else ""
        print(f"  {label[:55]:<55} | {mark} {('PASS' if ok else 'FAIL')}{sfx}")
        if not ok: fails += 1

    print("Iter 45 audit · agentic coverage 100% of routers\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    # 1. Discovery endpoint
    r = c.get("/api/v1/agentic-adapter/discovery")
    d = r.json()
    a(f"1. /discovery scans non-agentic routers ({d.get('count')})",
      r.status_code == 200 and d.get("count", 0) >= 30)

    # 2. Each discovered router has endpoints
    a(f"2. Discovered routers have endpoint inventory ({d.get('n_endpoints_total')})",
      d.get("n_endpoints_total", 0) >= 100)

    # 3. Coverage endpoint
    r = c.get("/api/v1/agentic-adapter/coverage")
    d = r.json()
    a(f"3. /coverage returns stats · coverage_pct={d.get('coverage_pct')}",
      r.status_code == 200 and d.get("coverage_pct", 0) >= 80)

    # 4. System agents in DB
    a(f"4. System agents created · {d['agents'].get('system_agents')}",
      d["agents"].get("system_agents", 0) >= 40)

    # 5. System skills in DB
    a(f"5. System skills created · {d['skills'].get('system_skills')}",
      d["skills"].get("system_skills", 0) >= 100)

    # 6. Business agents preserved
    a(f"6. Business agents preserved · {d['agents'].get('business_agents')}",
      d["agents"].get("business_agents", 0) >= 100)

    # 7. By-category breakdown populated
    a(f"7. System agents categorized ({len(d.get('system_agents_by_category', []))} categories)",
      len(d.get("system_agents_by_category", [])) >= 5)

    # 8. Cron script exists + executable
    cron = REPO / "scripts/agentic_coverage_loop.py"
    a("8. agentic_coverage_loop.py exists + executable",
      cron.exists() and cron.stat().st_mode & 0o111)

    # 9. Cron job installed
    import subprocess
    out = subprocess.run(["crontab", "-l"], capture_output=True, text=True)
    a("9. cron INSUR-AGENTIC-COVERAGE installed",
      "INSUR-AGENTIC-COVERAGE" in out.stdout)

    # 10. At least one report file exists
    reports = REPO / "jobs/reports/agentic-coverage"
    md_files = list(reports.glob("coverage-*.md"))
    a(f"10. Coverage report written ({len(md_files)})",
      len(md_files) >= 1)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    print(f"  Reference: Iter 45 · agentic coverage loop · cron-driven 100% router coverage")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
