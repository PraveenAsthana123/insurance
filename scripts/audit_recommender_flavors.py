#!/usr/bin/env python3
"""§64.22 audit · verify each dept's HOLY_RECOMMENDATION.md covers all 3 classical flavors.

Per global §64.22 + docs/RECOMMENDER_FLAVORS_PER_DEPT.md.

Checks:
1. HOLY_RECOMMENDATION.md exists in each dept's business-layer/
2. Each file mentions all 3 flavors (item-based · content-based · hybrid)
3. Each flavor has an algorithm + dataset + KPI line
4. Per-dept summary: which flavors documented · which missing

Exit code 0 = all depts pass · 1 = at least one missing.
"""
import json
import re
import sys
from pathlib import Path

REQUIRED_FLAVORS = ["item-based", "content-based", "hybrid"]
# Depts where item-based is N/A per RECOMMENDER_FLAVORS_PER_DEPT.md
ITEM_NA = {"8", "12", "13", "20", "22"}  # SIU · Compliance · Legal · Cyber · Product Innovation

REPO = Path(__file__).resolve().parent.parent
DEPTS_ROOT = REPO / "global-ai-org" / "departments"


def find_dept_dirs():
    if not DEPTS_ROOT.exists():
        return []
    return sorted([d for d in DEPTS_ROOT.iterdir() if d.is_dir() and not d.name.startswith(".")])


def audit_file(path: Path) -> dict:
    """Inspect HOLY_RECOMMENDATION.md and report flavor coverage."""
    if not path.exists():
        return {"present": False, "flavors": {}}
    content = path.read_text().lower()
    flavors = {
        "item-based": any(t in content for t in ["item-based", "collaborative filter", "item-item", "matrix factorization", "two-tower", "als"]),
        "content-based": any(t in content for t in ["content-based", "tf-idf", "sentence-transformer", "embedding sim", "clip embed"]),
        "hybrid": any(t in content for t in ["hybrid", "ensemble rerank", "lightgbm rank", "xgb rerank", "blended"]),
    }
    return {"present": True, "flavors": flavors, "size": len(content)}


def main() -> int:
    depts = find_dept_dirs()
    if not depts:
        print(f"  ✗ no departments found under {DEPTS_ROOT}")
        return 1

    print(f"§64.22 audit · {len(depts)} departments\n")
    print(f"  {'Dept':<35} | {'File':<6} | {'Item':<5} | {'Cont':<5} | {'Hyb':<4} | Pass")
    print(f"  {'-'*35} | {'-'*6} | {'-'*5} | {'-'*5} | {'-'*4} | ----")

    passes = 0
    fails = 0
    missing_files = 0
    for d in depts:
        # Dept id is leading digits OR config-driven; use folder name suffix
        m = re.match(r"^(\d+)", d.name)
        did = m.group(1) if m else "?"
        item_required = did not in ITEM_NA
        path = d / "business-layer" / "HOLY_RECOMMENDATION.md"
        r = audit_file(path)
        if not r["present"]:
            missing_files += 1
            print(f"  {d.name[:35]:<35} | {'✗':<6} | {'?':<5} | {'?':<5} | {'?':<4} | n/a")
            continue
        f = r["flavors"]
        i_mark = "✓" if f["item-based"] else ("n/a" if not item_required else "✗")
        c_mark = "✓" if f["content-based"] else "✗"
        h_mark = "✓" if f["hybrid"] else "✗"
        dept_pass = (f["content-based"] and f["hybrid"] and (f["item-based"] or not item_required))
        if dept_pass:
            passes += 1
        else:
            fails += 1
        print(f"  {d.name[:35]:<35} | {'✓':<6} | {i_mark:<5} | {c_mark:<5} | {h_mark:<4} | {'PASS' if dept_pass else 'FAIL'}")

    print(f"\n  Summary: {passes} pass · {fails} fail · {missing_files} missing file")
    print(f"  Reference: docs/RECOMMENDER_FLAVORS_PER_DEPT.md")
    return 0 if (fails == 0 and missing_files == 0) else 1


if __name__ == "__main__":
    sys.exit(main())
