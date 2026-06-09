"""Self-Healing AI · LLM fallback chain · T7.13 (governance gate #13).

Per Tier 7 governance gate #13 (Self-Healing AI · model fallback chain)
and PATH_E_EXECUTION_REPORT_2026-06-09.md backlog closure.

Pattern: try a chain of providers in order · log every fall-through ·
return the FIRST successful response. When all fail, return honest
empty + error chain per §57.7.

Usage:
    from services.self_healing import resilient_call, LLMFallbackChain

    chain = LLMFallbackChain([
        ("ollama-llama3", call_ollama),
        ("openai-gpt-4", call_openai),
        ("cached-response", lookup_cached),
        ("rule-based", rule_based_fallback),
    ])
    result = chain.invoke(prompt="...")
    # result = {"response": "...", "served_by": "ollama-llama3",
    #          "fallback_chain": ["ollama-llama3"], "n_attempts": 1}

Composes with §38.3 (every fallback chain run = audit row) ·
§40 (decision system · fallback IS the resilience layer) ·
§57.7 (honest empty when all providers fail · NEVER fake response).
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Callable

logger = logging.getLogger(__name__)


@dataclass
class FallbackAttempt:
    """One attempt at a provider in the chain."""
    provider: str
    success: bool
    latency_ms: float
    error: str | None = None
    response: Any = None


@dataclass
class FallbackResult:
    """Result of a complete fallback chain invocation."""
    response: Any
    served_by: str | None
    fallback_chain: list[str]
    n_attempts: int
    attempts: list[FallbackAttempt] = field(default_factory=list)
    all_failed: bool = False
    total_latency_ms: float = 0.0


class LLMFallbackChain:
    """Try a list of providers in order · return first success.

    Per §57.7 honest: when all providers fail, returns FallbackResult
    with `all_failed=True` + `response=None` + full attempts list ·
    NEVER fabricates a response.
    """

    def __init__(self, providers: list[tuple[str, Callable[..., Any]]]):
        """
        Args:
            providers: list of (name, callable) tuples. Callable receives
                       **kwargs and returns the response. Raises any
                       Exception on failure.
        """
        if not providers:
            raise ValueError("providers list must have at least one entry")
        self.providers = providers

    def invoke(self, **kwargs) -> FallbackResult:
        """Try each provider in order. Returns first successful response."""
        attempts: list[FallbackAttempt] = []
        chain_path: list[str] = []
        t_total_start = time.perf_counter()

        for name, fn in self.providers:
            chain_path.append(name)
            t_start = time.perf_counter()
            try:
                response = fn(**kwargs)
                latency_ms = (time.perf_counter() - t_start) * 1000
                attempts.append(FallbackAttempt(
                    provider=name, success=True,
                    latency_ms=round(latency_ms, 2),
                    response=response,
                ))
                logger.info("Self-healing chain · served by %s after %d attempt(s)",
                              name, len(attempts))
                return FallbackResult(
                    response=response,
                    served_by=name,
                    fallback_chain=chain_path,
                    n_attempts=len(attempts),
                    attempts=attempts,
                    all_failed=False,
                    total_latency_ms=round(
                        (time.perf_counter() - t_total_start) * 1000, 2,
                    ),
                )
            except Exception as e:
                latency_ms = (time.perf_counter() - t_start) * 1000
                attempts.append(FallbackAttempt(
                    provider=name, success=False,
                    latency_ms=round(latency_ms, 2),
                    error=f"{type(e).__name__}: {e}",
                ))
                logger.warning(
                    "Self-healing chain · %s failed (%s) · falling through",
                    name, type(e).__name__,
                )
                continue

        # All providers failed · honest per §57.7
        logger.error("Self-healing chain · ALL %d providers failed",
                      len(self.providers))
        return FallbackResult(
            response=None,
            served_by=None,
            fallback_chain=chain_path,
            n_attempts=len(attempts),
            attempts=attempts,
            all_failed=True,
            total_latency_ms=round(
                (time.perf_counter() - t_total_start) * 1000, 2,
            ),
        )


def resilient_call(
    primary: Callable[..., Any],
    fallbacks: list[Callable[..., Any]],
    **kwargs,
) -> FallbackResult:
    """Convenience wrapper for a primary + fallbacks pattern.

    Args:
        primary: the preferred callable
        fallbacks: ordered list of fallback callables
        **kwargs: passed to each callable

    Returns:
        FallbackResult · same shape as LLMFallbackChain.invoke().
    """
    providers = [(f"primary-{primary.__name__}", primary)]
    for i, fb in enumerate(fallbacks):
        providers.append((f"fallback-{i + 1}-{fb.__name__}", fb))
    chain = LLMFallbackChain(providers)
    return chain.invoke(**kwargs)


# ─── Default providers for autonomous_agent / autonomous_dept_registry ──

def _ollama_provider(prompt: str = "", **_) -> str:
    """Try Ollama local LLM · raise on unavailable."""
    try:
        import httpx
        r = httpx.post(
            "http://localhost:11434/api/generate",
            json={"model": "llama3", "prompt": prompt, "stream": False},
            timeout=10.0,
        )
        r.raise_for_status()
        return r.json().get("response", "")
    except Exception:
        raise


def _cached_provider(prompt: str = "", **_) -> str:
    """Look up cached response by prompt hash · raise if no cache."""
    # No cache yet · always raise per §57.7
    raise RuntimeError("cache lookup not implemented · returning miss")


def _rule_based_provider(prompt: str = "", **_) -> str:
    """Last-resort rule-based response · always returns something safe."""
    return (
        "[rule-based fallback] · all LLM providers unavailable · "
        "human review required · per §57.7 honest fallback."
    )


DEFAULT_LLM_CHAIN = LLMFallbackChain([
    ("ollama-llama3", _ollama_provider),
    ("cached-lookup", _cached_provider),
    ("rule-based", _rule_based_provider),
])
