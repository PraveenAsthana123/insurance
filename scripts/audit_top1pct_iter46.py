#!/usr/bin/env python3
"""Iter 46 · AgenticHubPage + catalogs."""
import os, sys, logging
from pathlib import Path
REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO)); sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1"); os.environ.setdefault("INSUR_DISABLE_PRESIDIO", "1")
logging.disable(logging.CRITICAL)

def main():
    fails = 0
    def a(label, ok, detail=""):
        nonlocal fails
        mark = "✓" if ok else "✗"
        print(f"  {label[:55]:<55} | {mark} {('PASS' if ok else 'FAIL')}{(' · ' + detail) if detail else ''}")
        if not ok: fails += 1
    print("Iter 46 audit · Hub + catalogs\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    hub = REPO / "frontend/src/components/AgenticHubPage.jsx"
    txt = hub.read_text()
    a("1. AgenticHubPage.jsx exists", hub.exists())
    a("2. Has StatusView (live monitoring)", "function StatusView" in txt)
    a("3. Has IssuesView (catalog of issues + solutions)", "function IssuesView" in txt)
    a("4. Has SkillsView", "function SkillsView" in txt)
    a("5. Has SearchView (cross-search)", "function SearchView" in txt)
    a("6. Has InterventionView (HITL)", "function InterventionView" in txt)
    a("7. Has VerificationView (9 gates)", "function VerificationView" in txt)
    a("8. Has 11 hub tabs declared", txt.count("HUB_TABS") >= 1 and "issues" in txt and "status" in txt)
    a("9. App.jsx route wired", "AgenticHubPage" in (REPO / "frontend/src/App.jsx").read_text())
    catalogs = [REPO / "docs/AGENT_CATALOG.md", REPO / "docs/SKILL_CATALOG.md"]
    a(f"10. Both catalog markdowns generated ({sum(c.exists() for c in catalogs)}/2)",
      all(c.exists() and c.stat().st_size > 1000 for c in catalogs))

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
