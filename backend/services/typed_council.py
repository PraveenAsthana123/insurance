"""Pydantic AI typed council — §56 Stage-1 adapter.

HOLY's existing council pattern runs via OpenClaw → Redis → worker
(see council_agents service in docker-compose). That path returns raw
text strings from each of the 3 stages (author / reviewer / chair).

This module is the COMPLEMENTARY in-process synchronous path with
*typed* Pydantic outputs at each stage:

  CouncilAuthorOutput  — proposal + confidence + risks
  CouncilReviewerOutput — critique + score + must_fix
  CouncilChairDecision — decision + rationale + final_text

Pydantic AI's Agent class enforces the output schema via function
calling, so an LLM that hallucinates an off-schema field is caught at
parse time rather than at downstream consumer time.

Per global CLAUDE.md §56.2 Stage-1 contract:
  - Lazy import of pydantic_ai (SDK absence → unavailable, never crash)
  - Feature-flag opt-in: HOLY_TYPED_COUNCIL_ENABLED=true
  - Default model from HOLY_LLM_MODEL (reuses gateway env contract)
  - Never default-on; OpenClaw/Redis path keeps working

Per §38.3:
  - Every council run writes one audit row per stage to
    data/agent-supervisor/typed_council_runs.jsonl

Per §57.7:
  - Schema-validation failures wrapped → outcome='schema_error'
  - Provider exceptions wrapped → outcome='error'
  - API keys NEVER appear in audit row or response

Drill: tests/drills/drill_typed_council.py
"""
from __future__ import annotations

import importlib.util
import json
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field

_COUNCIL_AUDIT_PATH = Path(
    os.environ.get("HOLY_TYPED_COUNCIL_AUDIT_PATH", "data/agent-supervisor/typed_council_runs.jsonl")
)
_DEFAULT_MODEL = os.environ.get("HOLY_LLM_MODEL", "ollama/kivi:local")


class CouncilAuthorOutput(BaseModel):
    """Stage 1 — author proposes."""

    proposal: str = Field(..., min_length=1, max_length=5000)
    confidence: float = Field(..., ge=0.0, le=1.0)
    risks: list[str] = Field(default_factory=list, max_length=10)


class CouncilReviewerOutput(BaseModel):
    """Stage 2 — reviewer critiques."""

    critique: str = Field(..., min_length=1, max_length=5000)
    score: int = Field(..., ge=1, le=10)
    must_fix: list[str] = Field(default_factory=list, max_length=10)


class CouncilChairDecision(BaseModel):
    """Stage 3 — chair decides."""

    decision: Literal["approve", "reject", "revise"]
    rationale: str = Field(..., min_length=1, max_length=2000)
    final_text: str | None = Field(default=None, max_length=5000)


@dataclass
class CouncilResult:
    """Normalized result of a typed-council run."""

    outcome: str   # "executed" | "disabled" | "unavailable" | "schema_error" | "error"
    author: CouncilAuthorOutput | None = None
    reviewer: CouncilReviewerOutput | None = None
    chair: CouncilChairDecision | None = None
    request_id: str = ""
    tenant_id: str = ""
    model: str = ""
    latency_ms: int = 0
    error_type: str | None = None
    error_msg: str | None = None


def is_enabled() -> bool:
    """True only when explicitly opted-in."""
    return os.environ.get("HOLY_TYPED_COUNCIL_ENABLED", "").lower() == "true"


def is_importable() -> bool:
    """Probe the pydantic_ai package without triggering side effects."""
    if "pydantic_ai" in sys.modules:
        return True
    try:
        return importlib.util.find_spec("pydantic_ai") is not None
    except (ValueError, ImportError):
        return False


def _write_audit_row(row: dict[str, Any]) -> None:
    """Best-effort §38.3 audit. Disk errors never crash the request."""
    try:
        _COUNCIL_AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
        with _COUNCIL_AUDIT_PATH.open("a") as fh:
            fh.write(json.dumps(row, separators=(",", ":")) + "\n")
    except OSError:
        pass


def _base_row(tenant_id: str, request_id: str, stage: str, model: str) -> dict[str, Any]:
    return {
        "ts": time.time(),
        "request_id": request_id or f"council-{int(time.time() * 1000)}",
        "tenant_id": tenant_id,
        "actor": "typed_council",
        "tool": f"pydantic_ai.{stage}",
        "model": model,
    }


def run_typed_council(
    prompt: str,
    *,
    tenant_id: str = "default",
    request_id: str = "",
    model: str | None = None,
) -> CouncilResult:
    """Drive a 3-stage typed council. Returns CouncilResult always — never raises.

    Sequencing:
      1. Author produces CouncilAuthorOutput from the prompt
      2. Reviewer reads the author output + critiques → CouncilReviewerOutput
      3. Chair reads both + decides → CouncilChairDecision

    Each stage writes one audit row. If any stage fails schema validation,
    outcome='schema_error' and the partial state is returned (so the caller
    can see which stage broke).
    """
    model = model or _DEFAULT_MODEL
    request_id = request_id or f"council-{int(time.time() * 1000)}"
    t0 = time.monotonic()

    if not is_enabled():
        row = {**_base_row(tenant_id, request_id, "gate", model), "outcome": "disabled", "latency_ms": 0}
        _write_audit_row(row)
        return CouncilResult(
            outcome="disabled", model=model, tenant_id=tenant_id, request_id=request_id,
            error_msg="HOLY_TYPED_COUNCIL_ENABLED is not 'true'",
        )

    if not is_importable():
        row = {**_base_row(tenant_id, request_id, "gate", model), "outcome": "unavailable", "latency_ms": 0}
        _write_audit_row(row)
        return CouncilResult(
            outcome="unavailable", model=model, tenant_id=tenant_id, request_id=request_id,
            error_msg="pydantic_ai package not installed",
        )

    try:
        import pydantic_ai  # noqa: F401 — lazy import per §56.2
        from pydantic_ai import Agent

        author_agent = Agent(
            model,
            output_type=CouncilAuthorOutput,
            system_prompt=(
                "You are the author of a 3-stage council. Produce a structured "
                "proposal with proposal text, a confidence score in [0,1], and "
                "up to 10 risks."
            ),
        )
        author_result = author_agent.run_sync(prompt)
        author_out: CouncilAuthorOutput = author_result.output

        _write_audit_row({
            **_base_row(tenant_id, request_id, "author", model),
            "outcome": "executed",
            "confidence": author_out.confidence,
            "risks_count": len(author_out.risks),
        })

        reviewer_agent = Agent(
            model,
            output_type=CouncilReviewerOutput,
            system_prompt=(
                "You are the reviewer of a 3-stage council. Read the author's "
                "proposal and critique it. Score 1-10, list must-fix items."
            ),
        )
        reviewer_prompt = (
            f"AUTHOR PROPOSAL:\n{author_out.proposal}\n\n"
            f"AUTHOR CONFIDENCE: {author_out.confidence}\n"
            f"AUTHOR RISKS: {json.dumps(author_out.risks)}"
        )
        reviewer_result = reviewer_agent.run_sync(reviewer_prompt)
        reviewer_out: CouncilReviewerOutput = reviewer_result.output

        _write_audit_row({
            **_base_row(tenant_id, request_id, "reviewer", model),
            "outcome": "executed",
            "score": reviewer_out.score,
            "must_fix_count": len(reviewer_out.must_fix),
        })

        chair_agent = Agent(
            model,
            output_type=CouncilChairDecision,
            system_prompt=(
                "You are the chair of a 3-stage council. Read both the author "
                "and reviewer output. Decide approve / reject / revise."
            ),
        )
        chair_prompt = (
            f"AUTHOR:\n{author_out.proposal}\n\n"
            f"REVIEWER (score {reviewer_out.score}):\n{reviewer_out.critique}\n"
            f"MUST FIX: {json.dumps(reviewer_out.must_fix)}"
        )
        chair_result = chair_agent.run_sync(chair_prompt)
        chair_out: CouncilChairDecision = chair_result.output

        latency_ms = int((time.monotonic() - t0) * 1000)
        _write_audit_row({
            **_base_row(tenant_id, request_id, "chair", model),
            "outcome": "executed",
            "decision": chair_out.decision,
            "total_latency_ms": latency_ms,
        })

        return CouncilResult(
            outcome="executed",
            author=author_out, reviewer=reviewer_out, chair=chair_out,
            model=model, tenant_id=tenant_id, request_id=request_id,
            latency_ms=latency_ms,
        )
    except Exception as exc:  # noqa: BLE001 — wrap all SDK/provider exceptions
        latency_ms = int((time.monotonic() - t0) * 1000)
        # Distinguish schema validation errors from other failures
        exc_type = type(exc).__name__
        outcome = "schema_error" if "Validation" in exc_type else "error"
        _write_audit_row({
            **_base_row(tenant_id, request_id, "exception", model),
            "outcome": outcome,
            "error_type": exc_type,
            "error_msg": str(exc)[:300],
            "latency_ms": latency_ms,
        })
        return CouncilResult(
            outcome=outcome, model=model, tenant_id=tenant_id, request_id=request_id,
            latency_ms=latency_ms,
            error_type=exc_type, error_msg=str(exc)[:300],
        )


def status() -> dict[str, Any]:
    """Snapshot of the typed-council adapter for the agent-platform status surface."""
    return {
        "key": "typed-council",
        "name": "Pydantic AI Typed Council (author/reviewer/chair)",
        "enabled": is_enabled(),
        "importable": is_importable(),
        "default_model": _DEFAULT_MODEL,
        "audit_path": str(_COUNCIL_AUDIT_PATH),
        "schemas": [
            "CouncilAuthorOutput(proposal,confidence,risks)",
            "CouncilReviewerOutput(critique,score,must_fix)",
            "CouncilChairDecision(decision,rationale,final_text)",
        ],
        "detail": (
            "Stage-1 adapter; opt-in via HOLY_TYPED_COUNCIL_ENABLED=true. "
            "Uses Pydantic AI Agent class to enforce typed output via function "
            "calling. Complementary to the async OpenClaw → Redis → worker "
            "council; same 3-stage shape, sync + typed outputs."
        ),
    }
