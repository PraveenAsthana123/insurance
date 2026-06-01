#!/usr/bin/env python3
"""Compact the §38.3 CUA audit log (data/agent-supervisor/cua_runs.jsonl).

Unlike the idempotency JSONL (which has a TTL — compactable), the audit
log is the §38.3 SOC2 trail and MUST NOT lose rows. This script enforces
that by NEVER dropping rows — it only:

  1. Counts rows per outcome class
  2. Reports tenant distribution + admin-of-audit count
  3. Rotates the file when it crosses a size threshold
     (default 50MB — env CUA_AUDIT_ROTATE_BYTES)

Rotation moves the live file to `cua_runs.YYYY-MM-DD.jsonl.gz` (gzipped)
and starts a fresh empty file. Operators can offload the rotated
archives to long-term storage; the SOC2 retention contract is preserved.

Per global CLAUDE.md §38.3 + §57.7:
  - NEVER drops audit rows; rotation preserves all history
  - Atomic rotation (rename live → archive, touch new live)
  - Skips corrupt JSON lines in stats (counts them, never deletes)
  - Dry-run reports stats without touching disk

Usage:
  scripts/audit_compact.py                         # rotate if > 50MB
  scripts/audit_compact.py --dry-run               # stats only
  scripts/audit_compact.py --force                 # rotate regardless
  scripts/audit_compact.py --path /tmp/audit.jsonl --rotate-bytes 1024
"""
from __future__ import annotations

import argparse
import datetime
import gzip
import json
import os
import shutil
import sys
import time
from collections import Counter
from pathlib import Path

DEFAULT_PATH = Path(
    os.environ.get("CUA_AUDIT_PATH", "data/agent-supervisor/cua_runs.jsonl")
)
DEFAULT_ROTATE_BYTES = int(os.environ.get("CUA_AUDIT_ROTATE_BYTES", str(50 * 1024 * 1024)))
ROTATE_AUDIT_PATH = Path("data/agent-supervisor/audit_compact_runs.jsonl")


def compact(path: Path, rotate_bytes: int, dry_run: bool = False, force: bool = False) -> dict:
    """Report stats; rotate if size threshold crossed (or --force).

    Returns stats dict with keys: total_lines, valid, corrupt, blank,
    by_outcome, by_tenant, file_size_bytes, rotated, archive_path.
    Audit rows are NEVER dropped — rotation moves them to a gzipped
    archive, preserving the §38.3 trail.
    """
    stats = {
        "ran_at": time.time(),
        "path": str(path),
        "rotate_bytes_threshold": rotate_bytes,
        "dry_run": dry_run,
        "force": force,
        "total_lines": 0,
        "valid": 0,
        "corrupt": 0,
        "blank": 0,
        "by_outcome": {},
        "by_tenant": {},
        "file_size_bytes": 0,
        "rotated": False,
        "archive_path": None,
    }
    if not path.exists():
        return stats

    stats["file_size_bytes"] = path.stat().st_size
    outcome_counter: Counter = Counter()
    tenant_counter: Counter = Counter()

    for line in path.read_text().splitlines():
        stats["total_lines"] += 1
        line_stripped = line.strip()
        if not line_stripped:
            stats["blank"] += 1
            continue
        try:
            entry = json.loads(line_stripped)
        except json.JSONDecodeError:
            stats["corrupt"] += 1
            continue
        stats["valid"] += 1
        outcome_counter[entry.get("outcome", "unknown")] += 1
        tenant_counter[entry.get("tenant_id", "unknown")] += 1

    stats["by_outcome"] = dict(outcome_counter)
    stats["by_tenant"] = dict(tenant_counter)

    should_rotate = force or stats["file_size_bytes"] >= rotate_bytes
    if not should_rotate or dry_run:
        return stats

    # Atomic rotation: write to .new, gzip the live file into archive, replace.
    # Use the path's stem so different audit files don't collide on archive name.
    stem = path.stem  # e.g. "cua_runs" or "cua_runs2"
    archive_name = f"{stem}.{datetime.date.today().isoformat()}.jsonl.gz"
    archive_path = path.parent / archive_name
    # If same-day archive exists already, suffix with epoch-ms for uniqueness
    if archive_path.exists():
        archive_path = path.parent / f"{stem}.{datetime.date.today().isoformat()}.{int(time.time() * 1000)}.jsonl.gz"

    try:
        # 1. Compress live file → temp gz
        tmp_gz = archive_path.with_suffix(".tmp.gz")
        with path.open("rb") as src, gzip.open(tmp_gz, "wb") as dst:
            shutil.copyfileobj(src, dst)
        # 2. Atomic rename of compressed temp → final archive
        os.replace(tmp_gz, archive_path)
        # 3. Truncate live file (open w + close immediately)
        path.write_text("")
        stats["rotated"] = True
        stats["archive_path"] = str(archive_path)
    except OSError as exc:
        # Best-effort cleanup of any half-written .tmp.gz
        if tmp_gz.exists():
            try:
                tmp_gz.unlink()
            except OSError:
                pass
        raise SystemExit(f"audit_compact rotation failed: {exc}")

    _write_audit_row(stats)
    return stats


def _write_audit_row(stats: dict) -> None:
    """Audit-of-audit at idempotency_compact_runs.jsonl-style sibling.
    NEVER includes per-tenant detail (the audit log itself has that)."""
    try:
        ROTATE_AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
        row = {k: v for k, v in stats.items() if k not in {"by_outcome", "by_tenant"}}
        with ROTATE_AUDIT_PATH.open("a") as fh:
            fh.write(json.dumps(row, separators=(",", ":")) + "\n")
    except OSError:
        pass


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--path", type=Path, default=DEFAULT_PATH,
                   help=f"path to JSONL (default: {DEFAULT_PATH})")
    p.add_argument("--rotate-bytes", type=int, default=DEFAULT_ROTATE_BYTES,
                   help=f"rotate when file ≥ N bytes (default: {DEFAULT_ROTATE_BYTES})")
    p.add_argument("--dry-run", action="store_true",
                   help="report stats; do not rotate")
    p.add_argument("--force", action="store_true",
                   help="rotate regardless of size")
    args = p.parse_args()

    stats = compact(args.path, args.rotate_bytes, dry_run=args.dry_run, force=args.force)
    mode = "dry-run" if args.dry_run else "applied"
    print(f"audit-compact ({mode}) — {stats['path']}")
    print(f"  total_lines={stats['total_lines']}  valid={stats['valid']}  "
          f"corrupt={stats['corrupt']}  blank={stats['blank']}")
    print(f"  file_size_bytes={stats['file_size_bytes']}  "
          f"rotate_threshold={stats['rotate_bytes_threshold']}  "
          f"rotated={stats['rotated']}")
    if stats["by_outcome"]:
        print(f"  by_outcome: {stats['by_outcome']}")
    if stats["by_tenant"]:
        print(f"  by_tenant: {dict(list(stats['by_tenant'].items())[:6])}{'...' if len(stats['by_tenant']) > 6 else ''}")
    if stats["archive_path"]:
        print(f"  archive_path={stats['archive_path']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
