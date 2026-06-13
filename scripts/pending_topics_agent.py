#!/usr/bin/env python3
"""sys_pending_topics_consolidator · Iter 81.

CLI agent · consolidates ALL pending topics from missing_items_advisor +
extends with own scans (cron jobs · invocations · audit drift) · prints
operator-readable consolidated view to terminal.

Run:
  python3 scripts/pending_topics_agent.py
  python3 scripts/pending_topics_agent.py --severity P0,P1
  python3 scripts/pending_topics_agent.py --format json
  python3 scripts/pending_topics_agent.py --watch    # refresh every 30s

Per operator brief 2026-06-11 · 'create agent which must consolidate all
the pending topic and showcase on terminal'.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# Set venv path
REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO))
sys.path.insert(0, str(REPO / "backend"))

os.environ.setdefault("BEV_POSTGRES_HOST", "localhost")
os.environ.setdefault("BEV_POSTGRES_PORT", "5434")
os.environ.setdefault("BEV_POSTGRES_USER", "insur_user")
os.environ.setdefault("BEV_POSTGRES_PASSWORD", "insur_secret_password")
os.environ.setdefault("BEV_POSTGRES_DB", "insur_analytics")
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")
os.environ.setdefault("INSUR_DISABLE_PRESIDIO", "1")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")

import logging
logging.disable(logging.CRITICAL)

# ANSI colors
class C:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    RED = "\033[31m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    MAGENTA = "\033[35m"
    CYAN = "\033[36m"
    GREY = "\033[90m"
    BG_RED = "\033[41m"
    BG_YELLOW = "\033[43m"
    BG_GREEN = "\033[42m"


SEV_STYLE = {
    "P0": (C.BG_RED + C.BOLD, "P0 CRITICAL"),
    "P1": (C.RED, "P1 HIGH    "),
    "P2": (C.YELLOW, "P2 MEDIUM  "),
    "P3": (C.GREY, "P3 LOW     "),
}


def scan_via_advisor() -> dict:
    """Run the advisor agent · returns its findings.

    Iter 95.3 · prefer HTTP against the already-running backend (5-6s) over
    in-process TestClient (~18s · FastAPI app init at 1059 routes is the
    expensive part). Falls back to TestClient if the backend is unreachable
    so the agent still works during cold boot or in CI without a server.
    """
    import urllib.request
    import urllib.error
    import json as _json
    backend_url = os.environ.get("INSUR_BACKEND_URL", "http://localhost:8001")
    try:
        req = urllib.request.Request(
            f"{backend_url}/api/v1/missing-items-advisor/scan",
            method="POST", data=b"{}",
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            return _json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, OSError, TimeoutError, _json.JSONDecodeError):
        # Best-effort fallback for cold boot or CI · §57.7 honest
        from main import create_app
        from fastapi.testclient import TestClient
        c = TestClient(create_app())
        r = c.post("/api/v1/missing-items-advisor/scan")
        return r.json()


def extra_scans() -> list[dict]:
    """Extend with own scans: cron jobs · ollama status · platform vitals."""
    findings = []
    import psycopg2
    cx = psycopg2.connect(host='localhost', port=5434, user='insur_user',
                          password='insur_secret_password', dbname='insur_analytics')

    # Watchdog activity (last hour) — accept both trigger_kind='watchdog'
    # AND the canonical cron prefix 'cron-watchdog' that the autonomous loop emits.
    # Also fall back to agent_id LIKE 'sys_watchdog%%' so a renamed trigger_kind
    # doesn't silently produce a false-positive P1 finding (root-cause fixed
    # 2026-06-11 per §142+§57.7 honest reporting).
    with cx, cx.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) FROM agent_invocation
            WHERE (trigger_kind IN ('watchdog','cron-watchdog')
                   OR agent_id LIKE 'sys_watchdog%%')
              AND created_at > NOW() - INTERVAL '1 hour'
        """)
        wd = cur.fetchone()[0]
        if wd == 0:
            findings.append({
                "severity": "P1", "category": "Platform vital",
                "topic": "Watchdog cron silent",
                "what_missing": "0 watchdog invocations in last hour",
                "advice": "Check cron · `crontab -l | grep watchdog`",
                "effort": "5min diagnosis",
            })
        cur.execute("""
            SELECT COUNT(*) FROM agent_invocation WHERE created_at > NOW() - INTERVAL '24 hours'
        """)
        n24 = cur.fetchone()[0]

        # Stale agents · was used historically · now silent 14d.
        # Never-invoked rows excluded — those are §63/§64 org-structure
        # scaffold seeded by global-ai-org generator · not operational stale.
        cur.execute("""
            SELECT ar.agent_id FROM agent_registry ar
            WHERE ar.status='Active'
              AND EXISTS (SELECT 1 FROM agent_invocation ai WHERE ai.agent_id=ar.agent_id)
              AND NOT EXISTS (
                SELECT 1 FROM agent_invocation ai
                WHERE ai.agent_id=ar.agent_id AND ai.created_at > NOW() - INTERVAL '14 days'
              )
            LIMIT 5
        """)
        stale_sample = [r[0] for r in cur.fetchall()]
        if stale_sample:
            findings.append({
                "severity": "P3", "category": "Workforce hygiene",
                "topic": "Stale active agents",
                "what_missing": f"≥{len(stale_sample)} Active agents · used historically · silent 14d",
                "items": stale_sample,
                "advice": "Consider retiring or merging · per §103 workforce mgmt",
                "effort": "Review · then bulk UPDATE status='Retired'",
            })

        # Cron health
        cur.execute("""
            SELECT COUNT(*) FROM agent_invocation
            WHERE trigger_kind='ui-tracer' AND created_at > NOW() - INTERVAL '7 days'
        """)
        ui_7d = cur.fetchone()[0]

    cx.close()

    # Uncommitted real-code changes · §106 auto-loop blind-spot closer.
    # The auto-loop reports "stable · 0 actionable" by reading backend
    # gap-finders only · it doesn't see git status. This scan adds:
    #   - count of *real* code/doc files modified (excluding runtime churn)
    #   - if > 0 · P2 finding so the operator (or §106) knows to commit
    # Runtime churn exclusions:
    #   data/prompt-history.md (§21 tracker), data/work_tracker/* (cron),
    #   data/registry/workforce_health.json (cron-rollup),
    #   .agent/* (§50 dispatcher audit append),
    #   jobs/ (audit reports · mostly gitignored anyway),
    #   data/insurance/*.docx (regen · same byte count),
    #   config/*.json with only _generated timestamp delta.
    import subprocess as _sp
    uncommitted_count = 0
    uncommitted_sample = []
    try:
        out = _sp.run(["git", "diff", "--name-only", "HEAD"],
                       cwd=str(REPO), capture_output=True, text=True, timeout=10)
        if out.returncode == 0:
            churn_prefixes = (
                "data/prompt-history.md",
                "data/work_tracker/",
                "data/registry/workforce_health.json",
                ".agent/",
                "jobs/",
                "data/insurance/",
                "config/",
            )
            for line in out.stdout.splitlines():
                line = line.strip()
                if not line:
                    continue
                if any(line.startswith(p) for p in churn_prefixes):
                    continue
                uncommitted_count += 1
                if len(uncommitted_sample) < 5:
                    uncommitted_sample.append(line)
    except Exception:
        pass  # best-effort · §57.7 honest (no fabrication)

    if uncommitted_count > 0:
        findings.append({
            "severity": "P2",
            "category": "Workflow hygiene",
            "topic": "Uncommitted real-code changes",
            "what_missing": f"{uncommitted_count} non-runtime file(s) modified but not committed",
            "items": uncommitted_sample,
            "advice": "Review with `git diff` then commit (or stash) — see §57.7 + §51",
            "effort": "≤10min per file · usually parallel-session edits",
        })

    return findings, {
        "invocations_24h": n24,
        "watchdog_1h": wd,
        "ui_traces_7d": ui_7d,
        "uncommitted_real_files": uncommitted_count,
    }


def render_terminal(report: dict, sev_filter: set | None = None):
    """Print operator-readable consolidated view."""
    findings = report["findings"]
    if sev_filter:
        findings = [f for f in findings if f["severity"] in sev_filter]

    width = min(120, os.get_terminal_size().columns if sys.stdout.isatty() else 120)

    # Header
    print()
    print(C.BOLD + "═" * width + C.RESET)
    print(C.BOLD + f"  CONSOLIDATED PENDING TOPICS · sys_pending_topics_consolidator".ljust(width) + C.RESET)
    print(C.BOLD + "═" * width + C.RESET)
    s = report["summary"]
    print(f"  {C.DIM}Scanned at:{C.RESET} {report['scanned_at']}")
    print(f"  {C.BOLD}TOTAL:{C.RESET} {s['total']}   "
          f"{C.BG_RED + C.BOLD}P0={s['P0_critical']}{C.RESET}   "
          f"{C.RED}P1={s['P1_high']}{C.RESET}   "
          f"{C.YELLOW}P2={s['P2_medium']}{C.RESET}   "
          f"{C.GREY}P3={s['P3_low']}{C.RESET}")
    if "vitals" in report:
        v = report["vitals"]
        print(f"  {C.CYAN}Vitals · 24h:{C.RESET} {v['invocations_24h']} invocations  "
              f"{C.CYAN}watchdog 1h:{C.RESET} {v['watchdog_1h']}  "
              f"{C.CYAN}ui-traces 7d:{C.RESET} {v['ui_traces_7d']}")

    print()
    # Group by category
    by_cat = {}
    for f in findings:
        by_cat.setdefault(f["category"], []).append(f)
    for cat in sorted(by_cat.keys()):
        rows = by_cat[cat]
        print(C.BOLD + C.BLUE + f"  ▸ {cat}  ({len(rows)})" + C.RESET)
        for f in rows:
            style, label = SEV_STYLE.get(f["severity"], ("", f["severity"]))
            topic = f["topic"][:36].ljust(36)
            what = f["what_missing"][:55].ljust(55)
            print(f"    {style}{label}{C.RESET}  {topic}  {C.DIM}{what}{C.RESET}")
            advice = f.get("advice", "")[:width-10]
            if advice:
                print(f"        {C.DIM}↳ {advice}{C.RESET}")
        print()

    # Roadmap
    print(C.BOLD + "─" * width + C.RESET)
    print(C.BOLD + "  ROADMAP" + C.RESET)
    print(C.BOLD + "─" * width + C.RESET)
    print(f"  {C.GREEN}Quick wins (P0+P1 · fast close):{C.RESET}")
    quick = [f for f in findings if f["severity"] in ("P0", "P1")][:5]
    for i, f in enumerate(quick, 1):
        print(f"    {i}. {f['topic']:<35} · {f['what_missing'][:50]}")
    print()
    print(f"  {C.YELLOW}Medium effort (P2):{C.RESET}")
    medium = [f for f in findings if f["severity"] == "P2"][:3]
    for i, f in enumerate(medium, 1):
        print(f"    {i}. {f['topic']:<35} · {f['what_missing'][:50]}")
    print()
    print(C.BOLD + "═" * width + C.RESET)
    print()


def main():
    ap = argparse.ArgumentParser(description="Consolidate pending topics · terminal view")
    ap.add_argument("--severity", default="all",
                    help="Comma-separated · e.g. P0,P1 or 'all' (default)")
    ap.add_argument("--format", choices=["terminal", "json", "markdown"],
                    default="terminal", help="Output format")
    ap.add_argument("--watch", type=int, default=0,
                    help="Refresh every N seconds (0 = once)")
    args = ap.parse_args()

    sev_filter = None if args.severity == "all" else set(args.severity.split(","))

    def run_once():
        advisor = scan_via_advisor()
        extra, vitals = extra_scans()
        merged = {
            "agent": "sys_pending_topics_consolidator",
            "scanned_at": datetime.now(timezone.utc).isoformat(),
            "findings": advisor["findings"] + extra,
            "summary": {
                "P0_critical": sum(1 for f in advisor["findings"] + extra if f["severity"] == "P0"),
                "P1_high":     sum(1 for f in advisor["findings"] + extra if f["severity"] == "P1"),
                "P2_medium":   sum(1 for f in advisor["findings"] + extra if f["severity"] == "P2"),
                "P3_low":      sum(1 for f in advisor["findings"] + extra if f["severity"] == "P3"),
                "total":       len(advisor["findings"] + extra),
            },
            "vitals": vitals,
        }
        if args.format == "json":
            print(json.dumps(merged, indent=2, default=str))
        elif args.format == "markdown":
            print(f"# Pending Topics · {datetime.now(timezone.utc).isoformat()}\n")
            print(f"**Total**: {merged['summary']['total']}\n")
            by_cat = {}
            for f in merged['findings']:
                by_cat.setdefault(f['category'], []).append(f)
            for cat, rows in sorted(by_cat.items()):
                print(f"## {cat}\n")
                for f in rows:
                    print(f"- **[{f['severity']}]** {f['topic']} — {f['what_missing']}")
                    print(f"  - _advice_: {f.get('advice','')}")
                print()
        else:
            render_terminal(merged, sev_filter)
        return merged

    if args.watch > 0:
        try:
            while True:
                # Clear screen
                if sys.stdout.isatty():
                    print("\033[2J\033[H", end="")
                run_once()
                print(C.DIM + f"  Watching · refresh in {args.watch}s · Ctrl-C to exit" + C.RESET)
                time.sleep(args.watch)
        except KeyboardInterrupt:
            print("\n  Stopped.")
    else:
        run_once()


if __name__ == "__main__":
    main()
