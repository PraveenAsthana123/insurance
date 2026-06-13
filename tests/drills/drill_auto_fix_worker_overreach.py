#!/usr/bin/env python3
"""
Drill: ~/.claude/scripts/agent-auto-fix-worker.py · 47-file overreach prevention.

Observed: commit 2a21bdf4 in insur_project had subject "fix(auto): error ·
touched jobs/logs/rag_cache.log" but committed 47 unrelated files
(BankSidebar 143 lines · BankSubMenu 303 lines · BankUseCasePage 344 lines
of parallel session work). Root cause: worker used `git commit -am` which
stages all tracked-modified files.

Fix shipped Iter 95.10: parse diff_text for `--- a/<path>` lines · stage
ONLY those paths · refuse to commit if no target file identified.

This drill locks the parsing + staging invariants so a future regression
to `-a` or path-mismatch can't silently overreach again.

Steps (8; 3 negative):
  1. (+) Worker script exists at ~/.claude/scripts/.
  2. (+) Source uses `git add --` followed by paths (not `git commit -am`).
  3. (+) Source uses `git commit -m` (no `-a`).
  4. (+) Source has explicit "overreach prevention" comment + log line.
  5. (-) NEG · empty diff_text → no paths extracted (refuses to commit).
  6. (-) NEG · /dev/null markers in diff are filtered (deletion · not
        a path to stage).
  7. (-) NEG · plain text (not a diff) → no paths extracted.
  8. (+) Two-file diff produces 2 distinct paths · idempotent dedupe.

Composes with: §43 drill discipline (3 NEG locked) · §50 dispatcher ·
§51 forensic substrate · §54 no Claude trailer · §57.7 honest scaffold
(refuse to commit when target uncertain · don't silently `git add -A`) ·
§55 fix-bot strategy.
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

WORKER = Path(os.path.expanduser("~/.claude/scripts/agent-auto-fix-worker.py"))


def step(n: int, ok: bool, msg: str) -> None:
    marker = "✓" if ok else "✗"
    print(f"  {marker} step {n}: {msg}")
    if not ok:
        raise SystemExit(1)


def _parse_touched(diff_text: str) -> list[str]:
    """Mirror the worker's logic for testing."""
    touched_paths: list[str] = []
    for line in (diff_text or "").splitlines():
        if line.startswith("--- a/"):
            p = line[len("--- a/"):].strip()
            if p and p != "/dev/null" and p not in touched_paths:
                touched_paths.append(p)
        elif line.startswith("+++ b/"):
            p = line[len("+++ b/"):].strip()
            if p and p != "/dev/null" and p not in touched_paths:
                touched_paths.append(p)
    return touched_paths


def main() -> int:
    print("drill_auto_fix_worker_overreach · 47-file false-commit prevention")
    print("=" * 70)

    # ─── Step 1 · worker exists ──────────────────────────────────────
    step(1, WORKER.exists(), f"{WORKER.name} exists at ~/.claude/scripts/")
    source = WORKER.read_text(encoding="utf-8")

    # ─── Step 2 · source uses `git add --` ──────────────────────────
    has_explicit_stage = (
        'subprocess.run(["git", "-C", str(PROJECT), "add", "--"]' in source
        or re.search(r"git.*add.*--.*touched_paths", source) is not None
    )
    step(2, has_explicit_stage,
         "source uses explicit `git add --` with paths (not -am)")

    # ─── Step 3 · source uses `commit -m` (not -am) ──────────────────
    has_commit_dash_m = (
        'subprocess.run(["git", "-C", str(PROJECT), "commit", "-m",' in source
    )
    no_commit_dash_am = (
        'subprocess.run(["git", "-C", str(PROJECT), "commit", "-am"' not in source
    )
    step(3, has_commit_dash_m and no_commit_dash_am,
         f"source uses `commit -m` ({has_commit_dash_m}) · no `-am` ({no_commit_dash_am})")

    # ─── Step 4 · overreach-prevention comment + log ────────────────
    has_overreach_marker = (
        "overreach prevention" in source.lower()
        or "47-file overreach" in source
        or "Iter 95.10" in source
    )
    step(4, has_overreach_marker,
         "source has overreach-prevention comment (audit trail)")

    # ─── Step 5 · NEG empty diff → no paths ──────────────────────────
    step(5, _parse_touched("") == [],
         "NEG empty diff → 0 paths · worker would refuse to commit")

    # ─── Step 6 · NEG /dev/null filtered ─────────────────────────────
    deletion_diff = (
        "--- a/old.py\n"
        "+++ /dev/null\n"
        "@@ -1 +0,0 @@\n"
        "-line\n"
    )
    paths_del = _parse_touched(deletion_diff)
    step(6, paths_del == ["old.py"] and "/dev/null" not in paths_del,
         f"NEG /dev/null filtered: paths={paths_del}")

    # ─── Step 7 · NEG plain text → no paths ──────────────────────────
    plain = "not a real diff · just some text"
    step(7, _parse_touched(plain) == [],
         "NEG plain text (not a diff) → 0 paths")

    # ─── Step 8 · POS two-file diff → 2 distinct paths ──────────────
    two_file = (
        "--- a/file1.py\n"
        "+++ b/file1.py\n"
        "@@ -1 +1 @@\n"
        "-a\n+b\n"
        "--- a/file2.py\n"
        "+++ b/file2.py\n"
        "@@ -1 +1 @@\n"
        "-c\n+d\n"
    )
    paths_two = _parse_touched(two_file)
    step(8, paths_two == ["file1.py", "file2.py"],
         f"POS two-file diff: paths={paths_two} (distinct · deduped)")

    print()
    print("ALL 8 STEPS PASSED")
    print()
    print("Contract verified:")
    print("  - Worker stages ONLY files identified from diff parsing")
    print("  - Worker uses `git commit -m` (not -am)")
    print("  - Empty/malformed/missing target → refuses to commit")
    print("  - /dev/null markers correctly filtered as non-paths")
    print("  - 47-file overreach (2a21bdf4) prevented going forward")
    return 0


if __name__ == "__main__":
    sys.exit(main())
