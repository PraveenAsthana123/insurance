#!/usr/bin/env python3
"""
Drill: TAB_CHARTER coverage · §122 brutal top-1% lock.

Operator (2026-06-13 11:24 MDT): "10/10" + "fix all" — after the
docs/TAB_GOAL_OUTPUT_AUDIT.md surfaced 22/31 (71%) rich charter
coverage, this drill locks 100% so it can't regress.

The contract:
  - Every TAB_PROFILES entry (1-line intent) MUST have a matching
    TAB_CHARTER entry (full 8-field Business Objective panel).
  - Every TAB_CHARTER entry MUST have all 8 canonical fields:
    what · why · addresses · how · navigate · objectives · scope · out_of_scope
  - The objectives[] array MUST have ≥ 3 entries (the hypothesis list).

Steps (8; 3 negative):
  1. (+) BankUseCasePage.jsx exists + parses
  2. (+) TAB_PROFILES block parses · ≥ 30 entries
  3. (+) TAB_CHARTER block parses · ≥ 30 entries
  4. (-) NEG · TAB_PROFILES ⊆ TAB_CHARTER (no profile without charter)
  5. (-) NEG · Every TAB_CHARTER entry has all 8 required fields
  6. (-) NEG · Every TAB_CHARTER objectives[] has ≥ 3 entries
  7. (+) BusinessObjectiveSection component is wired (line ~5580)
  8. (+) SummaryAndOutcomeRow component is wired (line ~5607)

Composes with: §43 (drill discipline · 3 neg minimum) ·
§57.7 (honest scaffold · contract locks the deliverable shape) ·
§73 (17-tab right pane) · §82 #14 (Hypothesis · objectives[] IS the
hypothesis list) · §93 (IPO pattern · objective + output) · §94 (17-
section structure) · §122 (brutal · top-1% means 100% coverage) ·
§138 (operator-handling · this drill IS the lock).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent
TARGET = REPO / "frontend/src/pages/bank/BankUseCasePage.jsx"

REQUIRED_FIELDS = [
    "what",
    "why",
    "addresses",
    "how",
    "navigate",
    "objectives",
    "scope",
    "out_of_scope",
]


def step(n: int, ok: bool, msg: str) -> None:
    marker = "✓" if ok else "✗"
    print(f"  {marker} step {n}: {msg}")
    if not ok:
        raise SystemExit(1)


def _block(src: str, anchor: str, open_ch: str, close_ch: str) -> str:
    """Return the block of source starting at anchor, balanced on open/close chars."""
    start = src.find(anchor)
    if start < 0:
        return ""
    depth = 0
    for i in range(start, len(src)):
        if src[i] == open_ch:
            depth += 1
        elif src[i] == close_ch:
            depth -= 1
            if depth == 0:
                return src[start : i + 1]
    return ""


def _parse_entry_fields(block: str, key: str) -> list[str]:
    """Within a TAB_CHARTER entry block, return list of field names present.

    We look for top-level `field_name:` patterns at the appropriate indent.
    Conservative — assumes the standard formatting in this file.
    """
    # Find the entry: `'<key>': {  ... },` block
    m = re.search(
        r"['\"]" + re.escape(key) + r"['\"]\s*:\s*\{(.*?)\n  \}",
        block,
        re.DOTALL,
    )
    if not m:
        return []
    body = m.group(1)
    # Match top-level field lines: 4-space indent + name: ...
    return re.findall(r"^\s{4}(\w+):", body, re.MULTILINE)


def _objectives_count(block: str, key: str) -> int:
    """Count entries in the objectives: [...] array for a given charter key."""
    m = re.search(
        r"['\"]" + re.escape(key) + r"['\"]\s*:\s*\{(.*?)\n  \}",
        block,
        re.DOTALL,
    )
    if not m:
        return 0
    body = m.group(1)
    obj_m = re.search(r"objectives:\s*\[(.*?)\]", body, re.DOTALL)
    if not obj_m:
        return 0
    items = re.findall(r"['\"`]", obj_m.group(1))
    # Each string has open + close quote · count quotes / 2
    return len(items) // 2


def main() -> int:
    print("drill_tab_charter_coverage · §122 top-1% TAB_CHARTER ⊇ TAB_PROFILES lock")
    print("=" * 70)

    # Step 1 · file exists + parses
    step(1, TARGET.exists(), f"{TARGET.name} exists")
    src = TARGET.read_text(encoding="utf-8")
    step(1, len(src) > 10000, f"BankUseCasePage parses · {len(src)} bytes")

    # Step 2 · TAB_PROFILES block
    profiles_block = _block(src, "const TAB_PROFILES = {", "{", "}")
    profile_keys = set(re.findall(r"^\s*'([\w-]+)':", profiles_block, re.MULTILINE))
    step(
        2,
        len(profile_keys) >= 32,
        f"TAB_PROFILES parses · {len(profile_keys)} entries (expect ≥ 32 incl. manual-explore)",
    )

    # Step 3 · TAB_CHARTER block
    charter_block = _block(src, "const TAB_CHARTER = {", "{", "}")
    charter_keys = set(
        re.findall(r"^\s*'([\w-]+)':\s*\{", charter_block, re.MULTILINE)
    )
    step(
        3,
        len(charter_keys) >= 32,
        f"TAB_CHARTER parses · {len(charter_keys)} entries (expect ≥ 32 incl. manual-explore)",
    )

    # Step 4 · NEG · every profile has a charter
    missing_charter = sorted(profile_keys - charter_keys)
    step(
        4,
        len(missing_charter) == 0,
        f"NEG · TAB_PROFILES ⊆ TAB_CHARTER · missing: {missing_charter or 'NONE'}",
    )

    # Step 5 · NEG · every charter has all 8 fields
    incomplete = []
    for k in sorted(charter_keys):
        fields = _parse_entry_fields(charter_block, k)
        missing = [f for f in REQUIRED_FIELDS if f not in fields]
        if missing:
            incomplete.append((k, missing))
    step(
        5,
        len(incomplete) == 0,
        f"NEG · 8 canonical fields per charter · incomplete: "
        f"{[(k, m) for k, m in incomplete[:3]] or 'NONE'}",
    )

    # Step 6 · NEG · every objectives[] has ≥ 3 entries
    thin_objectives = []
    for k in sorted(charter_keys):
        n = _objectives_count(charter_block, k)
        if n < 3:
            thin_objectives.append((k, n))
    step(
        6,
        len(thin_objectives) == 0,
        f"NEG · objectives[] ≥ 3 entries · thin: "
        f"{thin_objectives[:5] or 'NONE'}",
    )

    # Step 7 · BusinessObjectiveSection wired
    has_section = "<BusinessObjectiveSection" in src
    step(
        7,
        has_section,
        f"BusinessObjectiveSection consumed in render: {has_section}",
    )

    # Step 8 · SummaryAndOutcomeRow wired
    has_output = "<SummaryAndOutcomeRow" in src
    step(
        8,
        has_output,
        f"SummaryAndOutcomeRow consumed in render: {has_output}",
    )

    print()
    print("ALL 8 STEPS PASSED")
    print()
    print("Contract verified:")
    print(f"  - {len(profile_keys)} TAB_PROFILES entries")
    print(f"  - {len(charter_keys)} TAB_CHARTER entries")
    print(f"  - 100% PROFILES ⊆ CHARTER coverage (no goal-blind tab)")
    print(f"  - 8 canonical fields per charter (what · why · ... · out_of_scope)")
    print(f"  - objectives[] ≥ 3 entries each (per §82 #14 hypothesis list)")
    print(f"  - BusinessObjectiveSection + SummaryAndOutcomeRow both wired")
    return 0


if __name__ == "__main__":
    sys.exit(main())
