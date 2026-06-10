#!/usr/bin/env python3
"""Iter 53 · 24 watchdog agents + terminal viewer + UI sync."""
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
    print("Iter 53 · 24 watchdogs + which-working CLI\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    import psycopg2
    cx = psycopg2.connect(host='localhost', port=5434, user='insur_user',
                          password='insur_secret_password', dbname='insur_analytics')
    with cx, cx.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM agent_registry WHERE agent_id LIKE 'sys_watchdog_%'")
        n = cur.fetchone()[0]
    a(f"1. 24 watchdog agents registered ({n})", n >= 24)

    with cx, cx.cursor() as cur:
        cur.execute("""
            SELECT COUNT(DISTINCT agent_id) FROM agent_invocation
            WHERE agent_id LIKE 'sys_watchdog_%'
              AND created_at > NOW() - INTERVAL '1 hour'
        """)
        n = cur.fetchone()[0]
    a(f"2. Watchdog agents active in last hour ({n})", n >= 9)

    # Per-category coverage
    with cx, cx.cursor() as cur:
        cur.execute("""
            SELECT business_domain, COUNT(*) FROM agent_registry
            WHERE agent_id LIKE 'sys_watchdog_%' GROUP BY business_domain
        """)
        cats = dict(cur.fetchall())
    expected_cats = ['Scalability', 'Performance', 'Security', 'PII',
                     'Tokens', 'Embedding', 'Supervise', 'MCP']
    missing = [c for c in expected_cats if c not in cats]
    a(f"3. All operator-asked categories registered (missing={len(missing)})",
      not missing)
    cx.close()

    cli = REPO / "scripts/which_working.py"
    a("4. which_working.py exists + executable",
      cli.exists() and cli.stat().st_mode & 0o111)

    insur = (REPO / "scripts/insur").read_text()
    a("5. ./scripts/insur which-working subcommand wired",
      "cmd_which_working" in insur and "which-working)" in insur)
    a("6. ./scripts/insur watchdog subcommand wired",
      "cmd_watchdog" in insur)

    out = subprocess.run(["crontab", "-l"], capture_output=True, text=True).stdout
    a("7. cron INSUR-WATCHDOG-AGENTS still installed",
      "INSUR-WATCHDOG-AGENTS" in out)

    # Run the terminal viewer · should exit 0
    r = subprocess.run([str(REPO / "scripts/which_working.py")],
                       env={**os.environ, "BEV_POSTGRES_HOST": "localhost",
                            "BEV_POSTGRES_PORT": "5434",
                            "BEV_POSTGRES_USER": "insur_user",
                            "BEV_POSTGRES_PASSWORD": "insur_secret_password",
                            "BEV_POSTGRES_DB": "insur_analytics"},
                       capture_output=True, text=True, timeout=10)
    a(f"8. which-working returns 0 (got {r.returncode})", r.returncode == 0)
    a("9. which-working prints rollup header",
      "Last 24h · who is working" in r.stdout)
    a("10. which-working prints recent feed", "Recent" in r.stdout)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
