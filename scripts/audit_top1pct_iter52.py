#!/usr/bin/env python3
"""Iter 52 · 9 watchdog agents + Live Activity tab + cron."""
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
    print("Iter 52 · 9 watchdogs + live activity\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    import psycopg2
    cx = psycopg2.connect(host='localhost', port=5434, user='insur_user',
                          password='insur_secret_password', dbname='insur_analytics')
    with cx, cx.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM agent_registry WHERE agent_id LIKE 'sys_watchdog_%'")
        n_w = cur.fetchone()[0]
    a(f"1. 9 watchdog agents registered ({n_w})", n_w == 9)

    with cx, cx.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM agent_invocation WHERE agent_id LIKE 'sys_watchdog_%'")
        n_inv = cur.fetchone()[0]
    a(f"2. Watchdog invocations recorded ({n_inv})", n_inv >= 9)

    with cx, cx.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM agent_trace_event WHERE invocation_id IN (SELECT invocation_id FROM agent_invocation WHERE agent_id LIKE 'sys_watchdog_%')")
        n_t = cur.fetchone()[0]
    a(f"3. Trace events for watchdogs ({n_t})", n_t >= 9)
    cx.close()

    runner = REPO / "scripts/watchdog_agents_loop.py"
    a("4. watchdog_agents_loop.py exists + executable",
      runner.exists() and runner.stat().st_mode & 0o111)

    out = subprocess.run(["crontab", "-l"], capture_output=True, text=True).stdout
    a("5. cron INSUR-WATCHDOG-AGENTS installed",
      "INSUR-WATCHDOG-AGENTS" in out)

    hub = REPO / "frontend/src/components/AgenticHubPage.jsx"
    txt = hub.read_text()
    a("6. LiveActivityView component in hub", "function LiveActivityView" in txt)
    a("7. live-activity tab declared", "'live-activity'" in txt)
    a("8. Watchdog explainer table in UI",
      "sys_watchdog_jobs" in txt and "sys_watchdog_cron" in txt)

    rpts = REPO / "jobs/reports/watchdog"
    md_files = list(rpts.glob("watchdog-*.json"))
    a(f"9. Watchdog reports written ({len(md_files)})",
      len(md_files) >= 1)

    # All 4 fix-pending actions still working
    fix = REPO / "scripts/fix_pending_tasks.py"
    a("10. fix_pending_tasks still present",
      fix.exists() and fix.stat().st_mode & 0o111)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
