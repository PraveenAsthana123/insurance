"""§B5 · HTTP surface for the 9-gate verification engine."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.role_dependency import require_manager_or_above
from .runner import GATE_NAMES, run_verification_gates

router = APIRouter(prefix="/api/v1/verification", tags=["verification"])


class VerifyRequest(BaseModel):
    invocation_id: str
    output_text: str | None = None
    output: Any | None = None
    cost_usd: float | None = None
    tokens_in: int = 0
    tokens_out: int = 0
    confidence: float | None = None
    bias: dict | None = None
    is_reversible_action: bool = False
    rollback_plan: str | None = None
    tenant_id: str = "default"
    trace_id: str | None = None


@router.get("/gates")
def list_gates():
    """List the 9 gates the engine runs · informational."""
    return {
        "gates": list(GATE_NAMES),
        "n_gates": len(GATE_NAMES),
        "policy_ref": "§B5 PENDING_TASKS_PLAN · operator's 9-gate brief",
    }


@router.post("/run")
def run_gates(
    body: VerifyRequest,
    _role: str = Depends(require_manager_or_above),
):
    """Run all 9 verification gates against an invocation payload.

    Emits one row to agent_trace_event per gate · returns aggregated
    verdicts. §57.7 honest: failed gates land as failed (not silently
    promoted) and run.summary.overall is 'fail' if any gate failed.
    """
    if not body.output_text and body.output is None:
        raise HTTPException(
            400,
            {"detail": "output_text or output required",
             "error_code": "VERIFY_NO_OUTPUT"},
        )

    payload = body.dict()
    if payload.get("output") is None and payload.get("output_text"):
        payload["output"] = payload["output_text"]

    result = run_verification_gates(
        invocation_id=body.invocation_id,
        payload=payload,
        trace_id=body.trace_id,
        tenant_id=body.tenant_id,
    )
    return result
