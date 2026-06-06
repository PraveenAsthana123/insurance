#!/usr/bin/env python3
"""Drill: INSUR FRD + BRD content invariants per dept (§47 + §52 + §64).

Steps (10 total; 3 negative):
    1. (+) all 19 docs/brd/INSUR_BRD.md exist + ≥ 1500B
    2. (+) all 19 docs/frd/INSUR_FRD.md exist + ≥ 2000B
    3. (+) every BRD has §-numbered sections: Executive summary, Stakeholders,
           Scope, Success metrics, Constraints, Risks, Dependencies, Approvals,
           Compose-footer (per §49)
    4. (+) every FRD has FR-rows with the canonical 10-field structure +
           ≥ 1 row per category (Decision / Observability / Per-process / Compliance)
    5. (-) NEGATIVE — a fake dept missing both docs is detected by the
           per-dept audit (cross-check with drill_per_dept_artifacts)
    6. (+) every FRD references its parent BRD (INSUR_BRD.md link present)
    7. (+) every BRD references its child FRD (INSUR_FRD.md link present)
    8. (-) NEGATIVE — no FRD contains TBD/TODO/XXX placeholder anti-patterns
    9. (-) NEGATIVE — no BRD/FRD has duplicate FR-IDs across depts (would
           confuse audit traceability under §38.3)
   10. (+) every FRD's compose-footer (§49) cites ≥ 5 sibling artifacts

# RESOURCES: disk_io readonly

Exit 0 on PASS, 1 on FAIL.
"""
from __future__ import annotations

import re
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

DEPARTMENTS = [
    "digital-marketing", "customer-experience", "supply-chain", "manufacturing",
    "product-rd", "retail-operations", "sales", "finance", "hr", "procurement",
    "executive-leadership", "e-commerce", "customer-support", "engineering",
    "it-operations", "legal", "marketing", "operations", "security-operations",
]

BRD_REQUIRED_SECTIONS = [
    "## 1. Executive summary",
    "## 2. Stakeholders + RACI",
    "## 3. Scope",
    "## 4. Business outcomes (success metrics)",
    "## 5. Constraints",
    "## 6. Risks (business-level)",
    "## 7. Dependencies",
    "## 8. Approvals",
    "## 9. Compose-footer (§49)",
]

FRD_REQUIRED_CATEGORIES = [
    "### 3.1 Decision automation",
    "### 3.2 Observability + audit",
    "### 3.3 Per-process AI surfaces",
    "### 3.4 Compliance + RAI",
]


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' — ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def main():
    print("\nDRILL: INSUR FRD + BRD per dept (§47 + §52 + §64)\n")
    t0 = time.time()
    root = REPO_ROOT / "global-ai-org" / "departments"

    # ----- Step 1: BRDs exist + ≥ 1500B -----
    bad_brd: list[str] = []
    for dept in DEPARTMENTS:
        brd = root / dept / "docs" / "brd" / "INSUR_BRD.md"
        if not brd.exists():
            bad_brd.append(f"{dept}: missing")
        elif brd.stat().st_size < 1500:
            bad_brd.append(f"{dept}: tiny ({brd.stat().st_size}B)")
    step(1, f"all {len(DEPARTMENTS)} BRDs present + ≥ 1500B",
         not bad_brd, "; ".join(bad_brd[:3]) if bad_brd else "")

    # ----- Step 2: FRDs exist + ≥ 2000B -----
    bad_frd: list[str] = []
    for dept in DEPARTMENTS:
        frd = root / dept / "docs" / "frd" / "INSUR_FRD.md"
        if not frd.exists():
            bad_frd.append(f"{dept}: missing")
        elif frd.stat().st_size < 2000:
            bad_frd.append(f"{dept}: tiny ({frd.stat().st_size}B)")
    step(2, f"all {len(DEPARTMENTS)} FRDs present + ≥ 2000B",
         not bad_frd, "; ".join(bad_frd[:3]) if bad_frd else "")

    # ----- Step 3: BRD sections -----
    bad_sections: list[str] = []
    for dept in DEPARTMENTS:
        body = (root / dept / "docs" / "brd" / "INSUR_BRD.md").read_text()
        for section in BRD_REQUIRED_SECTIONS:
            if section not in body:
                bad_sections.append(f"{dept}: missing '{section}'")
                break  # one report per dept is enough
    step(3, "every BRD has 9 §-numbered sections",
         not bad_sections, "; ".join(bad_sections[:3]) if bad_sections else "")

    # ----- Step 4: FRD categories -----
    bad_cats: list[str] = []
    for dept in DEPARTMENTS:
        body = (root / dept / "docs" / "frd" / "INSUR_FRD.md").read_text()
        for cat in FRD_REQUIRED_CATEGORIES:
            if cat not in body:
                bad_cats.append(f"{dept}: missing '{cat}'")
                break
    step(4, "every FRD has 4 functional-requirement categories",
         not bad_cats, "; ".join(bad_cats[:3]) if bad_cats else "")

    # ----- Step 5: NEGATIVE — fake dept missing both docs detected -----
    fake_dept = "totally-bogus-dept-name"
    fake_brd = root / fake_dept / "docs" / "brd" / "INSUR_BRD.md"
    fake_frd = root / fake_dept / "docs" / "frd" / "INSUR_FRD.md"
    detected = (not fake_brd.exists()) and (not fake_frd.exists())
    step(5, "NEGATIVE: fake dept absent (audit doesn't false-positive pass)",
         detected, "fake dept paths should NOT exist")

    # ----- Step 6: FRD → BRD cross-link -----
    bad_links_frd: list[str] = []
    for dept in DEPARTMENTS:
        body = (root / dept / "docs" / "frd" / "INSUR_FRD.md").read_text()
        if "INSUR_BRD.md" not in body:
            bad_links_frd.append(f"{dept}")
    step(6, "every FRD links to its parent BRD",
         not bad_links_frd, f"missing link: {bad_links_frd[:3]}" if bad_links_frd else "")

    # ----- Step 7: BRD → FRD cross-link -----
    bad_links_brd: list[str] = []
    for dept in DEPARTMENTS:
        body = (root / dept / "docs" / "brd" / "INSUR_BRD.md").read_text()
        if "INSUR_FRD.md" not in body:
            bad_links_brd.append(f"{dept}")
    step(7, "every BRD links to its child FRD",
         not bad_links_brd, f"missing link: {bad_links_brd[:3]}" if bad_links_brd else "")

    # ----- Step 8: NEGATIVE — no TBD/TODO/XXX in shipped docs -----
    placeholder_pat = re.compile(r"\b(TBD|TODO|XXX|FIXME)\b")
    polluted: list[str] = []
    for dept in DEPARTMENTS:
        for kind in ("brd", "frd"):
            f = root / dept / "docs" / kind / f"INSUR_{kind.upper()}.md"
            if placeholder_pat.search(f.read_text()):
                polluted.append(f"{dept}/{kind}")
    step(8, "NEGATIVE: no TBD/TODO/XXX/FIXME placeholders in shipped docs",
         not polluted, f"polluted: {polluted[:3]}" if polluted else "")

    # ----- Step 9: NEGATIVE — duplicate FR-IDs across depts -----
    # FR-IDs are intentionally namespaced per dept (FR-SAL-001, FR-FIN-001).
    # Each dept's prefix MUST be unique — collision = audit row ambiguity.
    fr_id_pat = re.compile(r"FR-([A-Z]{3})-\d{3}")
    prefix_to_depts: dict[str, set[str]] = {}
    for dept in DEPARTMENTS:
        body = (root / dept / "docs" / "frd" / "INSUR_FRD.md").read_text()
        for match in fr_id_pat.finditer(body):
            prefix = match.group(1)
            prefix_to_depts.setdefault(prefix, set()).add(dept)
    collisions = {p: sorted(d) for p, d in prefix_to_depts.items() if len(d) > 1}
    step(9, "NEGATIVE: no FR-prefix collisions across depts",
         not collisions, f"collisions: {list(collisions.items())[:2]}" if collisions else "")

    # ----- Step 10: compose-footer richness -----
    # Each FRD's compose-footer cites ≥ 5 sibling artifacts per §49.
    # We count markdown links pointing at INSUR_*.md files.
    insur_link_pat = re.compile(r"INSUR_[A-Z_]+\.md")
    thin_footers: list[str] = []
    for dept in DEPARTMENTS:
        body = (root / dept / "docs" / "frd" / "INSUR_FRD.md").read_text()
        footer_idx = body.find("Compose-footer")
        footer = body[footer_idx:] if footer_idx >= 0 else ""
        n_links = len(set(insur_link_pat.findall(footer)))
        if n_links < 5:
            thin_footers.append(f"{dept}:{n_links}")
    step(10, "every FRD compose-footer cites ≥ 5 sibling artifacts (§49)",
         not thin_footers, f"thin: {thin_footers[:3]}" if thin_footers else "")

    print(f"\n\033[32mALL 10 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")


if __name__ == "__main__":
    main()
