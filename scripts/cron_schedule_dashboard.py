#!/usr/bin/env python3
"""Cron Schedule Dashboard · Iter 96 · per operator brief.
Shows: each cron job · next run time · status (pending/completed/running)."""
import argparse, os, subprocess, sys, time
from datetime import datetime, timezone, timedelta
from pathlib import Path

class C:
    R = "\033[0m"; B = "\033[1m"; D = "\033[2m"
    GRY = "\033[90m"; RED = "\033[31m"; GRN = "\033[32m"
    YLW = "\033[33m"; BLU = "\033[34m"; CYN = "\033[36m"
    BGR = "\033[42m"; BYW = "\033[43m"; BRD = "\033[41m"

REPO = Path("/mnt/deepa/insur_project")


def parse_cron_field(field: str, minmax: tuple) -> list:
    """Expand a cron field to list of values."""
    lo, hi = minmax
    if field == "*": return list(range(lo, hi + 1))
    if field.startswith("*/"):
        step = int(field[2:])
        return list(range(lo, hi + 1, step))
    out = []
    for part in field.split(","):
        if "/" in part:
            base, step = part.split("/")
            step = int(step)
            if base == "*": rng = range(lo, hi + 1, step)
            elif "-" in base:
                a, b = base.split("-"); rng = range(int(a), int(b) + 1, step)
            else: rng = range(int(base), hi + 1, step)
            out.extend(rng)
        elif "-" in part:
            a, b = part.split("-"); out.extend(range(int(a), int(b) + 1))
        else:
            try: out.append(int(part))
            except: pass
    return sorted(set(out))


def next_run(schedule: str, now: datetime) -> datetime | None:
    """Compute the next cron run time after `now`."""
    parts = schedule.split()
    if len(parts) != 5: return None
    minutes = parse_cron_field(parts[0], (0, 59))
    hours = parse_cron_field(parts[1], (0, 23))
    # Walk forward minute by minute up to 7 days (paranoid)
    candidate = now.replace(second=0, microsecond=0) + timedelta(minutes=1)
    for _ in range(7 * 24 * 60):
        if candidate.minute in minutes and candidate.hour in hours:
            return candidate
        candidate += timedelta(minutes=1)
    return None


def get_jobs():
    """Read crontab and parse INSUR-relevant entries."""
    try:
        out = subprocess.run(["crontab", "-l"], capture_output=True, text=True,
                             timeout=2).stdout
    except Exception:
        return []
    jobs = []
    for line in out.split("\n"):
        line = line.strip()
        if not line or line.startswith("#"): continue
        parts = line.split(None, 5)
        if len(parts) < 6: continue
        schedule = " ".join(parts[:5])
        cmd = parts[5]
        is_insur = "insur_project" in cmd or "INSUR-AUTO-NEXT" in line
        # Short label
        if "INSUR-AUTO-NEXT" in line:
            label = "auto_next_dispatcher.sh"
        elif "insur_project" in cmd:
            tail = cmd.split("/")[-1].split(">")[0].strip()[:35]
            label = tail
        else:
            label = cmd.split()[0].split("/")[-1][:35]
        jobs.append({"schedule": schedule, "label": label, "cmd": cmd[:100],
                     "is_insur": is_insur})
    return jobs


def last_run_for(label: str) -> dict:
    """Find last run evidence for a given job."""
    # auto_next_dispatcher → check tick reports
    if "auto_next" in label:
        d = REPO / "jobs/reports/auto-next"
        files = sorted(d.glob("run-*.json"), key=lambda p: p.stat().st_mtime, reverse=True) if d.exists() else []
        if files:
            mtime = datetime.fromtimestamp(files[0].stat().st_mtime, tz=timezone.utc)
            age = (datetime.now(timezone.utc) - mtime).total_seconds()
            return {"last_run": mtime, "age_s": age, "status": "completed", "evidence": files[0].name}
    # auto-next.log
    log = REPO / "jobs/logs/auto-next.log"
    if log.exists() and "auto_next" in label:
        mtime = datetime.fromtimestamp(log.stat().st_mtime, tz=timezone.utc)
        age = (datetime.now(timezone.utc) - mtime).total_seconds()
        return {"last_run": mtime, "age_s": age, "status": "logged", "evidence": "auto-next.log"}
    # Fallback · check all log dirs for files mentioning label
    for log_dir in [REPO / "jobs/logs", REPO / "jobs/reports/pending-tasks"]:
        if not log_dir.exists(): continue
        for p in sorted(log_dir.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True)[:30]:
            if label.replace(".sh", "")[:8] in p.name:
                mtime = datetime.fromtimestamp(p.stat().st_mtime, tz=timezone.utc)
                age = (datetime.now(timezone.utc) - mtime).total_seconds()
                return {"last_run": mtime, "age_s": age, "status": "completed", "evidence": p.name}
    return {"last_run": None, "age_s": None, "status": "no_evidence", "evidence": "—"}


def render():
    jobs = get_jobs()
    now = datetime.now(timezone.utc)
    now_local = datetime.now().astimezone()
    w = min(160, os.get_terminal_size().columns if sys.stdout.isatty() else 160)

    print()
    print(C.B + "═" * w + C.R)
    print(C.B + f"  ⏰ CRON SCHEDULE DASHBOARD · now {now_local.isoformat(timespec='seconds')} · UTC {now.isoformat(timespec='seconds')}" + C.R)
    print(C.B + "═" * w + C.R)

    insur = [j for j in jobs if j["is_insur"]]
    print(f"\n  {C.B}{C.GRN}INSUR cron jobs · {len(insur)}{C.R}\n")
    print(f"  {C.D}{'LABEL':<38}  {'SCHEDULE':<15}  {'NEXT RUN':<28}  {'LAST RUN':<28}  {'STATUS':<10}{C.R}")
    print(f"  {C.D}{'-' * (w - 4)}{C.R}")

    for j in sorted(insur, key=lambda x: x["label"]):
        nxt = next_run(j["schedule"], now)
        nxt_str = nxt.astimezone().isoformat(timespec="seconds") if nxt else "—"
        diff_s = (nxt - now).total_seconds() if nxt else 0
        nxt_in = f"in {int(diff_s)}s" if diff_s < 3600 else f"in {int(diff_s/60)}min"
        last = last_run_for(j["label"])
        if last["last_run"]:
            last_str = last["last_run"].astimezone().isoformat(timespec="seconds")
            age = last["age_s"]
            ago = f"{int(age)}s ago" if age < 3600 else f"{int(age/60)}min ago" if age < 86400 else f"{int(age/3600)}h ago"
        else:
            last_str = "—"; ago = "no evidence"

        # Status color
        if last["last_run"] and last["age_s"] and last["age_s"] < 600:
            sc = C.GRN; status = "FRESH"
        elif last["last_run"] and last["age_s"] and last["age_s"] < 3600:
            sc = C.YLW; status = "AGED"
        elif last["last_run"]:
            sc = C.RED; status = "STALE"
        else:
            sc = C.GRY; status = "NO LOG"

        print(f"  {C.B}{j['label'][:38]:<38}{C.R}  "
              f"{C.CYN}{j['schedule']:<15}{C.R}  "
              f"{nxt_str[:19]:<19} ({nxt_in:<7})  "
              f"{last_str[:19]:<19} ({ago:<10})  "
              f"{sc}{status:<10}{C.R}")

    # Non-INSUR summary
    other = [j for j in jobs if not j["is_insur"]]
    if other:
        print(f"\n  {C.D}Non-INSUR jobs: {len(other)}{C.R}")

    print()
    print(C.B + "─" * w + C.R)
    print(f"  {C.D}Refresh: python3 scripts/cron_schedule_dashboard.py [--watch 30]{C.R}")
    print()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--watch", type=int, default=0)
    args = ap.parse_args()
    if args.watch > 0:
        try:
            while True:
                if sys.stdout.isatty(): print("\033[2J\033[H", end="")
                render()
                print(f"  {C.D}Watching · refresh in {args.watch}s · Ctrl-C to exit{C.R}")
                time.sleep(args.watch)
        except KeyboardInterrupt:
            print("\nStopped.")
    else:
        render()


if __name__ == "__main__":
    main()
