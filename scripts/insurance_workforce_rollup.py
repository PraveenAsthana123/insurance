#!/usr/bin/env python3
"""Roll the insurance alignment audit + state files into work_tracker.

Writes data/work_tracker/insurance_alignment.json with a compact summary:
  - audit verdict + check counts + timestamp
  - capability_status breakdown (count per status)
  - maturity ladder distribution (count per L0..L6)
  - implementation current_step + progress %
  - cron last-fired timestamp from jobs/logs/insurance_alignment_cron.log

Designed for the global work_tracker dashboard to consume. Idempotent.
"""
from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LATEST_AUDIT = ROOT / "jobs" / "reports" / "insurance" / "insurance_alignment_latest.json"
BLUEPRINT = ROOT / "data" / "insurance" / "blueprint.json"
CAPS = ROOT / "data" / "insurance" / "capability_status.json"
MATURITY = ROOT / "data" / "insurance" / "maturity_state.json"
IMPL = ROOT / "data" / "insurance" / "implementation_state.json"
CRON_LOG = ROOT / "jobs" / "logs" / "insurance_alignment_cron.log"
OUT = ROOT / "data" / "work_tracker" / "insurance_alignment.json"
EXPECTED_DEPT_IDS = set(range(1, 23))


def _load(path: Path):
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError:
        return None


def main() -> int:
    now = datetime.now(timezone.utc).isoformat()
    audit = _load(LATEST_AUDIT) or {}
    bp = _load(BLUEPRINT) or {}
    caps = _load(CAPS) or {}
    mat = _load(MATURITY) or {}
    impl = _load(IMPL) or {}

    catalog = bp.get("department_catalog") or []
    present_ids = sorted(d.get("id") for d in catalog if isinstance(d, dict))
    partial_ids = sorted(d.get("id") for d in catalog if isinstance(d, dict) and d.get("partial"))
    complete_ids = sorted(set(present_ids) - set(partial_ids))
    missing_ids = sorted(EXPECTED_DEPT_IDS - set(present_ids))

    cap_breakdown = Counter()
    for entry in (caps.get("statuses") or {}).values():
        cap_breakdown[entry.get("status", "planned")] += 1

    mat_breakdown = Counter()
    for entry in (mat.get("depts") or {}).values():
        mat_breakdown[entry.get("current_level", "L0")] += 1

    impl_idx = impl.get("current_step_index", 0)
    impl_total = impl.get("total_steps", 0)
    impl_pct = round(100 * impl_idx / impl_total, 1) if impl_total else 0.0

    cron_last_mtime = None
    cron_tail = []
    if CRON_LOG.exists():
        cron_last_mtime = datetime.fromtimestamp(CRON_LOG.stat().st_mtime, tz=timezone.utc).isoformat()
        try:
            cron_tail = CRON_LOG.read_text().rstrip().splitlines()[-3:]
        except OSError:
            cron_tail = []

    payload = {
        "generated_at": now,
        "source_files": {
            "audit": str(LATEST_AUDIT.relative_to(ROOT)),
            "blueprint": str(BLUEPRINT.relative_to(ROOT)),
            "capability_status": str(CAPS.relative_to(ROOT)),
            "maturity_state": str(MATURITY.relative_to(ROOT)),
            "implementation_state": str(IMPL.relative_to(ROOT)),
            "cron_log": str(CRON_LOG.relative_to(ROOT)),
        },
        "audit": {
            "generated_at": audit.get("generated_at"),
            "total_checks": (audit.get("summary") or {}).get("total"),
            "failed_checks": (audit.get("summary") or {}).get("failed"),
            "verdict": "green" if (audit.get("summary") or {}).get("failed") == 0 else "red",
        },
        "dept_catalog_summary": {
            "expected": len(EXPECTED_DEPT_IDS),
            "present": len(present_ids),
            "complete": len(complete_ids),
            "partial": len(partial_ids),
            "missing": len(missing_ids),
            "coverage_pct": round(100 * len(present_ids) / len(EXPECTED_DEPT_IDS), 1),
            "complete_ids": complete_ids,
            "partial_ids": partial_ids,
            "missing_ids": missing_ids,
        },
        "capability_status_breakdown": dict(cap_breakdown),
        "capability_status_total": sum(cap_breakdown.values()),
        "maturity_breakdown": dict(mat_breakdown),
        "implementation_progress": {
            "current_step_index": impl_idx,
            "total_steps": impl_total,
            "pct_complete": impl_pct,
        },
        "cron": {
            "log_last_modified": cron_last_mtime,
            "log_tail": cron_tail,
        },
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2) + "\n")
    print(f"insurance rollup: {sum(cap_breakdown.values())} caps · {len(mat_breakdown)} maturity levels · impl {impl_pct}% · audit {payload['audit']['verdict']} · depts {len(present_ids)}/{len(EXPECTED_DEPT_IDS)} ({len(complete_ids)} complete, {len(partial_ids)} partial, {len(missing_ids)} missing)")
    print(f"out: {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
