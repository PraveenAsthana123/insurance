#!/usr/bin/env python3
"""Supervise INSUR agent queues, schedules, heartbeats, and task results.

This script is the local operational control plane for the Redis-backed agent
fleet. It does not execute tasks itself; it observes worker liveness, queue
backlog, recurring schedules, recent completions, and process-test coverage so
operators can see whether agents are taking work and finishing it.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import redis

DEFAULT_REDIS_URL = os.environ.get("REDIS_URL", os.environ.get("BEV_REDIS_URL", "redis://localhost:6379/0"))
ROOT_DIR = Path(__file__).resolve().parents[1]
PROCESS_CATALOG = ROOT_DIR / "docs" / "testing" / "PROCESS_AGENT_CRON_CATALOG.json"
DEFAULT_REPORT = ROOT_DIR / "data" / "agent-supervisor" / "latest.json"

QUEUE_PAIRS = {
    "simple": ("tasks", "done"),
    "council": ("council_tasks", "council_done"),
    "test": ("test_tasks", "test_results"),
}
SCHEDULE_SET = "agent:schedules"
SCHEDULE_PREFIX = "agent:schedule:"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Supervisor for INSUR local agent fleets.")
    parser.add_argument("--redis-url", default=DEFAULT_REDIS_URL, help="Redis URL")
    parser.add_argument("--sample", type=int, default=8, help="Recent result sample size")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("status", help="Print one supervisor snapshot")

    watch = sub.add_parser("watch", help="Continuously print supervisor snapshots")
    watch.add_argument("--interval", type=float, default=5.0, help="Refresh interval seconds")

    task = sub.add_parser("task", help="Inspect one task result across known result queues")
    task.add_argument("--task-id", required=True)
    task.add_argument("--limit", type=int, default=500, help="Max results to scan per result queue")

    health = sub.add_parser("health", help="Exit non-zero when queues or recent results are unhealthy")
    health.add_argument("--max-backlog", type=int, default=50, help="Allowed backlog with no live workers")
    health.add_argument("--max-recent-failures", type=int, default=3, help="Allowed failed items in samples")

    report = sub.add_parser("report", help="Write or print a machine-readable supervisor report")
    report.add_argument("--output", default=str(DEFAULT_REPORT), help="Report path, or '-' for stdout")

    sub.add_parser("schedules", help="List recurring agent schedules and process-test cron coverage")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def load_json(raw: str | bytes | None) -> dict[str, Any] | None:
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None


def redis_client(redis_url: str) -> redis.Redis:
    client = redis.from_url(redis_url, decode_responses=True)
    client.ping()
    return client


def queue_snapshot(client: redis.Redis) -> dict[str, dict[str, int]]:
    return {
        name: {"pending": client.llen(pending), "completed": client.llen(done)}
        for name, (pending, done) in QUEUE_PAIRS.items()
    }


def heartbeat_rows(client: redis.Redis) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for key in sorted(client.scan_iter("agent:heartbeat:*")):
        data = load_json(client.get(key))
        if not data:
            continue
        updated_at = float(data.get("updated_at", 0) or 0)
        rows.append(
            {
                "key": key,
                "kind": data.get("kind", "unknown"),
                "agent_id": data.get("agent_id", "unknown"),
                "state": data.get("state", "unknown"),
                "processed": int(data.get("processed", 0) or 0),
                "updated_at": updated_at,
                "age_sec": max(0, int(time.time() - updated_at)) if updated_at else None,
            }
        )
    return rows


def recent_results(client: redis.Redis, sample: int) -> dict[str, list[dict[str, Any]]]:
    results: dict[str, list[dict[str, Any]]] = {}
    for name, (_, done_key) in QUEUE_PAIRS.items():
        items: list[dict[str, Any]] = []
        for raw in client.lrange(done_key, 0, max(sample - 1, 0)):
            item = load_json(raw) or {"ok": False, "error": "result is not valid JSON", "raw": str(raw)[:200]}
            items.append(item)
        results[name] = items
    return results


def result_is_failure(item: dict[str, Any]) -> bool:
    if item.get("ok") is False:
        return True
    status = str(item.get("status", "")).lower()
    return status in {"error", "failed", "failure"}


def schedule_rows(client: redis.Redis) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for name in sorted(client.smembers(SCHEDULE_SET)):
        row = load_json(client.get(SCHEDULE_PREFIX + name))
        if row:
            rows.append(row)
    return rows


def process_catalog_summary() -> dict[str, Any]:
    if not PROCESS_CATALOG.exists():
        return {"path": str(PROCESS_CATALOG), "available": False, "processes": 0, "departments": {}}
    data = json.loads(PROCESS_CATALOG.read_text(encoding="utf-8"))
    processes = data.get("processes") or data.get("entries", [])
    departments = Counter(
        str(row.get("department") or row.get("department_route") or row.get("department_name") or "unknown")
        for row in processes
    )
    return {
        "path": str(PROCESS_CATALOG),
        "available": True,
        "processes": len(processes),
        "departments": dict(sorted(departments.items())),
    }


def build_report(client: redis.Redis, sample: int) -> dict[str, Any]:
    queues = queue_snapshot(client)
    heartbeats = heartbeat_rows(client)
    results = recent_results(client, sample)
    failures = sum(1 for rows in results.values() for row in rows if result_is_failure(row))
    pending_total = sum(row["pending"] for row in queues.values())
    live_by_kind = Counter(str(row.get("kind", "unknown")) for row in heartbeats)
    schedules = schedule_rows(client)
    recommendations: list[str] = []
    if pending_total and not heartbeats:
        recommendations.append("Pending work exists but no live agent heartbeats were found. Start agents or check Redis URLs.")
    if failures:
        recommendations.append("Recent completed-result samples include failures. Inspect failed task IDs and worker logs.")
    if not schedules:
        recommendations.append("No recurring schedules are registered. Add schedule-add jobs for recurring monitoring.")

    return {
        "generated_at": utc_now(),
        "redis_url": client.connection_pool.connection_kwargs.get("host", "redis"),
        "queues": queues,
        "pending_total": pending_total,
        "heartbeats": {
            "live": len(heartbeats),
            "by_kind": dict(sorted(live_by_kind.items())),
            "rows": heartbeats,
        },
        "schedules": schedules,
        "process_test_catalog": process_catalog_summary(),
        "recent_results": results,
        "recent_failure_count": failures,
        "recommendations": recommendations,
    }


def print_status(report: dict[str, Any], sample: int) -> None:
    print(f"\nHOLY Agent Supervisor @ {report['generated_at']}")
    print("=" * 78)
    print("Queues:")
    for name, row in report["queues"].items():
        print(f"  {name:<8} pending={row['pending']:<5} completed={row['completed']}")
    hb = report["heartbeats"]
    print(f"Heartbeats: live={hb['live']} by_kind={hb['by_kind']}")
    for row in hb["rows"][:30]:
        age = "?" if row["age_sec"] is None else f"{row['age_sec']}s"
        print(f"  {row['kind']:<8} {row['state']:<10} processed={row['processed']:<4} age={age:<5} {row['agent_id']}")
    if len(hb["rows"]) > 30:
        print(f"  ... {len(hb['rows']) - 30} more")

    print(f"Schedules: {len(report['schedules'])}")
    for row in report["schedules"][:12]:
        print(
            f"  {row.get('name')} mode={row.get('mode')} every={row.get('every_seconds')}s "
            f"runs={row.get('run_count', 0)} last_task={row.get('last_task_id', '-')}"
        )
    catalog = report["process_test_catalog"]
    print(f"Process-test catalog: available={catalog['available']} processes={catalog['processes']}")
    print(f"Recent failures in samples: {report['recent_failure_count']} / sample={sample}")
    print("Recent task results:")
    shown = 0
    for queue_name, rows in report["recent_results"].items():
        for item in rows:
            task_id = item.get("task_id", item.get("id", "?"))
            agent_id = item.get("agent_id", "?")
            ok = item.get("ok", item.get("status", "?"))
            dept = item.get("department", "")
            print(f"  {queue_name:<8} task={task_id} agent={agent_id} ok={ok} dept={dept}")
            shown += 1
            if shown >= sample:
                break
        if shown >= sample:
            break
    for recommendation in report["recommendations"]:
        print(f"Recommendation: {recommendation}")


def find_task(client: redis.Redis, task_id: str, limit: int) -> dict[str, Any] | None:
    for queue_name, (_, done_key) in QUEUE_PAIRS.items():
        for index, raw in enumerate(client.lrange(done_key, 0, max(limit - 1, 0))):
            item = load_json(raw)
            if not item:
                continue
            ids = {str(item.get("task_id", "")), str(item.get("id", ""))}
            if task_id in ids:
                return {"queue": queue_name, "result_index": index, "result": item}
    return None


def print_schedules(report: dict[str, Any]) -> None:
    if not report["schedules"]:
        print("no runtime schedules registered")
    for row in report["schedules"]:
        print(
            f"{row.get('name')} mode={row.get('mode')} every={row.get('every_seconds')}s "
            f"department={row.get('department', '')} runs={row.get('run_count', 0)} "
            f"last_task={row.get('last_task_id', '-')}"
        )
    catalog = report["process_test_catalog"]
    print("\nprocess-test cron catalog")
    print(f"path={catalog['path']}")
    print(f"available={catalog['available']} processes={catalog['processes']}")
    for department, count in catalog["departments"].items():
        print(f"  {department}: {count}")


def main() -> int:
    args = parse_args()
    try:
        client = redis_client(args.redis_url)
    except Exception as exc:
        print(f"Redis unavailable: {exc}", file=sys.stderr)
        return 2

    if args.cmd == "watch":
        while True:
            report = build_report(client, args.sample)
            print_status(report, args.sample)
            time.sleep(args.interval)

    report = build_report(client, args.sample)
    if args.cmd == "status":
        print_status(report, args.sample)
        return 0
    if args.cmd == "schedules":
        print_schedules(report)
        return 0
    if args.cmd == "task":
        found = find_task(client, args.task_id, args.limit)
        if not found:
            print(f"task not found in recent completed queues: {args.task_id}")
            return 1
        print(json.dumps(found, indent=2, sort_keys=True))
        return 0
    if args.cmd == "report":
        payload = json.dumps(report, indent=2, sort_keys=True)
        if args.output == "-":
            print(payload)
        else:
            output = Path(args.output)
            if not output.is_absolute():
                output = ROOT_DIR / output
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(payload + "\n", encoding="utf-8")
            print(f"agent supervisor report written: {output}")
        return 0
    if args.cmd == "health":
        queues = report["queues"]
        backlog_without_workers = [
            name for name, row in queues.items() if row["pending"] > args.max_backlog and report["heartbeats"]["live"] == 0
        ]
        if backlog_without_workers:
            print(f"unhealthy: backlog without live workers in {', '.join(backlog_without_workers)}")
            return 3
        if report["recent_failure_count"] > args.max_recent_failures:
            print(f"unhealthy: recent_failure_count={report['recent_failure_count']}")
            return 4
        print("healthy")
        return 0
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
