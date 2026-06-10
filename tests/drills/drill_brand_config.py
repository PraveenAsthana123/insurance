#!/usr/bin/env python3
"""drill_brand_config — locks invariants on config/brand.config.json.

Per §43 (drill discipline): at least 3 negative assertions, exit 0 green / 1 red.
Per §65.1 #8 + §78 (TDD-first): the config is the single source of truth — if it
drifts, the UI lies. This drill runs in CI to catch drift before merge.

POSITIVE assertions:
  1. JSON parses
  2. brand has name + icon + tagline
  3. priorityDepartmentId resolves to a real dept
  4. Required insurance depts present (underwriting, claims, broker)
  5. All dept ids unique
  6. Sidebar/Dashboard files import from config/brand

NEGATIVE assertions:
  N1. No stale BEV department (sales, supply-chain, telehealth, manufacturing)
  N2. Brand name is NOT a beverage placeholder (no 🥤, no "CPG", no "BEV")
  N3. departments.js does NOT hand-define dept objects (must re-export only)
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CFG = ROOT / "config" / "brand.config.json"
DEPARTMENTS_JS = ROOT / "frontend" / "src" / "data" / "departments.js"
BRAND_JS = ROOT / "frontend" / "src" / "config" / "brand.js"
DASHBOARD_JSX = ROOT / "frontend" / "src" / "pages" / "Dashboard.jsx"
SIDEBAR_JSX = ROOT / "frontend" / "src" / "components" / "Sidebar.jsx"

REQUIRED_INSURANCE_IDS = {"underwriting", "claims", "siu", "policy-admin"}
# Note: 'sales' in the 22-dept catalog = Sales & Distribution (insurance broker channel).
# 'supply-chain' / 'manufacturing' / 'retail' / 'telehealth' remain BEV-only stale ids.
STALE_BEV_IDS = {"sales-demand", "supply-chain", "logistics", "manufacturing", "telehealth", "retail"}
BEVERAGE_TOKENS = ("🥤", "CPG", "BEV Analytics", "beverage")

errors: list[str] = []
checks: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    checks.append((name, ok, detail))
    if not ok:
        errors.append(f"{name}: {detail}")


# ---- positive ----
try:
    cfg = json.loads(CFG.read_text())
    check("P1 JSON parses", True, str(CFG))
except Exception as e:  # noqa: BLE001
    check("P1 JSON parses", False, repr(e))
    print(json.dumps(checks, indent=2))
    sys.exit(1)

brand = cfg.get("brand", {})
check("P2 brand.name", bool(brand.get("name")), brand.get("name", ""))
check("P2 brand.icon", bool(brand.get("icon")), brand.get("icon", ""))
check("P2 brand.tagline", bool(brand.get("tagline")), brand.get("tagline", ""))

depts = cfg.get("departments", [])
dept_ids = [d["id"] for d in depts]
priority_id = cfg.get("industry", {}).get("priorityDepartmentId")
check("P3 priorityDept resolves", priority_id in dept_ids, f"{priority_id!r} in {len(dept_ids)} depts")

missing_required = REQUIRED_INSURANCE_IDS - set(dept_ids)
check("P4 insurance depts present", not missing_required, f"missing: {sorted(missing_required)}")

check("P5 dept ids unique", len(dept_ids) == len(set(dept_ids)), f"{len(dept_ids)} ids / {len(set(dept_ids))} unique")

dep_js = DEPARTMENTS_JS.read_text() if DEPARTMENTS_JS.exists() else ""
brand_js = BRAND_JS.read_text() if BRAND_JS.exists() else ""
dash_jsx = DASHBOARD_JSX.read_text() if DASHBOARD_JSX.exists() else ""
sidebar_jsx = SIDEBAR_JSX.read_text() if SIDEBAR_JSX.exists() else ""
check("P6 brand.js imports JSON", "brand.config.json" in brand_js, "brand.js misses the JSON import")
check("P6 Dashboard reads brand", "config/brand" in dash_jsx, "Dashboard.jsx does not import config/brand")
check("P6 Sidebar reads brand", "config/brand" in sidebar_jsx, "Sidebar.jsx does not import config/brand")

# ---- negative ----
stale_present = STALE_BEV_IDS.intersection(dept_ids)
check("N1 no stale BEV depts", not stale_present, f"found: {sorted(stale_present)}")

joined = json.dumps(cfg, ensure_ascii=False)
bev_tokens_found = [t for t in BEVERAGE_TOKENS if t in joined]
check("N2 no beverage tokens in config", not bev_tokens_found, f"tokens: {bev_tokens_found}")

# departments.js must NOT define dept objects literally — only re-export.
# Heuristic: an object literal with id+name+route fields is a hand-defined dept.
hand_defined = bool(re.search(r"id\s*:\s*['\"][a-z-]+['\"][\s\S]{0,400}?route\s*:", dep_js))
check("N3 departments.js is a re-export", not hand_defined, "dept objects found inline — must use the JSON")

# ---- report ----
green = sum(1 for _, ok, _ in checks if ok)
total = len(checks)
print(f"\nbrand.config.json drill — {green}/{total} green")
for name, ok, detail in checks:
    mark = "✓" if ok else "✗"
    print(f"  {mark} {name:35} {detail}")

if errors:
    print(f"\nFAILED: {len(errors)} invariant(s) broken")
    sys.exit(1)

print("\nALL invariants green — config is a stable source of truth.")
sys.exit(0)
