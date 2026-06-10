#!/usr/bin/env python3
"""Iter 24 audit · optimistic UI + shortcuts + favorites + top-bar + retry-fetch."""
import sys
from pathlib import Path
REPO = Path(__file__).resolve().parent.parent

def main():
    fails = 0
    def a(label, ok, detail=""):
        nonlocal fails
        mark = "✓" if ok else "✗"
        sfx = f" · {detail}" if detail else ""
        print(f"  {label[:55]:<55} | {mark} {('PASS' if ok else 'FAIL')}{sfx}")
        if not ok: fails += 1

    print("Iter 24 audit · polish past 110\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    # 1. fetchRetry exists with exponential backoff
    fr = REPO / "frontend/src/lib/fetchRetry.js"
    a("1. fetchRetry has Math.pow(2, attempt) backoff",
      fr.exists() and "Math.pow(2, attempt)" in fr.read_text())

    # 2. fetchJSON exported
    a("2. fetchJSON exported from fetchRetry",
      fr.exists() and "export async function fetchJSON" in fr.read_text())

    # 3. KeyboardShortcuts
    ks = REPO / "frontend/src/components/KeyboardShortcuts.jsx"
    a("3. KeyboardShortcuts handles ? + g+h + Esc + t",
      ks.exists()
      and "Shift+/" in ks.read_text()
      and "pendingG" in ks.read_text()
      and "Escape" in ks.read_text())

    # 4. FavoritesPanel + toggleFavorite + useTrackRecent
    fp = REPO / "frontend/src/components/FavoritesPanel.jsx"
    a("4. Favorites has toggleFavorite + useTrackRecent + FavoriteStar",
      fp.exists()
      and "toggleFavorite" in fp.read_text()
      and "useTrackRecent" in fp.read_text()
      and "FavoriteStar" in fp.read_text())

    # 5. TopProgressBar with role=progressbar
    tp = REPO / "frontend/src/components/TopProgressBar.jsx"
    a("5. TopProgressBar has role=progressbar + aria-valuenow",
      tp.exists()
      and 'role="progressbar"' in tp.read_text()
      and 'aria-valuenow' in tp.read_text())

    # 6. HITL has optimistic update + rollback
    hp = REPO / "frontend/src/components/HITLPanel.jsx"
    s = hp.read_text() if hp.exists() else ""
    a("6. HITLPanel · OPTIMISTIC apply + rollback on error",
      "OPTIMISTIC" in s and "rolled back" in s)

    # 7. KeyboardShortcuts mounted in layout
    layout = REPO / "frontend/src/pages/insurance/InsuranceLayout.jsx"
    ls = layout.read_text()
    a("7. InsuranceLayout mounts KeyboardShortcuts + TopProgressBar",
      "KeyboardShortcuts" in ls and "TopProgressBar" in ls)

    # 8. FavoritesPanel injected
    st = (REPO / "frontend/src/pages/insurance/tabs/SimpleTabs.jsx").read_text()
    a("8. SimpleTabs · FavoritesPanel imported + injected",
      "FavoritesPanel" in st and "<FavoritesPanel" in st)

    # 9. Star widget
    a("9. FavoriteStar has aria-label + ☆/★",
      fp.exists() and "aria-label" in fp.read_text() and "★" in fp.read_text())

    # 10. retry has timeout abort controller
    a("10. fetchRetry uses AbortController + timeoutMs",
      fr.exists() and "AbortController" in fr.read_text() and "timeoutMs" in fr.read_text())

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    print(f"  Reference: Iter 24 · polish past 110")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
