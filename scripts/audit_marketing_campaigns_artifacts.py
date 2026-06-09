#!/usr/bin/env python3
"""Audit marketing campaigns module completeness · §64.13 + §90 L13/L14.

Checks:
- backend/marketing_campaigns/ has 4 mandatory modules
- backend/migrations/054_marketing_campaigns.sql exists
- frontend/src/pages/MarketingCampaignsPage.jsx exists + >5 KB
- Migration 054 declares 4 allowed channels (CHECK constraint)
- 4 seed campaigns (1 per channel) defined

Exit 0 if all pass · 1 otherwise.
"""
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

BACKEND_FILES = [
    "backend/marketing_campaigns/__init__.py",
    "backend/marketing_campaigns/schemas.py",
    "backend/marketing_campaigns/services.py",
    "backend/marketing_campaigns/router.py",
]
MIGRATION = "backend/migrations/054_marketing_campaigns.sql"
FRONTEND = "frontend/src/pages/MarketingCampaignsPage.jsx"

REQUIRED_CHANNELS = ["email", "banner", "survey", "form"]
REQUIRED_SEEDS = [
    "MKT-EMAIL-001",
    "MKT-BANNER-001",
    "MKT-SURVEY-001",
    "MKT-FORM-001",
]


def main() -> int:
    print("Marketing campaigns module audit · §64.13 + §90 L13/L14\n")
    print(f"  {'Check':<55} | Result")
    print(f"  {'-' * 55} | -------")
    fails = 0

    # Backend modules
    for f in BACKEND_FILES:
        target = REPO / f
        ok = target.exists() and target.stat().st_size > 100
        print(f"  {f:<55} | {'✓ PASS' if ok else '✗ FAIL'}")
        if not ok:
            fails += 1

    # Migration
    mig = REPO / MIGRATION
    ok_mig = mig.exists() and mig.stat().st_size > 1000
    print(f"  {MIGRATION:<55} | {'✓ PASS' if ok_mig else '✗ FAIL'}")
    if not ok_mig:
        fails += 1

    # Frontend
    fe = REPO / FRONTEND
    ok_fe = fe.exists() and fe.stat().st_size > 5000
    print(f"  {FRONTEND:<55} | {'✓ PASS' if ok_fe else '✗ FAIL'}")
    if not ok_fe:
        fails += 1

    # Migration content checks
    if mig.exists():
        content = mig.read_text()
        for ch in REQUIRED_CHANNELS:
            ok = f"'{ch}'" in content
            print(f"  migration declares '{ch}' channel{' ' * 14} | {'✓ PASS' if ok else '✗ FAIL'}")
            if not ok:
                fails += 1
        for seed in REQUIRED_SEEDS:
            ok = seed in content
            print(f"  migration seeds {seed:<25} | {'✓ PASS' if ok else '✗ FAIL'}")
            if not ok:
                fails += 1

    # Public endpoints in router
    router_file = REPO / "backend/marketing_campaigns/router.py"
    if router_file.exists():
        router_content = router_file.read_text()
        for endpoint in ["public/survey", "public/form"]:
            ok = endpoint in router_content
            print(f"  router exposes /public/{endpoint.split('/')[-1]:<10}                 | {'✓ PASS' if ok else '✗ FAIL'}")
            if not ok:
                fails += 1

    total = len(BACKEND_FILES) + 2 + len(REQUIRED_CHANNELS) + len(REQUIRED_SEEDS) + 2
    passes = total - fails
    print(f"\n  Summary: {passes} / {total} pass · {fails} fail ({passes * 100 // total}%)")
    print(f"  Reference: §64.13 (Digital Marketing) + §90 L13 banner-ai + L14 contact-ai")
    return 0 if fails == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
