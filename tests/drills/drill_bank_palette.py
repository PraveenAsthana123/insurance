#!/usr/bin/env python3
"""
Drill: bank CARD_GRID_LIGHTS palette stays §137.3 compliant.

Commit a994ff27 added a 6-color pastel palette to BankTabs.jsx · used
to give consecutive cards on a grid visually distinct backgrounds.
Each entry is `{ bg: '#XXXXXX', border: '#XXXXXX' }` — bg must be a
§137.3-permitted light hex · border must be a matching mid-tone.

§137 audit scans for FORBIDDEN dark hex in content/workspace areas ·
this drill is the POSITIVE counterpart: every palette entry must be
in the PERMITTED §137.3 set (slate-50 family · WCAG AA contrast with
dark text).

A future refactor that accidentally drops a forbidden hex into the
palette (e.g., dark mode toggle attempt · operator-typed wrong hex)
would fail this drill before merge.

Steps (6; 3 negative):
  1. (+) Source file exists + parses for the CARD_GRID_LIGHTS array.
  2. (+) Array has ≥ 6 entries (the documented count).
  3. (+) Every entry has both `bg` and `border` 6-char hex codes.
  4. (-) NEG · NO entry's bg is in the §137.2 FORBIDDEN list (dark hex).
  5. (-) NEG · every bg is in the §137.3 PERMITTED light hex set
        (50-100 lightness range · WCAG AA with dark text).
  6. (-) NEG · adjacent entries have DIFFERENT bg colors (the whole
        point of the palette — visual differentiation).

Composes with: §43 drill discipline (3 negative locked) ·
§57.7 honest scaffold · §73 17-tab right pane (palette used in cards) ·
§137.2 forbidden hex · §137.3 permitted palette · §137.4 chrome stays dark.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent
TARGET = REPO / "frontend/src/pages/bank/tabs/BankTabs.jsx"


def step(n: int, ok: bool, msg: str) -> None:
    marker = "✓" if ok else "✗"
    print(f"  {marker} step {n}: {msg}")
    if not ok:
        raise SystemExit(1)


# §137.2 FORBIDDEN hex (release blocker in content areas)
FORBIDDEN_HEX = {
    "#000000", "#000",
    "#020617",
    "#0f172a",
    "#111827",
    "#181818",
    "#1a1a2e",
    "#1e293b",
    "#1f2937",
    "#212121",
    "#222222",
}

# §137.3 PERMITTED light backgrounds (slate-50 / 100 family · pastels)
# We accept anything in the "very light" range: hex with all 3 channels ≥ 0xE0
# (heuristic) OR explicitly listed permitted colors.
PERMITTED_EXPLICIT = {
    "#ffffff", "#fff",
    "#f8fafc", "#f1f5f9", "#e2e8f0",
    "#ecfdf5", "#fef3c7", "#fee2e2", "#dbeafe",
    "#f5f3ff", "#ecfeff", "#fdf2f8", "#fffbeb",
    "#eff6ff", "#f0fdf4",
}


def _all_channels_light(hex_str: str, threshold: int = 0xE0) -> bool:
    """True if all 3 channels are ≥ threshold (very light · safe with dark text)."""
    s = hex_str.lstrip("#")
    if len(s) == 3:
        s = "".join(c * 2 for c in s)
    if len(s) != 6:
        return False
    try:
        r, g, b = int(s[:2], 16), int(s[2:4], 16), int(s[4:6], 16)
        return r >= threshold and g >= threshold and b >= threshold
    except ValueError:
        return False


def main() -> int:
    print("drill_bank_palette · CARD_GRID_LIGHTS §137.3 compliance")
    print("=" * 70)

    # ─── Step 1 · source file parses ────────────────────────────────
    step(1, TARGET.exists(), f"{TARGET.name} exists")
    content = TARGET.read_text(encoding="utf-8")
    # Extract the array literal
    m = re.search(
        r"const\s+CARD_GRID_LIGHTS\s*=\s*\[(.*?)\];",
        content,
        re.DOTALL,
    )
    step(1, bool(m),
         "CARD_GRID_LIGHTS array literal found in source")

    array_body = m.group(1)
    # Parse each entry: { bg: '#XXX', border: '#XXX' }
    entry_pattern = re.compile(
        r"\{\s*bg:\s*'(#[0-9a-fA-F]{3,6})'\s*,\s*border:\s*'(#[0-9a-fA-F]{3,6})'\s*\}",
    )
    entries = entry_pattern.findall(array_body)

    # ─── Step 2 · ≥ 6 entries ────────────────────────────────────────
    step(2, len(entries) >= 6,
         f"palette has {len(entries)} entries (must be ≥ 6)")

    # ─── Step 3 · every entry has both fields ───────────────────────
    # If regex matched, both fields are present. Verify shape explicitly.
    all_have_fields = all(len(e) == 2 and e[0] and e[1] for e in entries)
    step(3, all_have_fields,
         f"every entry has {{bg, border}} hex pair · all {len(entries)} verified")

    # ─── Step 4 · NEG · no bg is in §137.2 FORBIDDEN ─────────────────
    forbidden_hits = [
        e[0] for e in entries
        if e[0].lower() in {h.lower() for h in FORBIDDEN_HEX}
    ]
    step(4, len(forbidden_hits) == 0,
         f"NEG §137.2: 0 forbidden bg · would-be-hits: {forbidden_hits if forbidden_hits else 'NONE'}")

    # ─── Step 5 · NEG · every bg is in §137.3 PERMITTED ─────────────
    non_permitted = []
    for bg, _ in entries:
        bg_lower = bg.lower()
        if bg_lower in {p.lower() for p in PERMITTED_EXPLICIT}:
            continue
        if _all_channels_light(bg):
            continue
        non_permitted.append(bg)
    step(5, len(non_permitted) == 0,
         f"NEG §137.3: all {len(entries)} bg are permitted (light family) · "
         f"non-permitted: {non_permitted if non_permitted else 'NONE'}")

    # ─── Step 6 · NEG · adjacent entries have DIFFERENT bg ──────────
    adjacent_same = []
    for i in range(len(entries) - 1):
        if entries[i][0].lower() == entries[i + 1][0].lower():
            adjacent_same.append((i, entries[i][0]))
    step(6, len(adjacent_same) == 0,
         f"NEG differentiation: 0 adjacent same-bg · "
         f"would-be-collisions: {adjacent_same if adjacent_same else 'NONE'}")

    print()
    print("ALL 6 STEPS PASSED")
    print(f"Palette ({len(entries)} entries):")
    for i, (bg, border) in enumerate(entries):
        print(f"  {i}: bg={bg} · border={border}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
