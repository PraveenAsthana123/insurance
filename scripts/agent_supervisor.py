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
TRACE_LOG = ROOT_DIR / "data" / "agent-supervisor" / "task_traces.jsonl"

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
    sub.add_parser("advanced", help="Print advanced monitoring, tracking, and delegation readiness")
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



def trace_log_summary(limit: int = 50) -> dict[str, Any]:
    if not TRACE_LOG.exists():
        return {
            "path": str(TRACE_LOG),
            "available": False,
            "total": 0,
            "recent": [],
            "by_status": {},
            "by_failure_category": {},
            "by_owner": {},
            "retryable": 0,
        }
    rows: list[dict[str, Any]] = []
    total = 0
    with TRACE_LOG.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            total += 1
            try:
                rows.append(json.loads(line))
            except Exception:
                rows.append({"status": "failed", "failure_category": "corrupt_trace_row", "owner": "AgentOps"})
            if len(rows) > max(limit * 4, 200):
                rows = rows[-max(limit * 2, 100):]
    recent = rows[-limit:][::-1]
    return {
        "path": str(TRACE_LOG),
        "available": True,
        "total": total,
        "recent": recent,
        "by_status": dict(sorted(Counter(str(row.get("status", "unknown")) for row in rows).items())),
        "by_failure_category": dict(sorted(Counter(str(row.get("failure_category", "unknown")) for row in rows).items())),
        "by_owner": dict(sorted(Counter(str(row.get("owner", "unknown")) for row in rows).items())),
        "retryable": sum(1 for row in rows if row.get("retryable") is True),
    }



def derive_operations(report: dict[str, Any]) -> dict[str, Any]:
    queues = report["queues"]
    heartbeats = report["heartbeats"]["rows"]
    recent_results = report["recent_results"]
    pending_total = report["pending_total"]
    completed_total = sum(row["completed"] for row in queues.values())
    recent_flat = [item for rows in recent_results.values() for item in rows]
    recent_count = len(recent_flat)
    recent_failures = report["recent_failure_count"]
    recent_success = max(0, recent_count - recent_failures)
    live_agents = report["heartbeats"]["live"]
    running_agents = sum(1 for row in heartbeats if row.get("state") == "running")
    stale_agents = sum(1 for row in heartbeats if (row.get("age_sec") or 0) > 30)
    processed_total = sum(int(row.get("processed", 0) or 0) for row in heartbeats)
    schedules = report["schedules"]
    catalog = report["process_test_catalog"]
    trace_log = report.get("trace_log", {})

    completion_rate = round((completed_total / max(completed_total + pending_total, 1)) * 100)
    recent_success_rate = round((recent_success / max(recent_count, 1)) * 100) if recent_count else 100
    worker_freshness = round(((live_agents - stale_agents) / max(live_agents, 1)) * 100) if live_agents else 0
    schedule_coverage = 100 if schedules else 0
    catalog_coverage = 100 if catalog.get("available") and catalog.get("processes", 0) else 0

    health_score = max(0, min(100, round(
        worker_freshness * 0.30
        + recent_success_rate * 0.25
        + completion_rate * 0.20
        + schedule_coverage * 0.10
        + catalog_coverage * 0.10
        + (100 if pending_total <= max(live_agents, 1) * 2 else 45) * 0.05
    )))
    execution_score = max(0, min(100, round(
        recent_success_rate * 0.55 + completion_rate * 0.30 + (100 if running_agents or completed_total else 60) * 0.15
    )))
    quality_score = max(0, min(100, round(
        recent_success_rate * 0.60 + (100 if recent_failures == 0 else 55) * 0.25 + catalog_coverage * 0.15
    )))
    observability_score = max(0, min(100, round(
        (100 if live_agents else 0) * 0.35 + (100 if recent_count else 35) * 0.25 + catalog_coverage * 0.20 + (100 if schedules else 35) * 0.20
    )))

    trace_rows: list[dict[str, Any]] = []
    for queue_name, rows in recent_results.items():
        for item in rows:
            trace_rows.append({
                "trace_id": item.get("trace_id") or item.get("task_id") or item.get("id") or "unknown",
                "queue": queue_name,
                "task_id": item.get("task_id") or item.get("id") or "unknown",
                "agent_id": item.get("agent_id") or item.get("agent") or "unknown",
                "department": item.get("department") or item.get("dept") or "unknown",
                "status": "success" if item.get("ok") is True else "failed" if result_is_failure(item) else str(item.get("status", "unknown")),
                "duration_ms": item.get("duration_ms"),
                "tokens": item.get("tokens"),
            })

    operation_rows = [
        {"name": "Agent fleet liveness", "status": "healthy" if live_agents else "critical", "metric": f"{live_agents} live"},
        {"name": "Queue drain", "status": "healthy" if pending_total == 0 else "watch", "metric": f"{pending_total} pending"},
        {"name": "Recent execution quality", "status": "healthy" if recent_failures == 0 else "degraded", "metric": f"{recent_failures} failures"},
        {"name": "Schedule coverage", "status": "healthy" if schedules else "gap", "metric": f"{len(schedules)} schedules"},
        {"name": "Process catalog coverage", "status": "healthy" if catalog.get("available") else "gap", "metric": f"{catalog.get('processes', 0)} processes"},
        {"name": "Worker throughput", "status": "healthy" if processed_total else "watch", "metric": f"{processed_total} processed"},
        {"name": "Durable trace log", "status": "healthy" if trace_log.get("available") and trace_log.get("total", 0) else "gap", "metric": f"{trace_log.get('total', 0)} traces"},
        {"name": "Retryable failures", "status": "watch" if trace_log.get("retryable", 0) else "healthy", "metric": f"{trace_log.get('retryable', 0)} retryable"},
    ]

    reporting = [
        {"name": "Executive health report", "cadence": "daily", "owner": "AI Command Center", "status": "ready" if health_score >= 70 else "needs attention"},
        {"name": "Failure RCA report", "cadence": "on failure", "owner": "AgentOps", "status": "ready" if recent_failures else "quiet"},
        {"name": "Queue and SLA report", "cadence": "hourly", "owner": "Operations", "status": "ready"},
        {"name": "Process test coverage report", "cadence": "weekly", "owner": "QA", "status": "ready" if catalog.get("available") else "blocked"},
        {"name": "Delegation and throughput report", "cadence": "daily", "owner": "Platform", "status": "ready" if live_agents else "blocked"},
    ]

    insights: list[str] = []
    brutal_feedback: list[str] = []
    if health_score >= 85:
        insights.append("The agent fleet is visible, responsive, and draining work within the sampled window.")
    if recent_failures:
        insights.append("Recent results include failures, so the next priority is failure classification and retry policy.")
        brutal_feedback.append("Do not call this autonomous until recurring failures are routed to RCA, retry, and owner escalation.")
    if not schedules:
        brutal_feedback.append("Scheduling is still immature: no recurring monitor jobs are registered.")
    if not live_agents:
        brutal_feedback.append("There is no execution visibility without live heartbeats. Start the workers before trusting any dashboard.")
    if live_agents and processed_total == 0:
        brutal_feedback.append("Agents are alive but not proving throughput yet. Keep smoke tasks running until processed counts move.")
    if catalog.get("processes", 0) < 50:
        insights.append("Process-test catalog exists, but coverage should grow with every new department workflow.")
    if not brutal_feedback:
        brutal_feedback.append("The stack is usable now; the remaining hardening work is SLA alerts, retry lanes, and persisted trace history.")

    return {
        "scores": {
            "health": health_score,
            "execution": execution_score,
            "quality": quality_score,
            "completion": completion_rate,
            "observability": observability_score,
        },
        "tracking": {
            "live_agents": live_agents,
            "running_agents": running_agents,
            "stale_agents": stale_agents,
            "processed_total": processed_total,
            "completed_total": completed_total,
            "pending_total": pending_total,
            "recent_success_rate": recent_success_rate,
            "recent_sample_size": recent_count,
        },
        "operations": operation_rows,
        "tracing": (trace_log.get("recent") or trace_rows)[:50],
        "failure_taxonomy": trace_log.get("by_failure_category", {}),
        "failure_owners": trace_log.get("by_owner", {}),
        "durable_trace_total": trace_log.get("total", 0),
        "retryable_failures": trace_log.get("retryable", 0),
        "reporting": reporting,
        "insights": insights,
        "brutal_feedback": brutal_feedback,
    }



def advanced_feature_gap_report(report: dict[str, Any]) -> dict[str, Any]:
    """Summarize missing advanced agent features and safe delegation advice.

    This is a read-only recommendation layer. It does not enqueue, retry, or
    reassign tasks; workers and OpenClaw keep owning execution.
    """
    queues = report["queues"]
    heartbeats = report["heartbeats"]["rows"]
    schedules = report["schedules"]
    trace_log = report.get("trace_log", {})
    pending_total = int(report.get("pending_total", 0) or 0)
    recent_failures = int(report.get("recent_failure_count", 0) or 0)
    live_by_kind = Counter(str(row.get("kind", "unknown")) for row in heartbeats)
    stale_agents = sum(1 for row in heartbeats if (row.get("age_sec") or 0) > 30)
    processed_total = sum(int(row.get("processed", 0) or 0) for row in heartbeats)
    durable_traces = int(trace_log.get("total", 0) or 0)
    retryable = int(trace_log.get("retryable", 0) or 0)

    capability_rows = [
        {
            "capability": "simple execution",
            "queue": "tasks",
            "done_queue": "done",
            "agent_kind": "simple",
            "live_agents": live_by_kind.get("simple", 0),
            "pending": queues.get("simple", {}).get("pending", 0),
            "recommended_for": "low-risk implementation, summarization, data checks, and repeatable single-agent tasks",
        },
        {
            "capability": "council review",
            "queue": "council_tasks",
            "done_queue": "council_done",
            "agent_kind": "council",
            "live_agents": live_by_kind.get("council", 0),
            "pending": queues.get("council", {}).get("pending", 0),
            "recommended_for": "architecture review, governance checks, risk review, and multi-agent arbitration",
        },
        {
            "capability": "test validation",
            "queue": "test_tasks",
            "done_queue": "test_results",
            "agent_kind": "test",
            "live_agents": live_by_kind.get("test", 0),
            "pending": queues.get("test", {}).get("pending", 0),
            "recommended_for": "targeted test execution, cron drills, quality gates, and regression checks",
        },
    ]

    delegation_plan: list[dict[str, Any]] = []
    for row in capability_rows:
        if row["pending"] and row["live_agents"]:
            delegation_plan.append(
                {
                    "queue": row["queue"],
                    "agent_kind": row["agent_kind"],
                    "action": "let workers drain existing queue",
                    "priority": "high" if row["pending"] > row["live_agents"] * 2 else "normal",
                    "reason": f"{row['pending']} pending tasks and {row['live_agents']} live {row['agent_kind']} agents",
                }
            )
        elif row["pending"] and not row["live_agents"]:
            delegation_plan.append(
                {
                    "queue": row["queue"],
                    "agent_kind": row["agent_kind"],
                    "action": "start matching workers before adding more tasks",
                    "priority": "critical",
                    "reason": f"{row['pending']} pending tasks but no live {row['agent_kind']} agents",
                }
            )
    if not delegation_plan:
        delegation_plan.append(
            {
                "queue": "all",
                "agent_kind": "supervisor",
                "action": "submit a smoke task or schedule recurring checks before claiming throughput",
                "priority": "normal",
                "reason": "no pending delegation pressure was found in the sampled queues",
            }
        )

    missing_features = [
        {
            "feature": "capability-aware routing",
            "status": "partial",
            "gap": "OpenClaw chooses simple/council mode, but there is no scored router that selects agents from skills, cost, SLA, or risk.",
            "enhancement": "Add a router policy that maps task type, department, risk, and required tools to queue and agent role.",
        },
        {
            "feature": "dead-letter queue and retry backoff",
            "status": "missing" if retryable == 0 else "partial",
            "gap": "Failed tasks are visible, but retry lanes and dead-letter queues are not first-class supervisor objects.",
            "enhancement": "Persist retry_count, next_retry_at, failure_category, and owner; move exhausted failures to dlq_tasks.",
        },
        {
            "feature": "SLA monitoring",
            "status": "partial",
            "gap": "Queue depth and heartbeat age exist, but task age, due time, and SLA breach counters are not enforced.",
            "enhancement": "Track queued_at/started_at/completed_at and emit breach counts by department and queue.",
        },
        {
            "feature": "agent capability registry",
            "status": "partial",
            "gap": "Heartbeats expose kind/state/processed, but not model, skills, max concurrency, tools, or current assignment.",
            "enhancement": "Extend heartbeat payloads with capabilities, model, active_task_id, lease_expires_at, and tool allowlist.",
        },
        {
            "feature": "task lineage and parent-child delegation",
            "status": "missing",
            "gap": "Task IDs are tracked, but parent_task_id, delegated_by, and child task fanout are not normalized.",
            "enhancement": "Add parent_task_id, delegated_by, delegation_reason, and child_task_ids to task/result envelopes.",
        },
        {
            "feature": "metrics export",
            "status": "partial",
            "gap": "JSON reports exist, but Prometheus/OpenTelemetry export is target-only.",
            "enhancement": "Expose queue depth, success rate, stale heartbeat count, failures, and SLA breaches as scrapeable metrics.",
        },
        {
            "feature": "operator escalation policy",
            "status": "partial",
            "gap": "Recommendations exist, but owner escalation and alert routing are not automated.",
            "enhancement": "Map failure categories to owners, severity, notification channel, and required approval gate.",
        },
    ]

    readiness_score = max(
        0,
        min(
            100,
            round(
                (100 if heartbeats else 0) * 0.20
                + (100 if schedules else 35) * 0.10
                + (100 if durable_traces else 35) * 0.15
                + (100 if processed_total else 50) * 0.15
                + (100 if not recent_failures else 50) * 0.15
                + (100 if pending_total <= max(len(heartbeats), 1) * 2 else 45) * 0.15
                + (100 if not stale_agents else 60) * 0.10
            ),
        ),
    )

    return {
        "readiness_score": readiness_score,
        "status": "ready" if readiness_score >= 80 else "watch" if readiness_score >= 60 else "needs_work",
        "monitoring_features_present": [
            "queue depth",
            "completion samples",
            "agent heartbeats",
            "heartbeat age",
            "schedule visibility",
            "process-test catalog coverage",
            "durable trace JSONL summary",
            "failure taxonomy summary",
            "operator recommendations",
        ],
        "missing_advanced_features": missing_features,
        "capability_registry": capability_rows,
        "delegation_plan": delegation_plan,
        "tracking_controls": {
            "live_agents": len(heartbeats),
            "stale_agents": stale_agents,
            "processed_total": processed_total,
            "pending_total": pending_total,
            "recent_failures": recent_failures,
            "durable_traces": durable_traces,
            "retryable_failures": retryable,
        },
        "safe_next_steps": [
            "Use OpenClaw mode routing for simple vs council tasks until a scored router exists.",
            "Start matching workers before adding work to a queue with pending backlog.",
            "Add parent_task_id/delegated_by fields before enabling multi-step delegation.",
            "Keep real browser/CUA actions approval-gated and excluded from auto-delegation.",
        ],
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

    report = {
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
        "trace_log": trace_log_summary(max(sample, 20)),
        "recent_results": results,
        "recent_failure_count": failures,
        "recommendations": recommendations,
    }
    report["operations_visibility"] = derive_operations(report)
    report["advanced_agent_features"] = advanced_feature_gap_report(report)
    return report


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
    advanced = report.get("advanced_agent_features", {})
    if advanced:
        print(f"Advanced readiness: {advanced.get('status')} score={advanced.get('readiness_score')}")
        for item in advanced.get("delegation_plan", [])[:5]:
            print(f"Delegation: {item.get('priority')} {item.get('agent_kind')} -> {item.get('action')} ({item.get('reason')})")
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
    if args.cmd == "advanced":
        print(json.dumps(report.get("advanced_agent_features", {}), indent=2, sort_keys=True))
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
