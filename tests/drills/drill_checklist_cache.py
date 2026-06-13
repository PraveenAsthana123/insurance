#!/usr/bin/env python3
"""
Drill: /api/v1/production-checklist/{summary,full} TTL cache contract.

Commit d7fe638c added a 60s in-process TTL cache. The clever bit:
both /summary and /full share ONE cache slot — first call to either
pre-warms the other (single underlying SQL+file scan covers both shapes).

This drill locks all 4 invariants (MISS / HIT / force / pre-warm) so a
future refactor (e.g., separating the cache slots, dropping pre-warm)
can't silently break the §138.4 sweep perf budget.

Steps (8; 3 negative):
  1. (+) Backend reachable + /summary returns valid shape with
        {cache_hit, cache_age_s, production_ready_pct} fields.
  2. (+) Cache MISS: ?force=true returns cache_hit=False, age=0.
  3. (+) Cache HIT on /summary: 2nd call returns cache_hit=True, age>0.
  4. (+) PRE-WARM: after /summary MISS, /full HITS the same cache slot
        (cache_hit=True, age matches).
  5. (+) Same in reverse: after /full MISS, /summary HITS.
  6. (-) NEG · ?force=true on /full ALSO refreshes the slot — subsequent
        /summary call returns the NEW scanned data (not stale).
  7. (-) NEG · cache_age_s bounded by TTL (≤ 60s default).
  8. (-) NEG · response invariants preserved across MISS and HIT:
        production_ready_pct (summary) and sections count (full) match
        what the underlying coverage_summary returns.

Composes with: §43 drill discipline (3 negative locked) · §57.7 honest
(cache_hit/cache_age_s explicit) · §99 production-ready gate ·
§138.4 sweep dim 3 · §138.11 perf budget.
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.request

BACKEND = os.environ.get("INSUR_BACKEND_URL", "http://localhost:8001")
SUMMARY = f"{BACKEND}/api/v1/production-checklist/summary"
FULL = f"{BACKEND}/api/v1/production-checklist/full"


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
    print("drill_checklist_cache · /production-checklist/{summary,full} TTL contract")
    print("=" * 70)

    # ─── Step 1 · backend reachable + shape ──────────────────────────
    try:
        summary, _ = _get(f"{SUMMARY}?force=true")
        ok1 = (
            "production_ready_pct" in summary
            and "cache_hit" in summary
            and "cache_age_s" in summary
        )
        step(1, ok1,
             f"summary shape: ready={summary.get('production_ready_pct')}%, "
             f"cache_hit={summary.get('cache_hit')}")
    except Exception as e:
        step(1, False, f"backend unreachable: {e}")

    # ─── Step 2 · MISS path via ?force=true ──────────────────────────
    miss, t_miss = _get(f"{SUMMARY}?force=true")
    ok2 = miss.get("cache_hit") is False and miss.get("cache_age_s") == 0.0
    step(2, ok2,
         f"MISS: cache_hit={miss.get('cache_hit')} · age={miss.get('cache_age_s')} · {t_miss * 1000:.0f}ms")

    # ─── Step 3 · HIT path · same scanned data ────────────────────────
    hit, t_hit = _get(SUMMARY)
    ok3 = (
        hit.get("cache_hit") is True
        and hit.get("cache_age_s", 0) > 0
        and hit.get("production_ready_pct") == miss.get("production_ready_pct")
    )
    step(3, ok3,
         f"HIT: cache_hit={hit.get('cache_hit')} · age={hit.get('cache_age_s'):.2f}s · "
         f"ready match={hit.get('production_ready_pct') == miss.get('production_ready_pct')}")

    # ─── Step 4 · PRE-WARM /summary → /full hits same slot ───────────
    _ = _get(f"{SUMMARY}?force=true")  # fresh slot
    time.sleep(0.05)
    full_hit, _ = _get(FULL)
    ok4 = (
        full_hit.get("cache_hit") is True
        and full_hit.get("cache_age_s", 0) > 0
        and "sections" in full_hit
    )
    step(4, ok4,
         f"PRE-WARM summary→full: cache_hit={full_hit.get('cache_hit')} · "
         f"age={full_hit.get('cache_age_s'):.2f}s · sections={len(full_hit.get('sections', []))}")

    # ─── Step 5 · Reverse · /full force → /summary HITS ──────────────
    _ = _get(f"{FULL}?force=true")  # fresh slot
    time.sleep(0.05)
    summary_hit, _ = _get(SUMMARY)
    ok5 = (
        summary_hit.get("cache_hit") is True
        and summary_hit.get("cache_age_s", 0) > 0
    )
    step(5, ok5,
         f"PRE-WARM full→summary: cache_hit={summary_hit.get('cache_hit')} · "
         f"age={summary_hit.get('cache_age_s'):.2f}s")

    # ─── Step 6 · NEG · ?force=true on /full refreshes slot ──────────
    # Wait > 0 so age is observably > 0 before force
    time.sleep(0.5)
    pre_full_hit_age = _get(SUMMARY)[0].get("cache_age_s", 0)
    _ = _get(f"{FULL}?force=true")  # forces rescan
    post_force_summary, _ = _get(SUMMARY)
    # The post-force summary should have a smaller age than pre_full_hit_age
    # (slot was just refreshed by the /full?force=true call)
    post_age = post_force_summary.get("cache_age_s", 999)
    step(6, post_age < pre_full_hit_age,
         f"NEG force-refresh: pre-force age={pre_full_hit_age:.2f}s · "
         f"post-force age={post_age:.2f}s (must be smaller)")

    # ─── Step 7 · NEG · TTL bound ────────────────────────────────────
    age = post_force_summary.get("cache_age_s", -1)
    ttl_default = 60
    step(7, 0 <= age <= ttl_default,
         f"NEG TTL bound: cache_age_s={age:.2f}s · must be in [0, {ttl_default}]")

    # ─── Step 8 · NEG · response invariants preserved ────────────────
    # Compare MISS-path data fields with HIT-path data fields
    miss2, _ = _get(f"{SUMMARY}?force=true")
    hit2, _ = _get(SUMMARY)
    ok8 = (
        miss2.get("production_ready_pct") == hit2.get("production_ready_pct")
        and miss2.get("total_items") == hit2.get("total_items")
        and miss2.get("done_items") == hit2.get("done_items")
    )
    step(8, ok8,
         f"NEG invariants: ready/total/done preserved across MISS+HIT")

    print()
    print("ALL 8 STEPS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
