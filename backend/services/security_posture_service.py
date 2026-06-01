"""§68.7 Security posture — read surface for "is the system secure?"

Aggregates three signals into one operator view:

  1. Compliance gate state — derived from running-project invariants
     (which RBAC entries are wired? is the federated audit helper in
     place? are the drill files present?). This is the "did we hold the
     line on the §42 / §47.6 / §38.3 baseline" check.
  2. CVE / dep-vuln backlog — read from data/agent-supervisor/
     security_posture.json (HOLY_SECURITY_POSTURE_PATH env override).
     This file is populated by an external pip-audit/bandit/trivy job
     (out-of-scope for this commit; service handles missing file
     gracefully per §57.7).
  3. Attack attempts — derived from the federated holy_reads audit log
     by filtering for 403/401-shaped denial events (RBAC denied / role
     unknown / scope-denied). The leak-scan from §68.6 sits adjacent.

Composes with §38.3 (audit on read) + §47.6 (compliance gate check —
the audit-helper + RBAC matrix presence ARE part of the posture) +
§57.7 (graceful degradation — missing posture file → empty signal,
never crash) + §64.32 (per-dept HOLY_SECURITY.md spec is the WRITE
side; this is the READ surface) + §68 (Observability Hub iter 3).
"""
from __future__ import annotations

import json
import logging
import os
import re
import time
from collections import Counter
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# CVE/dep-vuln snapshot — populated externally by pip-audit / bandit /
# trivy on a cadence. Service degrades gracefully if absent.
_POSTURE_CANDIDATES = [
    Path(__file__).resolve().parents[2] / "data" / "agent-supervisor" / "security_posture.json",
    Path("/app/data/agent-supervisor/security_posture.json"),
    Path("/data/agent-supervisor/security_posture.json"),
]

# Audit log for attack-attempt scan (same as §68.6 leak scan).
_AUDIT_LOG_CANDIDATES = [
    Path(__file__).resolve().parents[2] / "data" / "agent-supervisor" / "holy_reads.jsonl",
    Path("/app/data/agent-supervisor/holy_reads.jsonl"),
    Path("/data/agent-supervisor/holy_reads.jsonl"),
]


def _posture_path() -> Path | None:
    env = os.environ.get("HOLY_SECURITY_POSTURE_PATH")
    if env:
        p = Path(env)
        if p.exists():
            return p
    for p in _POSTURE_CANDIDATES:
        if p.exists():
            return p
    return None


def _audit_log_path() -> Path | None:
    env = os.environ.get("HOLY_AUDIT_PATH")
    if env:
        p = Path(env)
        if p.exists():
            return p
    for p in _AUDIT_LOG_CANDIDATES:
        if p.exists():
            return p
    return None


def _load_posture() -> dict[str, Any]:
    """Load the external posture snapshot. Returns empty envelope if missing."""
    p = _posture_path()
    if p is None:
        return {
            "status": "no_posture_snapshot",
            "n_critical_cves": 0,
            "n_high_cves": 0,
            "n_medium_cves": 0,
            "cves": [],
            "last_scanned_at": None,
        }
    try:
        return json.loads(p.read_text())
    except (json.JSONDecodeError, OSError) as exc:
        logger.warning("security_posture: failed to load %s: %s", p, exc)
        return {
            "status": "posture_snapshot_unreadable",
            "error_type": type(exc).__name__,
            "cves": [],
        }


def _compliance_gates() -> dict[str, Any]:
    """Probe live invariants to score the §47.6 compliance posture.

    Each gate is observable from the running process — no out-of-band
    calls. The score is the fraction of gates passing.
    """
    gates: list[dict[str, Any]] = []

    # Gate 1: federated audit helper present?
    try:
        from core.holy_audit import log_holy_access  # noqa: F401
        gates.append({"gate": "federated_audit_helper", "pass": True,
                      "evidence": "core.holy_audit.log_holy_access importable"})
    except Exception as exc:  # noqa: BLE001
        gates.append({"gate": "federated_audit_helper", "pass": False,
                      "evidence": f"import failed: {type(exc).__name__}"})

    # Gate 2: RBAC matrix wired for ≥10 patterns?
    try:
        from core.rbac_middleware import PERMS_MATRIX
        gates.append({"gate": "rbac_matrix_density",
                      "pass": len(PERMS_MATRIX) >= 10,
                      "evidence": f"{len(PERMS_MATRIX)} regex entries"})
    except Exception as exc:  # noqa: BLE001
        gates.append({"gate": "rbac_matrix_density", "pass": False,
                      "evidence": f"import failed: {type(exc).__name__}"})

    # Gate 3: TenantIdMiddleware available?
    try:
        from core.middleware import TenantIdMiddleware  # noqa: F401
        gates.append({"gate": "tenant_id_middleware", "pass": True,
                      "evidence": "core.middleware.TenantIdMiddleware importable"})
    except Exception as exc:  # noqa: BLE001
        gates.append({"gate": "tenant_id_middleware", "pass": False,
                      "evidence": f"import failed: {type(exc).__name__}"})

    # Gate 4: PII inventory service available (proves §68.6 wired)?
    try:
        from services.pii_inventory_service import is_pii_column_default  # noqa: F401
    except ImportError:
        try:
            import services.pii_inventory_service  # noqa: F401
            gates.append({"gate": "pii_inventory_service", "pass": True,
                          "evidence": "services.pii_inventory_service importable"})
        except Exception as exc:  # noqa: BLE001
            gates.append({"gate": "pii_inventory_service", "pass": False,
                          "evidence": f"import failed: {type(exc).__name__}"})
    else:
        gates.append({"gate": "pii_inventory_service", "pass": True,
                      "evidence": "services.pii_inventory_service importable"})

    # Gate 5: Guardrails service available (proves §68.5 wired)?
    try:
        import services.guardrails_service  # noqa: F401
        gates.append({"gate": "guardrails_service", "pass": True,
                      "evidence": "services.guardrails_service importable"})
    except Exception as exc:  # noqa: BLE001
        gates.append({"gate": "guardrails_service", "pass": False,
                      "evidence": f"import failed: {type(exc).__name__}"})

    # Gate 6: drill discipline — ≥5 drill files present?
    drill_dir = Path(__file__).resolve().parents[2] / "tests" / "drills"
    n_drills = 0
    if drill_dir.exists():
        n_drills = sum(1 for _ in drill_dir.glob("drill_*.py"))
    gates.append({"gate": "drill_discipline_n_drills",
                  "pass": n_drills >= 5,
                  "evidence": f"{n_drills} drill files under tests/drills/"})

    n_pass = sum(1 for g in gates if g["pass"])
    return {
        "n_gates": len(gates),
        "n_passing": n_pass,
        "score": round(n_pass / len(gates), 2) if gates else 0.0,
        "gates": gates,
    }


# Patterns that classify an audit-log row as an attack ATTEMPT.
# Conservative: catches the rejected attempts that DID hit the API,
# not full pentests against the host.
_ATTACK_PATTERNS = {
    "rbac_denial":    re.compile(r"rbac\.denied|forbidden|unauthorized", re.I),
    "scope_denial":   re.compile(r"scope[_ -]?(denied|missing)|insufficient[_ -]privilege", re.I),
    "malformed_path": re.compile(r"path traversal|injection attempt|malformed", re.I),
}


def _scan_attacks(since_epoch: float, limit: int) -> list[dict[str, Any]]:
    """Scan recent audit-log rows for attack-attempt signals."""
    p = _audit_log_path()
    if p is None or not p.exists():
        return []
    hits: list[dict[str, Any]] = []
    try:
        for line in p.read_text(errors="replace").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            if not isinstance(row, dict):
                continue
            ts = row.get("ts", 0)
            if since_epoch and ts < since_epoch:
                continue
            blob = json.dumps(row, separators=(",", ":"))
            for attack_type, pattern in _ATTACK_PATTERNS.items():
                if pattern.search(blob):
                    hits.append({
                        "attack_type": attack_type,
                        "ts": ts,
                        "tenant_id": row.get("tenant_id", ""),
                        "actor": row.get("actor", ""),
                        "tool": row.get("tool", ""),
                        "request_id": row.get("request_id", ""),
                        "surface": row.get("surface", ""),
                        "endpoint": row.get("endpoint", ""),
                    })
                    break  # one attack-type per row is enough
            if len(hits) >= limit:
                break
    except OSError:
        return hits
    return hits


def global_summary() -> dict[str, Any]:
    """Cross-dept security posture summary."""
    posture = _load_posture()
    compliance = _compliance_gates()
    attacks_24h = _scan_attacks(since_epoch=time.time() - 24 * 3600, limit=500)
    attack_counts = Counter(h["attack_type"] for h in attacks_24h)

    return {
        "policy": "§68.7 Security posture",
        "compliance": compliance,
        "vulnerabilities": {
            "n_critical": posture.get("n_critical_cves", 0),
            "n_high":     posture.get("n_high_cves", 0),
            "n_medium":   posture.get("n_medium_cves", 0),
            "last_scanned_at": posture.get("last_scanned_at"),
            "snapshot_status": posture.get("status", "loaded"),
        },
        "attack_attempts_24h": {
            "n_hits": len(attacks_24h),
            "by_type": dict(attack_counts),
        },
        "scanned_at": time.time(),
    }


def per_dept_score(dept: str) -> dict[str, Any]:
    """Per-dept security score — currently a slice of the global view.

    Future: read dept-specific CVE / pen-test result / compliance gate
    state from data/agent-supervisor/security_posture.json's `per_dept`
    section when populated.
    """
    posture = _load_posture()
    per_dept_data = posture.get("per_dept", {}).get(dept, {})

    # Dept-filtered attack count
    attacks = _scan_attacks(since_epoch=time.time() - 24 * 3600, limit=200)
    dept_attacks = [
        h for h in attacks
        # Dept may not be in audit row; fall back to surface containment
        if dept in (h.get("endpoint", "") + h.get("tool", "") + h.get("surface", ""))
        or h.get("tenant_id", "").endswith(dept)
    ]

    return {
        "dept": dept,
        "compliance_gates_passing": _compliance_gates()["n_passing"],
        "vulnerabilities": per_dept_data.get("vulnerabilities", {}),
        "pen_test_result": per_dept_data.get("pen_test_result"),
        "compliance_state": per_dept_data.get("compliance_state", {}),
        "attack_attempts_24h": len(dept_attacks),
        "spec_doc": f"global-ai-org/departments/{dept}/business-layer/HOLY_SECURITY.md",
        "scanned_at": time.time(),
    }


def list_attacks(since_epoch: float = 0.0, limit: int = 100) -> dict[str, Any]:
    """Recent attack attempts (rejected by middleware) with metadata."""
    if since_epoch == 0.0:
        since_epoch = time.time() - 7 * 24 * 3600  # default last 7 days
    hits = _scan_attacks(since_epoch=since_epoch, limit=limit)
    return {
        "since_epoch": since_epoch,
        "n_hits": len(hits),
        "hits": hits,
        "patterns_checked": sorted(_ATTACK_PATTERNS.keys()),
        "scanned_at": time.time(),
    }
