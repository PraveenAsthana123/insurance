#!/usr/bin/env python3
"""
Drill: /api/v1/missing-items-advisor/scan TTL cache contract.

Commit 67e2b211 added a 60s in-process TTL cache to make the §106
dispatcher tick cheap. This drill locks the cache contract so future
refactors (e.g., switching to Redis, dropping the cache, changing TTL
semantics) can't silently break the dispatcher's perf assumptions.

Steps (8; 3 negative):
  1. (+) Backend is reachable (sanity).
  2. (+) Cache MISS path: first call returns
        {cache_hit: false, cache_age_s: 0} + summary keys.
  3. (+) Cache HIT path: second call within TTL returns
        {cache_hit: true, cache_age_s: >0} with the SAME `scanned_at`
        (proving result reuse, not silent re-scan).
  4. (+) Force bypass: ?force=true returns {cache_hit: false} even
        immediately after a cached call. AND populates the cache for
        the next call.
  5. (-) NEG · cache_hit=true does NOT mean stale-data-lie: cache_age_s
        is bounded by TTL. We assert cache_age_s <= 60 (default TTL).
  6. (-) NEG · the cache responds with a DIFFERENT scanned_at after
        force=true (proving the force did rescan, not return stale).
  7. (-) NEG · invalid POST body does NOT poison the cache. POST with
        garbage body still returns valid scan result (FastAPI ignores
        non-declared body fields by default · cache stays consistent).
  8. (+) Cache MISS round-trip is materially slower than HIT: t_miss >
        4 × t_hit (the cache exists for a reason · prove it works).

Composes with: §43 drill discipline · §57.7 honest scaffold (cache_hit
+ cache_age_s are explicit fields) · §80 advisor consolidator ·
§106 dispatcher (this cache is what makes the dispatcher cheap).
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.request
import urllib.error

BACKEND = os.environ.get("INSUR_BACKEND_URL", "http://localhost:8001")
SCAN = f"{BACKEND}/api/v1/missing-items-advisor/scan"


def step(n: int, ok: bool, msg: str) -> None:
    marker = "✓" if ok else "✗"
    print(f"  {marker} step {n}: {msg}")
    if not ok:
        raise SystemExit(1)


def _post(url: str, body: bytes = b"{}", timeout: int = 30) -> tuple[dict, float]:
    """Returns (parsed_json, elapsed_seconds)."""
    req = urllib.request.Request(
        url, method="POST", data=body,
        headers={"Content-Type": "application/json"},
    )
    t0 = time.monotonic()
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return data, time.monotonic() - t0


def main() -> int:
    print("drill_advisor_cache · /missing-items-advisor/scan TTL cache contract")
    print("=" * 70)

    # ─── Step 1 · backend reachable ──────────────────────────────────
    try:
        r = urllib.request.urlopen(
            f"{BACKEND}/api/v1/missing-items-advisor/health", timeout=5,
        )
        step(1, r.status == 200, f"backend reachable · {BACKEND}")
    except (urllib.error.URLError, OSError) as e:
        step(1, False, f"backend unreachable: {e}")

    # Force-clear cache state by posting force=true first
    # (we don't have a clear endpoint · force=true repopulates)
    _post(f"{SCAN}?force=true")

    # ─── Step 2 · cache MISS path · force=true bypass + verify shape ─
    miss1, t_miss1 = _post(f"{SCAN}?force=true")
    ok2 = (
        miss1.get("cache_hit") is False
        and miss1.get("cache_age_s") == 0.0
        and "summary" in miss1
        and "scanned_at" in miss1
    )
    step(2, ok2,
         f"MISS path: cache_hit={miss1.get('cache_hit')} · age={miss1.get('cache_age_s')} · {t_miss1:.2f}s")

    # ─── Step 3 · cache HIT path · same scanned_at proves reuse ──────
    hit, t_hit = _post(SCAN)  # no force · should hit cache
    ok3 = (
        hit.get("cache_hit") is True
        and hit.get("cache_age_s", 0) > 0
        and hit.get("scanned_at") == miss1.get("scanned_at")
    )
    step(3, ok3,
         f"HIT path: cache_hit={hit.get('cache_hit')} · age={hit.get('cache_age_s'):.2f}s · "
         f"scanned_at match={hit.get('scanned_at') == miss1.get('scanned_at')}")

    # ─── Step 4 · force=true bypasses · repopulates ──────────────────
    miss2, t_miss2 = _post(f"{SCAN}?force=true")
    # Different scanned_at than the original miss1 (proving rescan)
    ok4 = (
        miss2.get("cache_hit") is False
        and miss2.get("scanned_at") != miss1.get("scanned_at")
    )
    step(4, ok4,
         f"FORCE bypass: cache_hit={miss2.get('cache_hit')} · "
         f"new scanned_at differs from prior MISS")

    # ─── Step 5 · NEG · cache_age_s bounded by TTL ───────────────────
    hit2, _ = _post(SCAN)
    ttl_default = 60
    age = hit2.get("cache_age_s", -1)
    step(5, 0 < age <= ttl_default,
         f"NEG TTL bound: cache_age_s={age:.2f}s · must be in (0, {ttl_default}]")

    # ─── Step 6 · NEG · force returns DIFFERENT scanned_at ───────────
    # Already proved in step 4 · re-prove with a clean force after a hit
    miss3, _ = _post(f"{SCAN}?force=true")
    step(6, miss3.get("scanned_at") != hit2.get("scanned_at"),
         f"NEG force rescan: force=true produces fresh scanned_at "
         f"({miss3.get('scanned_at')[:19]} != {hit2.get('scanned_at')[:19]})")

    # ─── Step 7 · NEG · garbage body does NOT poison cache ───────────
    # Post non-JSON garbage · cache should still serve next call cleanly
    try:
        # Try sending a JSON body with random extra fields · FastAPI ignores
        garbage, _ = _post(SCAN, body=b'{"junk":"value","more":42}')
        # Result should be the cached value (didn't trigger force)
        next_hit, _ = _post(SCAN)
        ok7 = (
            "summary" in garbage  # garbage body didn't crash the endpoint
            and "summary" in next_hit  # subsequent call still works
        )
        step(7, ok7, "NEG garbage body: endpoint stable · cache not poisoned")
    except Exception as e:
        step(7, False, f"garbage body crashed endpoint: {e}")

    # ─── Step 8 · perf · MISS materially slower than HIT ─────────────
    # Use the timings already collected
    perf_ok = t_miss1 > 4 * t_hit
    step(8, perf_ok,
         f"PERF: t_miss={t_miss1:.2f}s · t_hit={t_hit:.3f}s · "
         f"ratio={t_miss1 / max(t_hit, 1e-6):.1f}x (must be > 4x)")

    print()
    print("ALL 8 STEPS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
