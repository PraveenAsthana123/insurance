#!/usr/bin/env python3
"""Cron-driven agentic coverage loop · Iter 45.

Discovers every non-agentic backend router and registers it as a
System Agent in agent_registry · idempotent.

Runs:
  manual:  python3 scripts/agentic_coverage_loop.py
  cron:    every 6 hours · INSUR-AGENTIC-COVERAGE tag

Output:
  jobs/reports/agentic-coverage/coverage-YYYYMMDD_HHMM.md (markdown)
  jobs/reports/agentic-coverage/coverage-YYYYMMDD_HHMM.json (machine)
"""
import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO))
sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")
os.environ.setdefault("INSUR_DISABLE_PRESIDIO", "1")
logging.disable(logging.CRITICAL)

REPORTS = REPO / "jobs/reports/agentic-coverage"
REPORTS.mkdir(parents=True, exist_ok=True)


def main() -> int:
    from agentic_adapter.registrar import run_coverage_loop, coverage_stats

    ts = datetime.now(timezone.utc)
    print(f"Agentic coverage loop · {ts:%Y-%m-%d %H:%M:%S} UTC")

    # 1. Stats before
    before = coverage_stats()
    print(f"  Before: {before['agents']['system_agents']} system agents · "
          f"{before['skills']['system_skills']} system skills · "
          f"coverage={before['coverage_pct']}%")

    # 2. Run the loop
    result = run_coverage_loop()
    print(f"  Scanned {result['n_routers_scanned']} non-agentic routers")
    print(f"  Registered {result['n_agents_registered']} agents · "
          f"{result['total_skills_registered']} skills added")
    if result['n_failed']:
        print(f"  ⚠ {result['n_failed']} failed")
    if result['n_skipped']:
        print(f"  ⤴ {result['n_skipped']} skipped")

    # 3. Stats after
    after = coverage_stats()
    print(f"  After:  {after['agents']['system_agents']} system agents · "
          f"{after['skills']['system_skills']} system skills · "
          f"coverage={after['coverage_pct']}%")

    # 4. Write reports
    json_path = REPORTS / f"coverage-{ts:%Y%m%d_%H%M}.json"
    md_path   = REPORTS / f"coverage-{ts:%Y%m%d_%H%M}.md"
    json_path.write_text(json.dumps({
        "timestamp": ts.isoformat(),
        "before": before, "result": result, "after": after,
    }, indent=2, default=str))

    md = [
        f"# Agentic Coverage Run · {ts:%Y-%m-%d %H:%M:%S} UTC",
        "",
        f"- Non-agentic routers scanned: **{result['n_routers_scanned']}**",
        f"- System agents registered (cumulative): **{after['agents']['system_agents']}**",
        f"- System skills registered (cumulative): **{after['skills']['system_skills']}**",
        f"- Business agents (the 100 seeded): {after['agents']['business_agents']}",
        f"- **Coverage: {after['coverage_pct']}%**",
        "",
        "## Per-category system agents",
        "| Category | Count |",
        "|---|---|",
    ]
    for cat in after.get("system_agents_by_category", []):
        md.append(f"| {cat['category']} | {cat['n']} |")
    md.append("")
    md.append("## Latest run detail")
    md.append("| Module | Agent ID | Endpoints | Skills | Category |")
    md.append("|---|---|---|---|---|")
    for r in result["results"][:60]:
        md.append(f"| {r.get('module','')} | `{r.get('agent_id','')}` | "
                  f"{r.get('n_endpoints','—')} | {r.get('n_skills_registered',0)} | "
                  f"{r.get('category','')} |")
    if len(result["results"]) > 60:
        md.append(f"| ... | (+{len(result['results']) - 60} more) | | | |")
    md_path.write_text("\n".join(md))

    print(f"  Report → {md_path.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
