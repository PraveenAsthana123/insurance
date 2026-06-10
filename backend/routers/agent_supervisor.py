"""Live agent supervisor API.

Read-only HTTP wrapper around the Redis-backed agent fleet state. This powers
frontend command-center visibility without shell access.
"""
from __future__ import annotations

import json
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import redis
from fastapi import APIRouter, Query

from core.config import get_settings

# Operator 2026-06-05: structured brutal-feedback scorer (§57.5 + §82 alerting).
# Wraps in try/except so a missing module never breaks the report endpoint.
try:
    from agents.agent_brutal_feedback import score as _brutal_score
except Exception:
    _brutal_score = None

router = APIRouter(prefix="/api/v1/agent-supervisor", tags=["agent-supervisor"])

ROOT_DIR = Path(__file__).resolve().parents[2]
PROCESS_CATALOG = ROOT_DIR / "docs" / "testing" / "PROCESS_AGENT_CRON_CATALOG.json"
TRACE_LOG = ROOT_DIR / "data" / "agent-supervisor" / "task_traces.jsonl"
QUEUE_PAIRS = {
    "simple": ("tasks", "done"),
    "council": ("council_tasks", "council_done"),
    "test": ("test_tasks", "test_results"),
}
SCHEDULE_SET = "agent:schedules"
SCHEDULE_PREFIX = "agent:schedule:"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _load_json(raw: str | bytes | None) -> dict[str, Any] | None:
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None


def _redact_redis_url(redis_url: str) -> str:
    if "@" not in redis_url:
        return redis_url
    scheme, rest = redis_url.split("://", 1)
    return f"{scheme}://***@{rest.split('@', 1)[1]}"


def _redis_client() -> redis.Redis:
    settings = get_settings()
    client = redis.from_url(
        settings.redis_url,
        decode_responses=True,
        socket_connect_timeout=2,
        socket_timeout=2,
    )
    client.ping()
    return client


def _queue_snapshot(client: redis.Redis) -> dict[str, dict[str, int]]:
    return {
        name: {"pending": client.llen(pending), "completed": client.llen(done)}
        for name, (pending, done) in QUEUE_PAIRS.items()
    }


def _heartbeat_rows(client: redis.Redis) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for key in sorted(client.scan_iter("agent:heartbeat:*")):
        data = _load_json(client.get(key))
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
                "last_task_id": data.get("last_task_id") or data.get("task_id") or "",
            }
        )
    return rows


def _recent_results(client: redis.Redis, sample: int) -> dict[str, list[dict[str, Any]]]:
    results: dict[str, list[dict[str, Any]]] = {}
    for name, (_, done_key) in QUEUE_PAIRS.items():
        items: list[dict[str, Any]] = []
        for raw in client.lrange(done_key, 0, max(sample - 1, 0)):
            item = _load_json(raw) or {"ok": False, "error": "result is not valid JSON", "raw": str(raw)[:200]}
            items.append(item)
        results[name] = items
    return results


def _result_is_failure(item: dict[str, Any]) -> bool:
    if item.get("ok") is False:
        return True
    status = str(item.get("status", "")).lower()
    return status in {"error", "failed", "failure"}


def _schedule_rows(client: redis.Redis) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for name in sorted(client.smembers(SCHEDULE_SET)):
        row = _load_json(client.get(SCHEDULE_PREFIX + name))
        if row:
            rows.append(row)
    return rows


def _process_catalog_summary() -> dict[str, Any]:
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




def _derive_operations(report: dict[str, Any]) -> dict[str, Any]:
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
    health_score = max(0, min(100, round(worker_freshness * 0.30 + recent_success_rate * 0.25 + completion_rate * 0.20 + schedule_coverage * 0.10 + catalog_coverage * 0.10 + (100 if pending_total <= max(live_agents, 1) * 2 else 45) * 0.05)))
    execution_score = max(0, min(100, round(recent_success_rate * 0.55 + completion_rate * 0.30 + (100 if running_agents or completed_total else 60) * 0.15)))
    quality_score = max(0, min(100, round(recent_success_rate * 0.60 + (100 if recent_failures == 0 else 55) * 0.25 + catalog_coverage * 0.15)))
    observability_score = max(0, min(100, round((100 if live_agents else 0) * 0.35 + (100 if recent_count else 35) * 0.25 + catalog_coverage * 0.20 + (100 if schedules else 35) * 0.20)))

    trace_rows: list[dict[str, Any]] = []
    for queue_name, rows in recent_results.items():
        for item in rows:
            trace_rows.append({
                "trace_id": item.get("trace_id") or item.get("task_id") or item.get("id") or "unknown",
                "queue": queue_name,
                "task_id": item.get("task_id") or item.get("id") or "unknown",
                "agent_id": item.get("agent_id") or item.get("agent") or "unknown",
                "department": item.get("department") or item.get("dept") or "unknown",
                "status": "success" if item.get("ok") is True else "failed" if _result_is_failure(item) else str(item.get("status", "unknown")),
                "duration_ms": item.get("duration_ms"),
                "tokens": item.get("tokens"),
            })

    operations = [
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

    # Operator 2026-06-05: layer in structured findings from
    # agents/agent_brutal_feedback.py — per-rule severity + evidence + next-action.
    # Coexists with the legacy `brutal_feedback` list (which is human-readable
    # prose). Cockpit may render either or both.
    structured_findings: dict[str, Any] = {"available": False, "findings": [], "summary": {}, "score": None}
    if _brutal_score is not None:
        try:
            fleet_snapshot = {
                "live_agents": live_agents,
                "pending_tasks": pending_total,
                "schedules": [s.get("name") for s in schedules if isinstance(s, dict) and s.get("name")] or list(schedules),
            }
            report = _brutal_score(fleet_snapshot, traces=(trace_log.get("recent") or trace_rows))
            structured_findings = {
                "available": True,
                "findings": report.get("findings", []),
                "summary": report.get("summary", {}),
                "score": report.get("overall_health_score"),
                "traces_scored": report.get("traces_scored", 0),
            }
        except Exception as exc:  # Per §57.7: never let scorer crash the endpoint
            structured_findings = {
                "available": False,
                "error": f"brutal_feedback_scorer_failed: {exc!s}",
            }

    return {
        "scores": {"health": health_score, "execution": execution_score, "quality": quality_score, "completion": completion_rate, "observability": observability_score},
        "tracking": {"live_agents": live_agents, "running_agents": running_agents, "stale_agents": stale_agents, "processed_total": processed_total, "completed_total": completed_total, "pending_total": pending_total, "recent_success_rate": recent_success_rate, "recent_sample_size": recent_count},
        "operations": operations,
        "tracing": (trace_log.get("recent") or trace_rows)[:50],
        "failure_taxonomy": trace_log.get("by_failure_category", {}),
        "failure_owners": trace_log.get("by_owner", {}),
        "durable_trace_total": trace_log.get("total", 0),
        "retryable_failures": trace_log.get("retryable", 0),
        "reporting": reporting,
        "insights": insights,
        "brutal_feedback": brutal_feedback,
        "structured_findings": structured_findings,
    }



def _trace_log_summary(limit: int = 50) -> dict[str, Any]:
    if not TRACE_LOG.exists():
        return {"path": str(TRACE_LOG), "available": False, "total": 0, "recent": [], "by_status": {}, "by_failure_category": {}, "by_owner": {}, "retryable": 0}
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


def _advanced_feature_gap_report(report: dict[str, Any]) -> dict[str, Any]:
    """Return read-only advanced monitoring, tracking, and delegation readiness."""
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
            delegation_plan.append({"queue": row["queue"], "agent_kind": row["agent_kind"], "action": "let workers drain existing queue", "priority": "high" if row["pending"] > row["live_agents"] * 2 else "normal", "reason": f"{row['pending']} pending tasks and {row['live_agents']} live {row['agent_kind']} agents"})
        elif row["pending"] and not row["live_agents"]:
            delegation_plan.append({"queue": row["queue"], "agent_kind": row["agent_kind"], "action": "start matching workers before adding more tasks", "priority": "critical", "reason": f"{row['pending']} pending tasks but no live {row['agent_kind']} agents"})
    if not delegation_plan:
        delegation_plan.append({"queue": "all", "agent_kind": "supervisor", "action": "submit a smoke task or schedule recurring checks before claiming throughput", "priority": "normal", "reason": "no pending delegation pressure was found in the sampled queues"})

    readiness_score = max(0, min(100, round(
        (100 if heartbeats else 0) * 0.20
        + (100 if schedules else 35) * 0.10
        + (100 if durable_traces else 35) * 0.15
        + (100 if processed_total else 50) * 0.15
        + (100 if not recent_failures else 50) * 0.15
        + (100 if pending_total <= max(len(heartbeats), 1) * 2 else 45) * 0.15
        + (100 if not stale_agents else 60) * 0.10
    )))

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
        "missing_advanced_features": [
            {"feature": "capability-aware routing", "status": "partial", "gap": "OpenClaw chooses simple/council mode, but there is no scored router that selects agents from skills, cost, SLA, or risk.", "enhancement": "Add a router policy that maps task type, department, risk, and required tools to queue and agent role."},
            {"feature": "dead-letter queue and retry backoff", "status": "missing" if retryable == 0 else "partial", "gap": "Failed tasks are visible, but retry lanes and dead-letter queues are not first-class supervisor objects.", "enhancement": "Persist retry_count, next_retry_at, failure_category, and owner; move exhausted failures to dlq_tasks."},
            {"feature": "SLA monitoring", "status": "partial", "gap": "Queue depth and heartbeat age exist, but task age, due time, and SLA breach counters are not enforced.", "enhancement": "Track queued_at/started_at/completed_at and emit breach counts by department and queue."},
            {"feature": "agent capability registry", "status": "partial", "gap": "Heartbeats expose kind/state/processed, but not model, skills, max concurrency, tools, or current assignment.", "enhancement": "Extend heartbeat payloads with capabilities, model, active_task_id, lease_expires_at, and tool allowlist."},
            {"feature": "task lineage and parent-child delegation", "status": "missing", "gap": "Task IDs are tracked, but parent_task_id, delegated_by, and child task fanout are not normalized.", "enhancement": "Add parent_task_id, delegated_by, delegation_reason, and child_task_ids to task/result envelopes."},
            {"feature": "metrics export", "status": "partial", "gap": "JSON reports exist, but Prometheus/OpenTelemetry export is target-only.", "enhancement": "Expose queue depth, success rate, stale heartbeat count, failures, and SLA breaches as scrapeable metrics."},
            {"feature": "operator escalation policy", "status": "partial", "gap": "Recommendations exist, but owner escalation and alert routing are not automated.", "enhancement": "Map failure categories to owners, severity, notification channel, and required approval gate."},
        ],
        "capability_registry": capability_rows,
        "delegation_plan": delegation_plan,
        "tracking_controls": {"live_agents": len(heartbeats), "stale_agents": stale_agents, "processed_total": processed_total, "pending_total": pending_total, "recent_failures": recent_failures, "durable_traces": durable_traces, "retryable_failures": retryable},
        "safe_next_steps": [
            "Use OpenClaw mode routing for simple vs council tasks until a scored router exists.",
            "Start matching workers before adding work to a queue with pending backlog.",
            "Add parent_task_id/delegated_by fields before enabling multi-step delegation.",
            "Keep real browser/CUA actions approval-gated and excluded from auto-delegation.",
        ],
    }

def _empty_unavailable_report(detail: str) -> dict[str, Any]:
    report = {
        "generated_at": _utc_now(),
        "status": "unavailable",
        "detail": detail,
        "redis_url": _redact_redis_url(get_settings().redis_url),
        "queues": {name: {"pending": 0, "completed": 0} for name in QUEUE_PAIRS},
        "pending_total": 0,
        "heartbeats": {"live": 0, "by_kind": {}, "rows": []},
        "schedules": [],
        "process_test_catalog": _process_catalog_summary(),
        "trace_log": _trace_log_summary(20),
        "recent_results": {name: [] for name in QUEUE_PAIRS},
        "recent_failure_count": 0,
        "recommendations": ["Redis is unavailable. Start Redis and agent workers before expecting live task movement."],
    }
    report["operations_visibility"] = _derive_operations(report)
    report["advanced_agent_features"] = _advanced_feature_gap_report(report)
    return report


@router.get("/report")
def get_agent_supervisor_report(sample: int = Query(8, ge=1, le=50)) -> dict[str, Any]:
    """Return live Redis queue, heartbeat, schedule, and recent-result state."""
    try:
        client = _redis_client()
    except Exception as exc:
        return _empty_unavailable_report(f"Redis unavailable: {type(exc).__name__}: {exc}")

    queues = _queue_snapshot(client)
    heartbeats = _heartbeat_rows(client)
    results = _recent_results(client, sample)
    failures = sum(1 for rows in results.values() for row in rows if _result_is_failure(row))
    pending_total = sum(row["pending"] for row in queues.values())
    live_by_kind = Counter(str(row.get("kind", "unknown")) for row in heartbeats)
    schedules = _schedule_rows(client)

    recommendations: list[str] = []
    if pending_total and not heartbeats:
        recommendations.append("Pending work exists but no live agent heartbeats were found. Start agents or check Redis URLs.")
    if failures:
        recommendations.append("Recent completed-result samples include failures. Inspect failed task IDs and worker logs.")
    if not schedules:
        recommendations.append("No recurring schedules are registered. Add schedule-add jobs for recurring monitoring.")
    if not recommendations:
        recommendations.append("Agent supervisor state is healthy for the sampled queues.")

    report = {
        "generated_at": _utc_now(),
        "status": "ok",
        "detail": "Live agent supervisor report generated from Redis.",
        "redis_url": _redact_redis_url(get_settings().redis_url),
        "queues": queues,
        "pending_total": pending_total,
        "heartbeats": {
            "live": len(heartbeats),
            "by_kind": dict(sorted(live_by_kind.items())),
            "rows": heartbeats,
        },
        "schedules": schedules,
        "process_test_catalog": _process_catalog_summary(),
        "trace_log": _trace_log_summary(max(sample, 20)),
        "recent_results": results,
        "recent_failure_count": failures,
        "recommendations": recommendations,
    }
    report["operations_visibility"] = _derive_operations(report)
    report["advanced_agent_features"] = _advanced_feature_gap_report(report)
    return report


@router.get("/tasks/{task_id}")
def get_agent_task_result(task_id: str, limit: int = Query(500, ge=1, le=5000)) -> dict[str, Any]:
    """Find one completed task in known result queues."""
    try:
        client = _redis_client()
    except Exception as exc:
        return {"status": "unavailable", "detail": f"Redis unavailable: {type(exc).__name__}: {exc}", "task_id": task_id}

    for queue_name, (_, done_key) in QUEUE_PAIRS.items():
        for index, raw in enumerate(client.lrange(done_key, 0, max(limit - 1, 0))):
            item = _load_json(raw)
            if not item:
                continue
            ids = {str(item.get("task_id", "")), str(item.get("id", ""))}
            if task_id in ids:
                return {"status": "found", "queue": queue_name, "result_index": index, "result": item}
    return {"status": "not_found", "task_id": task_id, "searched_result_limit": limit}
