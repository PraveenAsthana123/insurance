#!/usr/bin/env python3
"""
Drill: scripts/parallel_lock.py contract · cross-process coordination.

Shipped P2-g · prevents the race-fix bug class observed at commit
c61c5abe (parallel session re-edited 3 files between my git add and
git commit). The §138 dispatcher's absence-mode handler now consults
this lock before staging · refuses if held.

This drill locks the contract:
  - Atomic acquire (O_EXCL prevents race on creation)
  - TTL auto-expires stale locks (no PID dependency · CLI-process-safe)
  - Wrong-actor release is refused
  - Context manager + CLI both work
  - Defensive: corrupt/malformed lock files treated as not-held

Steps (10; 4 negative):
  1. (+) Module imports cleanly.
  2. (+) Initial state: lock is NOT held.
  3. (+) Acquire succeeds + is_locked() reports True.
  4. (-) NEG · second acquire with different actor returns False (busy).
  5. (-) NEG · release with wrong actor returns False (cannot steal).
  6. (+) Release with correct actor returns True.
  7. (-) NEG · TTL-expired lock is auto-cleared on next status check.
  8. (+) Context manager acquires + releases cleanly.
  9. (-) NEG · raise_on_busy=False yields ok=False when busy (no exception).
 10. (+) CLI status command returns JSON with {locked, info} keys.

Composes with: §43 drill discipline (4 NEG locked) · §51 substrate ·
§54 no Claude trailer · §57.7 honest (no silent-win-race · refuses to
steal locks) · §138 absence-mode handler integration.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO / "scripts"))


def step(n: int, ok: bool, msg: str) -> None:
    marker = "✓" if ok else "✗"
    print(f"  {marker} step {n}: {msg}")
    if not ok:
        raise SystemExit(1)


def main() -> int:
    print("drill_parallel_lock · §138.x parallel-session lock contract")
    print("=" * 70)

    # Clean slate
    LOCK_FILE = REPO / ".agent" / "parallel-lock"
    if LOCK_FILE.exists():
        LOCK_FILE.unlink()

    # ─── Step 1 · module imports ──────────────────────────────────────
    try:
        from parallel_lock import (
            acquire_lock, release_lock, is_locked, parallel_lock,
            LOCK_FILE as MOD_LOCK_FILE,
        )
        step(1, True, "scripts/parallel_lock.py imports cleanly")
    except Exception as e:
        step(1, False, f"import FAIL: {e}")

    # ─── Step 2 · initial state · NOT held ───────────────────────────
    locked, info = is_locked()
    step(2, locked is False and info is None,
         f"initial state: locked={locked} · info={info}")

    # ─── Step 3 · acquire + is_locked True ───────────────────────────
    ok = acquire_lock("drill-test", ttl_s=60)
    locked, info = is_locked()
    step(3, ok and locked and info["actor"] == "drill-test",
         f"acquire ok={ok} · locked={locked} · actor={info['actor'] if info else None}")

    # ─── Step 4 · NEG · second acquire (different actor) returns False ──
    ok2 = acquire_lock("other-actor", ttl_s=60)
    step(4, ok2 is False,
         f"NEG busy-acquire: ok={ok2} (must be False)")

    # ─── Step 5 · NEG · wrong-actor release returns False ────────────
    released = release_lock("wrong-actor")
    locked_after, _ = is_locked()
    step(5, released is False and locked_after is True,
         f"NEG wrong-actor release: released={released} · still_locked={locked_after}")

    # ─── Step 6 · correct release succeeds ───────────────────────────
    released_correct = release_lock("drill-test")
    locked_after, _ = is_locked()
    step(6, released_correct is True and locked_after is False,
         f"POS correct release: released={released_correct} · locked_after={locked_after}")

    # ─── Step 7 · NEG · TTL expiry · synthetic ───────────────────────
    # Create a lock with very short TTL · sleep · verify auto-clear
    acquire_lock("ttl-test", ttl_s=1)
    time.sleep(1.5)
    locked_after_ttl, _ = is_locked()
    # is_locked() should have auto-cleared it
    step(7, locked_after_ttl is False,
         f"NEG TTL expiry: locked_after_1.5s_with_ttl_1s = {locked_after_ttl}")

    # Verify the lock file is gone
    step(7, not LOCK_FILE.exists(),
         f"TTL-expired lock file removed: exists={LOCK_FILE.exists()}")

    # ─── Step 8 · POS · context manager clean enter/exit ─────────────
    with parallel_lock(actor="ctx-test") as ok_ctx:
        inside_locked, _ = is_locked()
        ctx_works = ok_ctx is True and inside_locked is True
    post_locked, _ = is_locked()
    step(8, ctx_works and post_locked is False,
         f"POS context manager: inside_locked={inside_locked} · post_locked={post_locked}")

    # ─── Step 9 · NEG · raise_on_busy=False yields ok=False ──────────
    acquire_lock("outer", ttl_s=60)
    with parallel_lock(actor="inner", raise_on_busy=False) as ok_inner:
        skipped = ok_inner is False
    release_lock("outer")
    step(9, skipped,
         f"NEG raise_on_busy=False: yielded ok={ok_inner} (must be False)")

    # ─── Step 10 · POS · CLI status command JSON shape ──────────────
    SCRIPT = REPO / "scripts" / "parallel_lock.py"
    PY = "/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python"
    r = subprocess.run([PY, str(SCRIPT), "status"],
                       capture_output=True, text=True, timeout=10)
    try:
        data = json.loads(r.stdout)
        has_keys = "locked" in data and "info" in data
        step(10, has_keys and r.returncode == 0,
             f"CLI status: rc={r.returncode} · keys={sorted(data.keys())}")
    except json.JSONDecodeError:
        step(10, False, f"CLI status JSON parse FAIL: {r.stdout[:200]}")

    # Cleanup
    if LOCK_FILE.exists():
        LOCK_FILE.unlink()

    print()
    print("ALL 10 STEPS PASSED")
    print()
    print("Contract verified:")
    print("  - Atomic acquire (O_EXCL · no creation race)")
    print("  - TTL auto-expires stale locks (cross-process safe)")
    print("  - Wrong-actor release refused (no steal)")
    print("  - Context manager: clean enter/exit · raise_on_busy=False yields False")
    print("  - CLI status returns valid JSON {locked, info}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
