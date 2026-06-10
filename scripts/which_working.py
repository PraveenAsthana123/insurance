#!/usr/bin/env python3
"""./scripts/insur which-working · terminal view of live per-agent activity.

Per operator brief 'UI and terminal both' + 'which agent working'.
Same data the LiveActivity tab in /agentic uses · rendered as colorized
table for the terminal.
"""
import os, sys
from pathlib import Path
from datetime import datetime, timezone, timedelta

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO)); sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")

import psycopg2
import psycopg2.extras


def color(s, c):
    """ANSI color (works in xterm)."""
    return f"\033[{c}m{s}\033[0m"


STATUS_COLOR = {
    "Success":         "32",  # green
    "Failed":          "31",  # red
    "PartialFailure":  "31",
    "PendingApproval": "33",  # yellow
    "Cancelled":       "90",  # gray
    "Running":         "36",  # cyan
}


def main() -> int:
    cx = psycopg2.connect(
        host="localhost", port=5434, user="insur_user",
        password="insur_secret_password", dbname="insur_analytics",
    )
    with cx, cx.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # 1. Last 24h invocation rollup per agent
        cur.execute("""
            SELECT agent_id, COUNT(*) AS n,
                   COUNT(*) FILTER (WHERE status='Success') AS ok,
                   COUNT(*) FILTER (WHERE status IN ('Failed','PartialFailure')) AS fail,
                   COUNT(*) FILTER (WHERE status='PendingApproval') AS pend,
                   ROUND(AVG(duration_ms), 1) AS avg_ms,
                   MAX(created_at) AS last_seen
            FROM agent_invocation
            WHERE created_at > NOW() - INTERVAL '24 hours'
            GROUP BY agent_id
            ORDER BY MAX(created_at) DESC NULLS LAST
            LIMIT 50
        """)
        rows = [dict(r) for r in cur.fetchall()]

        cur.execute("""
            SELECT COUNT(*) AS total,
                   COUNT(*) FILTER (WHERE status='Success') AS ok,
                   COUNT(*) FILTER (WHERE status IN ('Failed','PartialFailure')) AS fail,
                   COUNT(*) FILTER (WHERE status='PendingApproval') AS pend
            FROM agent_invocation
            WHERE created_at > NOW() - INTERVAL '24 hours'
        """)
        rollup = dict(cur.fetchone())

        cur.execute("""
            SELECT agent_id, status, duration_ms, created_at, input_text, trigger_kind
            FROM agent_invocation
            WHERE created_at > NOW() - INTERVAL '1 hour'
            ORDER BY created_at DESC
            LIMIT 15
        """)
        recent = [dict(r) for r in cur.fetchall()]

    # Print rollup
    print(color("══════ Last 24h · who is working ══════", "1;36"))
    print(f"  Total invocations: {rollup['total']}  ·  "
          f"{color('OK ' + str(rollup['ok']), '32')}  ·  "
          f"{color('FAIL ' + str(rollup['fail']), '31')}  ·  "
          f"{color('PENDING ' + str(rollup['pend']), '33')}")

    print()
    print(color(f"Active agents in last 24h: {len(rows)}", "1"))
    print(f"  {'AGENT':<32} {'RUNS':>5} {'OK':>4} {'FAIL':>4} {'PEND':>4} {'AVG ms':>8}  LAST")
    print("  " + "─" * 90)

    now = datetime.now(timezone.utc)
    for r in rows:
        last = r["last_seen"]
        ago = (now - (last if last.tzinfo else last.replace(tzinfo=timezone.utc))).total_seconds()
        ago_s = (f"{int(ago)}s" if ago < 60 else
                 f"{int(ago/60)}m" if ago < 3600 else
                 f"{int(ago/3600)}h")
        c = "32" if r["ok"] == r["n"] else "31" if r["fail"] > 0 else "33"
        print(f"  {r['agent_id']:<32} "
              f"{color(str(r['n']).rjust(5), c)} "
              f"{str(r['ok']).rjust(4)} "
              f"{str(r['fail']).rjust(4)} "
              f"{str(r['pend']).rjust(4)} "
              f"{str(r['avg_ms'] or 0).rjust(8)}  "
              f"{ago_s} ago")

    # Recent feed
    print()
    print(color("══════ Recent 15 (last hour) · live feed ══════", "1;36"))
    print(f"  {'TIME':<8} {'AGENT':<30} {'STATUS':<16} {'ms':>6}  INPUT")
    print("  " + "─" * 95)
    for r in recent:
        c = STATUS_COLOR.get(r["status"], "0")
        when = (r["created_at"] or datetime.now(timezone.utc)).strftime("%H:%M:%S")
        print(f"  {when:<8} "
              f"{r['agent_id'][:30]:<30} "
              f"{color(r['status'].ljust(16), c)} "
              f"{str(r['duration_ms'] or 0).rjust(6)}  "
              f"{(r['input_text'] or '')[:60]}")

    cx.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
