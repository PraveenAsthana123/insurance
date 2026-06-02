#!/usr/bin/env python3
"""Recurring task scheduler for INSUR Redis-backed agents.

This is a lightweight local scheduler for demos and development. It stores job
metadata in Redis, supports multiple interval jobs, and enqueues due tasks into
simple or council queues. It is intentionally small; production cron should move
to a durable scheduler with ownership, retries, and audit retention.
"""
from __future__ import annotations

import argparse
import json
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Any

import redis

DEFAULT_REDIS_URL = os.environ.get("REDIS_URL", os.environ.get("BEV_REDIS_URL", "redis://localhost:6379/0"))
SCHEDULE_SET = "agent:schedules"
SCHEDULE_PREFIX = "agent:schedule:"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Schedule recurring INSUR agent tasks.")
    parser.add_argument("--redis-url", default=DEFAULT_REDIS_URL, help="Redis URL")
    sub = parser.add_subparsers(dest="cmd", required=True)

    add = sub.add_parser("add", help="Add an interval schedule")
    add.add_argument("--name", required=True)
    add.add_argument("--mode", choices=["simple", "council"], default="council")
    add.add_argument("--every", type=int, required=True, help="Interval seconds")
    add.add_argument("--department", default="")
    add.add_argument("--prompt", required=True)
    add.add_argument("--source", default="agent-scheduler")

    sub.add_parser("list", help="List schedules")
    rm = sub.add_parser("remove", help="Remove a schedule")
    rm.add_argument("name")
    run = sub.add_parser("run", help="Run scheduler loop")
    run.add_argument("--tick", type=float, default=5.0, help="Loop sleep seconds")
    run.add_argument("--once", action="store_true", help="Run one due-task scan and exit")
    return parser.parse_args()


def now() -> float:
    return time.time()


def queue_for(mode: str) -> str:
    return "council_tasks" if mode == "council" else "tasks"


def load_schedule(client: redis.Redis, name: str) -> dict[str, Any] | None:
    raw = client.get(SCHEDULE_PREFIX + name)
    return json.loads(raw) if raw else None


def save_schedule(client: redis.Redis, schedule: dict[str, Any]) -> None:
    name = schedule["name"]
    client.set(SCHEDULE_PREFIX + name, json.dumps(schedule, sort_keys=True))
    client.sadd(SCHEDULE_SET, name)


def list_schedules(client: redis.Redis) -> list[dict[str, Any]]:
    rows = []
    for name in sorted(client.smembers(SCHEDULE_SET)):
        schedule = load_schedule(client, name)
        if schedule:
            rows.append(schedule)
    return rows


def enqueue_due(client: redis.Redis) -> int:
    count = 0
    t = now()
    for schedule in list_schedules(client):
        if schedule.get("paused"):
            continue
        due_at = float(schedule.get("next_run_at", 0) or 0)
        if due_at > t:
            continue
        mode = schedule.get("mode", "council")
        task_id = f"sched-{schedule['name']}-{uuid.uuid4().hex[:8]}"
        task = {
            "id": task_id,
            "task_id": task_id,
            "department": schedule.get("department", ""),
            "prompt": schedule["prompt"],
            "seeded_at": t,
            "source": schedule.get("source", "agent-scheduler"),
            "schedule_name": schedule["name"],
            "mode": mode,
        }
        client.lpush(queue_for(mode), json.dumps(task, sort_keys=True))
        schedule["last_run_at"] = t
        schedule["last_task_id"] = task_id
        schedule["run_count"] = int(schedule.get("run_count", 0)) + 1
        schedule["next_run_at"] = t + int(schedule["every_seconds"])
        save_schedule(client, schedule)
        print(f"queued {task_id} -> {queue_for(mode)}")
        count += 1
    return count


def iso(ts: float | int | None) -> str:
    if not ts:
        return "never"
    return datetime.fromtimestamp(float(ts), tz=timezone.utc).isoformat(timespec="seconds")


def main() -> int:
    args = parse_args()
    client = redis.from_url(args.redis_url, decode_responses=True)
    client.ping()

    if args.cmd == "add":
        schedule = {
            "name": args.name,
            "mode": args.mode,
            "every_seconds": args.every,
            "department": args.department,
            "prompt": args.prompt,
            "source": args.source,
            "created_at": now(),
            "next_run_at": now(),
            "run_count": 0,
            "paused": False,
        }
        save_schedule(client, schedule)
        print(f"schedule added: {args.name} every={args.every}s mode={args.mode}")
        return 0

    if args.cmd == "list":
        rows = list_schedules(client)
        if not rows:
            print("no schedules")
            return 0
        for row in rows:
            print(
                f"{row['name']} mode={row.get('mode')} every={row.get('every_seconds')}s "
                f"next={iso(row.get('next_run_at'))} runs={row.get('run_count', 0)} "
                f"last_task={row.get('last_task_id', '-') }"
            )
        return 0

    if args.cmd == "remove":
        client.delete(SCHEDULE_PREFIX + args.name)
        client.srem(SCHEDULE_SET, args.name)
        print(f"schedule removed: {args.name}")
        return 0

    if args.cmd == "run":
        while True:
            count = enqueue_due(client)
            if args.once:
                print(f"due tasks queued: {count}")
                return 0
            time.sleep(args.tick)

    return 2


if __name__ == "__main__":
    raise SystemExit(main())
