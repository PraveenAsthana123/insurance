"""§68.5 Guardrails — answers "did the guardrails fire? what did they catch?"

Read-only aggregation surface over a guardrail-decisions JSONL log
(`data/agent-supervisor/guardrail_decisions.jsonl` by default; override
via INSUR_GUARDRAIL_LOG env). The WRITE side (middleware that appends a
row when a guardrail fires — prompt-injection filter, output toxicity
classifier, scope-denial, rate-limit hit, etc.) is a separate iteration
of §68.5; this commit ships only the READ surface so operators can
answer "show me the last 24h of denials by dept" today.

Per §68.5 schema: every row carries
  ts, tenant_id, actor, guardrail_type, input_hash, decision,
  filter_id, latency_ms

Optional row fields: dept, request_id, surface, reason, transformation.

PII never appears in the row — only the SHA-256 input_hash. That makes
the surface tenant-shareable without re-redaction at read time.

Per §57.7: missing file → empty envelope, not crash. Per §47.6: invalid
filter / dept names rejected BEFORE log read so failed-enumeration
attempts don't shape audit pollution.
"""
from __future__ import annotations

import json
import logging
import os
import re
import time
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_LOG_CANDIDATES = [
    Path(__file__).resolve().parents[2] / "data" / "agent-supervisor" / "guardrail_decisions.jsonl",
    Path("/app/data/agent-supervisor/guardrail_decisions.jsonl"),
    Path("/data/agent-supervisor/guardrail_decisions.jsonl"),
]

_VALID_DECISIONS = frozenset({"allow", "deny", "transform"})

# Known guardrail families (advisory — service doesn't reject unknown
# ones, just doesn't aggregate them under canonical names).
KNOWN_GUARDRAIL_TYPES = frozenset({
    "prompt_injection", "output_toxicity", "pii_redaction",
    "scope_denial", "rate_limit", "cost_ceiling", "hallucination",
    "schema_validation", "tool_authz",
})


def _log_path() -> Path | None:
    """Resolve the active guardrail log. INSUR_GUARDRAIL_LOG env wins
    so tests + alternate deploys can override (same pattern as §68.6).
    """
    env_override = os.environ.get("INSUR_GUARDRAIL_LOG")
    if env_override:
        p = Path(env_override)
        if p.exists():
            return p
        # Even if override doesn't exist yet, prefer it — read may follow a write
        return p
    for p in _LOG_CANDIDATES:
        if p.exists():
            return p
    return _LOG_CANDIDATES[0]  # canonical fallback path (may not exist yet)


def _read_rows(since_epoch: float = 0.0, max_rows: int = 5000) -> list[dict[str, Any]]:
    """Read JSONL rows, newest-first up to max_rows, filtered by since.

    Best-effort: corrupt JSON lines skipped, missing file returns [].
    """
    p = _log_path()
    if p is None or not p.exists():
        return []
    rows: list[dict[str, Any]] = []
    try:
        for line in p.read_text(errors="replace").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            if not isinstance(row, dict):
                continue
            if since_epoch and row.get("ts", 0) < since_epoch:
                continue
            rows.append(row)
    except OSError as exc:
        logger.info("guardrails: log unreadable (%s)", type(exc).__name__)
        return []
    # Newest-first
    rows.sort(key=lambda r: r.get("ts", 0), reverse=True)
    return rows[:max_rows]


def global_summary(since_epoch: float = 0.0) -> dict[str, Any]:
    """Cross-dept rollup: counts per guardrail_type x decision, plus
    per-dept totals."""
    rows = _read_rows(since_epoch=since_epoch)

    by_type: Counter[str] = Counter()
    by_decision: Counter[str] = Counter()
    by_type_decision: dict[str, Counter[str]] = defaultdict(Counter)
    by_dept: Counter[str] = Counter()
    by_filter: Counter[str] = Counter()

    for row in rows:
        gt = str(row.get("guardrail_type", "unknown"))
        dec = str(row.get("decision", "unknown"))
        by_type[gt] += 1
        by_decision[dec] += 1
        by_type_decision[gt][dec] += 1
        dept = row.get("dept")
        if dept:
            by_dept[str(dept)] += 1
        fid = row.get("filter_id")
        if fid:
            by_filter[str(fid)] += 1

    return {
        "policy": "§68.5 Guardrails",
        "log_path": str(_log_path()),
        "n_rows": len(rows),
        "since_epoch": since_epoch,
        "by_guardrail_type": dict(by_type),
        "by_decision": dict(by_decision),
        "by_type_x_decision": {gt: dict(d) for gt, d in by_type_decision.items()},
        "by_dept": dict(by_dept),
        "by_filter": dict(by_filter),
        "known_guardrail_types": sorted(KNOWN_GUARDRAIL_TYPES),
        "scanned_at": time.time(),
    }


def per_dept_decisions(
    dept: str,
    *,
    decision: str | None = None,
    guardrail_type: str | None = None,
    since_epoch: float = 0.0,
    limit: int = 100,
) -> dict[str, Any]:
    """Per-dept guardrail decisions, newest-first, with optional filters."""
    rows = _read_rows(since_epoch=since_epoch)
    matched = [r for r in rows if str(r.get("dept", "")) == dept]
    if decision is not None:
        if decision not in _VALID_DECISIONS:
            return {"dept": dept, "status": "invalid_decision_filter",
                    "valid_decisions": sorted(_VALID_DECISIONS), "rows": []}
        matched = [r for r in matched if str(r.get("decision", "")) == decision]
    if guardrail_type is not None:
        matched = [r for r in matched if str(r.get("guardrail_type", "")) == guardrail_type]
    matched = matched[:limit]

    return {
        "dept": dept,
        "filters": {
            "decision": decision,
            "guardrail_type": guardrail_type,
            "since_epoch": since_epoch,
            "limit": limit,
        },
        "n_rows": len(matched),
        "rows": matched,
        "scanned_at": time.time(),
    }


_DECISION_ID_RE = re.compile(r"^[A-Za-z0-9_.:-]+$")


def get_decision(decision_id: str) -> dict[str, Any] | None:
    """Look up a single guardrail decision by its row's request_id or
    explicit decision_id field. Returns None if not found."""
    if not _DECISION_ID_RE.match(decision_id):
        return {"status": "invalid_decision_id", "valid_pattern": _DECISION_ID_RE.pattern}
    rows = _read_rows()
    for row in rows:
        if str(row.get("decision_id", "")) == decision_id:
            return {"status": "found", "row": row, "scanned_at": time.time()}
        if str(row.get("request_id", "")) == decision_id:
            return {"status": "found", "row": row, "scanned_at": time.time()}
    return None
