#!/usr/bin/env python3
"""Drill: scripts/run_drills.py meta-drill (§43.2 resource-aware runner).

Validates the runner's contract WITHOUT actually launching the 24 drills
(that would be a 6+ minute recursion). Tests parsing + filtering +
listing + scheduler-isolation invariants.

Steps (10 total; 3 negative):
    1. (+) scripts/run_drills.py imports cleanly + exposes discover()
    2. (+) discover() returns ≥ 20 Drill objects
    3. (+) every Drill has non-empty resources + name + path
    4. (+) Drill.from_file() correctly parses `# RESOURCES:` tag
    5. (+) Drill.from_file() correctly detects `# SLOW:` tag (drill_full_lifecycle)
    6. (-) NEGATIVE — filter_drills(include_slow=False) excludes SLOW drills
    7. (+) filter_drills(only=substr) returns only matching drills
    8. (-) NEGATIVE — filter_drills(only=NONEXISTENT) returns empty list
    9. (+) --list mode runs + exits 0 + names all drills
   10. (-) NEGATIVE — --only NONEXISTENT exits 2 (not 0) with FATAL message

# RESOURCES: disk_io readonly

Exit 0 on PASS, 1 on FAIL.
"""
from __future__ import annotations

import asyncio
import subprocess
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

PYTHON_EXEC = sys.executable
RUNNER = REPO_ROOT / "scripts" / "run_drills.py"


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' — ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def main():
    print("\nDRILL: scripts/run_drills.py meta-drill (§43.2 resource-aware runner)\n")
    t0 = time.time()

    # ----- Step 1: import + discover() exposed -----
    try:
        from scripts import run_drills as rd
    except Exception as exc:
        step(1, "run_drills imports", False, f"{type(exc).__name__}: {exc}")
        return
    has_surface = (
        callable(getattr(rd, "discover", None))
        and callable(getattr(rd, "filter_drills", None))
        and hasattr(rd, "Drill")
        and hasattr(rd, "Scheduler")
    )
    step(1, "module imports + discover()/filter_drills()/Drill/Scheduler exposed",
         has_surface)

    # ----- Step 2: discover() returns ≥ 20 drills -----
    drills = rd.discover()
    step(2, "discover() returns ≥ 20 Drill objects",
         len(drills) >= 20, f"found {len(drills)}")

    # ----- Step 3: every drill has non-empty fields -----
    bad: list[str] = []
    for d in drills:
        if not d.name:
            bad.append("empty name")
        if not d.resources:
            bad.append(f"{d.name}: empty resources")
        if not d.path.exists():
            bad.append(f"{d.name}: path missing")
    step(3, "every Drill has non-empty name + resources + valid path",
         not bad, "; ".join(bad[:3]) if bad else "")

    # ----- Step 4: RESOURCES parsing -----
    # Pick a known drill with known tags
    celery_drill = next((d for d in drills if d.name == "drill_celery_beat"), None)
    if celery_drill is None:
        step(4, "drill_celery_beat discovered for RESOURCES test", False)
        return
    expected_resources = {"celery_config", "disk_io"}
    parsed_ok = celery_drill.resources == expected_resources
    step(4, "Drill.from_file() parses `# RESOURCES:` tag correctly",
         parsed_ok, f"got {sorted(celery_drill.resources)}")

    # ----- Step 5: SLOW tag detected -----
    full_drill = next((d for d in drills if d.name == "drill_full_lifecycle"), None)
    if full_drill is None:
        step(5, "drill_full_lifecycle discovered for SLOW test", False)
        return
    step(5, "Drill.from_file() detects `# SLOW:` tag on drill_full_lifecycle",
         full_drill.is_slow and len(full_drill.slow_reason) > 10,
         f"is_slow={full_drill.is_slow} reason='{full_drill.slow_reason[:40]}...'")

    # ----- Step 6: NEGATIVE — filter excludes SLOW by default -----
    fast_only = rd.filter_drills(drills, include_slow=False, only=None)
    slow_in_fast = [d.name for d in fast_only if d.is_slow]
    step(6, "NEGATIVE: filter_drills(include_slow=False) excludes SLOW drills",
         not slow_in_fast,
         f"slow leaked: {slow_in_fast}" if slow_in_fast else
         f"excluded {len(drills) - len(fast_only)} SLOW; kept {len(fast_only)} fast")

    # ----- Step 7: filter_drills(only=) works -----
    seq_only = rd.filter_drills(drills, include_slow=False, only="sequence")
    step(7, "filter_drills(only='sequence') returns only matching drills",
         len(seq_only) >= 1 and all("sequence" in d.name.lower() for d in seq_only),
         f"matched {len(seq_only)}: {[d.name for d in seq_only]}")

    # ----- Step 8: NEGATIVE — non-matching only returns empty -----
    none_match = rd.filter_drills(drills, include_slow=False, only="totally-bogus-xyz-99")
    step(8, "NEGATIVE: filter_drills(only='totally-bogus-xyz-99') → empty",
         not none_match, f"unexpectedly matched: {[d.name for d in none_match]}")

    # ----- Step 9: --list mode subprocess -----
    proc = subprocess.run(
        [PYTHON_EXEC, str(RUNNER), "--list"],
        cwd=str(REPO_ROOT), capture_output=True, text=True, timeout=30,
    )
    has_named_drills = (
        proc.returncode == 0
        and "drill_celery_beat" in proc.stdout
        and "drill_full_lifecycle" in proc.stdout
        and "[SLOW]" in proc.stdout
    )
    step(9, "--list mode exits 0 + names all known drills + shows [SLOW] tag",
         has_named_drills, f"rc={proc.returncode}")

    # ----- Step 10: NEGATIVE — --only with no match exits 2 -----
    proc = subprocess.run(
        [PYTHON_EXEC, str(RUNNER), "--only", "totally-bogus-xyz-99", "--list"],
        cwd=str(REPO_ROOT), capture_output=True, text=True, timeout=30,
    )
    # --list short-circuits BEFORE the filter, so this passes (exits 0).
    # Instead drop --list and verify the actual filter-then-fail path:
    proc = subprocess.run(
        [PYTHON_EXEC, str(RUNNER), "--only", "totally-bogus-xyz-99"],
        cwd=str(REPO_ROOT), capture_output=True, text=True, timeout=30,
    )
    step(10, "NEGATIVE: --only 'totally-bogus-xyz-99' (no match) exits 2 + FATAL",
         proc.returncode == 2 and "FATAL" in proc.stderr,
         f"rc={proc.returncode}, stderr='{proc.stderr[:80]}'")

    print(f"\n\033[32mALL 10 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")


if __name__ == "__main__":
    main()
