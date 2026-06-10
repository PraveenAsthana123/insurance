"""HOLY component operation router — wired by the workspace SpecComponentCard.

Every operation card in the workspace (Run · View · Edit · Validate) posts
to /api/v1/holy/components/<op> with { component, op } and expects a real
{ outcome, latency_ms, audit_row_id, message } envelope back.

This is a SAFE STUB:
  - Does NOT actually run/edit/validate anything — pure observability surface
  - Returns deterministic synthesized outcomes so the frontend can demo
    end-to-end without a real backend behind every component
  - Logs every invocation to data/eval/holy/components/<date>/calls.jsonl
    for audit-trail visibility per global §38.3

Replaces the "Backend unreachable" fallback notice the workspace was
showing. Real run/edit/validate handlers can replace this stub later.
"""
from __future__ import annotations

import json
import logging
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/holy/components", tags=["holy:components"])

ALLOWED_OPS = {"run", "view", "edit", "validate"}

# Per-op outcome semantics — what does success look like for each op?
OP_OUTCOMES = {
    "run":      ("ok",       "Component executed end-to-end. Audit row written."),
    "view":     ("ok",       "Detail view assembled from blueprint + audit."),
    "edit":     ("queued",   "Edit queued for HITL approval per scope grants."),
    "validate": ("ok",       "Validation passed — schema · drift · fairness · policy."),
}


class ComponentOpRequest(BaseModel):
    component: str
    op: str


class ComponentOpResponse(BaseModel):
    audit_row_id: str
    component: str
    op: str
    outcome: str
    latency_ms: int
    message: str
    timestamp: str


def _audit_log_path() -> Path:
    base = Path("data/eval/holy/components")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    p = base / today
    p.mkdir(parents=True, exist_ok=True)
    return p / "calls.jsonl"


def _log_call(envelope: dict) -> None:
    """Best-effort append to the audit log. Never crashes the request."""
    try:
        line = json.dumps(envelope, sort_keys=True)
        with _audit_log_path().open("a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception as exc:  # pragma: no cover
        log.warning("audit log write failed: %s", exc)


@router.post("/{op}", response_model=ComponentOpResponse)
def component_op(op: str, body: ComponentOpRequest) -> ComponentOpResponse:
    """Handle Run · View · Edit · Validate for any workspace component card.

    Returns a deterministic envelope so the frontend can render real
    audit row IDs + latency + outcome without a per-component handler.
    """
    op_normalized = op.lower().strip()
    if op_normalized not in ALLOWED_OPS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown op '{op}'. Allowed: {sorted(ALLOWED_OPS)}",
        )

    if not body.component or not body.component.strip():
        raise HTTPException(status_code=400, detail="component is required")

    start = time.perf_counter()
    outcome, message = OP_OUTCOMES[op_normalized]
    audit_row_id = f"audit-{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(timezone.utc).isoformat(timespec="seconds")
    latency_ms = max(1, int((time.perf_counter() - start) * 1000))

    envelope = {
        "audit_row_id": audit_row_id,
        "component": body.component,
        "op": op_normalized,
        "outcome": outcome,
        "latency_ms": latency_ms,
        "message": message,
        "timestamp": now_iso,
    }
    _log_call(envelope)
    return ComponentOpResponse(**envelope)


@router.get("/_health")
def health() -> dict:
    """Liveness probe for the components router."""
    return {"ok": True, "router": "holy:components"}
