#!/usr/bin/env python3
"""
Drill: INSUR per-role dashboards + reports (§43, §64.37).

Steps (8 total; 3 negative assertions):
    1. (+) Catalog defines all 15 roles
    2. (+) build_dashboard_payload returns ≥ 6 tiles + ≥ 3 charts for every role
    3. (+) Every tile has status ∈ {green, amber, red} + numeric delta
    4. (+) build_reports_payload returns ≥ 3 reports per role
    5. (-) NEGATIVE — unknown role returns None (no silent fallback)
    6. (-) NEGATIVE — empty dept name doesn't crash, just generates synthetic data deterministically
    7. (+) Deterministic synthesis — same (dept, role, metric) → same value
    8. (+) All 15 × 19 = 285 (dept, role) combinations yield valid payloads

# RESOURCES: ml_role_dashboard

Exit 0 on PASS, 1 on FAIL.
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))


DEPARTMENTS = [
    "digital-marketing", "customer-experience", "supply-chain", "manufacturing",
    "product-rd", "retail-operations", "sales", "finance", "hr", "procurement",
    "executive-leadership", "e-commerce",
    "customer-support", "engineering", "it-operations", "legal", "marketing",
    "operations", "security-operations",
]


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' — ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def main():
    from ml.reference.role_dashboard_catalog import (
        ROLE_CATALOG,
        build_dashboard_payload,
        build_reports_payload,
    )

    print("\nDRILL: INSUR role dashboards + reports\n")
    t0 = time.time()

    # ----- Step 1: catalog has all 15 roles -----
    expected_roles = {
        "admin", "manager", "team-member", "tester", "security", "devops",
        "ai-reviewer", "digital-transformation", "system-architect",
        "test-architect", "database-architect", "api-architect",
        "data-owner", "ai-strategy", "information-security",
    }
    ok = expected_roles.issubset(ROLE_CATALOG.keys())
    step(1, "catalog defines all 15 roles", ok,
         f"have {len(ROLE_CATALOG)} of expected 15; missing={expected_roles - set(ROLE_CATALOG.keys())}")

    # ----- Step 2: ≥ 6 tiles + ≥ 3 charts per role -----
    bad = []
    for role in expected_roles:
        p = build_dashboard_payload("sales", role)
        if not p:
            bad.append(f"{role}: no payload")
            continue
        if len(p["tiles"]) < 6:
            bad.append(f"{role}: {len(p['tiles'])} tiles < 6")
        if len(p["charts"]) < 3:
            bad.append(f"{role}: {len(p['charts'])} charts < 3")
    step(2, "every role has ≥ 6 tiles + ≥ 3 charts", not bad,
         "; ".join(bad) if bad else "all 15 roles passed")

    # ----- Step 3: tile statuses + deltas valid -----
    sample = build_dashboard_payload("manufacturing", "manager")
    bad = []
    for t in sample["tiles"]:
        if t.get("status") not in ("green", "amber", "red"):
            bad.append(f"{t['metric_id']}: bad status {t.get('status')}")
        if not isinstance(t.get("delta_pct"), (int, float)):
            bad.append(f"{t['metric_id']}: delta_pct not numeric")
    step(3, "tiles have valid status + numeric delta", not bad, "; ".join(bad) if bad else "")

    # ----- Step 4: ≥ 3 reports per role -----
    bad = []
    for role in expected_roles:
        r = build_reports_payload("sales", role)
        if not r or len(r["reports"]) < 3:
            bad.append(f"{role}: {len(r['reports']) if r else 0} reports < 3")
    step(4, "every role has ≥ 3 standard reports", not bad, "; ".join(bad) if bad else "")

    # ----- Step 5: NEGATIVE — unknown role -----
    bogus = build_dashboard_payload("sales", "totally_made_up_role_xyz")
    step(5, "NEGATIVE: unknown role returns None (no fallback)", bogus is None,
         f"got {bogus}")

    # ----- Step 6: NEGATIVE — empty dept produces valid (synthetic) payload but distinct from real dept -----
    a = build_dashboard_payload("", "manager")
    b = build_dashboard_payload("sales", "manager")
    ok = (
        a is not None
        and b is not None
        and a["tiles"][0]["value"] != b["tiles"][0]["value"]  # different seed → different value
    )
    step(6, "NEGATIVE: empty dept yields distinct seed (no cross-contamination)", ok,
         f"empty[0]={a['tiles'][0]['value']} sales[0]={b['tiles'][0]['value']}")

    # ----- Step 7: deterministic synthesis -----
    c = build_dashboard_payload("sales", "manager")
    d = build_dashboard_payload("sales", "manager")
    ok = all(c["tiles"][i]["value"] == d["tiles"][i]["value"] for i in range(len(c["tiles"])))
    step(7, "same (dept, role) → same tile values (deterministic)", ok)

    # ----- Step 8: 285 (dept, role) combinations all valid -----
    n_ok = 0
    n_bad = 0
    for dept in DEPARTMENTS:
        for role in expected_roles:
            p = build_dashboard_payload(dept, role)
            r = build_reports_payload(dept, role)
            if p and r and len(p["tiles"]) >= 6 and len(r["reports"]) >= 3:
                n_ok += 1
            else:
                n_bad += 1
    total = len(DEPARTMENTS) * len(expected_roles)
    step(8, f"all {total} (dept, role) combinations yield valid payloads",
         n_ok == total, f"{n_ok}/{total} passed, {n_bad} failed")

    print(f"\n\033[32mALL 8 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")


if __name__ == "__main__":
    main()
