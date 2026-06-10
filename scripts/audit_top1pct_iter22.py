#!/usr/bin/env python3
"""Iter 22 audit · dark mode + skeleton + responsive + a11y + playwright spec."""
import logging, os, sys
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

    print("Iter 22 audit · polish · dark mode + a11y + skeleton + playwright\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    # 1. Skeleton exists
    skel = REPO / "frontend/src/components/Skeleton.jsx"
    a("1. Skeleton.jsx exists + has SkeletonRow", skel.exists() and "SkeletonRow" in skel.read_text())

    # 2. ThemeToggle exists + aria-label
    tt = REPO / "frontend/src/components/ThemeToggle.jsx"
    a("2. ThemeToggle has aria-label + localStorage", tt.exists()
      and "aria-label" in tt.read_text() and "localStorage" in tt.read_text())

    # 3. dark-mode.css exists + has media query
    css = REPO / "frontend/src/styles/dark-mode.css"
    a("3. dark-mode.css has [data-theme=dark] + @media",
      css.exists() and '[data-theme="dark"]' in css.read_text()
      and "@media" in css.read_text())

    # 4. ThemeToggle mounted in layout
    layout = REPO / "frontend/src/pages/insurance/InsuranceLayout.jsx"
    a("4. InsuranceLayout mounts ThemeToggle",
      "ThemeToggle" in layout.read_text())

    # 5. SkeletonRow imported in panels
    panels_with_skel = 0
    for tgt in ["ResponsibleAIPanel", "DataPipelinePanel", "RegulatoryMappingPanel", "TestStatusTier12Panel"]:
        fp = REPO / f"frontend/src/components/{tgt}.jsx"
        if fp.exists() and "SkeletonRow" in fp.read_text(): panels_with_skel += 1
    a(f"5. SkeletonRow imported in panels ({panels_with_skel}/4)", panels_with_skel >= 3)

    # 6. dark-mode.css imported somewhere
    main_jsx = REPO / "frontend/src/main.jsx"
    a("6. dark-mode.css imported in main.jsx",
      main_jsx.exists() and "dark-mode.css" in main_jsx.read_text())

    # 7. Playwright smoke spec exists
    spec = REPO / "e2e/iter22_smoke.spec.js"
    a("7. e2e/iter22_smoke.spec.js exists + 4 tests",
      spec.exists() and spec.read_text().count("test(") >= 4)

    # 8. Responsive media queries
    a("8. CSS has @media max-width 768px",
      css.exists() and "max-width: 768px" in css.read_text())

    # 9. A11y focus-visible
    a("9. CSS has :focus-visible outline + sr-only",
      css.exists() and ":focus-visible" in css.read_text() and "sr-only" in css.read_text())

    # 10. SkeletonRow uses role="status" + aria-label
    a("10. SkeletonRow has role=status + aria-label", skel.exists()
      and 'role="status"' in skel.read_text() and 'aria-label' in skel.read_text())

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    print(f"  Reference: Iter 22 · polish past 100")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
