#!/usr/bin/env python3
"""Compact the §10.3 CUA idempotency JSONL by removing expired entries.

The append-only JSONL backing file at CUA_IDEMPOTENCY_PATH grows unbounded
because every successful CUA call appends one line. Compaction reads the
file, drops entries past CUA_IDEMPOTENCY_TTL_SECONDS, dedupes on
(tenant_id, idempotency_key) keeping the latest write, and atomically
replaces the file via a .tmp + os.replace().

Per global §10.3 + §57.7:
  - Skip corrupt JSON lines (never crash)
  - Atomic replace so a crash mid-compaction does not corrupt the live cache
  - Dry-run mode prints stats without touching disk
  - Never drops fresh entries (within TTL)
  - Audit row to data/agent-supervisor/idempotency_compact_runs.jsonl

Usage:
  scripts/idempotency_compact.py                # compact in-place
  scripts/idempotency_compact.py --dry-run      # show what would change
  scripts/idempotency_compact.py --path /tmp/idem.jsonl --ttl 60
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
import time
from pathlib import Path

DEFAULT_PATH = Path(
    os.environ.get("CUA_IDEMPOTENCY_PATH", "data/agent-supervisor/cua_idempotency.jsonl")
)
DEFAULT_TTL = float(os.environ.get("CUA_IDEMPOTENCY_TTL_SECONDS", "300"))
COMPACT_AUDIT_PATH = Path("data/agent-supervisor/idempotency_compact_runs.jsonl")


def compact(path: Path, ttl_seconds: float, dry_run: bool = False) -> dict:
    """Compact path in place. Returns stats dict.

    Stats keys: total_lines, valid, expired, corrupt, deduped_kept, written.
    """
    stats = {
        "total_lines": 0,
        "valid": 0,
        "expired": 0,
        "corrupt": 0,
        "deduped_kept": 0,
        "written": 0,
        "path": str(path),
        "ttl_seconds": ttl_seconds,
        "ran_at": time.time(),
        "dry_run": dry_run,
    }
    if not path.exists():
        return stats

    now = time.time()
    # (tenant_id, key) -> (stored_at, line_text)
    keepers: dict[tuple[str, str], tuple[float, str]] = {}

    for line in path.read_text().splitlines():
        stats["total_lines"] += 1
        line_stripped = line.strip()
        if not line_stripped:
            continue
        try:
            entry = json.loads(line_stripped)
        except json.JSONDecodeError:
            stats["corrupt"] += 1
            continue
        try:
            tenant_id = entry["tenant_id"]
            key = entry["idempotency_key"]
            stored_at = float(entry["stored_at"])
        except (KeyError, TypeError, ValueError):
            stats["corrupt"] += 1
            continue

        stats["valid"] += 1
        if now - stored_at > ttl_seconds:
            stats["expired"] += 1
            continue

        cache_key = (tenant_id, key)
        prev = keepers.get(cache_key)
        if prev is None or stored_at > prev[0]:
            keepers[cache_key] = (stored_at, line_stripped)

    stats["deduped_kept"] = len(keepers)
    stats["written"] = 0 if dry_run else len(keepers)

    if dry_run:
        return stats

    # Atomic write: tempfile in same dir → os.replace.
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(dir=str(path.parent), prefix=".compact_", suffix=".tmp")
    try:
        with os.fdopen(fd, "w") as fh:
            # Sort by stored_at so the file is monotonically ordered after compact.
            for _, (stored_at, line_text) in sorted(keepers.items(), key=lambda kv: kv[1][0]):
                fh.write(line_text + "\n")
        os.replace(tmp_path, path)
    except OSError as exc:
        # Best-effort cleanup; never leave a half-written tmp file lying around.
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise SystemExit(f"compact failed: {exc}")

    _write_audit_row(stats)
    return stats


def _write_audit_row(stats: dict) -> None:
    """Append one row to idempotency_compact_runs.jsonl. Best-effort."""
    try:
        COMPACT_AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
        with COMPACT_AUDIT_PATH.open("a") as fh:
            fh.write(json.dumps(stats, separators=(",", ":")) + "\n")
    except OSError:
        pass


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--path", type=Path, default=DEFAULT_PATH,
                   help=f"path to JSONL (default: {DEFAULT_PATH})")
    p.add_argument("--ttl", type=float, default=DEFAULT_TTL,
                   help=f"TTL in seconds (default: {DEFAULT_TTL})")
    p.add_argument("--dry-run", action="store_true",
                   help="report what would change; do not modify the file")
    args = p.parse_args()

    stats = compact(args.path, args.ttl, dry_run=args.dry_run)
    mode = "dry-run" if args.dry_run else "applied"
    print(f"idempotency-compact ({mode}) — {stats['path']}")
    print(f"  lines={stats['total_lines']}  valid={stats['valid']}  "
          f"expired={stats['expired']}  corrupt={stats['corrupt']}  "
          f"deduped_kept={stats['deduped_kept']}  written={stats['written']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
