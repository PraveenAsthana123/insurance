#!/usr/bin/env python3
"""
Drill: scripts/rotate_work_tracker_history.sh contract.

Commit 9180e4f8 added daily rotation for data/work_tracker/history.jsonl
to close the GitHub 50 MB warning. This drill locks the contract so a
future refactor (e.g., changing the 24h cutoff, the archive path, or
the malformed-line policy) doesn't silently break the rotation.

Steps (8; 3 negative):
  1. (+) Script exists and is executable.
  2. (+) Script runs cleanly against an EMPTY history file (no-op).
  3. (+) Script splits a fixture with 3 old + 2 new events into:
        - current file with 2 events (< 24h)
        - archive .gz with 3 events (>= 24h)
  4. (+) The archive file is gzipped (magic bytes 1f 8b) and the
        decompressed content is valid JSONL.
  5. (-) NEG · malformed JSON line is KEPT in the current file
        (operator can investigate · §57.7 honest).
  6. (-) NEG · script is idempotent · re-running it does NOT delete
        events that were already in the current file (no double-rotation).
  7. (+) Same-day archive is APPENDED (not overwritten) when script
        runs twice in the same UTC day.
  8. (-) NEG · script returns exit 0 when history file is missing
        (skip behavior · per §57.7 best-effort).

Composes with: §43 drill discipline (3 negative locked) · §57.7 honest
scaffold · §70 cron audit pattern (the rotation IS the cron) ·
§38.3 audit-preservation (archive keeps events · doesn't delete them).
"""
from __future__ import annotations

import gzip
import json
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent
SCRIPT = REPO / "scripts/rotate_work_tracker_history.sh"


def step(n: int, ok: bool, msg: str) -> None:
    marker = "✓" if ok else "✗"
    print(f"  {marker} step {n}: {msg}")
    if not ok:
        raise SystemExit(1)


def _now_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _hours_ago_utc(h: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(hours=h)).strftime("%Y-%m-%dT%H:%M:%SZ")


def _run_script_in(tmpdir: Path) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["bash", str(SCRIPT), str(tmpdir)],
        capture_output=True, text=True, timeout=60,
    )


def main() -> int:
    print("drill_history_rotation · §70 cron audit + §38.3 preservation contract")
    print("=" * 70)

    # ─── Step 1 · script exists and is executable ────────────────────
    step(1, SCRIPT.exists() and os.access(SCRIPT, os.X_OK),
         f"{SCRIPT.name} exists and is executable")

    # Set up an isolated tmpdir that mimics the project structure
    with tempfile.TemporaryDirectory(prefix="drill-history-") as td:
        tmpdir = Path(td)
        wt_dir = tmpdir / "data/work_tracker"
        wt_dir.mkdir(parents=True)
        hist = wt_dir / "history.jsonl"
        arch_dir = wt_dir / "archive"

        # ─── Step 2 · empty file · no-op ─────────────────────────────
        hist.write_text("")
        r = _run_script_in(tmpdir)
        step(2, r.returncode == 0 and not list(arch_dir.glob("*.gz") if arch_dir.exists() else []),
             f"empty file: exit {r.returncode}, no archive created")

        # ─── Step 3 · split 3 old + 2 new ────────────────────────────
        events = [
            {"ts": _hours_ago_utc(48), "tag": "old-1"},
            {"ts": _hours_ago_utc(36), "tag": "old-2"},
            {"ts": _hours_ago_utc(25), "tag": "old-3"},
            {"ts": _hours_ago_utc(12), "tag": "new-1"},
            {"ts": _hours_ago_utc(1),  "tag": "new-2"},
        ]
        hist.write_text("\n".join(json.dumps(e) for e in events) + "\n")

        r = _run_script_in(tmpdir)
        assert r.returncode == 0, f"script failed: {r.stderr}"

        kept = [json.loads(line) for line in hist.read_text().splitlines() if line.strip()]
        archive_files = sorted(arch_dir.glob("history-*.jsonl.gz"))
        archived = []
        for af in archive_files:
            with gzip.open(af, "rt") as gz:
                archived.extend(json.loads(line) for line in gz if line.strip())

        ok_split = (
            len(kept) == 2
            and {e["tag"] for e in kept} == {"new-1", "new-2"}
            and len(archived) == 3
            and {e["tag"] for e in archived} == {"old-1", "old-2", "old-3"}
        )
        step(3, ok_split,
             f"split correct · kept={[e['tag'] for e in kept]} "
             f"archived={[e['tag'] for e in archived]}")

        # ─── Step 4 · archive is gzipped + valid JSONL ──────────────
        with archive_files[0].open("rb") as f:
            magic = f.read(2)
        ok_gzip = magic == b"\x1f\x8b"
        step(4, ok_gzip,
             f"archive gzipped (magic={magic!r}) and JSONL parseable")

        # ─── Step 5 · NEG · malformed line KEPT in current ──────────
        hist.write_text(
            json.dumps({"ts": _hours_ago_utc(48), "tag": "old"}) + "\n"
            + "THIS_IS_NOT_JSON\n"  # malformed
            + json.dumps({"ts": _hours_ago_utc(1), "tag": "new"}) + "\n"
        )
        # Clean previous archive
        if arch_dir.exists():
            shutil.rmtree(arch_dir)
            arch_dir.mkdir()
        r = _run_script_in(tmpdir)
        assert r.returncode == 0
        current_lines = [line for line in hist.read_text().splitlines() if line.strip()]
        # Expected: 'new' event + malformed line · old archived
        has_malformed = any(line == "THIS_IS_NOT_JSON" for line in current_lines)
        has_new = any('"tag": "new"' in line for line in current_lines)
        step(5, has_malformed and has_new and len(current_lines) == 2,
             f"NEG malformed line KEPT · current={len(current_lines)} lines "
             f"malformed_present={has_malformed} new_present={has_new}")

        # ─── Step 6 · NEG · idempotency (re-run doesn't double-rotate)
        before_current = hist.read_text()
        r2 = _run_script_in(tmpdir)
        after_current = hist.read_text()
        step(6, r2.returncode == 0 and before_current == after_current,
             f"NEG idempotent · re-run preserves current file content")

        # ─── Step 7 · same-day archive APPENDED ─────────────────────
        # Set up fresh: 2 old events, run once · gives 2-event archive
        # Then add 2 more old events to history, run again · archive
        # should contain 4 events (appended · not overwritten).
        hist.write_text(
            json.dumps({"ts": _hours_ago_utc(48), "tag": "round1-a"}) + "\n"
            + json.dumps({"ts": _hours_ago_utc(40), "tag": "round1-b"}) + "\n"
        )
        if arch_dir.exists():
            shutil.rmtree(arch_dir)
            arch_dir.mkdir()
        _run_script_in(tmpdir)
        # Round 2
        hist.write_text(
            json.dumps({"ts": _hours_ago_utc(48), "tag": "round2-a"}) + "\n"
            + json.dumps({"ts": _hours_ago_utc(40), "tag": "round2-b"}) + "\n"
        )
        _run_script_in(tmpdir)
        # Read back the same-day archive
        archive_files = sorted(arch_dir.glob("history-*.jsonl.gz"))
        if archive_files:
            with gzip.open(archive_files[0], "rt") as gz:
                events = [json.loads(line) for line in gz if line.strip()]
            tags = {e["tag"] for e in events}
            ok_append = tags == {"round1-a", "round1-b", "round2-a", "round2-b"}
            step(7, ok_append,
                 f"same-day APPEND · archive contains {sorted(tags)}")
        else:
            step(7, False, "no archive file after round 2")

        # ─── Step 8 · NEG · missing file · exit 0 ───────────────────
        if hist.exists():
            hist.unlink()
        r = _run_script_in(tmpdir)
        step(8, r.returncode == 0,
             f"NEG missing file · exit {r.returncode} (must be 0 per §57.7)")

    print()
    print("ALL 8 STEPS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
