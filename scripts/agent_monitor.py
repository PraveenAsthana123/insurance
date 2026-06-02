#!/usr/bin/env python3
"""Monitor the INSUR agent queues and live worker heartbeats.

Shows queue depths, completion counts, success/error summary, and recently seen
agent heartbeat records. It works for simple agents and council agents.
"""
from __future__ import annotations

import argparse
import json
import os
import time
from datetime import datetime, timezone
from typing import Any

import redis

DEFAULT_REDIS_URL = os.environ.get("REDIS_URL", os.environ.get("BEV_REDIS_URL", "redis://localhost:6379/0"))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Monitor INSUR Redis-backed agent fleets.")
    parser.add_argument("--redis-url", default=DEFAULT_REDIS_URL, help="Redis URL")
    parser.add_argument("--watch", action="store_true", help="Refresh continuously")
    parser.add_argument("--interval", type=float, default=2.0, help="Watch refresh seconds")
    parser.add_argument("--sample", type=int, default=5, help="Completed-result sample size")
    return parser.parse_args()


def load_json(raw: str | bytes | None) -> dict[str, Any] | None:
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None


def summarize_results(client: redis.Redis, key: str, limit: int) -> tuple[int, int, list[dict[str, Any]]]:
    ok = 0
    failed = 0
    samples: list[dict[str, Any]] = []
    for raw in client.lrange(key, 0, max(limit - 1, 0)):
        item = load_json(raw)
        if not item:
            failed += 1
            continue
        if item.get("ok") is False:
            failed += 1
        else:
            ok += 1
        samples.append(item)
    return ok, failed, samples


def heartbeat_rows(client: redis.Redis) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for key in sorted(client.scan_iter("agent:heartbeat:*")):
        data = load_json(client.get(key))
        if not data:
            continue
        updated_at = float(data.get("updated_at", 0) or 0)
        rows.append({
            "key": key,
            "kind": data.get("kind", "?"),
            "agent_id": data.get("agent_id", "?"),
            "state": data.get("state", "?"),
            "processed": data.get("processed", 0),
            "age_sec": max(0, int(time.time() - updated_at)) if updated_at else "?",
        })
    return rows


def print_snapshot(client: redis.Redis, sample_size: int) -> None:
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    simple_ok, simple_failed, simple_samples = summarize_results(client, "done", sample_size)
    council_ok, council_failed, council_samples = summarize_results(client, "council_done", sample_size)
    rows = heartbeat_rows(client)

    print(f"\nHOLY Agent Fleet Monitor @ {now}")
    print("=" * 72)
    print(f"simple queue:  tasks={client.llen('tasks')} done={client.llen('done')} sample_ok={simple_ok} sample_failed={simple_failed}")
    print(f"council queue: tasks={client.llen('council_tasks')} done={client.llen('council_done')} sample_ok={council_ok} sample_failed={council_failed}")
    print(f"test queue:    tasks={client.llen('test_tasks')} done={client.llen('test_results')}")
    print(f"heartbeats:    live={len(rows)}")
    if rows:
        print("\nLive agents:")
        print("kind     state     processed age  agent_id")
        for row in rows[:30]:
            print(f"{row['kind']:<8} {row['state']:<9} {row['processed']!s:<9} {row['age_sec']!s:<4} {row['agent_id']}")
        if len(rows) > 30:
            print(f"... {len(rows) - 30} more")
    if simple_samples or council_samples:
        print("\nRecent completed tasks:")
        for item in (simple_samples + council_samples)[:sample_size]:
            task_id = item.get("task_id", item.get("id", "?"))
            agent_id = item.get("agent_id", "?")
            ok = item.get("ok", "?")
            dept = item.get("department", "")
            print(f"- task={task_id} agent={agent_id} ok={ok} dept={dept}")


def main() -> int:
    args = parse_args()
    client = redis.from_url(args.redis_url, decode_responses=True)
    client.ping()
    while True:
        print_snapshot(client, args.sample)
        if not args.watch:
            return 0
        time.sleep(args.interval)


if __name__ == "__main__":
    raise SystemExit(main())
