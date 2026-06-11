#!/usr/bin/env python3
"""Jobs Dashboard · Iter 95 · terminal view of platform jobs.

Shows in 4 panels:
  1. Cron jobs (installed crontab entries)
  2. Recent ticks (auto-next loop history)
  3. Active goal-loops + autonomous loops
  4. Pending findings (from missing-items-advisor)

Run:
  python3 scripts/jobs_dashboard.py
  python3 scripts/jobs_dashboard.py --watch 10
  python3 scripts/jobs_dashboard.py --format json
"""
import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

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


class C:
    R = "\033[0m"; B = "\033[1m"; D = "\033[2m"
    GRY = "\033[90m"; RED = "\033[31m"; GRN = "\033[32m"
    YLW = "\033[33m"; BLU = "\033[34m"; MAG = "\033[35m"; CYN = "\033[36m"
    BGR = "\033[42m"; BYW = "\033[43m"; BRD = "\033[41m"


def cron_jobs():
    """Get all cron entries · highlight project-related ones."""
    try:
        out = subprocess.run(["crontab", "-l"], capture_output=True, text=True,
                             timeout=2).stdout
        lines = [l.strip() for l in out.split("\n")
                  if l.strip() and not l.strip().startswith("#")]
        jobs = []
        for line in lines:
            parts = line.split(None, 5)
            if len(parts) < 6: continue
            schedule = " ".join(parts[:5])
            cmd = parts[5]
            is_insur = "insur_project" in cmd or "INSUR-AUTO-NEXT" in line
            jobs.append({"schedule": schedule, "cmd": cmd[:80],
                         "is_insur": is_insur})
        return jobs
    except Exception as e:
        return [{"schedule": "ERROR", "cmd": str(e), "is_insur": False}]


def recent_ticks(limit=10):
    """Recent auto-next ticks."""
    p = REPO / "jobs/reports/auto-next"
    if not p.exists(): return []
    files = sorted(p.glob("run-*.json"), key=lambda x: x.stat().st_mtime, reverse=True)
    out = []
    for f in files[:limit]:
        try:
            d = json.loads(f.read_text())
            out.append({
                "tick_id": d.get("tick_id", ""),
                "started_at": d.get("started_at", ""),
                "status": d.get("status", ""),
                "actor_user": d.get("actor_user", ""),
                "duration_s": d.get("duration_s", 0),
                "findings_total": d.get("findings_total", 0),
                "top": d.get("top_finding", {}).get("topic", ""),
            })
        except: pass
    return out


def active_goal_loops():
    """Recent goal-loop runs from DB."""
    import psycopg2
    try:
        cx = psycopg2.connect(host='localhost', port=5434, user='insur_user',
                              password='insur_secret_password', dbname='insur_analytics')
        with cx, cx.cursor() as cur:
            cur.execute("""
                SELECT goal_id, goal_text, status, iteration, max_iterations,
                       started_at, completed_at
                FROM goal_run ORDER BY started_at DESC LIMIT 10
            """)
            rows = cur.fetchall()
        cx.close()
        return [{"goal_id": r[0], "goal": r[1][:50], "status": r[2],
                 "iter": f"{r[3]}/{r[4]}", "started": str(r[5]),
                 "completed": str(r[6]) if r[6] else "running"}
                for r in rows]
    except Exception:
        return []


def autonomous_loops():
    """Recent autonomous_loop runs."""
    import psycopg2
    try:
        cx = psycopg2.connect(host='localhost', port=5434, user='insur_user',
                              password='insur_secret_password', dbname='insur_analytics')
        with cx, cx.cursor() as cur:
            cur.execute("""
                SELECT loop_id, blueprint_id, status, n_steps_passed, n_steps_total,
                       started_at, completed_at
                FROM autonomous_loop_run ORDER BY started_at DESC LIMIT 5
            """)
            rows = cur.fetchall()
        cx.close()
        return [{"loop_id": r[0], "blueprint": r[1], "status": r[2],
                 "steps": f"{r[3]}/{r[4]}", "started": str(r[5]),
                 "completed": str(r[6]) if r[6] else "running"}
                for r in rows]
    except Exception:
        return []


def pending_findings():
    """Current advisor findings (lightweight)."""
    from main import create_app
    from fastapi.testclient import TestClient
    try:
        c = TestClient(create_app())
        r = c.get("/api/v1/missing-items-advisor/summary").json()
        return r
    except Exception as e:
        return {"error": str(e)[:100]}


def render(data):
    w = min(120, os.get_terminal_size().columns if sys.stdout.isatty() else 120)
    now_utc = datetime.now(timezone.utc).isoformat()
    now_local = datetime.now().astimezone().isoformat()

    # HEADER
    print()
    print(C.B + "═" * w + C.R)
    print(C.B + f"  📊 JOBS DASHBOARD · {now_local}" + C.R)
    print(C.B + "═" * w + C.R)
    print()

    # 1. CRON JOBS
    print(C.B + C.BLU + "  ▸ Cron Jobs" + C.R)
    insur = [j for j in data["cron"] if j["is_insur"]]
    other = [j for j in data["cron"] if not j["is_insur"]]
    if insur:
        print(f"    {C.GRN}INSUR project ({len(insur)}):{C.R}")
        for j in insur:
            print(f"      {C.BGR}{C.B} {j['schedule']:<14} {C.R} {j['cmd'][:80]}")
    if other:
        print(f"    {C.D}Other projects ({len(other)}):{C.R}")
        for j in other[:5]:
            print(f"      {C.D}{j['schedule']:<14}{C.R} {j['cmd'][:80]}")
        if len(other) > 5:
            print(f"      {C.D}... +{len(other)-5} more{C.R}")
    print()

    # 2. RECENT TICKS
    print(C.B + C.BLU + f"  ▸ Recent Auto-Next Ticks ({len(data['ticks'])})" + C.R)
    if not data["ticks"]:
        print(f"    {C.YLW}No ticks yet · cron may not have fired{C.R}")
    else:
        for t in data["ticks"]:
            st = t["status"]
            color = C.GRN if st == "acted" else C.YLW if st in ("cooldown","gated") \
                    else C.GRY if st == "stable" else C.RED
            started = t["started_at"][:19].replace("T", " ")
            top = t.get("top", "")[:35]
            print(f"    {C.D}{started}{C.R}  {color}{st:<10}{C.R}  "
                  f"top={top:<35}  {C.D}({t['duration_s']}s){C.R}")
    print()

    # 3. GOAL LOOPS
    print(C.B + C.BLU + f"  ▸ Goal-Loop Runs ({len(data['goals'])})" + C.R)
    if not data["goals"]:
        print(f"    {C.D}(none){C.R}")
    else:
        for g in data["goals"]:
            color = C.GRN if g["status"] == "completed" else C.YLW if g["status"] == "executing" else C.GRY
            print(f"    {color}{g['status']:<11}{C.R}  iter {g['iter']:<6}  "
                  f"{C.D}{g['started'][:19]}{C.R}")
            print(f"      goal: {g['goal']}")
    print()

    # 4. AUTONOMOUS LOOPS
    print(C.B + C.BLU + f"  ▸ Autonomous-Loop Runs ({len(data['autonomous'])})" + C.R)
    if not data["autonomous"]:
        print(f"    {C.D}(none){C.R}")
    else:
        for a in data["autonomous"]:
            color = C.GRN if a["status"] == "completed" else C.YLW
            print(f"    {color}{a['status']:<25}{C.R}  steps {a['steps']:<6}  "
                  f"bp={a['blueprint']:<20}  {C.D}{a['started'][:19]}{C.R}")
    print()

    # 5. PENDING FINDINGS
    pf = data["pending"]
    print(C.B + C.BLU + "  ▸ Pending Findings (advisor)" + C.R)
    if "error" in pf:
        print(f"    {C.RED}error: {pf['error']}{C.R}")
    else:
        by_sev = pf.get("by_severity", {})
        cats = pf.get("by_category", {})
        rec = pf.get("recommended_next_action", "")
        print(f"    {C.B}TOTAL: {pf.get('total_findings', 0)}{C.R}   "
              f"{C.BRD}{C.B}P0={by_sev.get('P0',0)}{C.R}   "
              f"{C.RED}P1={by_sev.get('P1',0)}{C.R}   "
              f"{C.YLW}P2={by_sev.get('P2',0)}{C.R}   "
              f"{C.GRY}P3={by_sev.get('P3',0)}{C.R}")
        if cats:
            for cat, n in sorted(cats.items(), key=lambda x: -x[1]):
                print(f"      {cat:<32}  {n}")
        print(f"\n    {C.D}Recommended next: {rec[:100]}{C.R}")
    print()

    print(C.B + "═" * w + C.R)
    print(f"  {C.D}UTC: {now_utc} · run: python3 scripts/jobs_dashboard.py [--watch 10]{C.R}")
    print()


def collect():
    return {
        "cron":       cron_jobs(),
        "ticks":      recent_ticks(),
        "goals":      active_goal_loops(),
        "autonomous": autonomous_loops(),
        "pending":    pending_findings(),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--format", choices=["terminal", "json"], default="terminal")
    ap.add_argument("--watch", type=int, default=0)
    args = ap.parse_args()

    def run_once():
        d = collect()
        if args.format == "json":
            print(json.dumps(d, indent=2, default=str))
        else:
            render(d)

    if args.watch > 0:
        try:
            while True:
                if sys.stdout.isatty(): print("\033[2J\033[H", end="")
                run_once()
                print(f"  {C.D}Watching · refresh in {args.watch}s · Ctrl-C to exit{C.R}")
                time.sleep(args.watch)
        except KeyboardInterrupt:
            print("\n  Stopped.")
    else:
        run_once()


if __name__ == "__main__":
    main()
