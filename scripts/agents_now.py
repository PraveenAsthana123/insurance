#!/usr/bin/env python3
"""agents_now · Iter 100 · live list of which agents are working RIGHT NOW.

Shows on terminal:
  · Total active agents in registry
  · Agents with invocations in last 5 min (CURRENTLY WORKING)
  · Agents with invocations in last 1 hour (RECENT)
  · For each: name · last task · last status · count

Usage:
  python3 scripts/agents_now.py
  python3 scripts/agents_now.py --watch 5
  python3 scripts/agents_now.py --hours 4
"""
import argparse
import os
import sys
import time
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras


class C:
    R = "\033[0m"; B = "\033[1m"; D = "\033[2m"
    GRN = "\033[32m"; YLW = "\033[33m"; CYN = "\033[36m"; MAG = "\033[35m"
    RED = "\033[31m"; BLU = "\033[34m"; GRY = "\033[90m"
    BGR = "\033[42m"; BYW = "\033[43m"


def conn():
    return psycopg2.connect(host='localhost', port=5434, user='insur_user',
                             password='insur_secret_password',
                             dbname='insur_analytics')


def ts():
    return datetime.now().astimezone().strftime("%Y-%m-%d %H:%M:%S %Z")


def render(hours):
    w = min(140, os.get_terminal_size().columns if sys.stdout.isatty() else 140)
    if sys.stdout.isatty():
        print("\033[2J\033[H", end="")
    print(f"\n  {C.B}═══ AGENTS WORKING · {ts()} ═══{C.R}\n")

    with conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT COUNT(*) AS active FROM agent_registry WHERE status='Active'
        """)
        active = cur.fetchone()["active"]

        # Agents with invocations in last 5 min
        cur.execute("""
            SELECT ai.agent_id, ar.agent_name, ar.business_domain,
                   COUNT(*) AS n_invocations,
                   MAX(ai.created_at) AS last_call,
                   AVG(ai.duration_ms) AS avg_ms,
                   array_agg(ai.status ORDER BY ai.created_at DESC) AS recent_statuses
            FROM agent_invocation ai
            LEFT JOIN agent_registry ar ON ar.agent_id = ai.agent_id
            WHERE ai.created_at > NOW() - INTERVAL '5 minutes'
            GROUP BY ai.agent_id, ar.agent_name, ar.business_domain
            ORDER BY n_invocations DESC, last_call DESC
        """)
        working_5m = [dict(r) for r in cur.fetchall()]

        # Agents with invocations in last N hours
        cur.execute("""
            SELECT ai.agent_id, ar.agent_name, ar.business_domain,
                   COUNT(*) AS n_invocations,
                   MAX(ai.created_at) AS last_call,
                   COALESCE(AVG(ai.duration_ms), 0) AS avg_ms,
                   COUNT(*) FILTER (WHERE ai.status='Success') AS success,
                   COUNT(*) FILTER (WHERE ai.status IN ('Failed', 'PartialFailure')) AS failed
            FROM agent_invocation ai
            LEFT JOIN agent_registry ar ON ar.agent_id = ai.agent_id
            WHERE ai.created_at > NOW() - (%s || ' hours')::interval
            GROUP BY ai.agent_id, ar.agent_name, ar.business_domain
            ORDER BY n_invocations DESC
        """, (hours,))
        working_recent = [dict(r) for r in cur.fetchall()]

        # Last few raw invocations (the actual current work)
        cur.execute("""
            SELECT ai.invocation_id, ai.agent_id, ar.agent_name,
                   ai.input_text, ai.status, ai.duration_ms,
                   ai.created_at, ai.correlation_id
            FROM agent_invocation ai
            LEFT JOIN agent_registry ar ON ar.agent_id = ai.agent_id
            ORDER BY ai.created_at DESC LIMIT 10
        """)
        recent_calls = [dict(r) for r in cur.fetchall()]

    print(f"  {C.GRN}{C.B}● {active} agents registered as Active{C.R}")
    print(f"  {C.GRN}{C.B}● {len(working_5m)} agents called in last 5 min{C.R}")
    print(f"  {C.CYN}● {len(working_recent)} agents called in last {hours} hour(s){C.R}")
    print()

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if working_5m:
        print(f"  {C.B}{C.BGR} CURRENTLY WORKING (last 5 min) {C.R}")
        print()
        print(f"    {C.D}{'AGENT':<35} {'DOMAIN':<18} {'CALLS':<7} "
              f"{'AVG_MS':<8} {'LAST CALL':<22} STATUS{C.R}")
        for w in working_5m:
            statuses = w.get("recent_statuses") or []
            ok = sum(1 for s in statuses if s == "Success")
            color = C.GRN if ok == len(statuses) else C.YLW
            last_dt = w["last_call"].astimezone().strftime("%H:%M:%S %Z") if w["last_call"] else "?"
            print(f"    {color}{(w['agent_id'] or '?')[:35]:<35}{C.R} "
                  f"{(w['business_domain'] or '-')[:18]:<18} "
                  f"{w['n_invocations']:<7} "
                  f"{int(w['avg_ms'] or 0):<8} "
                  f"{last_dt:<22} "
                  f"{ok}/{len(statuses)} ok")
        print()

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if working_recent:
        print(f"  {C.B}{C.BYW} ACTIVE in last {hours}h ({len(working_recent)}) {C.R}")
        print()
        print(f"    {C.D}{'AGENT':<35} {'DOMAIN':<18} {'CALLS':<7} "
              f"{'OK':<5} {'FAIL':<5} {'LAST CALL':<22}{C.R}")
        for w in working_recent[:30]:
            color = C.GRN if w["failed"] == 0 else C.YLW
            last_dt = w["last_call"].astimezone().strftime("%H:%M:%S %Z") if w["last_call"] else "?"
            print(f"    {color}{(w['agent_id'] or '?')[:35]:<35}{C.R} "
                  f"{(w['business_domain'] or '-')[:18]:<18} "
                  f"{w['n_invocations']:<7} "
                  f"{w['success']:<5} "
                  f"{w['failed']:<5} "
                  f"{last_dt:<22}")
        if len(working_recent) > 30:
            print(f"    {C.D}... +{len(working_recent)-30} more{C.R}")
        print()

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    print(f"  {C.B}{C.BLU} LAST 10 RAW INVOCATIONS (newest first) {C.R}")
    print()
    print(f"    {C.D}{'TIME':<22} {'AGENT':<35} {'STATUS':<12} {'DURATION':<10} TASK{C.R}")
    for r in recent_calls:
        ts_dt = r["created_at"].astimezone().strftime("%H:%M:%S %Z") if r["created_at"] else "?"
        status = r.get("status", "?")
        sc = C.GRN if status == "Success" else C.YLW if status == "PartialFailure" else C.RED
        task = (r.get("input_text") or "")[:50].replace("\n", " ")
        dur = f"{r.get('duration_ms', 0)}ms"
        print(f"    {C.D}{ts_dt:<22}{C.R} "
              f"{(r.get('agent_id') or '?')[:35]:<35} "
              f"{sc}{status:<12}{C.R} "
              f"{dur:<10} "
              f"{C.D}{task}{C.R}")
    print()
    print(f"  {C.D}─── End · run with --watch 5 to auto-refresh every 5s ───{C.R}\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--hours", type=int, default=1)
    ap.add_argument("--watch", type=int, default=0)
    args = ap.parse_args()
    try:
        if args.watch > 0:
            while True:
                render(args.hours)
                print(f"  {C.D}refreshing in {args.watch}s · Ctrl-C to exit{C.R}")
                time.sleep(args.watch)
        else:
            render(args.hours)
    except KeyboardInterrupt:
        print("\n  Stopped.")
        sys.exit(0)


if __name__ == "__main__":
    main()
