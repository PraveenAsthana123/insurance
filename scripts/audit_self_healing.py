#!/usr/bin/env python3
"""Self-Healing AI fallback chain audit · T7.13 · governance gate #13.

Per docs/PATH_E_EXECUTION_REPORT_2026-06-09.md T7.13 closure. Verifies
the LLMFallbackChain pattern with synthetic providers.

10 assertions:
  1. LLMFallbackChain empty providers → raises ValueError
  2. Single working provider → success, n_attempts=1, served_by=name
  3. First fails → second succeeds → n_attempts=2, fallback path captured
  4. All fail → all_failed=True, response=None, attempts list populated
  5. Successful response is the WORKING provider's output
  6. Latency tracked per attempt (>= 0)
  7. Total latency tracked
  8. Fallback chain order preserved
  9. DEFAULT_LLM_CHAIN constructs without error (3 providers wired)
 10. Rule-based fallback always returns safe text (last-resort works)
"""
import logging
import os
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO))
sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")
logging.disable(logging.CRITICAL)


def main() -> int:
    print("Self-Healing AI fallback chain audit · T7.13 + governance gate #13\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    fails = 0

    def assert_(label: str, ok: bool, detail: str = ""):
        nonlocal fails
        mark = "✓" if ok else "✗"
        sfx = f" · {detail}" if detail else ""
        print(f"  {label[:55]:<55} | {mark} {('PASS' if ok else 'FAIL')}{sfx}")
        if not ok:
            fails += 1

    try:
        from services.self_healing import (
            LLMFallbackChain, FallbackResult,
            DEFAULT_LLM_CHAIN, _rule_based_provider,
        )
    except ImportError as e:
        print(f"  ✗ FATAL · {e}")
        return 1

    # 1. Empty providers → ValueError
    try:
        LLMFallbackChain([])
        assert_("1. empty providers raises ValueError", False, "no error")
    except ValueError:
        assert_("1. empty providers raises ValueError", True)
    except Exception as e:
        assert_("1. empty providers raises ValueError", False, f"got {type(e).__name__}")

    # 2. Single working provider
    def good(**_): return "OK"
    chain = LLMFallbackChain([("primary", good)])
    r = chain.invoke()
    assert_("2. single working provider succeeds",
            r.served_by == "primary" and r.n_attempts == 1 and not r.all_failed,
            f"served_by={r.served_by} · n_attempts={r.n_attempts}")

    # 3. First fails, second succeeds
    def bad(**_): raise RuntimeError("boom")
    chain = LLMFallbackChain([("a", bad), ("b", good)])
    r = chain.invoke()
    assert_("3. first fails → second succeeds",
            r.served_by == "b" and r.n_attempts == 2 and r.fallback_chain == ["a", "b"],
            f"served_by={r.served_by} · path={r.fallback_chain}")

    # 4. All fail
    chain = LLMFallbackChain([("a", bad), ("b", bad), ("c", bad)])
    r = chain.invoke()
    assert_("4. all fail · all_failed=True · response=None",
            r.all_failed and r.response is None and r.n_attempts == 3,
            f"all_failed={r.all_failed} · response={r.response}")

    # 5. Working provider's output returned
    def returns_42(**_): return 42
    chain = LLMFallbackChain([("first", returns_42)])
    r = chain.invoke()
    assert_("5. response is working provider's output",
            r.response == 42, f"got {r.response}")

    # 6. Latency per attempt
    r = LLMFallbackChain([("good", good)]).invoke()
    assert_("6. latency_ms per attempt ≥ 0",
            r.attempts[0].latency_ms >= 0,
            f"got {r.attempts[0].latency_ms}")

    # 7. Total latency
    assert_("7. total_latency_ms ≥ 0",
            r.total_latency_ms >= 0, f"got {r.total_latency_ms}")

    # 8. Fallback chain order
    chain = LLMFallbackChain([("alpha", bad), ("beta", bad), ("gamma", good)])
    r = chain.invoke()
    assert_("8. fallback chain order preserved",
            r.fallback_chain == ["alpha", "beta", "gamma"],
            f"got {r.fallback_chain}")

    # 9. DEFAULT_LLM_CHAIN constructs
    assert_("9. DEFAULT_LLM_CHAIN has 3 providers",
            len(DEFAULT_LLM_CHAIN.providers) == 3,
            f"got {len(DEFAULT_LLM_CHAIN.providers)}")

    # 10. Rule-based provider returns safe text
    result = _rule_based_provider(prompt="anything")
    assert_("10. rule-based provider returns last-resort text",
            isinstance(result, str) and "fallback" in result.lower(),
            f"got: {result[:60]}")

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    print(f"  Reference: §57.7 + §40 + T7.13 + Tier 7 governance gate #13")
    return 0 if fails == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
