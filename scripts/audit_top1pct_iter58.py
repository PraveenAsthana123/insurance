#!/usr/bin/env python3
"""Iter 58 · challenges + plans + tools catalog."""
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
    print("Iter 58 · challenges & plans catalog\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    r = c.get("/api/v1/challenges-catalog/health")
    d = r.json()
    a(f"1. /health 7 categories ({d.get('n_categories')})",
      d.get("n_categories") == 7)
    a(f"2. ≥35 challenges total ({d.get('n_challenges_total')})",
      d.get("n_challenges_total") >= 35)
    a(f"3. ≥14 tools ({d.get('n_tools')})", d.get("n_tools") >= 14)
    a(f"4. ≥9 plans ({d.get('n_plans')})", d.get("n_plans") >= 9)

    r = c.get("/api/v1/challenges-catalog/by-category")
    d = r.json()
    expected = ["frontend", "api", "data", "mcp", "output", "accuracy", "benchmarking"]
    missing = [e for e in expected if e not in d.get("categories", {})]
    a(f"5. All 7 categories present (missing={len(missing)})", not missing)

    r = c.get("/api/v1/challenges-catalog/by-severity")
    a(f"6. Critical severities exist ({len(r.json()['by_severity'].get('Critical', []))})",
      len(r.json()["by_severity"].get("Critical", [])) >= 5)

    r = c.get("/api/v1/challenges-catalog/tools")
    tools = r.json()["tools"]
    expected_tools = {"pybreaker", "Istio", "Kiali", "Temporal", "SonarQube",
                       "CUA", "Stagehand", "Playwright", "gRPC"}
    have = {t["tool"] for t in tools}
    a(f"7. All 9 operator-named tools listed (missing={len(expected_tools - have)})",
      not (expected_tools - have))

    r = c.get("/api/v1/challenges-catalog/plans")
    plans = r.json()["plans"]
    expected_plans = {"mitigation_plan", "agent_plan", "solution_plan", "cron_plan",
                      "tracking_plan", "tracing_plan", "system_crash_plan",
                      "prompt_saving_plan", "prompt_showcasing_plan"}
    have_p = set(plans.keys())
    a(f"8. All 9 operator-named plans declared (missing={len(expected_plans - have_p)})",
      not (expected_plans - have_p))

    hub = (REPO / "frontend/src/components/AgenticHubPage.jsx").read_text()
    a("9. ChallengesView in hub UI", "function ChallengesView" in hub)
    a("10. challenges tab in HUB_TABS", "'challenges'" in hub)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
