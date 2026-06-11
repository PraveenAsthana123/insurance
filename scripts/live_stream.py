#!/usr/bin/env python3
"""Live Streaming Monitor · Iter 99.

Streams events to terminal · each line ALWAYS has full timestamp.
NO clear-screen · history accumulates · scroll up to see past.

Polls every 5s · detects:
  · new tick reports (with status + duration + findings)
  · daemon progress file updates (heartbeat · iter · status changes)
  · daemon log new lines
  · daemon process death/restart

Each output line format:
  [YYYY-MM-DD HH:MM:SS TZ] EVENT_TYPE · details

Usage:
  python3 scripts/live_stream.py
  python3 scripts/live_stream.py --poll 3      # poll every 3s instead of 5
  python3 scripts/live_stream.py --include-log # also include raw log lines
"""
import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

REPO = Path("/mnt/deepa/insur_project")
DAEMON_LOG = REPO / "jobs/logs/auto-next-daemon.log"
PROGRESS_JSON = REPO / "jobs/reports/auto-next/daemon-progress.json"
TICK_DIR = REPO / "jobs/reports/auto-next"


class C:
    R = "\033[0m"; B = "\033[1m"; D = "\033[2m"
    GRY = "\033[90m"; RED = "\033[31m"; GRN = "\033[32m"
    YLW = "\033[33m"; BLU = "\033[34m"; MAG = "\033[35m"; CYN = "\033[36m"
    BGR = "\033[42m"; BYW = "\033[43m"; BRD = "\033[41m"


def ts():
    """Format current time with full local timestamp + TZ."""
    now = datetime.now().astimezone()
    return now.strftime("%Y-%m-%d %H:%M:%S %Z")


def emit(level: str, event: str, details: str):
    """Print one event line · ALWAYS with timestamp."""
    level_colors = {
        "INFO": C.CYN, "TICK": C.GRN, "STATUS": C.B, "HEARTBEAT": C.D,
        "WARN": C.YLW, "ERROR": C.RED, "BANNER": C.BGR + C.B,
        "DAEMON": C.MAG,
    }
    color = level_colors.get(level, C.WHT if hasattr(C, "WHT") else "")
    print(f"  {C.D}[{ts()}]{C.R}  {color}{level:<9}{C.R}  "
           f"{C.B}{event:<22}{C.R}  {details}")
    sys.stdout.flush()


def daemon_pids():
    try:
        out = subprocess.run(["pgrep", "-f", "auto_next_daemon.sh"],
                             capture_output=True, text=True, timeout=2)
        return [int(p) for p in out.stdout.strip().split("\n") if p.strip().isdigit()]
    except Exception:
        return []


def read_progress():
    if not PROGRESS_JSON.exists():
        return None
    try:
        return json.loads(PROGRESS_JSON.read_text())
    except Exception:
        return None


def read_tick(path):
    try:
        return json.loads(path.read_text())
    except Exception:
        return None


def stream(poll_s: int, include_log: bool):
    # State for change detection
    last_iter = -1
    last_status = ""
    last_pids = set()
    seen_ticks = set()
    log_position = DAEMON_LOG.stat().st_size if DAEMON_LOG.exists() else 0

    # Banner: print where we are
    emit("INFO", "MONITOR_STARTED",
          f"poll={poll_s}s · watching daemon + ticks + log · Ctrl-C to stop")

    # Initial state
    pids = daemon_pids()
    if pids:
        emit("DAEMON", "ALIVE", f"PID(s)={pids}")
        last_pids = set(pids)
    else:
        emit("ERROR", "DAEMON_DEAD",
              "no auto_next_daemon process found · cron will respawn")

    p = read_progress()
    if p:
        last_iter = p.get("current_iter", -1)
        last_status = p.get("last_iter_status", "")
        emit("STATUS", "INITIAL_STATE",
              f"iter=#{last_iter} status={last_status} "
              f"uptime_from={p.get('started_at','?')}")

    # Pre-load tick file mtimes
    if TICK_DIR.exists():
        seen_ticks = {f.name for f in TICK_DIR.glob("run-*.json")}

    while True:
        time.sleep(poll_s)

        # 1. Daemon process change
        pids = daemon_pids()
        cur = set(pids)
        if cur != last_pids:
            if cur and not last_pids:
                emit("DAEMON", "RESTARTED", f"new PID(s)={pids}")
            elif not cur and last_pids:
                emit("ERROR", "DAEMON_DIED", f"previously running PID(s)={last_pids}")
            elif cur != last_pids:
                added = cur - last_pids
                dead = last_pids - cur
                if added:
                    emit("DAEMON", "PID_ADDED", f"new={added}")
                if dead:
                    emit("WARN", "PID_GONE", f"missing={dead}")
            last_pids = cur

        # 2. Progress file change
        p = read_progress()
        if p:
            iter_ = p.get("current_iter", -1)
            status = p.get("last_iter_status", "")
            if iter_ != last_iter:
                dur = p.get("last_iter_duration_s", 0)
                next_s = p.get("next_sleep_s", 0)
                empty = p.get("consecutive_empty", 0)
                emit("HEARTBEAT", "NEW_ITER",
                      f"#{iter_} status={status} dur={dur}s "
                      f"next_sleep={next_s}s empty_streak={empty}/3")
                last_iter = iter_
            elif status != last_status:
                emit("STATUS", "STATUS_CHANGED",
                      f"#{iter_}: {last_status} → {status}")
                last_status = status

            # NO PENDING TASKS banner
            if (p.get("last_iter_status") == "no_pending_tasks" or
                p.get("consecutive_empty", 0) >= 3):
                emit("BANNER", "NO_PENDING_TASKS",
                      f"  ✓ PLATFORM STABLE · daemon exiting · iter={iter_}")

        # 3. New tick files
        if TICK_DIR.exists():
            current = {f.name: f for f in TICK_DIR.glob("run-*.json")}
            new = set(current.keys()) - seen_ticks
            for name in sorted(new):
                t = read_tick(current[name])
                if t:
                    tid = t.get("tick_id", name)
                    status = t.get("status", "?")
                    actionable = t.get("p0_p1_p2_actionable", "?")
                    total = t.get("findings_total", "?")
                    top = t.get("top_finding", {}).get("topic", "")
                    sev = t.get("top_finding", {}).get("severity", "")
                    dur = t.get("duration_s", "?")
                    emit("TICK", "TICK_COMPLETED",
                          f"{tid[-12:]} · status={status} · "
                          f"findings={total} (actionable={actionable}) · "
                          f"top=[{sev}] {top[:35]} · dur={dur}s")
                seen_ticks.add(name)

        # 4. Daemon log new lines
        if include_log and DAEMON_LOG.exists():
            cur_size = DAEMON_LOG.stat().st_size
            if cur_size > log_position:
                with DAEMON_LOG.open() as f:
                    f.seek(log_position)
                    new_data = f.read()
                log_position = cur_size
                for line in new_data.strip().split("\n"):
                    if line.strip():
                        emit("INFO", "DAEMON_LOG", line.strip()[:90])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--poll", type=int, default=5,
                     help="Poll interval seconds (default 5)")
    ap.add_argument("--include-log", action="store_true",
                     help="Also stream raw daemon log lines")
    args = ap.parse_args()
    try:
        stream(args.poll, args.include_log)
    except KeyboardInterrupt:
        emit("INFO", "MONITOR_STOPPED", "Ctrl-C received")
        sys.exit(0)


if __name__ == "__main__":
    main()
