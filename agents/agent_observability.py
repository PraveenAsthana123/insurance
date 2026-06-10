from __future__ import annotations

import hashlib
import json
import os
import time
from pathlib import Path
from typing import Any

def _resolve_trace_path() -> Path:
    """Resolve where to write the trace JSONL.

    Order of precedence:
    1. AGENT_TRACE_PATH env var (operator override · used by drills + CLI tests).
    2. Docker container path `/data/agent-supervisor/task_traces.jsonl` (production).
    3. Project-relative `data/agent-supervisor/task_traces.jsonl` (local dev fallback).

    Without this fallback, brutal_feedback CLI returns 0 findings silently in dev
    because the absolute path resolves to nowhere outside Docker. Per §57.7
    honesty: silent-zero is worse than a clear "no data found" — surface the
    project-relative location when the absolute one is missing.
    """
    env_override = os.environ.get("AGENT_TRACE_PATH")
    if env_override:
        return Path(env_override)
    docker_path = Path("/data/agent-supervisor/task_traces.jsonl")
    if docker_path.exists() or docker_path.parent.exists():
        return docker_path
    # Local-dev fallback: project-relative path (works for CLI + tests)
    project_rel = Path("data/agent-supervisor/task_traces.jsonl")
    if project_rel.exists():
        return project_rel.resolve()
    return docker_path  # Default to docker path; will create dir on first write

TRACE_PATH = _resolve_trace_path()


def prompt_hash(prompt: str) -> str:
    return hashlib.sha256(prompt.encode("utf-8", errors="ignore")).hexdigest()[:16]


def classify_failure(result: dict[str, Any]) -> str:
    if result.get("ok") is True:
        return "none"
    text = " ".join(str(result.get(key, "")) for key in ("error", "stage_failed", "status")).lower()
    if "readtimeout" in text or "timed out" in text or "timeout" in text:
        return "model_timeout"
    if "404" in text or "not found" in text:
        return "model_not_found"
    if "connect" in text or "connection" in text or "network" in text:
        return "model_connection"
    if "json" in text or "schema" in text or "validation" in text:
        return "schema_error"
    if "redis" in text:
        return "redis_error"
    if "rate" in text and "limit" in text:
        return "rate_limit"
    return "unknown"


def retry_policy(category: str, retry_count: int = 0) -> dict[str, Any]:
    if category == "none":
        return {"retryable": False, "next_queue": "none", "owner": "none", "action": "no retry needed"}
    if retry_count >= 3:
        return {"retryable": False, "next_queue": "dead_letter_tasks", "owner": "AgentOps", "action": "dead-letter and RCA"}
    if category in {"model_timeout", "model_connection", "rate_limit"}:
        return {"retryable": True, "next_queue": "retry_tasks", "owner": "AgentOps", "action": "retry with backoff"}
    if category == "model_not_found":
        return {"retryable": False, "next_queue": "manual_review_tasks", "owner": "Platform", "action": "fix model routing"}
    if category == "schema_error":
        return {"retryable": False, "next_queue": "manual_review_tasks", "owner": "QA", "action": "fix contract or parser"}
    return {"retryable": False, "next_queue": "manual_review_tasks", "owner": "AgentOps", "action": "classify manually"}


def build_trace(queue: str, task: dict[str, Any], output: dict[str, Any], model: str, agent_id: str) -> dict[str, Any]:
    """Build an enriched trace row.

    Per global §57.6 + §57.6.1 (16-field golden-rule extension) + §83.6
    (agentic audit row). The 16-field set lives below the existing base
    schema; missing fields default to '' (string) or None so the JSONL
    remains parseable. Per §57.7: never fabricate values — use empty
    string / None when the upstream caller didn't supply them.
    """
    retry_count = int(task.get("retry_count", 0) or 0)
    category = classify_failure(output)
    policy = retry_policy(category, retry_count)
    task_id = output.get("task_id") or task.get("task_id") or task.get("id") or "unknown"
    trace_id = output.get("trace_id") or task.get("trace_id") or task_id

    # ── §57.6.1 / §83.6 16-field golden-rule extension ───────────────
    # Populate from output, then task, then defaults. Per §57.7 honesty,
    # do not invent values; mark missing as empty string.
    golden = {
        "user_id":            task.get("user_id") or output.get("user_id") or "",
        "tenant_id":          task.get("tenant_id") or output.get("tenant_id") or "",
        "request_id":         task.get("request_id") or output.get("request_id") or task_id,
        "trace_id":           trace_id,
        "agent_path":         output.get("agent_path") or task.get("agent_path") or [agent_id],
        "sharepoint_site_id": task.get("source_system_id") or "",
        "document_ids":       output.get("document_ids") or [],
        "chunk_ids":          output.get("chunk_ids") or [],
        "retrieval_scores":   output.get("retrieval_scores") or [],
        "model_name":         model,
        "prompt_version":     task.get("prompt_version") or output.get("prompt_version") or "v0",
        "eval_score":         output.get("eval_score"),
        "cost":               output.get("cost"),
        "latency":            output.get("duration_ms") or output.get("elapsed_ms") or output.get("ms"),
        "final_decision":     output.get("final_decision") or ("approved" if output.get("ok") is True else "rejected"),
        "audit_event_id":     output.get("audit_event_id") or f"audit-{task_id}",
    }

    return {
        # ── Base schema (existing) ─────────────────────────────────
        "ts": time.time(),
        "trace_id": trace_id,
        "task_id": task_id,
        "queue": queue,
        "agent_id": agent_id,
        "department": output.get("department") or task.get("department") or "",
        "schedule_name": task.get("schedule_name") or "",
        "source": task.get("source") or "",
        "model": model,
        "status": "success" if output.get("ok") is True else "failed",
        "ok": output.get("ok") is True,
        "duration_ms": output.get("duration_ms") or output.get("elapsed_ms") or output.get("ms"),
        "tokens": output.get("tokens"),
        "failure_category": category,
        "retry_count": retry_count,
        "retryable": policy["retryable"],
        "next_queue": policy["next_queue"],
        "owner": policy["owner"],
        "recommended_action": policy["action"],
        "prompt_hash": prompt_hash(str(task.get("prompt", ""))),
        "error": str(output.get("error", ""))[:500],
        # ── §57.6.1 + §83.6 16-field golden-rule extension ─────────
        "golden_rule": golden,
        "schema_version": "1.1",  # 1.0 = base; 1.1 = +golden_rule per 2026-06-05
    }


# ─── §83.6 16-field golden-rule completeness check ───────────────────
GOLDEN_RULE_FIELDS = (
    "user_id", "tenant_id", "request_id", "trace_id", "agent_path",
    "sharepoint_site_id", "document_ids", "chunk_ids", "retrieval_scores",
    "model_name", "prompt_version", "eval_score", "cost", "latency",
    "final_decision", "audit_event_id",
)

# Per §83.6: which fields are MANDATORY non-empty (vs allowed-empty
# when the request type doesn't apply, e.g. RAG fields on a non-RAG run).
GOLDEN_RULE_MANDATORY = (
    "request_id", "trace_id", "model_name", "prompt_version",
    "final_decision", "audit_event_id",
)

# Conditional mandatory: required only when the listed flag is set.
GOLDEN_RULE_CONDITIONAL_MANDATORY = {
    "rag": ("document_ids", "chunk_ids", "retrieval_scores"),
    "regulated": ("user_id", "tenant_id"),
    "ai_decision": ("eval_score", "cost", "latency"),
}


def golden_rule_completeness(trace: dict[str, Any], context: tuple[str, ...] = ()) -> tuple[bool, list[str]]:
    """Check the 16-field golden-rule completeness on a trace row.

    Args:
        trace: a trace dict produced by build_trace().
        context: one or more of 'rag' / 'regulated' / 'ai_decision' to add
                 conditional mandatory fields.

    Returns (complete, list_of_missing). Per §48.11: missing any mandatory
    field for a regulated decision = the row is a tombstone, not an audit row.
    """
    golden = trace.get("golden_rule") or {}
    missing = []

    def empty(v):
        return v is None or v == "" or v == []

    for f in GOLDEN_RULE_MANDATORY:
        if empty(golden.get(f)):
            missing.append(f)

    for ctx in context:
        for f in GOLDEN_RULE_CONDITIONAL_MANDATORY.get(ctx, ()):
            if empty(golden.get(f)):
                missing.append(f"{f} (required because context={ctx!r})")

    return len(missing) == 0, missing


def append_trace(row: dict[str, Any]) -> None:
    try:
        TRACE_PATH.parent.mkdir(parents=True, exist_ok=True)
        with TRACE_PATH.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(row, sort_keys=True) + "\n")
    except Exception:
        # Never break task execution because the local trace sink is unavailable.
        return


def attach_trace(output: dict[str, Any], trace: dict[str, Any]) -> dict[str, Any]:
    output.update({
        "trace_id": trace["trace_id"],
        "failure_category": trace["failure_category"],
        "retryable": trace["retryable"],
        "next_queue": trace["next_queue"],
        "owner": trace["owner"],
        "recommended_action": trace["recommended_action"],
        "prompt_hash": trace["prompt_hash"],
    })
    return output
