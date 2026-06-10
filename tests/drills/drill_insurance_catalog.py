#!/usr/bin/env python3
"""drill_insurance_catalog — locks invariants per global §82.7.

≥15 invariants (positive + negative). Exit 0 green / 1 red.

Run:
    python tests/drills/drill_insurance_catalog.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from lib import datafmt  # noqa: E402

CAT = ROOT / "config" / "insurance.catalog.json"
AI = ROOT / "config" / "ai_capabilities.json"
SH = ROOT / "config" / "stakeholders.json"
BR = ROOT / "config" / "brand.config.json"
MAN = ROOT / "data" / "insurance" / "manifest.json"

VALID_CHANNELS = {"B2B", "B2C", "B2E"}
MIN_DEPTS = 22
MIN_PROCESSES_PER_DEPT = 1

results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok, detail))


# ---- load ----
try:
    cat = json.loads(CAT.read_text())
    check("P1 catalog JSON parses", True, f"{len(cat.get('departments', []))} depts")
except Exception as e:  # noqa: BLE001
    check("P1 catalog JSON parses", False, repr(e))
    for r in results:
        print(r)
    sys.exit(1)

ai = json.loads(AI.read_text())
sh = json.loads(SH.read_text())
brand = json.loads(BR.read_text())
manifest = json.loads(MAN.read_text())

ai_ids = {x["id"] for x in ai.get("capabilities", [])}
role_ids = {x["role"] for x in sh.get("stakeholders", [])}
depts = cat.get("departments", [])

# ---- positive ----
check("P2 22+ departments", len(depts) >= MIN_DEPTS, f"got {len(depts)}")

every_dept_has_proc = all(len(d.get("processes", [])) >= MIN_PROCESSES_PER_DEPT for d in depts)
check("P3 every dept has ≥1 process", every_dept_has_proc, "")

procs = [(d, p) for d in depts for p in d.get("processes", [])]
sub_total = sum(len(p.get("subProcesses", [])) for _, p in procs)
some_sub = any(p.get("subProcesses") for _, p in procs)
check("P4 at least one process has sub-processes", some_sub, f"{sub_total} sub-procs total")

every_proc_has_stakeholder = all(p.get("stakeholders") for _, p in procs)
check("P5 every process has ≥1 stakeholder", every_proc_has_stakeholder, "")

every_proc_has_ai = all(p.get("aiCapabilities") for _, p in procs)
check("P6 every process has ≥1 AI capability", every_proc_has_ai, "")

every_proc_has_sample = all(p.get("dataSamples") for _, p in procs)
check("P7 every process has ≥1 data sample", every_proc_has_sample, "")

bad_files = []
bad_valid = []
empty_files = []
for d, p in procs:
    for s in p.get("dataSamples", []):
        path = ROOT / s["path"]
        if not path.exists():
            bad_files.append(s["path"])
            continue
        if path.stat().st_size == 0:
            empty_files.append(s["path"])
            continue
        ok, reason = datafmt.is_valid(path)
        if not ok:
            bad_valid.append(f"{s['path']}:{reason}")

check("P8 every sample file exists", not bad_files, f"missing: {bad_files[:3]}")
check("P9 every sample file is spec-valid", not bad_valid, f"invalid: {bad_valid[:3]}")

unknown_ai = []
for d in depts:
    for c in d.get("aiCapabilities", []):
        if c not in ai_ids:
            unknown_ai.append(f"dept/{d['id']}:{c}")
    for p in d.get("processes", []):
        for c in p.get("aiCapabilities", []):
            if c not in ai_ids:
                unknown_ai.append(f"proc/{d['id']}/{p['id']}:{c}")
        for sp in p.get("subProcesses", []):
            for c in sp.get("aiCapabilities", []):
                if c not in ai_ids:
                    unknown_ai.append(f"sub/{d['id']}/{p['id']}/{sp['id']}:{c}")
check("P10 every AI id resolves to registry", not unknown_ai, f"unknown: {unknown_ai[:3]}")

unknown_role = []
for _, p in procs:
    for s in p.get("stakeholders", []):
        if s["role"] not in role_ids:
            unknown_role.append(f"{p['id']}:{s['role']}")
    for sp in p.get("subProcesses", []):
        for s in sp.get("stakeholders", []):
            if s["role"] not in role_ids:
                unknown_role.append(f"{p['id']}/{sp['id']}:{s['role']}")
check("P11 every stakeholder role resolves to registry", not unknown_role,
      f"unknown: {unknown_role[:3]}")

bad_channels = []
for _, p in procs:
    for ch in p.get("channels", []):
        if ch not in VALID_CHANNELS:
            bad_channels.append(f"{p['id']}:{ch}")
    for sp in p.get("subProcesses", []):
        for ch in sp.get("channels", []):
            if ch not in VALID_CHANNELS:
                bad_channels.append(f"{p['id']}/{sp['id']}:{ch}")
check("P12 every channel ∈ {B2B,B2C,B2E}", not bad_channels,
      f"invalid: {bad_channels[:3]}")

# ---- negative ----
check("N1 NO empty sample files (0 bytes)", not empty_files,
      f"empty: {empty_files[:3]}")

dup_ids = []
for d in depts:
    seen: set[str] = set()
    for p in d.get("processes", []):
        if p["id"] in seen:
            dup_ids.append(f"{d['id']}:{p['id']}")
        seen.add(p["id"])
check("N2 NO duplicate process id within a department", not dup_ids,
      f"dups: {dup_ids[:3]}")

check("N3 NO stale BEV depts (sales-demand/supply-chain/telehealth)",
      all(d["id"] not in {"sales-demand", "supply-chain", "telehealth"} for d in depts),
      "")

brand_ids = {d["id"] for d in brand.get("departments", [])}
catalog_ids = {d["id"] for d in depts}
missing = catalog_ids - brand_ids
check("P13 every catalog dept appears in brand nav", not missing,
      f"missing nav: {sorted(missing)[:3]}")

beverage_tokens = ("\U0001f964", "CPG", "beverage")
brand_blob = json.dumps(brand, ensure_ascii=False).lower()
found = [t for t in beverage_tokens if t.lower() in brand_blob]
check("N4 NO beverage tokens in brand", not found, f"found: {found}")

manifest_paths = {e["path"] for e in manifest.get("files", [])}
catalog_paths = {s["path"] for _, p in procs for s in p.get("dataSamples", [])}
diff = manifest_paths.symmetric_difference(catalog_paths)
check("P14 manifest matches catalog file list", not diff, f"diff: {len(diff)} entries")

valid_families = {"Foundational", "Decision", "Reasoning", "Operations",
                  "Governance", "Quality", "Domain", "Platform"}
bad_family = [c["id"] for c in ai.get("capabilities", []) if c.get("family") not in valid_families]
check("P15 every AI entry has a valid family", not bad_family,
      f"bad: {bad_family[:3]}")

# ---- report ----
green = sum(1 for _, ok, _ in results if ok)
total = len(results)
print(f"\ndrill_insurance_catalog — {green}/{total} green")
for name, ok, detail in results:
    mark = "✓" if ok else "✗"
    print(f"  {mark} {name:50} {detail}")

if green < total:
    print(f"\nFAILED: {total - green} invariant(s) red.")
    sys.exit(1)

print("\nALL invariants green.")
sys.exit(0)
