#!/usr/bin/env python3
"""Initialize / refresh the operator-editable state files that sit alongside
the blueprint.

Three state files live under data/insurance/:
  - capability_status.json — name → status for every AI capability surfaced
    by the blueprint (missing_capabilities · enterprise_arch layers ·
    enterprise_missing_layers · top50_missing_ai · per-dept top_missing).
  - maturity_state.json — current_level per dept in the catalog (L0..L6).
  - implementation_state.json — current_step_index + per-step status across
    the 12-step implementation_sequence.

Idempotent. Re-running adds new keys (e.g., after new depts land) without
ever overwriting an operator-set value. Default for new entries is
"planned" / "L0" / 0.

Valid status vocab: planned · in-progress · live · deferred.
Valid maturity vocab: L0 · L1 · L2 · L3 · L4 · L5 · L6.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data" / "insurance"
BLUEPRINT = DATA_DIR / "blueprint.json"
CAPS_PATH = DATA_DIR / "capability_status.json"
MATURITY_PATH = DATA_DIR / "maturity_state.json"
IMPL_PATH = DATA_DIR / "implementation_state.json"

VALID_STATUSES = ["planned", "in-progress", "live", "deferred"]
VALID_MATURITY = ["L0", "L1", "L2", "L3", "L4", "L5", "L6"]


def _load(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError:
        return {}


def _write(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2, sort_keys=False) + "\n")


def _ensure(d: dict, key: str, default):
    if key not in d:
        d[key] = default
    return d[key]


def collect_capability_names(bp: dict) -> list[str]:
    """Pull every AI capability / layer / role name out of the blueprint
    that the operator might want to mark as planned / in-progress / live."""
    names: list[str] = []
    seen: set[str] = set()

    def add(name: str):
        if name and name not in seen:
            names.append(name)
            seen.add(name)

    for row in bp.get("missing_capabilities", []) or []:
        add(row.get("name", ""))
    for layer in (bp.get("enterprise_architecture") or {}).get("layers", []) or []:
        add(layer.get("name", ""))
    for row in bp.get("enterprise_missing_layers", []) or []:
        add(row.get("layer", ""))
    for name in bp.get("top50_missing_ai", []) or []:
        add(name)
    for dept in bp.get("department_catalog", []) or []:
        for cap in dept.get("top_missing_capabilities", []) or []:
            add(cap)
    return names


def init_capability_status(bp: dict) -> int:
    existing = _load(CAPS_PATH)
    statuses = _ensure(existing, "statuses", {})
    existing.setdefault("version", "1.0")
    existing.setdefault("valid_statuses", VALID_STATUSES)
    added = 0
    for name in collect_capability_names(bp):
        if name not in statuses:
            statuses[name] = {"status": "planned", "notes": ""}
            added += 1
    _write(CAPS_PATH, existing)
    print(f"capability_status: {len(statuses)} entries (added {added} new)")
    return added


def init_maturity_state(bp: dict) -> int:
    existing = _load(MATURITY_PATH)
    depts = _ensure(existing, "depts", {})
    existing.setdefault("version", "1.0")
    existing.setdefault("valid_levels", VALID_MATURITY)
    added = 0
    for dept in bp.get("department_catalog", []) or []:
        did = str(dept.get("id"))
        if did not in depts:
            depts[did] = {"current_level": "L0", "name": dept.get("name", ""), "notes": ""}
            added += 1
        else:
            # keep current_level + notes; refresh display name in case blueprint renamed it
            depts[did]["name"] = dept.get("name", depts[did].get("name", ""))
    _write(MATURITY_PATH, existing)
    print(f"maturity_state: {len(depts)} depts (added {added} new)")
    return added


def init_implementation_state(bp: dict) -> int:
    existing = _load(IMPL_PATH)
    existing.setdefault("version", "1.0")
    existing.setdefault("current_step_index", 0)
    existing.setdefault("valid_statuses", VALID_STATUSES)
    sequence = bp.get("implementation_sequence", []) or []
    step_status = _ensure(existing, "step_status", {})
    added = 0
    for step in sequence:
        if step not in step_status:
            step_status[step] = {"status": "planned", "notes": ""}
            added += 1
    # clamp the current_step_index to a valid range
    if not isinstance(existing.get("current_step_index"), int):
        existing["current_step_index"] = 0
    existing["current_step_index"] = max(0, min(existing["current_step_index"], len(sequence)))
    existing["total_steps"] = len(sequence)
    _write(IMPL_PATH, existing)
    print(f"implementation_state: {len(step_status)} steps (added {added} new), current_step_index={existing['current_step_index']}")
    return added


def main() -> int:
    if not BLUEPRINT.exists():
        print(f"FATAL: blueprint missing at {BLUEPRINT}")
        return 1
    bp = json.loads(BLUEPRINT.read_text())
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    init_capability_status(bp)
    init_maturity_state(bp)
    init_implementation_state(bp)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
