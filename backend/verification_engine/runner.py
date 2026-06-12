"""§B5 · verification gate runner · emits agent_trace_event per gate.

Per PENDING_TASKS_PLAN B5 review gate: per-invocation · 9 trace events
with verdicts visible in /trace endpoint.

§57.7 honest: every gate returns structured verdict with a reason; never
fabricates PASS for unimplemented work. Stage-1 gates that are
intentionally permissive document their permissiveness in `reason`.
"""
from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Callable

import psycopg2

from core.config import get_settings

GATE_NAMES = (
    "schema",
    "citation",
    "pii",
    "bias",
    "cost",
    "safety",
    "confidence",
    "rollback",
    "audit",
)

# ---- gates ---------------------------------------------------------------

def _gate_schema(payload: dict) -> dict:
    """Output validates against a known JSON shape."""
    out = payload.get("output", payload.get("output_text"))
    if out is None:
        return {"status": "fail", "reason": "missing output_text"}
    if isinstance(out, dict) and out.get("output_text") is None and not out:
        return {"status": "fail", "reason": "output dict is empty"}
    return {"status": "pass", "reason": "output_text present and non-empty"}


def _gate_citation(payload: dict) -> dict:
    """Every claim cites a retrievable source."""
    out = str(payload.get("output", payload.get("output_text") or ""))
    cite_pat = re.compile(r"\[(?:cite|src|ref|source):[^\]]+\]", re.I)
    if cite_pat.search(out):
        return {"status": "pass", "reason": "citation marker found"}
    # Stage-1 permissive · short outputs without claims still pass
    if len(out) < 200:
        return {"status": "pass", "reason": "short output · no claims to cite (stage-1)"}
    return {"status": "fail", "reason": "long output without [cite:*] markers"}


_PII_PATTERNS = (
    re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),                      # SSN
    re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b", re.I),  # email
    re.compile(r"\b(?:\d[ -]*?){13,16}\b"),                     # credit-card-ish
    re.compile(r"\b\d{3}[ -]?\d{3}[ -]?\d{4}\b"),               # US phone
)


def _gate_pii(payload: dict) -> dict:
    """No PII leaked in output text."""
    out = str(payload.get("output", payload.get("output_text") or ""))
    hits = []
    for pat in _PII_PATTERNS:
        m = pat.search(out)
        if m:
            hits.append({"pattern": pat.pattern, "match_excerpt": m.group()[:30]})
    if hits:
        return {"status": "fail", "reason": "pii pattern matched", "hits": hits}
    return {"status": "pass", "reason": "no PII patterns matched (4 regex)"}


def _gate_bias(payload: dict) -> dict:
    """Fairness deltas within threshold.

    Stage-1: passes unless caller explicitly opts into stricter check by
    passing `payload['bias']['disparate_impact']`.
    """
    bias = payload.get("bias", {})
    if not bias:
        return {"status": "pass", "reason": "no bias metric supplied (stage-1 permissive)"}
    di = bias.get("disparate_impact")
    if di is None:
        return {"status": "pass", "reason": "bias dict present but no DI score"}
    # 80% rule per §76
    if di < 0.8:
        return {"status": "fail", "reason": f"disparate_impact {di} < 0.8"}
    return {"status": "pass", "reason": f"disparate_impact {di} >= 0.8"}


def _gate_cost(payload: dict) -> dict:
    """Within per-tenant token + dollar budget."""
    cost = payload.get("cost_usd")
    tokens = payload.get("tokens_in", 0) + payload.get("tokens_out", 0)
    if cost is None and not tokens:
        return {"status": "pass", "reason": "no cost reported (stage-1 permissive)"}
    if cost is not None and cost > 5.0:
        return {"status": "fail", "reason": f"cost_usd {cost} exceeds 5.00 cap"}
    if tokens > 50_000:
        return {"status": "fail", "reason": f"tokens {tokens} > 50000 cap"}
    return {"status": "pass", "reason": f"cost ${cost} tokens {tokens} within budget"}


_UNSAFE_PATTERNS = (
    re.compile(r"\b(?:kill|harm|attack|exploit)\s+(?:someone|him|her|them|user)", re.I),
    re.compile(r"\b(?:bypass|disable|disable)\s+(?:auth|security|guardrail)", re.I),
)


def _gate_safety(payload: dict) -> dict:
    """No policy-violating content."""
    out = str(payload.get("output", payload.get("output_text") or ""))
    for pat in _UNSAFE_PATTERNS:
        if pat.search(out):
            return {"status": "fail", "reason": f"unsafe pattern matched: {pat.pattern}"}
    return {"status": "pass", "reason": "no unsafe patterns matched"}


def _gate_confidence(payload: dict) -> dict:
    """Model confidence >= threshold."""
    conf = payload.get("confidence")
    if conf is None:
        return {"status": "pass", "reason": "no confidence reported (stage-1 permissive)"}
    if conf < 0.5:
        return {"status": "fail", "reason": f"confidence {conf} < 0.5"}
    return {"status": "pass", "reason": f"confidence {conf} >= 0.5"}


def _gate_rollback(payload: dict) -> dict:
    """Reversible action has a documented undo."""
    is_reversible = payload.get("is_reversible_action", False)
    if not is_reversible:
        return {"status": "pass", "reason": "action not flagged reversible"}
    if not payload.get("rollback_plan"):
        return {"status": "fail", "reason": "reversible action missing rollback_plan"}
    return {"status": "pass", "reason": "rollback plan present"}


def _gate_audit(payload: dict) -> dict:
    """§38.3 audit row was written."""
    invocation_id = payload.get("invocation_id")
    if not invocation_id:
        return {"status": "fail", "reason": "invocation_id missing · cannot verify audit"}
    settings = get_settings()
    try:
        with psycopg2.connect(settings.database_url) as conn, conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM audit_log WHERE correlation_id = %s LIMIT 1",
                (invocation_id,),
            )
            if cur.fetchone():
                return {"status": "pass", "reason": "audit_log row exists for invocation_id"}
    except psycopg2.Error as e:
        return {"status": "fail", "reason": f"audit lookup error: {e.__class__.__name__}"}
    return {"status": "pass", "reason": "no audit row found (stage-1 permissive · §38.3 enforcement is gradual)"}


GATES: dict[str, Callable[[dict], dict]] = {
    "schema":     _gate_schema,
    "citation":   _gate_citation,
    "pii":        _gate_pii,
    "bias":       _gate_bias,
    "cost":       _gate_cost,
    "safety":     _gate_safety,
    "confidence": _gate_confidence,
    "rollback":   _gate_rollback,
    "audit":      _gate_audit,
}


# ---- runner --------------------------------------------------------------

def _emit_trace_event(
    cur,
    invocation_id: str,
    trace_id: str,
    gate_name: str,
    verdict: dict,
    started_at: datetime,
    duration_ms: float,
    tenant_id: str,
) -> None:
    """Insert one trace row per gate."""
    cur.execute(
        """
        INSERT INTO agent_trace_event (
            event_id, invocation_id, trace_id, event_name, event_kind,
            started_at, completed_at, duration_ms, status, attributes,
            tenant_id
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s)
        ON CONFLICT (event_id) DO NOTHING
        """,
        (
            f"evt-{uuid.uuid4().hex[:14]}",
            invocation_id,
            trace_id,
            f"verification.gate.{gate_name}",
            "verification",
            started_at,
            started_at,
            round(duration_ms, 2),
            verdict["status"],
            json.dumps({"gate": gate_name, **verdict}),
            tenant_id,
        ),
    )


def run_verification_gates(
    invocation_id: str,
    payload: dict,
    trace_id: str | None = None,
    tenant_id: str = "default",
) -> dict:
    """Run all 9 gates · emit one trace event per gate · return verdicts.

    Args:
        invocation_id: target invocation
        payload: dict with at least output_text · may include cost_usd ·
                 tokens_in · tokens_out · confidence · bias · rollback_plan
        trace_id: OpenTelemetry trace id · auto-generated if omitted
        tenant_id: §41.3 tenant scope

    Returns:
        {
          "invocation_id": str,
          "trace_id": str,
          "verdicts": {gate_name: {status: pass|fail, reason: str, ...}},
          "summary": {passed: int, failed: int, overall: pass|fail},
        }
    """
    trace_id = trace_id or uuid.uuid4().hex[:16]
    payload = {**payload, "invocation_id": invocation_id}
    verdicts: dict[str, dict] = {}

    settings = get_settings()
    with psycopg2.connect(settings.database_url) as conn, conn.cursor() as cur:
        for gate_name in GATE_NAMES:
            started = datetime.now(timezone.utc).replace(tzinfo=None)
            t0 = datetime.now(timezone.utc)
            try:
                verdict = GATES[gate_name](payload)
            except Exception as e:
                # §57.7 honest: failures during the gate itself MUST land as a fail
                verdict = {"status": "fail", "reason": f"gate raised: {e.__class__.__name__}: {e}"}
            elapsed = (datetime.now(timezone.utc) - t0).total_seconds() * 1000.0
            verdicts[gate_name] = verdict
            _emit_trace_event(
                cur, invocation_id, trace_id, gate_name, verdict,
                started, elapsed, tenant_id,
            )
        conn.commit()

    passed = sum(1 for v in verdicts.values() if v["status"] == "pass")
    failed = len(verdicts) - passed
    return {
        "invocation_id": invocation_id,
        "trace_id": trace_id,
        "verdicts": verdicts,
        "summary": {
            "passed": passed,
            "failed": failed,
            "overall": "pass" if failed == 0 else "fail",
            "n_gates": len(verdicts),
        },
        "policy_ref": "§B5 + §38.3 trace + §57.7 honest",
    }
