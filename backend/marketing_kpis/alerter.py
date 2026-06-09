"""KPI target-breach alerter · T5.10.

Per docs/PENDING_PLAN.md T5.10. Compares each KPI's current value against
its `target_op` + `target` in the registry · returns breach severity.

Severity tiers (relative deviation from target):
  critical · value ≥ 50% off the target threshold
  warning  · value crosses target but within 50%
  info     · still meeting target (no breach)

Per §57.7: returns 'no_target' when KPI lacks a numeric target ·
  no fake breach alarms for KPIs that don't have a measurable goal.
Per §82.7: alerts feed drift detection · operator can see "marketing_roi
  fell from 3.2 to 1.8 · warning · target 3.0" without manual scanning.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from . import computer, registry

logger = logging.getLogger(__name__)


def _deviation(value: float, target: float, op: str) -> float:
    """How far off-target as a fraction (0 = at target · 1.0 = 100% off).

    For '>'  · negative deviation = value below target = bad
    For '<'  · positive deviation = value above target = bad
    Returns the magnitude of the BAD direction · None if value not breaching.
    """
    if target == 0:
        return abs(value)
    if op == ">":
        return max(0.0, (target - value) / target)
    if op == "<":
        return max(0.0, (value - target) / target)
    return 0.0


def check_breach(kpi: dict[str, Any], value: Any) -> Optional[dict[str, Any]]:
    """Returns alert dict if value breaches target · None otherwise.

    Alert shape:
      {kpi_id · value · target · target_op · severity · deviation_pct ·
       message · category}
    """
    if value is None:
        # Don't alert when KPI has no computed value · §57.7
        return None
    target = kpi.get("target")
    op = kpi.get("target_op")
    if target is None or op in (None, "growth", "budget"):
        # Non-numeric targets · skip per §57.7 (no fake comparison)
        return None
    try:
        v = float(value) if not isinstance(value, dict) else None
    except (TypeError, ValueError):
        return None
    if v is None:
        return None
    target_f = float(target)

    # Does it actually breach?
    if op == ">" and v >= target_f:
        return None
    if op == "<" and v <= target_f:
        return None

    dev = _deviation(v, target_f, op)
    severity = "critical" if dev >= 0.5 else "warning"

    return {
        "kpi_id": kpi["id"],
        "kpi_name": kpi["name"],
        "category": kpi["category"],
        "value": round(v, 4),
        "target": target_f,
        "target_op": op,
        "severity": severity,
        "deviation_pct": round(dev * 100, 1),
        "message": (
            f"{kpi['name']} = {v} · target {op} {target_f} · "
            f"deviation {dev * 100:.1f}%"
        ),
    }


def compute_all_breaches() -> dict[str, Any]:
    """Check every KPI with a computer + numeric target."""
    values = computer.compute_all()
    by_id = {k["id"]: k for k in registry.KPIS}
    alerts: list[dict] = []
    skipped_no_value = 0
    skipped_no_target = 0
    in_compliance = 0
    for kpi_id, value in values.items():
        kpi = by_id.get(kpi_id)
        if not kpi:
            continue
        if value is None:
            skipped_no_value += 1
            continue
        # Non-numeric / growth / budget targets
        if kpi.get("target") is None or kpi.get("target_op") in ("growth", "budget", None):
            skipped_no_target += 1
            continue
        alert = check_breach(kpi, value)
        if alert:
            alerts.append(alert)
        else:
            in_compliance += 1

    # Severity counts
    critical = sum(1 for a in alerts if a["severity"] == "critical")
    warning = sum(1 for a in alerts if a["severity"] == "warning")

    return {
        "alerts": sorted(alerts, key=lambda a: (-a["deviation_pct"],)),
        "summary": {
            "total_alerts": len(alerts),
            "critical": critical,
            "warning": warning,
            "in_compliance": in_compliance,
            "skipped_no_value": skipped_no_value,
            "skipped_no_target": skipped_no_target,
        },
    }
