"""LiteLLM provider-agnostic LLM gateway (§56 Stage-1 adapter).

Today, INSUR's agent flows reach Ollama via the OpenClaw → Redis → worker pool
path (`docker-compose ... agents`). That path is async-fanout and works well
for batched council/simple work.

This module is the COMPLEMENTARY in-process synchronous path for code that
needs a single LLM call without the queue overhead:
  - Pydantic-AI typed validators that need a single retry on schema failure
  - Debug tooling that wants to compare Ollama vs OpenAI vs Anthropic
  - Tests that mock-out provider calls with the same call shape

Per global CLAUDE.md §56.2 Stage-1 adapter contract:
  - Lazy import (litellm SDK absence is fine — adapter degrades to honest
    "unavailable" instead of crashing)
  - Feature-flag opt-in via env: INSUR_LLM_GATEWAY_ENABLED=true
  - Default model from env INSUR_LLM_MODEL (e.g. "ollama/kivi:local") so
    no provider creds are required to drive the local Ollama path
  - NEVER default-on; the original OpenClaw/Redis path keeps working
    without this module being imported

Per global §57.7:
  - All LiteLLM exceptions wrapped → structured error response
  - Hard timeout cap via INSUR_LLM_TIMEOUT_SECONDS (default 30s)
  - API key values NEVER appear in responses (only model + provider names)

Per global §38.3:
  - Every `complete()` call writes one audit row to
    data/agent-supervisor/llm_gateway_runs.jsonl with model, latency_ms,
    outcome, tenant_id (caller-supplied), and request_id

Drill: tests/drills/drill_litellm_gateway.py
"""
from __future__ import annotations

import importlib.util
import json
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

_LLM_AUDIT_PATH = Path(
    os.environ.get("INSUR_LLM_GATEWAY_AUDIT_PATH", "data/agent-supervisor/llm_gateway_runs.jsonl")
)
_DEFAULT_MODEL = os.environ.get("INSUR_LLM_MODEL", "ollama/kivi:local")
_DEFAULT_TIMEOUT_SECONDS = float(os.environ.get("INSUR_LLM_TIMEOUT_SECONDS", "30"))


@dataclass
class LlmCompletion:
    """Normalized LLM-call response. Same shape regardless of provider."""

    text: str
    model: str
    outcome: str            # "executed" | "error" | "unavailable" | "disabled"
    latency_ms: int
    provider: str
    request_id: str
    error_type: str | None = None
    error_msg: str | None = None
    prompt_tokens: int | None = None
    completion_tokens: int | None = None


def is_enabled() -> bool:
    """Return True only when explicitly opted-in. Default off; never default-on."""
    return os.environ.get("INSUR_LLM_GATEWAY_ENABLED", "").lower() == "true"


def is_importable() -> bool:
    """Probe the litellm package without triggering side effects.

    Handles two states: (a) module already in sys.modules — return True
    even if it's a test mock without __spec__; (b) not yet imported — use
    importlib.util.find_spec.
    """
    import sys
    if "litellm" in sys.modules:
        return True
    try:
        return importlib.util.find_spec("litellm") is not None
    except (ValueError, ImportError):
        return False


def _write_audit_row(row: dict[str, Any]) -> None:
    """Best-effort §38.3 audit row. Disk errors do NOT crash the request."""
    try:
        _LLM_AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
        with _LLM_AUDIT_PATH.open("a") as fh:
            fh.write(json.dumps(row, separators=(",", ":")) + "\n")
    except OSError:
        pass


def _provider_from_model(model: str) -> str:
    """Extract provider prefix from a LiteLLM-shaped model string.

    `ollama/kivi:local` → "ollama"
    `gpt-4o-mini`       → "openai" (default when no prefix)
    `anthropic/claude-3` → "anthropic"
    """
    if "/" in model:
        return model.split("/", 1)[0]
    return "openai"


def complete(
    prompt: str,
    *,
    model: str | None = None,
    timeout_seconds: float | None = None,
    tenant_id: str = "default",
    request_id: str = "",
    max_tokens: int | None = None,
    temperature: float = 0.2,
) -> LlmCompletion:
    """Sync single LLM call via LiteLLM. Returns LlmCompletion regardless of outcome.

    Contract:
      - Returns outcome="disabled" when INSUR_LLM_GATEWAY_ENABLED != "true"
      - Returns outcome="unavailable" when litellm is not importable
      - Returns outcome="error" when litellm raises (wrapped in error_type/msg)
      - Returns outcome="executed" with `text` populated on success
      - Audit row written for EVERY call (even disabled/unavailable) so
        operator can see attempts that never landed
    """
    model = model or _DEFAULT_MODEL
    timeout_seconds = timeout_seconds or _DEFAULT_TIMEOUT_SECONDS
    provider = _provider_from_model(model)
    t0 = time.monotonic()

    base_row = {
        "ts": time.time(),
        "request_id": request_id or f"llmgw-{int(time.time() * 1000)}",
        "tenant_id": tenant_id,
        "actor": "llm_gateway",
        "tool": "litellm.completion",
        "model": model,
        "provider": provider,
        "prompt_excerpt": prompt[:200],
    }

    if not is_enabled():
        row = {**base_row, "outcome": "disabled", "latency_ms": 0}
        _write_audit_row(row)
        return LlmCompletion(
            text="", model=model, outcome="disabled", latency_ms=0,
            provider=provider, request_id=row["request_id"],
            error_msg="INSUR_LLM_GATEWAY_ENABLED is not 'true'",
        )

    if not is_importable():
        row = {**base_row, "outcome": "unavailable", "latency_ms": 0}
        _write_audit_row(row)
        return LlmCompletion(
            text="", model=model, outcome="unavailable", latency_ms=0,
            provider=provider, request_id=row["request_id"],
            error_msg="litellm package not installed",
        )

    try:
        import litellm  # noqa: I001 — lazy import per §56.2
        # LiteLLM's `completion` is the OpenAI-shaped API across all providers.
        kwargs: dict[str, Any] = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "timeout": timeout_seconds,
            "temperature": temperature,
        }
        if max_tokens is not None:
            kwargs["max_tokens"] = max_tokens
        response = litellm.completion(**kwargs)
        # Normalize LiteLLM response shape — it follows OpenAI's choices[].message.content
        text = (
            response.choices[0].message.content
            if response and getattr(response, "choices", None)
            else ""
        )
        usage = getattr(response, "usage", None)
        latency_ms = int((time.monotonic() - t0) * 1000)
        row = {
            **base_row, "outcome": "executed", "latency_ms": latency_ms,
            "prompt_tokens": getattr(usage, "prompt_tokens", None),
            "completion_tokens": getattr(usage, "completion_tokens", None),
            "response_excerpt": (text or "")[:200],
        }
        _write_audit_row(row)
        return LlmCompletion(
            text=text or "", model=model, outcome="executed",
            latency_ms=latency_ms, provider=provider,
            request_id=row["request_id"],
            prompt_tokens=getattr(usage, "prompt_tokens", None),
            completion_tokens=getattr(usage, "completion_tokens", None),
        )
    except Exception as exc:  # noqa: BLE001 — wrap ALL provider exceptions
        latency_ms = int((time.monotonic() - t0) * 1000)
        row = {
            **base_row, "outcome": "error", "latency_ms": latency_ms,
            "error_type": type(exc).__name__,
            "error_msg": str(exc)[:300],
        }
        _write_audit_row(row)
        return LlmCompletion(
            text="", model=model, outcome="error", latency_ms=latency_ms,
            provider=provider, request_id=row["request_id"],
            error_type=type(exc).__name__,
            error_msg=str(exc)[:300],
        )


def status() -> dict[str, Any]:
    """Return a snapshot of gateway readiness for the agent-platform status surface."""
    return {
        "key": "llm-gateway",
        "name": "LiteLLM Provider-Agnostic Gateway",
        "enabled": is_enabled(),
        "importable": is_importable(),
        "default_model": _DEFAULT_MODEL,
        "timeout_seconds": _DEFAULT_TIMEOUT_SECONDS,
        "audit_path": str(_LLM_AUDIT_PATH),
        "detail": (
            "Stage-1 adapter; opt-in via INSUR_LLM_GATEWAY_ENABLED=true. "
            "Default model targets local Ollama; override via INSUR_LLM_MODEL "
            "(e.g. 'openai/gpt-4o-mini', 'anthropic/claude-3-5-sonnet-latest'). "
            "Every call writes an audit row regardless of outcome."
        ),
    }
