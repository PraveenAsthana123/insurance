#!/usr/bin/env python3
"""Live Terminal Monitor · Iter 98 · per operator brief.

Single screen · live updating · shows:
  · Daemon process status (alive/dead/respawning)
  · Current iter · runtime · what it's doing RIGHT NOW
  · Last tick status · duration · findings
  · Recent daemon log lines (tail)
  · Total elapsed time
  · Adaptive cadence demonstration

Usage:
  python3 scripts/live_monitor.py             # refresh every 3s
  python3 scripts/live_monitor.py --refresh 5
"""
import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path

REPO = Path("/mnt/deepa/insur_project")
DAEMON_LOG = REPO / "jobs/logs/auto-next-daemon.log"
PROGRESS_JSON = REPO / "jobs/reports/auto-next/daemon-progress.json"
TICK_DIR = REPO / "jobs/reports/auto-next"


class C:
    R = "\033[0m"; B = "\033[1m"; D = "\033[2m"
    GRY = "\033[90m"; RED = "\033[31m"; GRN = "\033[32m"
    YLW = "\033[33m"; BLU = "\033[34m"; MAG = "\033[35m"; CYN = "\033[36m"
    WHT = "\033[37m"; BGR = "\033[42m"; BYW = "\033[43m"; BRD = "\033[41m"
    BLU_BG = "\033[44m"


def daemon_status():
    try:
        out = subprocess.run(["pgrep", "-f", "auto_next_daemon.sh"],
                             capture_output=True, text=True, timeout=2)
        pids = [int(p) for p in out.stdout.strip().split("\n") if p.strip().isdigit()]
        return pids
    except Exception:
        return []


def progress():
    if not PROGRESS_JSON.exists():
        return None
    try:
        return json.loads(PROGRESS_JSON.read_text())
    except Exception:
        return None


def last_tick():
    files = sorted(TICK_DIR.glob("run-*.json"), key=lambda p: p.stat().st_mtime,
                    reverse=True) if TICK_DIR.exists() else []
    if not files:
        return None
    try:
        d = json.loads(files[0].read_text())
        d["__mtime"] = files[0].stat().st_mtime
        return d
    except Exception:
        return None


def daemon_log_tail(n=10):
    if not DAEMON_LOG.exists():
        return []
    try:
        with DAEMON_LOG.open() as f:
            lines = f.readlines()
        return [l.rstrip() for l in lines[-n:]]
    except Exception:
        return []


def tick_stats():
    """Count ticks by status over last hour."""
    if not TICK_DIR.exists():
        return {}
    cutoff = time.time() - 3600
    files = [f for f in TICK_DIR.glob("run-*.json") if f.stat().st_mtime > cutoff]
    by_status = {}
    durations = []
    for f in files:
        try:
            d = json.loads(f.read_text())
            s = d.get("status", "unknown")
            by_status[s] = by_status.get(s, 0) + 1
            if "duration_s" in d:
                durations.append(d["duration_s"])
        except Exception:
            pass
    return {"by_status": by_status, "count": len(files),
            "avg_duration_s": round(sum(durations) / len(durations), 1) if durations else 0,
            "min": min(durations) if durations else 0,
            "max": max(durations) if durations else 0}


def render():
    w = min(110, os.get_terminal_size().columns if sys.stdout.isatty() else 110)
    now = datetime.now()
    now_utc = datetime.now(timezone.utc)

    if sys.stdout.isatty():
        print("\033[2J\033[H", end="")

    # HEADER
    print(C.B + "═" * w + C.R)
    print(C.B + f"  🔴 LIVE MONITOR · §118 Autonomous Daemon · " + C.R +
           C.D + now.isoformat(timespec='seconds') + C.R)
    print(C.B + "═" * w + C.R)
    print()

    # DAEMON STATUS
    pids = daemon_status()
    if pids:
        print(f"  {C.BGR}{C.B} ● DAEMON ALIVE {C.R}   "
              f"PID(s): {C.CYN}{', '.join(str(p) for p in pids)}{C.R}")
    else:
        print(f"  {C.BRD}{C.B} ✗ DAEMON DEAD {C.R}   "
              f"{C.YLW}cron will respawn within 1 hour{C.R}")
    print()

    # PROGRESS
    p = progress()
    if p:
        started_at = p.get("started_at", "")
        try:
            started_dt = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
            uptime = now_utc - started_dt
            uptime_s = int(uptime.total_seconds())
            uptime_str = f"{uptime_s // 3600}h {(uptime_s % 3600) // 60}m {uptime_s % 60}s"
        except Exception:
            uptime_str = "?"

        try:
            updated_dt = datetime.fromisoformat(p.get("updated_at", "").replace("Z", "+00:00"))
            heartbeat_s = int((now_utc - updated_dt).total_seconds())
        except Exception:
            heartbeat_s = 0

        # Heartbeat color
        hb_color = C.GRN if heartbeat_s < 60 else C.YLW if heartbeat_s < 300 else C.RED
        hb_label = "LIVE" if heartbeat_s < 60 else "SLOW" if heartbeat_s < 300 else "STALE"

        status = p.get("last_iter_status", "?")
        st_color = (C.GRN if status == "acted" else C.YLW if status in ("cooldown","gated") else
                     C.GRY if status == "stable" else C.RED if status == "error" else C.WHT)

        print(C.B + "  ▶ Current State" + C.R)
        print(f"    Started:        {C.CYN}{p.get('started_at', ''):<35}{C.R}  Uptime: {C.B}{uptime_str}{C.R}")
        print(f"    Current iter:   {C.B}#{p.get('current_iter', 0):<33}{C.R}  Heartbeat: {hb_color}{hb_label} ({heartbeat_s}s){C.R}")
        print(f"    Last status:    {st_color}{status:<35}{C.R}  Duration: {C.B}{p.get('last_iter_duration_s', 0)}s{C.R}")
        print(f"    Next sleep:     {C.YLW}{p.get('next_sleep_s', 0)}s{C.R}                                  "
              f"  Empty streak: {C.B}{p.get('consecutive_empty', 0)}/3{C.R}")

        # Big NO PENDING banner if we're empty
        if p.get("last_iter_status") == "no_pending_tasks" or p.get("consecutive_empty", 0) >= 3:
            print()
            print(f"    {C.BGR}{C.B}  ╔══════════════════════════════════════════════════════════╗  {C.R}")
            print(f"    {C.BGR}{C.B}  ║  ✓ NO PENDING TASKS · PLATFORM STABLE                    ║  {C.R}")
            print(f"    {C.BGR}{C.B}  ╚══════════════════════════════════════════════════════════╝  {C.R}")
    else:
        print(f"  {C.YLW}(no progress file yet · daemon not started or starting){C.R}")
    print()

    # LAST TICK DETAIL
    t = last_tick()
    if t:
        age_s = int(time.time() - t["__mtime"])
        age_color = C.GRN if age_s < 60 else C.YLW if age_s < 300 else C.RED
        print(C.B + f"  ▶ Last Tick ({age_color}{age_s}s ago{C.R})" + C.R)
        tid = t.get("tick_id", "?")
        print(f"    Tick ID:        {C.CYN}{tid}{C.R}")
        print(f"    Status:         {t.get('status', '?')}")
        print(f"    Findings:       {C.B}{t.get('findings_total', '?')} total{C.R} "
              f"({C.RED}{t.get('p0_p1_p2_actionable', '?')} actionable{C.R})")
        top = t.get("top_finding", {})
        if top:
            print(f"    Top task:       {C.YLW}[{top.get('severity', '?')}]{C.R} {top.get('topic', '?')[:50]}")
            print(f"    Why:            {C.D}{top.get('category', '?')[:80]}{C.R}")
    print()

    # HOURLY STATS
    s = tick_stats()
    if s and s.get("count", 0) > 0:
        print(C.B + f"  ▶ Last Hour ({s['count']} ticks)" + C.R)
        st_str = "  ".join(f"{C.CYN}{k}={v}{C.R}" for k, v in s["by_status"].items())
        print(f"    By status:      {st_str}")
        print(f"    Avg duration:   {C.B}{s['avg_duration_s']}s{C.R}  "
              f"min={s['min']}s · max={s['max']}s")
    print()

    # LIVE TAIL
    print(C.B + "  ▶ Live Daemon Log (last 8 lines)" + C.R)
    for line in daemon_log_tail(8):
        # Highlight status info
        if "status=" in line:
            print(f"    {C.GRN}{line[:w-6]}{C.R}")
        elif "iter " in line:
            print(f"    {C.CYN}{line[:w-6]}{C.R}")
        elif "STOP" in line or "STARTED" in line:
            print(f"    {C.B}{line[:w-6]}{C.R}")
        else:
            print(f"    {C.D}{line[:w-6]}{C.R}")
    print()

    # FOOTER
    print(C.B + "─" * w + C.R)
    print(f"  {C.D}Files watched:{C.R}")
    print(f"    {C.D}{PROGRESS_JSON}{C.R}")
    print(f"    {C.D}{DAEMON_LOG}{C.R}")
    print(f"  {C.D}Ctrl-C to exit · Press 'q' or close terminal{C.R}")


def main():
    ap = argparse.ArgumentParser(description="Live terminal monitor for §118 daemon")
    ap.add_argument("--refresh", type=int, default=3, help="Refresh seconds (default 3)")
    args = ap.parse_args()

    try:
        while True:
            render()
            time.sleep(args.refresh)
    except KeyboardInterrupt:
        print("\n  Stopped.")
        sys.exit(0)


if __name__ == "__main__":
    main()
