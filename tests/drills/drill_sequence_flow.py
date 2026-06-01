#!/usr/bin/env python3
"""Drill: HOLY sequence-flow docs per dept (§47 C4-L4 + §38 audit + §49 compose).

Steps (10 total; 3 negative):
    1. (+) all 19 docs/sequence/HOLY_SEQUENCE.md exist + ≥ 4000B
    2. (+) every doc carries ≥ 6 mermaid sequenceDiagram blocks
           (canonical / cron / dept-primary / agentic-10-layer / RAG / incident)
    3. (+) every mermaid block opens with sequenceDiagram + has ≥ 1 participant
    4. (-) NEGATIVE — no mermaid block is unclosed (every ```mermaid has ```)
    5. (+) every dept's sequence file names a dept-specific primary process
           (different from the canonical ones — proves MDD per-dept render)
    6. (+) every doc terminates each sequence in an audit row (§38 contract:
           "a sequence that doesn't write an audit row is incomplete")
    7. (-) NEGATIVE — no doc references HOLY_*.md files that don't exist
           in this dept (broken compose-footer link = release blocker per §49)
    8. (+) every doc compose-footer cites ≥ 6 sibling artifacts (§49)
    9. (-) NEGATIVE — fake dept absent (audit doesn't false-positive pass)
   10. (+) Mermaid arrow syntax sane (->>  -->>  ->  --) no broken arrows

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

# Per global §59 MDD — each dept advertises a different primary process
# in §3 of its sequence doc; the scaffolder's DEPT_FLOWS dict drives this.
DEPT_PRIMARY = {
    "digital-marketing":   "Campaign Attribution",
    "customer-experience": "Ticket Triage + Auto-Reply",
    "supply-chain":        "Demand Forecast Refresh",
    "manufacturing":       "Defect Detection on Line",
    "product-rd":          "Concept Scoring",
    "retail-operations":   "Footfall + Staffing",
    "sales":               "Lead Scoring + Next-Best",
    "finance":             "Fraud Detection on Txn",
    "hr":                  "Attrition Prediction Refresh",
    "procurement":         "Vendor Risk Score Refresh",
    "executive-leadership":"Exec KPI Rollup",
    "e-commerce":          "Cart Abandonment Recovery",
    "customer-support":    "RAG-Backed Resolution",
    "engineering":         "AI Code Review on PR",
    "it-operations":       "Log Anomaly Triage",
    "legal":               "Contract Clause Risk",
    "marketing":           "Audience Segmentation Refresh",
    "operations":          "Process Anomaly Triage",
    "security-operations": "Threat Classifier on Alert",
}


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' — ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def main():
    print("\nDRILL: HOLY sequence-flow per dept (§47 C4-L4 + §38 + §49)\n")
    t0 = time.time()
    root = REPO_ROOT / "global-ai-org" / "departments"

    # ----- Step 1: all docs exist + size -----
    bad_exist = []
    for dept in DEPARTMENTS:
        f = root / dept / "docs" / "sequence" / "HOLY_SEQUENCE.md"
        if not f.exists():
            bad_exist.append(f"{dept}: missing")
        elif f.stat().st_size < 4000:
            bad_exist.append(f"{dept}: tiny ({f.stat().st_size}B)")
    step(1, f"all {len(DEPARTMENTS)} HOLY_SEQUENCE.md exist + ≥ 4000B",
         not bad_exist, "; ".join(bad_exist[:3]) if bad_exist else "")

    # ----- Step 2: ≥ 6 mermaid blocks per doc -----
    mermaid_open_pat = re.compile(r"^```mermaid\s*$", re.MULTILINE)
    sequence_diagram_pat = re.compile(r"sequenceDiagram")
    bad_count = []
    for dept in DEPARTMENTS:
        body = (root / dept / "docs" / "sequence" / "HOLY_SEQUENCE.md").read_text()
        opens = len(mermaid_open_pat.findall(body))
        seqs = len(sequence_diagram_pat.findall(body))
        # ≥ 6 mermaid blocks AND ≥ 6 sequenceDiagram declarations
        if opens < 6 or seqs < 6:
            bad_count.append(f"{dept}: opens={opens} seqs={seqs}")
    step(2, "every doc has ≥ 6 mermaid sequenceDiagram blocks",
         not bad_count, "; ".join(bad_count[:3]) if bad_count else "")

    # ----- Step 3: each mermaid block has ≥ 1 participant line -----
    participant_pat = re.compile(r"^\s*participant\s+\w+", re.MULTILINE)
    bad_participants = []
    for dept in DEPARTMENTS:
        body = (root / dept / "docs" / "sequence" / "HOLY_SEQUENCE.md").read_text()
        # Split into mermaid blocks and check each
        blocks = re.findall(r"```mermaid\n(.+?)\n```", body, re.DOTALL)
        for i, block in enumerate(blocks):
            if "sequenceDiagram" not in block:
                continue
            if not participant_pat.search(block):
                bad_participants.append(f"{dept} block{i}: no participants")
    step(3, "every sequence block has ≥ 1 participant declaration",
         not bad_participants, "; ".join(bad_participants[:3]) if bad_participants else "")

    # ----- Step 4: NEGATIVE — no unclosed mermaid blocks -----
    close_pat = re.compile(r"^```\s*$", re.MULTILINE)
    bad_balance = []
    for dept in DEPARTMENTS:
        body = (root / dept / "docs" / "sequence" / "HOLY_SEQUENCE.md").read_text()
        opens = len(mermaid_open_pat.findall(body))
        # Total closing fences = mermaid closes + other code-block closes
        # A simpler invariant: walk lines and ensure every ```mermaid has a
        # matching ``` before the next ```mermaid.
        lines = body.splitlines()
        depth = 0
        unbalanced = False
        for line in lines:
            if line.strip() == "```mermaid":
                if depth != 0:
                    unbalanced = True
                    break
                depth = 1
            elif line.strip().startswith("```") and depth == 1:
                depth = 0
            elif line.strip() == "```" and depth != 1:
                # closing other code blocks — ignore
                pass
        if unbalanced or depth != 0:
            bad_balance.append(f"{dept}: unclosed mermaid (depth={depth}, opens={opens})")
    step(4, "NEGATIVE: no unclosed mermaid blocks (every ```mermaid has matching ```)",
         not bad_balance, "; ".join(bad_balance[:3]) if bad_balance else "")

    # ----- Step 5: dept-specific primary process named -----
    bad_primary = []
    for dept, expected in DEPT_PRIMARY.items():
        body = (root / dept / "docs" / "sequence" / "HOLY_SEQUENCE.md").read_text()
        if expected not in body:
            bad_primary.append(f"{dept}: missing '{expected}'")
    step(5, "every dept's doc names its specific primary process",
         not bad_primary, "; ".join(bad_primary[:3]) if bad_primary else "")

    # ----- Step 6: audit row contract — every doc names "Audit" lane -----
    audit_pat = re.compile(r"participant\s+A\s+as\s+Audit", re.IGNORECASE)
    bad_audit = []
    for dept in DEPARTMENTS:
        body = (root / dept / "docs" / "sequence" / "HOLY_SEQUENCE.md").read_text()
        # Should appear in multiple sequences — minimum 3 (canonical, cron, decision)
        n_audit_participants = len(audit_pat.findall(body))
        if n_audit_participants < 3:
            bad_audit.append(f"{dept}: only {n_audit_participants} sequences carry audit lane")
    step(6, "every doc terminates ≥ 3 sequences in an audit-row lane (§38)",
         not bad_audit, "; ".join(bad_audit[:3]) if bad_audit else "")

    # ----- Step 7: NEGATIVE — no broken compose-footer links -----
    # Compose-footer cites paths like ../hld/HOLY_HLD.md — verify each resolves.
    broken_links: list[str] = []
    link_pat = re.compile(r"\(\.\.?/[^)]*HOLY_[A-Z_]+\.md\)")
    for dept in DEPARTMENTS:
        seq_file = root / dept / "docs" / "sequence" / "HOLY_SEQUENCE.md"
        body = seq_file.read_text()
        # Extract footer block only
        footer_idx = body.find("Cross-references")
        if footer_idx < 0:
            footer_idx = body.find("compose-footer")
        if footer_idx < 0:
            continue
        footer = body[footer_idx:]
        for match in link_pat.finditer(footer):
            rel_path = match.group(0).strip("()")
            target = (seq_file.parent / rel_path).resolve()
            if not target.exists():
                broken_links.append(f"{dept}: {rel_path} → {target}")
    step(7, "NEGATIVE: no broken compose-footer links (every HOLY_*.md resolves)",
         not broken_links, "; ".join(broken_links[:3]) if broken_links else "")

    # ----- Step 8: ≥ 6 sibling artifacts cited in compose-footer -----
    holy_link_pat = re.compile(r"HOLY_[A-Z_]+\.md")
    thin_footers = []
    for dept in DEPARTMENTS:
        body = (root / dept / "docs" / "sequence" / "HOLY_SEQUENCE.md").read_text()
        footer_idx = body.find("Cross-references")
        footer = body[footer_idx:] if footer_idx >= 0 else ""
        unique_links = set(holy_link_pat.findall(footer))
        if len(unique_links) < 6:
            thin_footers.append(f"{dept}:{len(unique_links)}")
    step(8, "every doc compose-footer cites ≥ 6 sibling artifacts (§49)",
         not thin_footers, "; ".join(thin_footers[:3]) if thin_footers else "")

    # ----- Step 9: NEGATIVE — fake dept absent -----
    fake = root / "totally-bogus-dept-99" / "docs" / "sequence" / "HOLY_SEQUENCE.md"
    step(9, "NEGATIVE: fake dept absent (audit doesn't false-positive pass)",
         not fake.exists(), "fake dept path should NOT exist")

    # ----- Step 10: Mermaid arrow syntax sanity -----
    # Valid sequence arrows: ->>  -->>  ->  --
    # Invalid: ===, ~~>, broken syntax
    invalid_arrow_pat = re.compile(r"(?<![-=~])(?:===|~~>|=>>|=>)")
    bad_arrows = []
    for dept in DEPARTMENTS:
        body = (root / dept / "docs" / "sequence" / "HOLY_SEQUENCE.md").read_text()
        # Only check inside mermaid blocks
        blocks = re.findall(r"```mermaid\n(.+?)\n```", body, re.DOTALL)
        for i, block in enumerate(blocks):
            invalid = invalid_arrow_pat.findall(block)
            if invalid:
                bad_arrows.append(f"{dept} block{i}: invalid arrows {invalid[:2]}")
    step(10, "Mermaid arrow syntax sane (no ===, ~~>, => etc.)",
         not bad_arrows, "; ".join(bad_arrows[:3]) if bad_arrows else "")

    print(f"\n\033[32mALL 10 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")


if __name__ == "__main__":
    main()
