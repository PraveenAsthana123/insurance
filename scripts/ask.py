#!/usr/bin/env python3
"""ask · Iter 101 · single-CLI answer-everything on terminal.

Type any of these natural-language questions · get answered on terminal:

  status              · daemon running? jobs going?
  duration            · current job · how long · ETA
  agents              · who is working · what task
  pending             · what tasks pending · severity
  cron                · all cron jobs · next/last/status
  history             · last N ticks · timestamps
  tools               · all integrations installed
  why <topic>         · ask council of agents (Ollama)
  calgary             · current Calgary time
  uptime              · daemon uptime · total iters
  all                 · everything in one screen

Usage:
  ask status
  ask duration
  ask why is daemon stuck
  ask all
"""
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path

os.environ["TZ"] = "America/Edmonton"
try:
    time.tzset()
except Exception:
    pass

REPO = Path("/mnt/deepa/insur_project")
PROG = REPO / "jobs/reports/auto-next/daemon-progress.json"
LOG = REPO / "jobs/logs/auto-next-daemon.log"
TICK = REPO / "jobs/reports/auto-next"


class C:
    R = "\033[0m"; B = "\033[1m"; D = "\033[2m"
    GRN = "\033[32m"; YLW = "\033[33m"; CYN = "\033[36m"; MAG = "\033[35m"
    RED = "\033[31m"; BLU = "\033[34m"; GRY = "\033[90m"
    BGR = "\033[42m"; BYW = "\033[43m"


def ts():
    return datetime.now().astimezone().strftime("%Y-%m-%d %H:%M:%S %Z")


def header(msg):
    print()
    print(f"  {C.B}╔══ {msg} ══╗{C.R}")


def get_progress():
    try: return json.loads(PROG.read_text())
    except Exception: return None


def cmd_calgary():
    header("CALGARY TIME")
    now_local = datetime.now().astimezone()
    print(f"  📍 Calgary, AB")
    print(f"  📅 {now_local.strftime('%A · %Y-%m-%d')}")
    print(f"  🕐 {now_local.strftime('%H:%M:%S %Z (%z)')}")
    print(f"  🌍 UTC: {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}")


def cmd_status():
    header("DAEMON STATUS")
    out = subprocess.run(["pgrep", "-f", "auto_next_daemon.sh"],
                          capture_output=True, text=True).stdout.strip()
    pids = [p for p in out.split("\n") if p.strip()]
    if pids:
        print(f"  {C.GRN}{C.B}● DAEMON ALIVE{C.R}  PID(s): {C.CYN}{', '.join(pids)}{C.R}")
    else:
        print(f"  {C.RED}{C.B}✗ DAEMON DEAD{C.R}  cron will respawn within 1h")
    p = get_progress()
    if p:
        print(f"  iter:        {C.B}#{p.get('current_iter')}{C.R}")
        print(f"  status:      {p.get('last_iter_status')}")
        print(f"  duration:    {p.get('last_iter_duration_s')}s")
        print(f"  next_sleep:  {p.get('next_sleep_s')}s")
        print(f"  empty_streak: {p.get('consecutive_empty')}/3")


def cmd_duration():
    header("CURRENT JOB DURATION + ETA")
    p = get_progress()
    if not p:
        print(f"  {C.YLW}no progress file{C.R}"); return
    files = sorted(TICK.glob("run-*.json"),
                    key=lambda p: p.stat().st_mtime, reverse=True)[:10]
    durs = []
    for f in files:
        try:
            d = json.loads(f.read_text())
            if "duration_s" in d and d["duration_s"] > 0:
                durs.append(d["duration_s"])
        except Exception:
            pass
    # Fallback: read from log
    if not durs and LOG.exists():
        import re
        log_text = LOG.read_text().split("\n")[-100:]
        for line in log_text:
            m = re.search(r"duration=(\d+)s", line)
            if m: durs.append(int(m.group(1)))
    avg = round(sum(durs) / len(durs), 1) if durs else 15
    min_d = min(durs) if durs else 0
    max_d = max(durs) if durs else 0

    started = datetime.fromisoformat(p["updated_at"].replace("Z", "+00:00")).astimezone()
    now = datetime.now().astimezone()
    elapsed = (now - started).total_seconds()
    eta = started + timedelta(seconds=avg)

    print(f"  iter #:          {C.B}{p['current_iter']}{C.R}")
    print(f"  started:         {started.strftime('%H:%M:%S MDT')}")
    print(f"  now:             {now.strftime('%H:%M:%S MDT')}")
    print(f"  elapsed:         {int(elapsed)}s")
    print(f"  avg duration:    {C.B}{avg}s{C.R} (min {min_d}s · max {max_d}s · last {len(durs)} ticks)")
    print(f"  ETA:             {C.B}{eta.strftime('%H:%M:%S MDT')}{C.R}")
    if elapsed > avg:
        print(f"  {C.YLW}overrun:         +{int(elapsed - avg)}s past ETA{C.R}")
    else:
        print(f"  remaining:       ~{int(avg - elapsed)}s")
    # Next job
    next_sleep = p.get("next_sleep_s", 30)
    last_end = started + timedelta(seconds=p.get("last_iter_duration_s", 0))
    next_start = last_end + timedelta(seconds=next_sleep)
    print(f"  next job at:     {C.D}{next_start.strftime('%H:%M:%S MDT')} (sleep {next_sleep}s){C.R}")


def cmd_agents():
    header("AGENTS WORKING NOW")
    try:
        import psycopg2
        cx = psycopg2.connect(host='localhost', port=5434, user='insur_user',
                              password='insur_secret_password', dbname='insur_analytics')
        with cx, cx.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM agent_registry WHERE status='Active'")
            n_active = cur.fetchone()[0]
            cur.execute("""
                SELECT agent_id, COUNT(*), MAX(created_at)
                FROM agent_invocation
                WHERE created_at > NOW() - INTERVAL '5 minutes'
                GROUP BY agent_id ORDER BY MAX(created_at) DESC LIMIT 20
            """)
            recent = cur.fetchall()
        cx.close()
        print(f"  {C.GRN}● {n_active} agents Active in registry{C.R}")
        print(f"  {C.GRN}● {len(recent)} agents fired in last 5 min{C.R}")
        print()
        for aid, n, last in recent:
            print(f"    {C.GRN}●{C.R} {aid[:35]:<35}  {C.D}calls={n}  last {last.astimezone().strftime('%H:%M:%S MDT')}{C.R}")
    except Exception as e:
        print(f"  {C.RED}DB error: {str(e)[:80]}{C.R}")


def cmd_pending():
    header("PENDING TASKS")
    try:
        sys.path.insert(0, str(REPO))
        sys.path.insert(0, str(REPO / "backend"))
        os.environ.setdefault("BEV_POSTGRES_HOST", "localhost")
        os.environ.setdefault("BEV_POSTGRES_PORT", "5434")
        os.environ.setdefault("BEV_POSTGRES_USER", "insur_user")
        os.environ.setdefault("BEV_POSTGRES_PASSWORD", "insur_secret_password")
        os.environ.setdefault("BEV_POSTGRES_DB", "insur_analytics")
        os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")
        os.environ.setdefault("INSUR_DISABLE_PRESIDIO", "1")
        import logging; logging.disable(logging.CRITICAL)
        from main import create_app
        from fastapi.testclient import TestClient
        c = TestClient(create_app())
        r = c.get("/api/v1/missing-items-advisor/summary").json()
        s = r.get("by_severity", {})
        print(f"  Total findings:  {C.B}{r.get('total_findings')}{C.R}")
        print(f"  {C.RED}P0 (critical):  {s.get('P0',0)}{C.R}")
        print(f"  {C.YLW}P1 (high):      {s.get('P1',0)}{C.R}")
        print(f"  {C.CYN}P2 (medium):    {s.get('P2',0)}{C.R}")
        print(f"  {C.D}P3 (low):       {s.get('P3',0)}{C.R}")
        print(f"  {C.D}Next action: {r.get('recommended_next_action','-')[:90]}{C.R}")
    except Exception as e:
        print(f"  {C.RED}error: {str(e)[:120]}{C.R}")


def cmd_history(n=10):
    header(f"LAST {n} TICKS")
    files = sorted(TICK.glob("run-*.json"),
                    key=lambda p: p.stat().st_mtime, reverse=True)[:n]
    for f in files:
        try:
            d = json.loads(f.read_text())
            t = datetime.fromtimestamp(f.stat().st_mtime).astimezone()
            print(f"  {C.D}{t.strftime('%H:%M:%S MDT')}{C.R}  "
                  f"{(d.get('status','?') or '?'):<10}  "
                  f"{(d.get('top_finding') or {}).get('topic','-')[:40]:<40}  "
                  f"{C.D}findings={d.get('findings_total','?')}{C.R}")
        except Exception:
            pass


def cmd_uptime():
    header("DAEMON UPTIME")
    p = get_progress()
    if not p: return
    started = datetime.fromisoformat(p["started_at"].replace("Z", "+00:00")).astimezone()
    now = datetime.now().astimezone()
    delta = now - started
    h = int(delta.total_seconds() // 3600)
    m = int((delta.total_seconds() % 3600) // 60)
    sec = int(delta.total_seconds() % 60)
    print(f"  Started:    {started.strftime('%Y-%m-%d %H:%M:%S MDT')}")
    print(f"  Now:        {now.strftime('%Y-%m-%d %H:%M:%S MDT')}")
    print(f"  Uptime:     {C.B}{h}h {m}m {sec}s{C.R}")
    print(f"  Iters:      {C.B}{p.get('current_iter')}{C.R} (avg {round(delta.total_seconds() / max(p.get('current_iter', 1), 1), 1)}s/iter)")


def cmd_why(rest_of_query):
    """Route to ask_agents.py council."""
    if not rest_of_query:
        print("  Usage: ask why <your question>")
        return
    q = " ".join(rest_of_query)
    print(f"  {C.D}Routing to §97 council of agents (Ollama)...{C.R}\n")
    subprocess.run(["python3", str(REPO / "scripts/ask_agents.py"), q])


def cmd_all():
    cmd_calgary()
    cmd_status()
    cmd_duration()
    cmd_pending()
    cmd_agents()
    cmd_history(5)
    cmd_uptime()
    print()
    print(f"  {C.D}─── End · {ts()} ───{C.R}\n")


CMDS = {
    "calgary": cmd_calgary, "time": cmd_calgary,
    "status": cmd_status, "running": cmd_status,
    "duration": cmd_duration, "eta": cmd_duration, "when": cmd_duration,
    "agents": cmd_agents, "who": cmd_agents,
    "pending": cmd_pending, "tasks": cmd_pending,
    "history": cmd_history, "ticks": cmd_history,
    "uptime": cmd_uptime,
    "all": cmd_all, "everything": cmd_all,
}


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("help", "-h", "--help"):
        print(f"\n  {C.B}ask · single-CLI answer-everything{C.R}\n")
        print(f"  {C.B}Quick:{C.R}")
        for k in sorted(set(CMDS.keys())):
            print(f"    ask {k}")
        print(f"\n  {C.B}Council questions (uses Ollama):{C.R}")
        print(f"    ask why is daemon stuck in cooldown")
        print(f"    ask why <any question>")
        print()
        return

    arg = sys.argv[1].lower()
    if arg in ("why", "council", "ask"):
        cmd_why(sys.argv[2:])
    elif arg in CMDS:
        CMDS[arg]()
    else:
        # Treat as a council question
        cmd_why(sys.argv[1:])
    print()


if __name__ == "__main__":
    main()
