"""
WHAT:           Brutal-feedback scorer for the agent fleet — surfaces uncomfortable truths from the durable trace log.
WHY:            "Dashboards show status" rolls up too cleanly. Operators need "agents alive but no throughput", "schedules without scheduled output", "failures without owner", "no dead-letter routing" — phrased as accusations, not metrics.
WHEN:           Called by the agent-supervisor reporter. Re-runs on every cockpit refresh + on the cron-driven /api/v1/agent-supervisor/report endpoint.
OBJECTIVE:      Replace polite "✓ healthy" with named gaps an on-call can act on within 5 minutes (per §57.5).
GIVEN:          data/agent-supervisor/task_traces.jsonl exists with rows produced by agent_observability.build_trace(). Fleet state (agent count · queue depths · schedule names) provided by caller.
APPROACH:       Apply N rules (each: name · severity · evaluator · evidence-emitter) against the most recent K trace rows + fleet snapshot. Each rule returns either None (pass) or a Finding(name, severity, message, evidence_rows).
SEQUENCE:       1. load recent traces 2. snapshot fleet state 3. apply each rule 4. emit findings sorted by severity 5. caller renders in cockpit.
INTEGRATION:    §38 audit · §40 decision · §43 drills · §57.5 5-question runbook · §57.6.1 16-field golden-rule (used by GoldenRuleIncompleteness rule) · §82 observability (Critical row alerts) · §83.6 forced-sequence gap (Council-bypass rule).
OBSERVABILITY:  Findings JSON returned to caller. No file writes — stateless. Each finding includes evidence (up to 3 trace rows) so an operator can grep the JSONL.
TRACING:        No OTel spans — read-only scoring layer.
EXPLAINABILITY: Every finding includes the rule's intent + the rows that triggered it. Auditor query: `grep finding_id=<id> in cockpit logs`.
"""

from __future__ import annotations

import json
import time
from collections import Counter
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Callable

from agents.agent_observability import (
    GOLDEN_RULE_MANDATORY,
    TRACE_PATH,
    golden_rule_completeness,
)


# ─── Finding model ──────────────────────────────────────────────────────

SEVERITY_ORDER = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}


@dataclass
class Finding:
    rule:        str
    severity:    str         # P0 (critical) / P1 / P2 / P3
    title:       str         # Short brutal accusation
    message:     str         # 1-2 sentence detail
    evidence:    list[dict] = field(default_factory=list)  # Up to 3 trace rows
    owner_hint:  str = ""    # Suggested team to escalate to
    next_action: str = ""    # 1-line operator action

    def to_dict(self) -> dict:
        d = asdict(self)
        # Truncate evidence rows to keep cockpit payloads small
        d["evidence"] = [
            {k: v for k, v in row.items() if k in ("task_id", "agent_id", "queue", "failure_category", "status", "ts", "schedule_name")}
            for row in self.evidence[:3]
        ]
        return d


# ─── Rule helpers ───────────────────────────────────────────────────────

def _load_recent_traces(limit: int = 200) -> list[dict]:
    """Read the last `limit` rows from the trace JSONL. Tolerant of missing file."""
    p = Path(TRACE_PATH)
    if not p.exists():
        return []
    try:
        with p.open(encoding="utf-8") as fh:
            lines = fh.readlines()
        rows = []
        for line in lines[-limit:]:
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                continue
        return rows
    except Exception:
        return []


# ─── Brutal-feedback rules ──────────────────────────────────────────────
# Each rule: (fleet, traces) → list[Finding]. Rules accuse, not describe.

def rule_no_throughput(fleet: dict, traces: list[dict]) -> list[Finding]:
    """Agents alive but no completions in the last 15 minutes."""
    live_agents = fleet.get("live_agents") or 0
    if live_agents < 5:
        return []  # Small fleet; throughput rule doesn't apply
    now = time.time()
    completed_recent = [r for r in traces if r.get("ok") is True and (now - (r.get("ts") or 0)) < 900]
    if not completed_recent:
        return [Finding(
            rule="no_throughput",
            severity="P0",
            title=f"{live_agents} agents alive but zero throughput in last 15 minutes",
            message="Fleet is consuming compute but producing nothing. Either queues are empty (waste) or workers are stuck (incident).",
            evidence=traces[-3:],
            owner_hint="AgentOps + SRE",
            next_action="Check `redis-cli llen tasks` and `docker compose logs --tail=50 agents`.",
        )]
    return []


def rule_schedules_without_output(fleet: dict, traces: list[dict]) -> list[Finding]:
    """Schedules exist but their tasks have no completed runs in last 1h."""
    schedules = set(fleet.get("schedules") or [])
    if not schedules:
        return []
    one_hour_ago = time.time() - 3600
    recent = [r for r in traces if (r.get("ts") or 0) > one_hour_ago]
    seen_schedules = {r.get("schedule_name") for r in recent if r.get("schedule_name")}
    missing = schedules - seen_schedules
    if not missing:
        return []
    return [Finding(
        rule="schedules_without_output",
        severity="P1",
        title=f"{len(missing)} schedule(s) defined but produced no traces in last hour",
        message=f"Schedule(s) {sorted(missing)} are configured but not landing rows in the trace log. Either the scheduler isn't running or its tasks aren't being routed.",
        evidence=[],
        owner_hint="SRE",
        next_action="Check `docker compose ps scheduler` and `redis-cli xinfo` on the schedule stream.",
    )]


def rule_failures_without_owner(fleet: dict, traces: list[dict]) -> list[Finding]:
    """Failed tasks where `owner` is 'none' or missing — no escalation path."""
    failed = [r for r in traces if r.get("ok") is False]
    if not failed:
        return []
    no_owner = [r for r in failed if r.get("owner") in (None, "", "none")]
    if not no_owner:
        return []
    return [Finding(
        rule="failures_without_owner",
        severity="P1",
        title=f"{len(no_owner)} failed task(s) have no owner — no one will pick them up",
        message="Failures without an `owner` field die in the trace log. The retry_policy() should always assign an owner — investigate why it's empty here.",
        evidence=no_owner[-3:],
        owner_hint="AgentOps",
        next_action="Inspect `retry_policy()` in agent_observability.py and add an owner for every failure_category.",
    )]


def rule_no_dead_letter_routing(fleet: dict, traces: list[dict]) -> list[Finding]:
    """High retry_count rows still going to `tasks` instead of `dead_letter_tasks`."""
    repeated_failures = [
        r for r in traces
        if r.get("ok") is False
        and (r.get("retry_count") or 0) >= 3
        and r.get("next_queue") not in ("dead_letter_tasks", "manual_review_tasks")
    ]
    if not repeated_failures:
        return []
    return [Finding(
        rule="no_dead_letter_routing",
        severity="P0",
        title=f"{len(repeated_failures)} task(s) with 3+ retries still routed to live queue — no dead-letter discipline",
        message="Tasks that have failed 3+ times should route to `dead_letter_tasks` or `manual_review_tasks` per §83.7 escalation. They're going back to the main queue and will retry forever.",
        evidence=repeated_failures[-3:],
        owner_hint="AgentOps + Platform",
        next_action="Wire `retry_policy()` to route retry_count >= 3 to dead_letter_tasks queue + monitor the queue.",
    )]


def rule_golden_rule_incompleteness(fleet: dict, traces: list[dict]) -> list[Finding]:
    """Trace rows missing mandatory §57.6.1 + §83.6 fields → tombstones."""
    tombstones = []
    for r in traces[-50:]:  # Sample recent rows
        complete, missing = golden_rule_completeness(r)
        if not complete:
            tombstones.append((r, missing))
    if not tombstones:
        return []
    field_counts = Counter(m for _, ms in tombstones for m in ms)
    most_missing = field_counts.most_common(3)
    return [Finding(
        rule="golden_rule_incompleteness",
        severity="P0",
        title=f"{len(tombstones)} trace row(s) missing §57.6.1 mandatory fields — these are tombstones, not audit rows",
        message=f"Per §48.11: missing any of {GOLDEN_RULE_MANDATORY} on a regulated decision = unreproducible. Most-missing: {', '.join(f'{f} (×{c})' for f, c in most_missing)}.",
        evidence=[r for r, _ in tombstones[:3]],
        owner_hint="Engineering + Compliance",
        next_action="Update upstream callers of build_trace() to populate the §83.6 16-field set.",
    )]


def rule_failure_taxonomy_unknown_dominant(fleet: dict, traces: list[dict]) -> list[Finding]:
    """If >20% of failures classify as 'unknown', the classifier is blind."""
    failed = [r for r in traces if r.get("ok") is False]
    if len(failed) < 5:
        return []
    unknown = [r for r in failed if r.get("failure_category") == "unknown"]
    pct = len(unknown) / len(failed)
    if pct < 0.20:
        return []
    return [Finding(
        rule="failure_taxonomy_unknown_dominant",
        severity="P1",
        title=f"{len(unknown)} of {len(failed)} failures ({int(pct*100)}%) classify as 'unknown' — the taxonomy is blind",
        message="Per §82 alert wiring: more than 20% of failures with category=unknown means classify_failure() doesn't recognize the actual failure shape. Add new categories or refine regex patterns.",
        evidence=unknown[-3:],
        owner_hint="AgentOps + AI Platform",
        next_action="Add categories to classify_failure() in agent_observability.py based on the error strings in evidence.",
    )]


def rule_backlog_risk(fleet: dict, traces: list[dict]) -> list[Finding]:
    """Pending queue depth > live_agents × 2 means workers are saturated."""
    pending = fleet.get("pending_tasks") or 0
    live_agents = fleet.get("live_agents") or 1
    if pending <= live_agents * 2:
        return []
    return [Finding(
        rule="backlog_risk",
        severity="P1",
        title=f"Pending queue depth {pending} is {pending // live_agents}× the live-agent count — workers are saturated",
        message="When queue depth exceeds 2× the worker count, latency rises non-linearly. Either scale up workers or shed load.",
        evidence=[],
        owner_hint="SRE",
        next_action=f"Scale workers: `docker compose up -d --scale agents={(pending // 2) + 1}` OR throttle producers.",
    )]


# ─── Public API ─────────────────────────────────────────────────────────

ALL_RULES: list[Callable[[dict, list[dict]], list[Finding]]] = [
    rule_no_throughput,
    rule_schedules_without_output,
    rule_failures_without_owner,
    rule_no_dead_letter_routing,
    rule_golden_rule_incompleteness,
    rule_failure_taxonomy_unknown_dominant,
    rule_backlog_risk,
]


def score(fleet: dict[str, Any], traces: list[dict] | None = None) -> dict[str, Any]:
    """Run every rule and return a structured report.

    Args:
        fleet: dict with at least `live_agents`, `pending_tasks`, `schedules` (list of names).
        traces: list of recent trace dicts. If None, loads the last 200 from TRACE_PATH.

    Returns:
        dict with `findings` (list of Finding.to_dict()), `summary` counts by severity,
        and `overall_health_score` (0-100, lower for more findings).
    """
    if traces is None:
        traces = _load_recent_traces(limit=200)

    findings: list[Finding] = []
    for rule in ALL_RULES:
        try:
            result = rule(fleet, traces)
            if result:
                findings.extend(result)
        except Exception as e:
            # Per §57.7: don't let a rule blowup break the report. Log + continue.
            findings.append(Finding(
                rule=f"{rule.__name__}__internal_error",
                severity="P2",
                title=f"Rule {rule.__name__} crashed",
                message=f"Internal error: {e}",
            ))

    # Sort by severity, then by rule name for determinism
    findings.sort(key=lambda f: (SEVERITY_ORDER.get(f.severity, 99), f.rule))

    summary = Counter(f.severity for f in findings)
    # Health score: P0=-25, P1=-10, P2=-3, P3=-1; floor at 0
    score_val = 100 - (
        25 * summary.get("P0", 0)
        + 10 * summary.get("P1", 0)
        +  3 * summary.get("P2", 0)
        +  1 * summary.get("P3", 0)
    )
    score_val = max(0, score_val)

    return {
        "ts": time.time(),
        "traces_scored": len(traces),
        "summary": dict(summary),
        "overall_health_score": score_val,
        "findings": [f.to_dict() for f in findings],
    }


# ─── CLI for ops + drills ───────────────────────────────────────────────

if __name__ == "__main__":  # pragma: no cover
    import sys
    fleet_stub = {
        "live_agents": 105,
        "pending_tasks": 0,
        "schedules": ["ops-health-smoke", "ops-failure-rca", "ops-council-review"],
    }
    report = score(fleet_stub)
    json.dump(report, sys.stdout, indent=2, default=str)
    print()
