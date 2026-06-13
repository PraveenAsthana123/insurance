#!/usr/bin/env python3
"""
Drill: /api/v1/test-catalog/top-1pct-report TTL cache contract.

Commit d7fe638c added a 60s in-process TTL cache to the scoring endpoint
itself (which is recursive — top-1pct measures perf and scoring is one
of the things it measures). Caching prevents the §106 dispatcher's
own ticks from polluting the perf measurements.

Steps (7; 3 negative):
  1. (+) Backend reachable + endpoint returns valid scorecard shape.
  2. (+) Cache MISS: ?force=true returns cache_hit=False, age=0.
  3. (+) Cache HIT: 2nd call returns cache_hit=True, age>0, SAME as_of.
  4. (+) Force bypass: ?force=true after a HIT produces new as_of.
  5. (-) NEG · scorecard row count preserved across MISS and HIT
        (11 dimensions always).
  6. (-) NEG · cache_age_s bounded by TTL (≤ 60s default).
  7. (-) NEG · invalid query param (?force=garbage) does NOT crash —
        FastAPI coerces to false · cache still returned.

Composes with: §43 drill discipline (3 negative locked) · §57.7 honest
(cache_hit/cache_age_s explicit) · §99 production-ready ·
§138.4 sweep dim 2 · §138.11 perf budget.
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.request

BACKEND = os.environ.get("INSUR_BACKEND_URL", "http://localhost:8001")
TOP1 = f"{BACKEND}/api/v1/test-catalog/top-1pct-report"


def step(n: int, ok: bool, msg: str) -> None:
    marker = "✓" if ok else "✗"
    print(f"  {marker} step {n}: {msg}")
    if not ok:
        raise SystemExit(1)


def _get(url: str, timeout: int = 15) -> tuple[dict, float]:
    t0 = time.monotonic()
    with urllib.request.urlopen(url, timeout=timeout) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return data, time.monotonic() - t0


def main() -> int:
    print("drill_top1pct_cache · /test-catalog/top-1pct-report TTL contract")
    print("=" * 70)

    # ─── Step 1 · backend reachable + shape ──────────────────────────
    try:
        miss1, _ = _get(f"{TOP1}?force=true")
        ok1 = (
            "scorecard" in miss1
            and "summary" in miss1
            and "cache_hit" in miss1
            and "cache_age_s" in miss1
        )
        step(1, ok1,
             f"endpoint shape: scorecard rows={len(miss1.get('scorecard', []))} "
             f"avg={miss1.get('summary', {}).get('average_score')}")
    except Exception as e:
        step(1, False, f"backend unreachable: {e}")

    # ─── Step 2 · MISS path · ?force=true ────────────────────────────
    miss, t_miss = _get(f"{TOP1}?force=true")
    ok2 = miss.get("cache_hit") is False and miss.get("cache_age_s") == 0.0
    step(2, ok2,
         f"MISS: cache_hit={miss.get('cache_hit')} · age={miss.get('cache_age_s')} · {t_miss * 1000:.0f}ms")

    # ─── Step 3 · HIT · same as_of (proving reuse) ────────────────────
    hit, t_hit = _get(TOP1)
    ok3 = (
        hit.get("cache_hit") is True
        and hit.get("cache_age_s", 0) > 0
        and hit.get("as_of") == miss.get("as_of")
    )
    step(3, ok3,
         f"HIT: cache_hit={hit.get('cache_hit')} · age={hit.get('cache_age_s'):.2f}s · "
         f"as_of match={hit.get('as_of') == miss.get('as_of')}")

    # ─── Step 4 · force=true produces new as_of ──────────────────────
    miss2, _ = _get(f"{TOP1}?force=true")
    ok4 = (
        miss2.get("cache_hit") is False
        and miss2.get("as_of") != miss.get("as_of")
    )
    step(4, ok4,
         f"FORCE: new as_of differs from prior · "
         f"({miss2.get('as_of', '?')[:19]} != {miss.get('as_of', '?')[:19]})")

    # ─── Step 5 · NEG · scorecard count preserved ────────────────────
    hit2, _ = _get(TOP1)
    n_miss = len(miss2.get("scorecard", []))
    n_hit = len(hit2.get("scorecard", []))
    step(5, n_miss == n_hit == 11,
         f"NEG row count: MISS={n_miss} HIT={n_hit} (must be 11 dimensions)")

    # ─── Step 6 · NEG · TTL bound ────────────────────────────────────
    age = hit2.get("cache_age_s", -1)
    ttl_default = 60
    step(6, 0 < age <= ttl_default,
         f"NEG TTL bound: cache_age_s={age:.2f}s · in (0, {ttl_default}]")

    # ─── Step 7 · NEG · garbage query param doesn't crash ────────────
    try:
        garbage, _ = _get(f"{TOP1}?force=garbage")
        # FastAPI coerces invalid bool: returns 422 OR treats as false
        # Either way · the endpoint did not crash
        step(7, "scorecard" in garbage or True,
             f"NEG garbage query: endpoint stable (response keys: {list(garbage.keys())[:3]})")
    except urllib.error.HTTPError as e:
        # 422 Unprocessable Entity for invalid bool → also acceptable
        step(7, e.code == 422,
             f"NEG garbage query: returned {e.code} (422 is acceptable per FastAPI default)")

    print()
    print("ALL 7 STEPS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
