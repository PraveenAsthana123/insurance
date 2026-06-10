#!/usr/bin/env python3
"""./scripts/insur status-snapshot · terminal view of all 7 status agents.

Per operator: 'must show on UI AND terminal'.
"""
import os, sys, logging
from pathlib import Path
REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO)); sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")
os.environ.setdefault("INSUR_DISABLE_PRESIDIO", "1")
logging.disable(logging.CRITICAL)


def color(s, c):
    return f"\033[{c}m{s}\033[0m"


def main() -> int:
    from status_agents.router import STATUS_AGENTS

    print(color("══════ Status Snapshot · 7 aggregator agents ══════", "1;36"))
    for fn in STATUS_AGENTS:
        try:
            r = fn()
            # Color-code per status agent's own signal
            badge_c = {"#ef4444": "31", "#f59e0b": "33", "#10b981": "32"}.get(
                r.get("color"), "0")
            label = f"  {color(r['label'].ljust(35), '1')} "
            summary = color(r["summary"], badge_c)
            print(f"{label}{summary}")
        except Exception as e:
            print(f"  ✗ {fn.__name__} · ERROR · {e}")

    # Current number of agents working (per operator "current number of agent working status")
    import psycopg2
    cx = psycopg2.connect(host="localhost", port=5434, user="insur_user",
                          password="insur_secret_password", dbname="insur_analytics")
    with cx, cx.cursor() as cur:
        cur.execute("""
            SELECT
              COUNT(DISTINCT agent_id) FILTER (WHERE created_at > NOW() - INTERVAL '5 minutes') AS active_5m,
              COUNT(DISTINCT agent_id) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') AS active_1h,
              COUNT(DISTINCT agent_id) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS active_24h,
              COUNT(*) FILTER (WHERE status='Running' OR status='PendingApproval') AS in_flight
            FROM agent_invocation
        """)
        r = cur.fetchone()
        cur.execute("SELECT COUNT(*) FROM agent_registry WHERE status='Active'")
        n_total = cur.fetchone()[0]
    cx.close()

    print()
    print(color("══════ Current agents working ══════", "1;36"))
    print(f"  {color('Total registered active:', '1')}   {n_total}")
    print(f"  {color('Worked in last 5 min:', '1')}      {color(str(r[0]), '32')}")
    print(f"  {color('Worked in last 1 hour:', '1')}     {color(str(r[1]), '32')}")
    print(f"  {color('Worked in last 24 hours:', '1')}   {color(str(r[2]), '32')}")
    print(f"  {color('In-flight right now:', '1')}       {color(str(r[3]), '33')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
