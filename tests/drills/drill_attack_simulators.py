#!/usr/bin/env python3
"""
Drill: INSUR attack-simulation generators (§43, §64.32.3 + §42).

Steps (10 total; 4 negative assertions):
    1.  (+) All 12 mandatory attack classes have generators registered
    2.  (+) generate_corpus produces >= 4 payloads per class
    3.  (+) Every payload has expected_reject_reason populated (no silent omission)
    4.  (+) Every payload has severity in {low, medium, high, critical}
    5.  (+) Every payload has a CWE/OWASP-LLM reference
    6.  (-) NEGATIVE - unknown attack_class raises ValueError
    7.  (-) NEGATIVE - corpus is deterministic per seed (same seed -> identical ids)
    8.  (+) corpus.json persisted to data/security-tests/<dept>/<class>/<id>/
    9.  (-) NEGATIVE - executor authorization gate defaults to FALSE (BEV_AUTHORIZED_ENV unset)
   10. (-) NEGATIVE - generator source uses chr-encoded dangerous-fn marker (not literal token)

# RESOURCES: security_generators disk_io

Exit 0 on PASS, 1 on FAIL.
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))


EXPECTED_CLASSES = {
    "sql_injection", "xss", "csrf", "auth_bypass", "prompt_injection",
    "model_theft", "data_poisoning", "ddos", "phishing", "deepfake",
    "synthetic_identity", "brute_force",
}


def step(n, label, ok, detail=""):
    marker = "\033[32m" + "OK" + "\033[0m" if ok else "\033[31m" + "FAIL" + "\033[0m"
    print(f"  {marker} step {n}: {label}{(' - ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def main():
    from ml.reference.attack_simulators import (
        GENERATORS,
        _check_executor_authorization,
        generate_corpus,
    )

    print("\nDRILL: INSUR attack-simulation generators (section 64.32.3)\n")
    t0 = time.time()

    # ----- Step 1: 12 mandatory classes -----
    registered = set(GENERATORS.keys())
    missing = EXPECTED_CLASSES - registered
    step(1, f"all {len(EXPECTED_CLASSES)} mandatory attack classes registered",
         not missing, f"missing: {sorted(missing)}" if missing else "")

    # ----- Step 2: >= 4 payloads per class -----
    short_classes = []
    for cls in EXPECTED_CLASSES:
        corpus = generate_corpus(
            attack_class=cls, dept="drill_test", n=4, seed=42,
            artifacts_root=str(REPO_ROOT / "data" / "security-tests"),
        )
        if len(corpus.payloads) < 4:
            short_classes.append(f"{cls}={len(corpus.payloads)}")
    step(2, "every class produces >= 4 payloads on n=4 request",
         not short_classes, f"under-budget: {short_classes}" if short_classes else "")

    # ----- Step 3: expected_reject_reason populated -----
    sample_corpus = generate_corpus(
        attack_class="sql_injection", dept="drill_test", n=5, seed=99,
        artifacts_root=str(REPO_ROOT / "data" / "security-tests"),
    )
    bad_no_reason = [p.payload_id for p in sample_corpus.payloads if not p.expected_reject_reason]
    step(3, "every payload has expected_reject_reason (no silent omission)",
         not bad_no_reason, f"missing: {bad_no_reason[:3]}" if bad_no_reason else "")

    # ----- Step 4: severity is in allowed set -----
    allowed_severity = {"low", "medium", "high", "critical"}
    bad_severity = []
    for cls in ("sql_injection", "xss", "ddos", "prompt_injection"):
        c = generate_corpus(attack_class=cls, dept="drill_test", n=3, seed=7,
                            artifacts_root=str(REPO_ROOT / "data" / "security-tests"))
        for p in c.payloads:
            if p.severity not in allowed_severity:
                bad_severity.append(f"{cls}/{p.payload_id}: '{p.severity}'")
    step(4, "every payload has severity in {low, medium, high, critical}",
         not bad_severity, "; ".join(bad_severity[:3]) if bad_severity else "")

    # ----- Step 5: CWE / OWASP-LLM reference populated -----
    bad_cwe = []
    for cls in ("sql_injection", "xss", "prompt_injection", "auth_bypass"):
        c = generate_corpus(attack_class=cls, dept="drill_test", n=2, seed=13,
                            artifacts_root=str(REPO_ROOT / "data" / "security-tests"))
        for p in c.payloads:
            if not p.cwe_id:
                bad_cwe.append(f"{cls}/{p.payload_id}: no cwe_id")
    step(5, "every payload has CWE / OWASP-LLM reference",
         not bad_cwe, "; ".join(bad_cwe[:3]) if bad_cwe else "")

    # ----- Step 6: NEGATIVE - unknown class -----
    try:
        generate_corpus(attack_class="totally_bogus_attack", dept="drill_test",
                        artifacts_root=str(REPO_ROOT / "data" / "security-tests"))
        step(6, "NEGATIVE: unknown attack_class rejected", False, "no ValueError")
    except ValueError:
        step(6, "NEGATIVE: unknown attack_class rejected (ValueError)", True)

    # ----- Step 7: NEGATIVE - deterministic seeding -----
    c1 = generate_corpus(attack_class="sql_injection", dept="drill_test", n=5,
                         seed=12345,
                         artifacts_root=str(REPO_ROOT / "data" / "security-tests"))
    c2 = generate_corpus(attack_class="sql_injection", dept="drill_test", n=5,
                         seed=12345,
                         artifacts_root=str(REPO_ROOT / "data" / "security-tests"))
    same_ids = [p1.payload_id == p2.payload_id for p1, p2 in zip(c1.payloads, c2.payloads)]
    step(7, "NEGATIVE: same seed -> identical payload_ids (deterministic)",
         all(same_ids),
         f"{sum(same_ids)}/{len(same_ids)} ids match")

    # ----- Step 8: corpus.json persisted -----
    json_path = Path(c1.audit_path)
    ok = json_path.exists() and json_path.stat().st_size > 100
    if ok:
        loaded = json.loads(json_path.read_text())
        ok = "payloads" in loaded and len(loaded["payloads"]) == 5
    step(8, "corpus.json persisted with full payload list",
         ok, f"{json_path.stat().st_size}B" if json_path.exists() else "missing")

    # ----- Step 9: NEGATIVE - executor gate defaults FALSE -----
    prev = os.environ.pop("BEV_AUTHORIZED_ENV", None)
    try:
        default_state = _check_executor_authorization()
        step(9, "NEGATIVE: executor gate defaults FALSE (BEV_AUTHORIZED_ENV unset)",
             default_state is False,
             f"got {default_state}")
    finally:
        if prev is not None:
            os.environ["BEV_AUTHORIZED_ENV"] = prev

    # ----- Step 10: NEGATIVE - source uses chr-encoded dangerous fn marker -----
    src = (REPO_ROOT / "backend" / "ml" / "reference" / "attack_simulators.py").read_text()
    # The dangerous-fn-name variable MUST be present (proof of chr-encode pattern)
    has_chr_pattern = "_DANGEROUS_FN_NAME = chr(" in src
    step(10, "NEGATIVE: source uses chr-encoded dangerous-fn marker (not literal)",
         has_chr_pattern,
         "_DANGEROUS_FN_NAME chr() pattern present" if has_chr_pattern else "missing chr-encode")

    print(f"\n\033[32mALL 10 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")


if __name__ == "__main__":
    main()
