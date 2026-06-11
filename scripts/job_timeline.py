#!/usr/bin/env python3
"""Job Timeline · Iter 100 · per operator brief.

Shows EACH JOB as:
  [TIME] JOB STARTED  · tick_id · estimated duration based on rolling avg
  [TIME] PROGRESS     · heartbeat dot every N seconds while job runs
  [TIME] JOB ENDED    · status · actual duration · vs ETA
  [TIME] NEXT JOB AT  · scheduled start of next job

Polls the daemon log + progress file rapidly · prints each event as it happens.
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


def now_str():
    return datetime.now().astimezone().strftime("%H:%M:%S %Z")


def emit(label, color, message):
    print(f"  {C.D}[{now_str()}]{C.R} {color}{label:<14}{C.R} {message}")
    sys.stdout.flush()


def get_avg_duration(n=10):
    """Rolling avg job duration from last N ticks."""
    if not TICK_DIR.exists():
        return 15  # default guess
    files = sorted(TICK_DIR.glob("run-*.json"),
                    key=lambda p: p.stat().st_mtime, reverse=True)[:n]
    durations = []
    for f in files:
        try:
            d = json.loads(f.read_text())
            if "duration_s" in d:
                durations.append(d["duration_s"])
        except Exception:
            pass
    return round(sum(durations) / len(durations), 1) if durations else 15


def progress():
    if not PROGRESS_JSON.exists():
        return None
    try:
        return json.loads(PROGRESS_JSON.read_text())
    except Exception:
        return None


def latest_tick_id():
    if not TICK_DIR.exists():
        return None
    files = sorted(TICK_DIR.glob("run-*.json"),
                    key=lambda p: p.stat().st_mtime, reverse=True)
    if not files:
        return None
    try:
        return json.loads(files[0].read_text())
    except Exception:
        return None


def run(poll_s, progress_dots):
    avg_dur = get_avg_duration()
    emit("MONITOR_INIT", C.CYN,
          f"avg job duration ≈ {avg_dur}s (from last 10 ticks)")

    last_iter = -1
    last_tick_name = ""
    job_start_time = None
    job_eta = None
    last_status = ""
    last_progress_print = 0

    # Pre-load
    p = progress()
    if p:
        last_iter = p.get("current_iter", -1)
        last_status = p.get("last_iter_status", "")
        emit("INITIAL_STATE", C.CYN,
              f"daemon at iter #{last_iter} · last status: {last_status}")

    while True:
        time.sleep(poll_s)

        p = progress()
        if not p:
            continue

        cur_iter = p.get("current_iter", -1)
        cur_status = p.get("last_iter_status", "")

        # ITER ADVANCE = new job started OR previous job completed
        if cur_iter != last_iter:
            # Previous job (last_iter) is now done
            if last_iter > 0 and job_start_time:
                actual_dur = p.get("last_iter_duration_s", 0)
                eta_diff = ""
                if job_eta:
                    diff = actual_dur - avg_dur
                    sign = "+" if diff >= 0 else ""
                    eta_diff = f" (ETA was {avg_dur}s · {sign}{diff:.1f}s)"
                color = (C.GRN if cur_status == "acted" else
                          C.YLW if cur_status in ("cooldown", "gated") else
                          C.GRY if cur_status == "stable" else C.RED)
                emit("JOB ENDED", color,
                      f"#{last_iter} · status={cur_status} · "
                      f"actual {actual_dur}s{eta_diff}")
                # NEXT JOB schedule
                next_sleep = p.get("next_sleep_s", 30)
                next_time = (datetime.now().astimezone() +
                              timedelta(seconds=next_sleep))
                emit("NEXT JOB AT", C.D,
                      f"{next_time.strftime('%H:%M:%S %Z')} "
                      f"(in {next_sleep}s · adaptive cadence)")
                print()  # blank line between jobs

            # NEW JOB starts NOW
            job_start_time = datetime.now()
            avg_dur = get_avg_duration()
            job_eta = job_start_time + timedelta(seconds=avg_dur)
            tick = latest_tick_id()
            tick_id = tick.get("tick_id", "?")[-12:] if tick else "?"
            emit("JOB STARTED", C.B + C.CYN,
                  f"iter #{cur_iter} · ETA {job_eta.strftime('%H:%M:%S %Z')} "
                  f"(~{avg_dur}s)")
            emit("PROGRESS", C.D,
                  f"  → calling sys_auto_next_loop · advisor scan · "
                  f"tick {tick_id}")
            last_progress_print = time.time()

            last_iter = cur_iter
            last_status = cur_status

        elif cur_status != last_status:
            # Status changed mid-iter
            emit("STATUS UPDATE", C.YLW,
                  f"#{cur_iter}: {last_status} → {cur_status}")
            last_status = cur_status

        # PROGRESS DOTS · if job has been running >progress_dots seconds without ending
        if job_start_time and not job_eta_reached(job_eta):
            elapsed = (datetime.now() - job_start_time).total_seconds()
            now_t = time.time()
            if now_t - last_progress_print >= progress_dots:
                emit("PROGRESS", C.D,
                      f"  → still running · elapsed {int(elapsed)}s "
                      f"(ETA in {max(0, int(avg_dur - elapsed))}s)")
                last_progress_print = now_t

        # NO PENDING banner
        if cur_status == "no_pending_tasks" or p.get("consecutive_empty", 0) >= 3:
            emit("✓ COMPLETE", C.GRN + C.B,
                  f"NO PENDING TASKS · platform stable · "
                  f"daemon exiting cleanly")
            print()
            print(f"  {C.GRN}{C.B}╔═══════════════════════════════════════════╗{C.R}")
            print(f"  {C.GRN}{C.B}║  ✓ ALL JOBS COMPLETE · NO PENDING TASKS  ║{C.R}")
            print(f"  {C.GRN}{C.B}╚═══════════════════════════════════════════╝{C.R}")
            break


def job_eta_reached(eta):
    if not eta:
        return False
    return datetime.now() > eta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--poll", type=int, default=2,
                     help="Poll interval seconds (default 2)")
    ap.add_argument("--progress-dots", type=int, default=8,
                     help="Print progress every N seconds while job runs")
    args = ap.parse_args()
    try:
        run(args.poll, args.progress_dots)
    except KeyboardInterrupt:
        emit("MONITOR_STOPPED", C.YLW, "Ctrl-C received")
        sys.exit(0)


if __name__ == "__main__":
    main()
