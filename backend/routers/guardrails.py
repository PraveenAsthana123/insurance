"""§68.5 Guardrails router.

3 endpoints under /api/v1/holy/guardrails/* federated via core.holy_audit
(surface=guardrails). Answers operator's question: "Did the guardrails
fire? What did they catch? Show me the decision detail."

Composes with §38.3 (audit on read) + §47.6 (validator-first; PII never
in row, only input_hash) + §57.7 (graceful when no log yet) + §64.43 #7
(federation) + §68 (Observability Hub iter 2).
"""
from __future__ import annotations

import re
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request

from core.holy_audit import log_holy_access
from services import guardrails_service as gr

router = APIRouter(prefix="/api/v1/holy/guardrails", tags=["holy", "guardrails"])

HOLY_DEPTS = [
    "digital-marketing", "customer-experience", "supply-chain", "manufacturing",
    "product-rd", "retail-operations", "sales", "finance", "hr", "procurement",
    "executive-leadership", "e-commerce", "customer-support", "engineering",
    "it-operations", "legal", "marketing", "operations", "security-operations",
]

_VALID_DECISIONS = {"allow", "deny", "transform"}
_TYPE_RE = re.compile(r"^[a-z][a-z0-9_]*$")
_DECISION_ID_RE = re.compile(r"^[A-Za-z0-9_.:-]+$")


def _validate_dept(dept: str) -> None:
    if dept not in HOLY_DEPTS:
        raise HTTPException(404, f"Unknown dept '{dept}' — must be one of {len(HOLY_DEPTS)} HOLY depts")


# _global BEFORE /{dept} per §66.3 FastAPI greedy-match trap.
@router.get("/_global")
def guardrails_global(
    http_request: Request,
    since: float = Query(0.0, ge=0.0),
) -> dict[str, Any]:
    """Cross-dept rollup: counts per guardrail_type × decision + per-dept totals."""
    log_holy_access(http_request, "guardrails", "guardrails_global",
                    extra={"since": since})
    return gr.global_summary(since_epoch=since)


# Specific path BEFORE parameterized — `/decision/{id}` is literal-prefixed.
@router.get("/decision/{decision_id}")
def guardrails_decision(http_request: Request, decision_id: str) -> dict[str, Any]:
    """Look up one guardrail decision by decision_id or request_id."""
    if not _DECISION_ID_RE.match(decision_id):
        raise HTTPException(400, f"Malformed decision_id '{decision_id}'")
    log_holy_access(http_request, "guardrails", "guardrails_decision",
                    extra={"decision_id": decision_id})
    result = gr.get_decision(decision_id)
    if result is None:
        raise HTTPException(404, f"Decision '{decision_id}' not found in guardrail log")
    if isinstance(result, dict) and result.get("status") == "invalid_decision_id":
        raise HTTPException(400, "Malformed decision_id (regex validation)")
    return result


@router.get("/{dept}")
def guardrails_dept(
    http_request: Request,
    dept: str,
    decision: str | None = Query(None, description="Filter: allow / deny / transform"),
    guardrail_type: str | None = Query(None, description="Filter: prompt_injection / output_toxicity / scope_denial / etc."),
    since: float = Query(0.0, ge=0.0),
    limit: int = Query(100, ge=1, le=500),
) -> dict[str, Any]:
    """Per-dept guardrail decisions, newest-first, with optional filters."""
    _validate_dept(dept)
    if decision is not None and decision not in _VALID_DECISIONS:
        raise HTTPException(
            400,
            f"Invalid decision filter '{decision}' — must be one of {sorted(_VALID_DECISIONS)}",
        )
    if guardrail_type is not None and not _TYPE_RE.match(guardrail_type):
        raise HTTPException(
            400,
            f"Malformed guardrail_type '{guardrail_type}' (lowercase letters/digits/underscores)",
        )
    log_holy_access(
        http_request, "guardrails", "guardrails_dept",
        dept=dept,
        extra={"decision": decision, "guardrail_type": guardrail_type,
               "since": since, "limit": limit},
    )
    return gr.per_dept_decisions(
        dept,
        decision=decision,
        guardrail_type=guardrail_type,
        since_epoch=since,
        limit=limit,
    )
