#!/usr/bin/env python3
"""work_tracker — track + monitor every cron/fleet/agent job in the repo.

Per operator 2026-06-01: "track all the work, monitor all the work and
create the agent to speedup the work"

Aggregates state from:
  jobs/logs/*.log                — cron output (tail + tail-time)
  jobs/fleet/{tasks,results,status}.jsonl — fleet state
  data/eval/bot/audit.jsonl      — bot decision audit
  data/rag/{chunks,embeddings}/  — RAG inventory
  crontab -l                     — scheduled work

Modes:
  python work_tracker.py snapshot      # write data/work_tracker/latest.json
  python work_tracker.py status        # print human summary
  python work_tracker.py speedup       # parallel-run pending cron tasks now
  python work_tracker.py watch         # tail every active log
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[1]
OUT_DIR = REPO / "data" / "work_tracker"
OUT_DIR.mkdir(parents=True, exist_ok=True)
LATEST = OUT_DIR / "latest.json"
HISTORY = OUT_DIR / "history.jsonl"


def tail(path: Path, n: int = 5) -> list[str]:
    if not path.exists():
        return []
    try:
        return path.read_text(errors="ignore").splitlines()[-n:]
    except Exception:
        return []


def mtime(path: Path) -> str | None:
    if not path.exists():
        return None
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(path.stat().st_mtime))


def snapshot() -> dict[str, Any]:
    snap: dict[str, Any] = {"ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}

    # 1. Cron logs (recency + tail)
    logs: dict[str, dict[str, Any]] = {}
    for log in sorted((REPO / "jobs" / "logs").glob("*.log")):
        logs[log.name] = {
            "size": log.stat().st_size,
            "last_modified": mtime(log),
            "tail": tail(log, 3),
        }
    snap["cron_logs"] = logs

    # 2. Fleet status
    fleet_status = REPO / "jobs" / "fleet" / "status.json"
    snap["fleet"] = json.loads(fleet_status.read_text()) if fleet_status.exists() else {"status": "no_run_yet"}

    # 3. RAG inventory
    snap["rag"] = {
        "chunks": len(list((REPO / "data" / "rag" / "chunks").glob("*.json"))) if (REPO / "data" / "rag" / "chunks").exists() else 0,
        "embeddings": len(list((REPO / "data" / "rag" / "embeddings").glob("*.json"))) if (REPO / "data" / "rag" / "embeddings").exists() else 0,
    }

    # 4. Bot audit volume
    bot_audit = REPO / "data" / "eval" / "bot" / "audit.jsonl"
    snap["bot"] = {
        "audit_rows": len(bot_audit.read_text().splitlines()) if bot_audit.exists() else 0,
        "last_modified": mtime(bot_audit),
    }

    # 5. Scheduled cron entries
    try:
        ct = subprocess.run(["crontab", "-l"], capture_output=True, text=True, timeout=5)
        entries = [ln for ln in ct.stdout.splitlines() if ln and not ln.startswith("#") and "insur_project" in ln]
        snap["cron_entries"] = len(entries)
    except Exception:
        snap["cron_entries"] = None

    # 6. End-to-end runs
    e2e_dir = REPO / "data" / "eval" / "end_to_end"
    runs = sorted(e2e_dir.glob("e2e-*")) if e2e_dir.exists() else []
    snap["e2e_runs"] = {"count": len(runs), "latest": runs[-1].name if runs else None}

    # 7. Reports
    reports = REPO / "jobs" / "reports"
    snap["reports"] = {"count": len(list(reports.glob("*"))) if reports.exists() else 0}

    return snap


def write_snapshot() -> dict[str, Any]:
    snap = snapshot()
    LATEST.write_text(json.dumps(snap, indent=2))
    with HISTORY.open("a") as f:
        f.write(json.dumps(snap) + "\n")
    return snap


def print_status() -> None:
    if not LATEST.exists():
        snap = write_snapshot()
    else:
        snap = json.loads(LATEST.read_text())
    print(f"=== insur_project work tracker @ {snap['ts']} ===\n")
    print(f"Fleet:     {snap['fleet'].get('tasks', 0)} tasks · "
          f"verdicts={snap['fleet'].get('verdicts', {})}")
    print(f"RAG:       {snap['rag']['chunks']} chunks · {snap['rag']['embeddings']} embeddings")
    print(f"Bot:       {snap['bot']['audit_rows']} audit rows · last={snap['bot']['last_modified']}")
    print(f"Cron:      {snap['cron_entries']} insur_project entries scheduled")
    print(f"E2E runs:  {snap['e2e_runs']['count']} (latest={snap['e2e_runs']['latest']})")
    print(f"Reports:   {snap['reports']['count']} files in jobs/reports/")
    print(f"\nCron logs ({len(snap['cron_logs'])} files):")
    for name, meta in list(snap["cron_logs"].items())[:10]:
        last = meta["last_modified"] or "(never)"
        print(f"  {name:<40s} {meta['size']:>8d} bytes · {last}")


def speedup() -> None:
    """Run every scheduled job NOW in parallel — no waiting for cron tick."""
    runner = REPO / "scripts" / "basic_rag_ops_runner.sh"
    pending_runner = REPO / "scripts" / "pending_tasks_runner.sh"
    fleet_script = REPO / "scripts" / "insur_fleet.py"
    py = "/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python"

    jobs: list[tuple[str, list[str]]] = []
    if runner.exists():
        for task in ["chunking", "embedding", "token", "guardrail", "deepeval", "ragas"]:
            jobs.append((f"rag/{task}", ["bash", str(runner), task]))
    if pending_runner.exists():
        for task in ["boot", "data-manifest", "module-sync", "claude-md-drift"]:
            jobs.append((f"pending/{task}", ["bash", str(pending_runner), task]))
    if fleet_script.exists():
        jobs.append(("fleet/seed", [py, str(fleet_script), "seed"]))

    print(f"[speedup] dispatching {len(jobs)} jobs in parallel...")
    t0 = time.time()
    results: dict[str, dict[str, Any]] = {}

    def run(name_cmd):
        name, cmd = name_cmd
        t = time.time()
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            return name, {
                "exit": r.returncode,
                "duration_s": round(time.time() - t, 2),
                "stdout_tail": r.stdout.splitlines()[-3:] if r.stdout else [],
                "stderr_tail": r.stderr.splitlines()[-3:] if r.stderr else [],
            }
        except subprocess.TimeoutExpired:
            return name, {"exit": 124, "error": "timeout 120s"}
        except Exception as e:
            return name, {"exit": -1, "error": str(e)[:200]}

    with ThreadPoolExecutor(max_workers=8) as pool:
        for name, res in pool.map(run, jobs):
            results[name] = res
            mark = "✓" if res.get("exit") == 0 else "✗"
            print(f"  {mark} {name:<28s} exit={res.get('exit')} dur={res.get('duration_s', '?')}s")

    elapsed = time.time() - t0
    report = OUT_DIR / f"speedup_{time.strftime('%Y%m%dT%H%M%SZ', time.gmtime())}.json"
    report.write_text(json.dumps({"elapsed_s": round(elapsed, 2), "results": results}, indent=2))
    print(f"\n[speedup] done in {elapsed:.1f}s · report: {report}")


def watch() -> None:
    """Live-print recent activity across all jobs."""
    print("=== work_tracker watch — Ctrl-C to stop ===")
    seen: dict[str, int] = {}
    try:
        while True:
            snap = snapshot()
            print(f"\r[{snap['ts']}] fleet={snap['fleet'].get('tasks', 0)} "
                  f"chunks={snap['rag']['chunks']} emb={snap['rag']['embeddings']} "
                  f"bot={snap['bot']['audit_rows']} reports={snap['reports']['count']}", end="", flush=True)
            time.sleep(5)
    except KeyboardInterrupt:
        print("\nstopped.")


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("snapshot", help="Write data/work_tracker/latest.json")
    sub.add_parser("status", help="Human-readable summary")
    sub.add_parser("speedup", help="Run all scheduled jobs NOW in parallel")
    sub.add_parser("watch", help="Live monitor")
    args = ap.parse_args()
    if args.cmd == "snapshot":
        s = write_snapshot()
        print(f"snapshot written → {LATEST} (cron_entries={s['cron_entries']}, fleet={s['fleet'].get('tasks', 0)})")
    elif args.cmd == "status":
        print_status()
    elif args.cmd == "speedup":
        speedup()
    elif args.cmd == "watch":
        watch()


if __name__ == "__main__":
    main()
