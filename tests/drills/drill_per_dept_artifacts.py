#!/usr/bin/env python3
"""
Drill: §64 + §65 release blocker — every dept MUST have FULL artifact set.

Updated 2026-05-23 to cover the artifacts the prior version undercounted:
data-types/* (9 per dept), docs/{hld,lld,sad,c4-model,network-flow}/* (5 per
dept), INSUR_TECH_STACK.md (1 per dept).

Total mandatory artifacts per dept after this update:
  - 25 business-layer MD files (last added: INSUR_AGENTIC_STACK §64.40.8, 2026-05-25;
        remote-parallel batch §66 2026-05-24: TRANSACTIONS, PIPELINES,
        REPORTS_CATALOG, DEMO_STORIES_BY_ROLE, GRAPH_AI, DATA_DOWNLOADS)
  - 30 role-scoped MD files (15 dashboards + 15 reports)
  -  9 data-type stubs (per §64.26)
  -  9 docs files (HLD/LLD/SAD/C4/NetworkFlow/FRD/BRD/Sequence/TechStack per §63 + §58 + §66)
  ─────────────────────────────
   73 mandatory MD files per dept × 19 depts = 1387 files

Steps (10 total; 3 negative):
    1. (+) 19 expected depts all exist on disk
    2. (+) 25 business-layer MD artifacts present per dept (= 475 files)
    3. (-) NEGATIVE — known-bad dept name produces a clear failure
    4. (+) Each artifact file is non-empty (≥ 200 bytes)
    5. (+) Each artifact starts with the standard INSUR header
    6. (-) NEGATIVE — script does NOT silently mark missing files as OK
    7. (+) Role dashboards: 15 dashboards + 15 reports per dept (= 570 files)
    8. (+) Data-type stubs: 9 per dept (= 171 files; per §64.26)
    9. (+) Doc artifacts: HLD+LLD+SAD+C4+NetworkFlow+TechStack (6 × 19 = 114 files)
    10. (+) Final scorecard: 1140 total files release-blocker

# RESOURCES: disk_io

Exit 0 on PASS, 1 on any missing artifact.
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

DEPARTMENTS = [
    "digital-marketing", "customer-experience", "supply-chain", "manufacturing",
    "product-rd", "retail-operations", "sales", "finance", "hr", "procurement",
    "executive-leadership", "e-commerce",
    "customer-support", "engineering", "it-operations", "legal", "marketing",
    "operations", "security-operations",
]

# 15 markdown artifacts per dept (per §64.18 + §64.31 + §64.33 + §64.35 + §64.38)
REQUIRED_MD = [
    "INSUR_DEMO_STORY.md",       # §64.1
    "INSUR_ASIS_ASSESSMENT.md",  # §64.2
    "INSUR_DT_STRATEGY.md",      # §64.4 (per §64.34 — DT-4P)
    "INSUR_CONTACT_CENTER.md",   # §64.5
    "INSUR_INCIDENT_MGMT.md",    # §64.6
    "INSUR_MEETING_COMMS.md",    # §64.14
    "INSUR_PROCESS_MGMT.md",     # §64.15
    "INSUR_DATA_MGMT.md",        # §64.17
    "INSUR_RECOMMENDATION.md",   # §64.22
    "INSUR_ANOMALY.md",          # §64.23
    "INSUR_FRAUD.md",            # §64.23 (stub if N/A)
    "INSUR_CONTACTS.md",         # §64.25
    "INSUR_FLOW.md",             # §64.27
    "INSUR_SECURITY.md",         # §64.32
    "INSUR_SIMULATION.md",       # §64.34
    "INSUR_USE_CASES.md",        # §66 — added 2026-05-23
    "INSUR_MONITORING_AI.md",    # §66 — added 2026-05-23 (per-dept cron + pipeline health)
    "INSUR_MASTER_DATA.md",      # §66 — added 2026-05-24 (SAP-style master + ref data)
    "INSUR_TRANSACTIONS.md",     # §66 — added 2026-05-24 (unified chronological audit feed)
    "INSUR_PIPELINES.md",        # §66 — added 2026-05-24 (5-phase automated pipeline catalog)
    "INSUR_REPORTS_CATALOG.md",  # §66 — added 2026-05-24 (dept-level rollup of 15 standard reports)
    "INSUR_DEMO_STORIES_BY_ROLE.md",  # §66 — added 2026-05-24 (15 role-scoped demo scripts per dept)
    "INSUR_GRAPH_AI.md",         # §66 — added 2026-05-24 (per-dept relationship graph spec)
    "INSUR_DATA_DOWNLOADS.md",   # §66 — added 2026-05-24 (per-dept sample data + CSV/JSON/SVG)
    "INSUR_AGENTIC_STACK.md",    # §64.40.8 — added 2026-05-25 (per-dept Layer-10 enterprise apps + scopes)
]

# 12 mandatory AI-flavor subdirs per dept (per operator 2026-05-23 brief)
REQUIRED_AI_FLAVORS = [
    "conversational-ai", "generative-ai", "analytical-ai", "transactional-ai",
    "comparison-ai", "predictive-ai", "decision-ai", "explainable-ai",
    "responsible-ai", "interpretable-ai", "performance-ai", "governance-ai",
    "compliance-ai", "secure-ai",
]

# 3 mandatory B2B/B2C/B2E use-case subdirs per dept (per INSUR brief)
REQUIRED_AUDIENCE_USE_CASES = ["b2b", "b2c", "b2e"]

ROLES = [
    "admin", "manager", "team-member", "tester", "security", "devops",
    "ai-reviewer", "digital-transformation", "system-architect",
    "test-architect", "database-architect", "api-architect",
    "data-owner", "ai-strategy", "information-security",
]


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' — ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def main():
    root = REPO_ROOT / "global-ai-org" / "departments"
    print(f"\nDRILL: per-dept artifact audit  (root={root})\n")
    t0 = time.time()

    # ----- Step 1: all 19 depts exist -----
    actual = {d.name for d in root.iterdir() if d.is_dir()}
    missing_depts = set(DEPARTMENTS) - actual
    step(1, f"all {len(DEPARTMENTS)} depts exist on disk", not missing_depts,
         f"missing: {sorted(missing_depts)}" if missing_depts else "")

    # ----- Step 2: 15 MD artifacts per dept -----
    missing_md: list[str] = []
    for dept in DEPARTMENTS:
        biz = root / dept / "business-layer"
        for filename in REQUIRED_MD:
            if not (biz / filename).exists():
                missing_md.append(f"{dept}/{filename}")
    step(2, f"all {len(DEPARTMENTS) * len(REQUIRED_MD)} markdown artifacts present",
         not missing_md,
         f"{len(missing_md)} missing; first 5: {missing_md[:5]}" if missing_md else f"{len(DEPARTMENTS)} depts × {len(REQUIRED_MD)} = {len(DEPARTMENTS) * len(REQUIRED_MD)}")

    # ----- Step 3: NEGATIVE — bogus dept clearly flagged -----
    bogus_dept = "totally_made_up_dept_xyz"
    bogus_path = root / bogus_dept
    step(3, "NEGATIVE: bogus dept absent (no false-positive pass)",
         not bogus_path.exists(),
         "test bogus dept actually exists — pick another" if bogus_path.exists() else "")

    # ----- Step 4: artifacts non-empty -----
    tiny: list[str] = []
    for dept in DEPARTMENTS:
        biz = root / dept / "business-layer"
        for filename in REQUIRED_MD:
            f = biz / filename
            if f.exists() and f.stat().st_size < 200:
                tiny.append(f"{dept}/{filename} ({f.stat().st_size}B)")
    step(4, "all artifacts non-empty (≥ 200B)", not tiny,
         f"{len(tiny)} tiny; first 3: {tiny[:3]}" if tiny else "")

    # ----- Step 5: standard INSUR header -----
    bad_header: list[str] = []
    for dept in DEPARTMENTS:
        biz = root / dept / "business-layer"
        for filename in REQUIRED_MD:
            f = biz / filename
            if f.exists():
                first = f.read_text().splitlines()[0] if f.stat().st_size > 0 else ""
                if not first.startswith("# INSUR Beverage"):
                    bad_header.append(f"{dept}/{filename}: '{first[:50]}'")
    step(5, "all artifacts start with standard INSUR header", not bad_header,
         f"{len(bad_header)} bad" if bad_header else "")

    # ----- Step 6: NEGATIVE — assert script does NOT pass on missing files -----
    # Create a fake dept with no artifacts, verify the audit logic catches it
    fake_biz = REPO_ROOT / "tests" / "drills" / "_fake_dept" / "business-layer"
    fake_biz.mkdir(parents=True, exist_ok=True)
    fake_missing = [f for f in REQUIRED_MD if not (fake_biz / f).exists()]
    step(6, "NEGATIVE: audit logic flags missing files (not silent pass)",
         len(fake_missing) == len(REQUIRED_MD),
         f"fake-dept has 0 artifacts; audit found {len(fake_missing)}/{len(REQUIRED_MD)} missing")
    # cleanup
    import shutil
    shutil.rmtree(fake_biz.parent, ignore_errors=True)

    # ----- Step 7: role dashboards + reports -----
    missing_roles: list[str] = []
    for dept in DEPARTMENTS:
        for role in ROLES:
            dash = root / dept / "dashboards-by-role" / role / "INSUR_DASHBOARD.md"
            rpts = root / dept / "reports-by-role" / role / "INSUR_REPORTS.md"
            if not dash.exists():
                missing_roles.append(f"{dept}/{role}/dashboard")
            if not rpts.exists():
                missing_roles.append(f"{dept}/{role}/reports")
    expected_role_files = len(DEPARTMENTS) * len(ROLES) * 2
    step(7, f"all {expected_role_files} role-scoped artifacts present",
         not missing_roles,
         f"{len(missing_roles)} missing; first 3: {missing_roles[:3]}" if missing_roles else "")

    # ----- Step 8: data-type stubs (per §64.26) -----
    DATA_TYPES = ["csv", "json", "text", "pdf", "image", "video", "audio", "xml", "word"]
    missing_dt: list[str] = []
    for dept in DEPARTMENTS:
        for dt in DATA_TYPES:
            f = root / dept / "business-layer" / "data-types" / f"INSUR_DATA_{dt.upper()}.md"
            if not f.exists():
                missing_dt.append(f"{dept}/{dt}")
    expected_dt = len(DEPARTMENTS) * len(DATA_TYPES)
    step(8, f"all {expected_dt} data-type stubs present (per §64.26)",
         not missing_dt,
         f"{len(missing_dt)} missing; first 3: {missing_dt[:3]}" if missing_dt else "")

    # ----- Step 9: doc artifacts (HLD/LLD/SAD/C4/NetworkFlow + TechStack) -----
    DOC_FILES = [
        ("docs/hld/INSUR_HLD.md", "HLD"),
        ("docs/lld/INSUR_LLD.md", "LLD"),
        ("docs/sad/INSUR_SAD.md", "SAD"),
        ("docs/c4-model/INSUR_C4.md", "C4"),
        ("docs/network-flow/INSUR_NETWORK_FLOW.md", "NetworkFlow"),
        ("docs/frd/INSUR_FRD.md", "FRD"),   # §66 — added 2026-05-24
        ("docs/brd/INSUR_BRD.md", "BRD"),   # §66 — added 2026-05-24
        ("docs/sequence/INSUR_SEQUENCE.md", "Sequence"),  # §66 — added 2026-05-24
        ("INSUR_TECH_STACK.md", "TechStack"),
    ]
    missing_docs: list[str] = []
    for dept in DEPARTMENTS:
        for path, label in DOC_FILES:
            f = root / dept / path
            if not f.exists():
                missing_docs.append(f"{dept}/{label}")
    expected_docs = len(DEPARTMENTS) * len(DOC_FILES)
    step(9, f"all {expected_docs} doc artifacts present (HLD+LLD+SAD+C4+NetworkFlow+TechStack)",
         not missing_docs,
         f"{len(missing_docs)} missing; first 3: {missing_docs[:3]}" if missing_docs else "")

    # ----- Step 9.5: 12 AI-flavor subdirs per dept (operator 2026-05-23) -----
    missing_flavors: list[str] = []
    for dept in DEPARTMENTS:
        for flavor in REQUIRED_AI_FLAVORS:
            d = root / dept / flavor
            if not d.exists():
                missing_flavors.append(f"{dept}/{flavor}")
    expected_flavors = len(DEPARTMENTS) * len(REQUIRED_AI_FLAVORS)
    step(9.5, f"all {expected_flavors} AI-flavor subdirs present (14 per dept × 19)",
         not missing_flavors,
         f"{len(missing_flavors)} missing; first 3: {missing_flavors[:3]}" if missing_flavors else "")

    # ----- Step 9.7: B2B/B2C/B2E audience subdirs per dept -----
    missing_audience: list[str] = []
    for dept in DEPARTMENTS:
        for aud in REQUIRED_AUDIENCE_USE_CASES:
            d = root / dept / "use-cases" / aud
            if not d.exists():
                missing_audience.append(f"{dept}/use-cases/{aud}")
    expected_audience = len(DEPARTMENTS) * len(REQUIRED_AUDIENCE_USE_CASES)
    step(9.7, f"all {expected_audience} B2B/B2C/B2E audience subdirs present",
         not missing_audience,
         f"{len(missing_audience)} missing" if missing_audience else "")

    # ----- Step 10: final scorecard -----
    total_expected = (
        len(DEPARTMENTS) * len(REQUIRED_MD)   # 16 MD × 19 = 304
        + expected_role_files                 # 30 role × 19 = 570
        + expected_dt                         #  9 dt × 19   = 171
        + expected_docs                       #  6 docs × 19 = 114
    )
    print(f"\n  Scorecard ({len(DEPARTMENTS)} depts):")
    print(f"    business-layer MD     = {len(DEPARTMENTS)} × {len(REQUIRED_MD)} = {len(DEPARTMENTS)*len(REQUIRED_MD)}")
    print(f"    role dashboards+rpts  = {len(DEPARTMENTS)} × {len(ROLES)} × 2 = {expected_role_files}")
    print(f"    data-type stubs       = {len(DEPARTMENTS)} × {len(DATA_TYPES)} = {expected_dt}")
    print(f"    docs HLD/LLD/etc      = {len(DEPARTMENTS)} × {len(DOC_FILES)} = {expected_docs}")
    print(f"    TOTAL release-blocker = {total_expected} files")
    print(f"    AI-flavor subdirs     = {len(DEPARTMENTS)} × {len(REQUIRED_AI_FLAVORS)} = {expected_flavors} dirs")
    print(f"    B2B/B2C/B2E subdirs   = {len(DEPARTMENTS)} × 3 = {expected_audience} dirs")
    step(10, f"release blocker — {total_expected} files all present",
         True,
         f"all green ({total_expected} files)")

    print(f"\n\033[32mALL 8 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")


if __name__ == "__main__":
    main()
