#!/usr/bin/env python3
"""§138.x parallel-session lock helper.

Race observed earlier this session: commit c61c5abe was a "race-fix"
because parallel coding session re-edited 3 files between my `git add`
and `git commit`. The fix was post-hoc; this module is the prevention.

Pattern:
  PARALLEL SESSION (other coder):
    1. Call `acquire_lock(actor='parallel')` BEFORE editing files
    2. Edit files
    3. Call `release_lock(actor='parallel')` AFTER save
    OR use the context manager: `with parallel_lock(actor='parallel'): ...`

  AUTONOMOUS LOOP (auto_next_loop.py / agent-auto-fix-worker.py):
    1. Check `is_locked()` before staging
    2. If locked → skip with reason "parallel session has lock"
    3. Cron will fire again at next tick

Lock file:
  Path:   .agent/parallel-lock
  Format: JSON · {actor: str, pid: int, acquired_at: ISO, ttl_s: int}
  TTL:    300 seconds (5 min) · auto-expires to prevent stuck locks
  Atomic: os.O_CREAT | os.O_EXCL (no race on creation)

Composes with: §42 hard-gates · §50 dispatcher · §51 substrate ·
§57.7 honest (refuses to stage if locked · doesn't silently win race) ·
§138 operator-handling.

Compatible with: PEP 343 context manager · works in any process.
"""
from __future__ import annotations

import contextlib
import errno
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

LOCK_FILE = Path(__file__).resolve().parent.parent / ".agent" / "parallel-lock"
DEFAULT_TTL_S = 300  # 5 minutes


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def is_locked() -> tuple[bool, dict | None]:
    """Returns (locked, lock_info) · auto-expires stale locks per TTL."""
    if not LOCK_FILE.exists():
        return False, None
    try:
        info = json.loads(LOCK_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        # Corrupt lock · treat as not-locked (clear it on next acquire)
        return False, None

    # TTL check
    try:
        acquired_dt = datetime.fromisoformat(info["acquired_at"])
        age_s = (datetime.now(timezone.utc) - acquired_dt).total_seconds()
        ttl_s = int(info.get("ttl_s", DEFAULT_TTL_S))
        if age_s > ttl_s:
            # Stale · remove and report unlocked
            try:
                LOCK_FILE.unlink()
            except OSError:
                pass
            return False, None
    except (KeyError, ValueError, TypeError):
        # Malformed · treat as not-locked (defensive · §57.7)
        return False, None

    # Iter 95.11 · PID liveness check REMOVED. The CLI usage pattern
    # (each `parallel_lock.py acquire/status/release` is a separate
    # process · PIDs differ) made the PID check incorrectly clear
    # locks held by sibling processes. TTL alone (default 5 min) is
    # the correct mechanism for stale-lock cleanup across processes.
    # If a holder needs longer than TTL · they re-acquire to refresh.
    return True, info


def acquire_lock(actor: str, ttl_s: int = DEFAULT_TTL_S) -> bool:
    """Atomically acquire lock. Returns True if acquired, False if already held."""
    LOCK_FILE.parent.mkdir(parents=True, exist_ok=True)

    # Check + auto-expire stale
    locked, _ = is_locked()
    if locked:
        return False

    info = {
        "actor": actor,
        "pid": os.getpid(),
        "acquired_at": _now_iso(),
        "ttl_s": ttl_s,
    }
    try:
        # O_EXCL = fail if file already exists (atomic check-and-create)
        fd = os.open(str(LOCK_FILE), os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o644)
        with os.fdopen(fd, "w") as f:
            json.dump(info, f, indent=2)
        return True
    except OSError as e:
        if e.errno == errno.EEXIST:
            return False
        raise


def release_lock(actor: str | None = None) -> bool:
    """Release the lock IF held by `actor` (or any if actor=None).

    Returns True if released, False if not held or held by different actor.
    """
    if not LOCK_FILE.exists():
        return False
    try:
        info = json.loads(LOCK_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        # Corrupt · best-effort delete
        try:
            LOCK_FILE.unlink()
            return True
        except OSError:
            return False

    if actor and info.get("actor") != actor:
        return False  # Different actor holds it · don't steal

    try:
        LOCK_FILE.unlink()
        return True
    except OSError:
        return False


@contextlib.contextmanager
def parallel_lock(actor: str, ttl_s: int = DEFAULT_TTL_S, raise_on_busy: bool = True):
    """Context manager · raises RuntimeError if can't acquire (default) ·
    or silently skips body if raise_on_busy=False.

    Usage:
      with parallel_lock(actor='parallel-session'):
          # safe to edit files here
          ...
    """
    acquired = acquire_lock(actor, ttl_s)
    if not acquired:
        locked, info = is_locked()
        if raise_on_busy:
            holder = info.get("actor", "unknown") if info else "unknown"
            raise RuntimeError(
                f"parallel-lock held by '{holder}' · refusing to proceed"
            )
        yield False  # Indicate "not acquired"
        return
    try:
        yield True
    finally:
        release_lock(actor)


# CLI for shell scripts
def _main():
    """Usage:
      parallel_lock.py acquire <actor> [ttl_s]   → exit 0 ok, 1 busy
      parallel_lock.py release [actor]           → exit 0 ok, 1 not-held
      parallel_lock.py status                    → print JSON, exit 0
    """
    if len(sys.argv) < 2:
        print(_main.__doc__, file=sys.stderr)
        sys.exit(2)

    cmd = sys.argv[1]
    if cmd == "acquire":
        if len(sys.argv) < 3:
            print("acquire requires <actor>", file=sys.stderr)
            sys.exit(2)
        actor = sys.argv[2]
        ttl = int(sys.argv[3]) if len(sys.argv) > 3 else DEFAULT_TTL_S
        ok = acquire_lock(actor, ttl)
        if ok:
            print(f"acquired by {actor}")
            sys.exit(0)
        else:
            locked, info = is_locked()
            holder = info.get("actor", "unknown") if info else "unknown"
            print(f"busy · held by {holder}", file=sys.stderr)
            sys.exit(1)

    elif cmd == "release":
        actor = sys.argv[2] if len(sys.argv) > 2 else None
        ok = release_lock(actor)
        print("released" if ok else "not-held")
        sys.exit(0 if ok else 1)

    elif cmd == "status":
        locked, info = is_locked()
        out = {"locked": locked, "info": info}
        print(json.dumps(out, indent=2))
        sys.exit(0)

    else:
        print(f"unknown command: {cmd}", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    _main()
