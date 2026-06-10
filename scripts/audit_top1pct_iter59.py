#!/usr/bin/env python3
"""Iter 59 · 7 status aggregator agents · UI + terminal + global policy."""
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
    print("Iter 59 · status agents\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    r = c.get("/api/v1/status-agents/health")
    a(f"1. /health declares 7 agents ({r.json().get('n_agents')})",
      r.json().get("n_agents") == 7)

    r = c.get("/api/v1/status-agents/all")
    d = r.json()
    a(f"2. /all returns 7 agents ({d.get('count')})", d.get("count") == 7)

    ids = [s.get("agent_id") for s in d.get("status_agents", [])]
    expected = ["sys_brutal_feedback", "sys_top1pct_status", "sys_pending_task_tracker",
                "sys_error_status", "sys_testing_status", "sys_scalability_status",
                "sys_load_perf_status"]
    missing = [e for e in expected if e not in ids]
    a(f"3. All 7 operator-named agents present (missing={len(missing)})", not missing)

    # Per-agent fields
    bf = next((s for s in d['status_agents'] if s['agent_id'] == 'sys_brutal_feedback'), {})
    a("4. brutal_feedback has scaffold_dims metric",
      "scaffold_dims" in bf.get("metrics", {}))

    tp = next((s for s in d['status_agents'] if s['agent_id'] == 'sys_top1pct_status'), {})
    a("5. top1pct_status has grade", "grade" in tp.get("metrics", {}))

    es = next((s for s in d['status_agents'] if s['agent_id'] == 'sys_error_status'), {})
    a("6. error_status has 7 categories",
      all(k in es.get("metrics", {}) for k in
          ["api", "data", "frontend", "backend", "model", "accuracy", "integration"]))

    ts = next((s for s in d['status_agents'] if s['agent_id'] == 'sys_testing_status'), {})
    a(f"7. testing_status has pass_pct ({ts.get('metrics', {}).get('pass_pct')})",
      "pass_pct" in ts.get("metrics", {}))

    # Terminal script
    cli = REPO / "scripts/status_snapshot.py"
    a("8. status_snapshot.py exists + executable",
      cli.exists() and cli.stat().st_mode & 0o111)

    # CLI subcommand
    insur = (REPO / "scripts/insur").read_text()
    a("9. ./scripts/insur status-snapshot wired",
      "cmd_status_snapshot" in insur)

    # Global policy
    policy = Path.home() / ".claude/policies/status-aggregator-agents.md"
    a("10. Global policy committed (status-aggregator-agents.md)",
      policy.exists() and policy.stat().st_size > 1500)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
