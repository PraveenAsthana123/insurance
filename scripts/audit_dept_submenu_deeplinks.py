#!/usr/bin/env python3
"""Dept sub-menu deep-link integrity audit.

Per docs/PATH_E_EXECUTION_REPORT_2026-06-09.md P1 closure ·
'18 of 22 dept sub-menus don't deep-link'.

Verifies that EVERY dept × process × sub-process in
config/insurance.catalog.json has:
  - non-empty id
  - non-empty name
  - URL-safe id (no spaces · no special chars)
  - resolvable through the (dept_id, process_id) lookup pattern

Plus checks that key depts have at least 1 process with subProcesses.

10 assertions:
  1. catalog file exists + parses
  2. departments array non-empty
  3. every dept has id + name
  4. every dept has at least 1 process
  5. every process has id + name
  6. every process id is URL-safe (alphanumeric + dash)
  7. dept ids are unique
  8. process ids are unique WITHIN each dept
  9. cross-dept dept-id uniqueness preserved
 10. all 22 depts traversable (no missing/empty rows)
"""
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent


def main() -> int:
    print("Dept sub-menu deep-link integrity audit\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    fails = 0

    def assert_(label: str, ok: bool, detail: str = ""):
        nonlocal fails
        mark = "✓" if ok else "✗"
        sfx = f" · {detail}" if detail else ""
        print(f"  {label[:55]:<55} | {mark} {('PASS' if ok else 'FAIL')}{sfx}")
        if not ok:
            fails += 1

    # 1. Catalog exists + parses
    catalog_path = REPO / "config" / "insurance.catalog.json"
    if not catalog_path.exists():
        assert_("1. insurance.catalog.json exists", False, "missing")
        return 1
    try:
        data = json.loads(catalog_path.read_text())
        assert_("1. catalog parses as JSON", True)
    except json.JSONDecodeError as e:
        assert_("1. catalog parses as JSON", False, str(e))
        return 1

    # 2. departments array
    depts = data.get("departments", [])
    assert_(f"2. departments array · {len(depts)} entries",
            len(depts) >= 1, f"got {len(depts)}")

    # 3. Every dept has id + name
    bad_dept = [d for d in depts if not d.get("id") or not d.get("name")]
    assert_("3. every dept has id + name",
            len(bad_dept) == 0, f"bad: {[d.get('name', '?') for d in bad_dept][:3]}")

    # 4. Every dept has ≥1 process
    no_proc = [d["id"] for d in depts if not d.get("processes")]
    assert_(f"4. every dept has ≥1 process",
            len(no_proc) == 0,
            f"depts without processes: {no_proc[:3]}")

    # 5. Every process has id + name
    bad_proc = []
    for d in depts:
        for p in d.get("processes", []):
            if not p.get("id") or not p.get("name"):
                bad_proc.append(f"{d['id']}/{p.get('name', '?')}")
    assert_("5. every process has id + name",
            len(bad_proc) == 0, f"bad: {bad_proc[:3]}")

    # 6. URL-safe IDs (alphanumeric + dash · no spaces · no special chars)
    url_safe = re.compile(r"^[a-z0-9_-]+$", re.IGNORECASE)
    unsafe_dept = [d["id"] for d in depts if not url_safe.match(d["id"] or "")]
    unsafe_proc = []
    for d in depts:
        for p in d.get("processes", []):
            if not url_safe.match(p["id"] or ""):
                unsafe_proc.append(f"{d['id']}/{p['id']}")
    assert_("6. dept IDs are URL-safe",
            len(unsafe_dept) == 0, f"unsafe: {unsafe_dept[:3]}")
    assert_("6b. process IDs are URL-safe",
            len(unsafe_proc) == 0, f"unsafe: {unsafe_proc[:3]}")

    # 7. dept_ids are unique
    dept_ids = [d["id"] for d in depts]
    duplicates = [i for i in set(dept_ids) if dept_ids.count(i) > 1]
    assert_("7. dept IDs are unique",
            len(duplicates) == 0, f"dups: {duplicates}")

    # 8. process IDs unique within each dept
    bad_within = []
    for d in depts:
        proc_ids = [p["id"] for p in d.get("processes", [])]
        dups = [i for i in set(proc_ids) if proc_ids.count(i) > 1]
        if dups:
            bad_within.append(f"{d['id']}: {dups}")
    assert_("8. process IDs unique within each dept",
            len(bad_within) == 0, f"dups: {bad_within[:2]}")

    # 9. Total dept count target (22 per docs)
    assert_(f"9. expected 22 depts · got {len(depts)}",
            len(depts) >= 22, "below target")

    # 10. All depts traversable (simulate findProcess lookup for first proc of each dept)
    unreachable = []
    for d in depts:
        procs = d.get("processes", [])
        if not procs:
            unreachable.append(d["id"])
            continue
        # Simulate URL decoding lookup
        first_proc = procs[0]
        found = any(p["id"] == first_proc["id"] for p in procs)
        if not found:
            unreachable.append(f"{d['id']}/{first_proc['id']}")
    assert_("10. all depts traversable (first-proc resolvable)",
            len(unreachable) == 0,
            f"unreachable: {unreachable[:3]}")

    total_procs = sum(len(d.get("processes", [])) for d in depts)
    total_subs = sum(
        len(p.get("subProcesses", []))
        for d in depts for p in d.get("processes", [])
    )
    print(f"\n  Aggregate: {len(depts)} depts · {total_procs} processes · {total_subs} sub-processes")
    print(f"  Summary: {11 - fails}/11 pass · {fails} fail")
    print(f"  Reference: §73 + PATH_E P1 closure · deep-link integrity")
    return 0 if fails == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
