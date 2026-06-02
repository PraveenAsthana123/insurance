#!/usr/bin/env python3
"""Drill: INSUR demo-stories per dept × per role (§38 + §47.6 + §57.6 + §63 + §66).

Steps (10 total; 3 negative):
    1. (+) demo-stories router imports + ROLES has exactly 15 entries (§63)
    2. (+) ROLE_DEMO covers every ROLES entry (no role missing a demo)
    3. (+) per-dept GET returns 200 + 15 demos + dept-prefixed personas
    4. (+) per-role detail returns 200 + 9-section envelope
    5. (-) NEGATIVE — unknown dept → 404 (no info leak)
    6. (-) NEGATIVE — unknown role → 404 + lists available
    7. (-) NEGATIVE — malformed role (caps/special) → 400
    8. (+) demo_id values unique within a dept catalog (no dup primary keys)
    9. (+) every role in ROLE_DEMO ∈ canonical ROLES list (no drift)
   10. (+) INSUR_DEMO_STORIES_BY_ROLE.md per dept + _global rollup
           returns all 19 depts with n_demos_total = 285 (15 × 19)

# RESOURCES: demo_stories_router disk_io

Exit 0 on PASS, 1 on FAIL.
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))

EXPECTED_DEPTS = {
    "digital-marketing", "customer-experience", "supply-chain", "manufacturing",
    "product-rd", "retail-operations", "sales", "finance", "hr", "procurement",
    "executive-leadership", "e-commerce", "customer-support", "engineering",
    "it-operations", "legal", "marketing", "operations", "security-operations",
}

EXPECTED_ROLES = {
    "admin", "manager", "team-member", "tester", "security", "devops",
    "ai-reviewer", "digital-transformation", "system-architect",
    "test-architect", "database-architect", "api-architect", "data-owner",
    "ai-strategy", "information-security",
}

# 9-section envelope each demo entry MUST carry per §59 MDD.
REQUIRED_DEMO_KEYS = {
    "demo_id", "role", "persona", "scenario", "kpi_moved", "primary_route",
    "steps", "talking_points", "success_criteria", "gotchas",
    "audit_event_pattern", "related",
}


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' — ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def main():
    print("\nDRILL: INSUR demo-stories per dept × per role (§38 + §47.6 + §63 + §66)\n")
    t0 = time.time()

    # ----- Step 1: router imports + ROLES count -----
    try:
        from routers import demo_stories as ds
    except Exception as exc:
        step(1, "demo_stories router imports", False, f"{type(exc).__name__}: {exc}")
        return
    ok = hasattr(ds, "ROLES") and len(ds.ROLES) == 15
    step(1, "router imports + ROLES has exactly 15 entries (per §63)",
         ok, f"n_roles={len(ds.ROLES)}")

    # ----- Step 2: ROLE_DEMO covers every ROLES entry -----
    missing_demos = set(ds.ROLES) - set(ds.ROLE_DEMO.keys())
    step(2, "ROLE_DEMO covers every ROLES entry (no role missing a demo)",
         not missing_demos,
         f"missing: {sorted(missing_demos)}" if missing_demos else
         f"all {len(ds.ROLES)} roles covered")

    # ----- Spin up TestClient -----
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    app = FastAPI()
    app.include_router(ds.router)
    client = TestClient(app)

    # ----- Step 3: per-dept GET 200 + 15 demos + persona contains dept -----
    r = client.get("/api/v1/insur/demo-stories/sales")
    body = r.json() if r.status_code == 200 else {}
    demos = body.get("demos", [])
    persona_ok = all("Sales" in d.get("persona", "") for d in demos)
    ok = r.status_code == 200 and len(demos) == 15 and persona_ok
    step(3, "GET /sales → 200 + 15 demos + every persona mentions 'Sales'",
         ok,
         f"status={r.status_code} n={len(demos)} persona_ok={persona_ok}")

    # ----- Step 4: per-role detail + 9-section envelope -----
    r = client.get("/api/v1/insur/demo-stories/sales/manager")
    body = r.json() if r.status_code == 200 else {}
    demo = body.get("demo", {})
    missing_keys = REQUIRED_DEMO_KEYS - set(demo.keys())
    step(4, "GET /sales/manager → 200 + 12-section envelope present",
         r.status_code == 200 and not missing_keys,
         f"status={r.status_code} missing_keys={sorted(missing_keys)}" if missing_keys else
         f"all {len(REQUIRED_DEMO_KEYS)} keys present")

    # ----- Step 5: NEGATIVE — unknown dept -----
    r = client.get("/api/v1/insur/demo-stories/not-a-real-dept")
    step(5, "NEGATIVE: unknown dept → 404 (no info leak)",
         r.status_code == 404, f"got {r.status_code}: {r.text[:80]}")

    # ----- Step 6: NEGATIVE — unknown role -----
    r = client.get("/api/v1/insur/demo-stories/sales/totally-bogus-role")
    step(6, "NEGATIVE: unknown role → 404 + lists available",
         r.status_code == 404 and "manager" in r.text,
         f"got {r.status_code}: {r.text[:120]}")

    # ----- Step 7: NEGATIVE — malformed role -----
    r = client.get("/api/v1/insur/demo-stories/sales/Bogus_Caps!")
    step(7, "NEGATIVE: malformed role (caps/special) → 400",
         r.status_code == 400, f"got {r.status_code}: {r.text[:80]}")

    # ----- Step 8: demo_id uniqueness within a dept -----
    catalog = client.get("/api/v1/insur/demo-stories/sales").json()
    ids = [d["demo_id"] for d in catalog.get("demos", [])]
    dups = [rid for rid in set(ids) if ids.count(rid) > 1]
    step(8, "demo_id values unique within a dept catalog (no dup keys)",
         not dups, f"duplicates: {dups}" if dups else f"all {len(ids)} unique")

    # ----- Step 9: ROLE_DEMO keys ⊆ canonical ROLES (no drift) -----
    role_demo_drift = set(ds.ROLE_DEMO.keys()) - set(ds.ROLES)
    step(9, "ROLE_DEMO keys ⊆ canonical ROLES list (no drift)",
         not role_demo_drift,
         f"unknown roles in ROLE_DEMO: {sorted(role_demo_drift)}" if role_demo_drift else "")

    # ----- Step 10: per-dept MD + _global rollup -----
    candidates = [Path("/global-ai-org"), REPO_ROOT / "global-ai-org"]
    gao = next((p for p in candidates if p.exists()), None)
    if gao is None:
        step(10, "global-ai-org/ locatable", False, "tried " + str(candidates))
        return
    missing_md = [
        dept for dept in EXPECTED_DEPTS
        if not (gao / "departments" / dept / "business-layer" / "INSUR_DEMO_STORIES_BY_ROLE.md").exists()
    ]
    r = client.get("/api/v1/insur/demo-stories/_global")
    rollup = r.json() if r.status_code == 200 else {}
    expected_total = len(EXPECTED_DEPTS) * len(ds.ROLES)
    ok = (
        not missing_md
        and r.status_code == 200
        and rollup.get("n_demos_total") == expected_total
        and set(rollup.get("depts", [])) == EXPECTED_DEPTS
    )
    step(10,
         f"INSUR_DEMO_STORIES_BY_ROLE.md present + _global ({len(EXPECTED_DEPTS)} depts × {len(ds.ROLES)} = {expected_total} demos)",
         ok,
         f"missing_md={missing_md[:2]} n_total={rollup.get('n_demos_total')} depts={len(rollup.get('depts', []))}")

    print(f"\n\033[32mALL 10 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")


if __name__ == "__main__":
    main()
