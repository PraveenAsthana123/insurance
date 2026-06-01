"""HOLY transactional history router — unified chronological audit feed per dept.

Surfaces 3 event sources in MVP:
  - cron audit rows  data/eval/cron/<job>/<run_id>/manifest.json
  - ML lifecycle runs data/eval/<dept>/<pipeline>/<run_id>/manifest.json
  - simulation runs   data/eval/sim/<dept>/<process>/<sim_id>/events.jsonl

Future sources (gated for follow-up work):
  - test runs from Redis test_results list
  - decision audit from Postgres decision_audit table

Composes with global §38 audit + §41.3 tenant isolation + §47.6 SOC2
CC6.2 access (PII redacted by default) + §57.6 canonical envelope.

Endpoints (read-only — append-only event stream, no mutation API):
  GET /api/v1/holy/transactions/{dept}
  GET /api/v1/holy/transactions/{dept}/{event_id}
  GET /api/v1/holy/transactions/_global
"""
from __future__ import annotations

import json
import logging
import re
import time
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request

from core.holy_audit import log_holy_access

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/holy/transactions", tags=["holy", "transactions"])

HOLY_DEPTS = [
    "digital-marketing", "customer-experience", "supply-chain", "manufacturing",
    "product-rd", "retail-operations", "sales", "finance", "hr", "procurement",
    "executive-leadership", "e-commerce", "customer-support", "engineering",
    "it-operations", "legal", "marketing", "operations", "security-operations",
]

# Cron job catalog — keep aligned with monitoring.py CRON_JOBS.
CRON_AUDIT_DIRS = {
    "cron.refresh_data_artifacts": "data_refresh",
    "cron.retrain_models":         "retrain",
    "cron.eval_accuracy_drift":    "accuracy",
    "cron.analysis_rollup":        "analysis",
}

# PII tokens that MUST be redacted from default response payload bodies.
PII_TOKENS = {
    "customer_name", "primary_email", "primary_phone", "billing_address",
    "vendor_name", "bank_account_iban", "full_name", "email", "phone",
    "ssn_hash", "ssn",
}

# Locate data/ root same way monitoring.py does.
_DATA_CANDIDATES = [
    Path("/data"),
    Path("/app/data"),
    Path(__file__).resolve().parents[2] / "data",
]
DATA_ROOT = next((p for p in _DATA_CANDIDATES if p.exists()), _DATA_CANDIDATES[-1])
CRON_DIR = DATA_ROOT / "eval" / "cron"
SIM_DIR = DATA_ROOT / "eval" / "sim"


def _validate_dept(dept: str) -> None:
    if dept not in HOLY_DEPTS:
        raise HTTPException(404, f"Unknown dept '{dept}' — must be one of {len(HOLY_DEPTS)} HOLY depts")


def _ts_from_run_id(run_id: str) -> float | None:
    """Extract epoch from canonical run_id format <unix-ts>-<hex6>."""
    m = re.match(r"^(\d{10,})", run_id)
    return float(m.group(1)) if m else None


def _redact_pii(obj: Any) -> Any:
    """Recursively replace PII-keyed values with REDACTED marker."""
    if isinstance(obj, dict):
        return {
            k: ("***REDACTED***" if k in PII_TOKENS else _redact_pii(v))
            for k, v in obj.items()
        }
    if isinstance(obj, list):
        return [_redact_pii(item) for item in obj]
    return obj


def _scan_cron_events(dept: str, since_epoch: float, limit: int) -> list[dict[str, Any]]:
    """Cron events apply to all depts (fan-out style); filter by since_epoch."""
    events: list[dict[str, Any]] = []
    if not CRON_DIR.exists():
        return events
    for event_type, subdir_name in CRON_AUDIT_DIRS.items():
        subdir = CRON_DIR / subdir_name
        if not subdir.exists():
            continue
        for run_dir in sorted(subdir.iterdir(), reverse=True):
            if not run_dir.is_dir():
                continue
            ts = _ts_from_run_id(run_dir.name)
            if ts is None or ts < since_epoch:
                continue
            manifest_path = run_dir / "manifest.json"
            if not manifest_path.exists():
                continue
            try:
                manifest = json.loads(manifest_path.read_text())
            except (json.JSONDecodeError, OSError):
                continue
            events.append({
                "event_id": f"evt-cron-{run_dir.name}",
                "event_type": event_type,
                "request_id": run_dir.name,
                "tenant_id": "default",
                "actor": "celery-worker",
                "dept": dept,
                "timestamp": ts,
                "latency_ms": int(manifest.get("duration_seconds", 0) * 1000),
                "outcome": manifest.get("status", "ok"),
                "source": "cron",
                "payload": manifest,
            })
            if len(events) >= limit * 4:  # cap intermediate scan
                break
    return events


def _scan_ml_events(dept: str, since_epoch: float, limit: int) -> list[dict[str, Any]]:
    """ML lifecycle events under data/eval/<dept>/<pipeline>/<run_id>/manifest.json."""
    events: list[dict[str, Any]] = []
    dept_dir = DATA_ROOT / "eval" / dept
    if not dept_dir.exists():
        return events
    for pipeline_dir in dept_dir.iterdir():
        if not pipeline_dir.is_dir():
            continue
        for run_dir in sorted(pipeline_dir.iterdir(), reverse=True):
            if not run_dir.is_dir():
                continue
            ts = _ts_from_run_id(run_dir.name)
            if ts is None or ts < since_epoch:
                continue
            manifest_path = run_dir / "manifest.json"
            if not manifest_path.exists():
                continue
            try:
                manifest = json.loads(manifest_path.read_text())
            except (json.JSONDecodeError, OSError):
                continue
            events.append({
                "event_id": f"evt-ml-{run_dir.name}",
                "event_type": f"ml.{pipeline_dir.name}",
                "request_id": run_dir.name,
                "tenant_id": "default",
                "actor": "celery-worker",
                "dept": dept,
                "timestamp": ts,
                "latency_ms": int(manifest.get("duration_seconds", 0) * 1000),
                "outcome": "ok",
                "source": "ml",
                "payload": manifest,
            })
            if len(events) >= limit * 4:
                break
    return events


def _scan_sim_events(dept: str, since_epoch: float, limit: int) -> list[dict[str, Any]]:
    """Sim events under data/eval/sim/<dept>/<process>/<sim_id>/manifest.json."""
    events: list[dict[str, Any]] = []
    dept_sim_dir = SIM_DIR / dept
    if not dept_sim_dir.exists():
        return events
    for process_dir in dept_sim_dir.iterdir():
        if not process_dir.is_dir():
            continue
        for sim_dir in sorted(process_dir.iterdir(), reverse=True):
            if not sim_dir.is_dir():
                continue
            ts = _ts_from_run_id(sim_dir.name)
            if ts is None or ts < since_epoch:
                continue
            manifest_path = sim_dir / "manifest.json"
            if not manifest_path.exists():
                continue
            try:
                manifest = json.loads(manifest_path.read_text())
            except (json.JSONDecodeError, OSError):
                continue
            events.append({
                "event_id": f"evt-sim-{sim_dir.name}",
                "event_type": f"sim.{process_dir.name}",
                "request_id": sim_dir.name,
                "tenant_id": "default",
                "actor": "simulator",
                "dept": dept,
                "timestamp": ts,
                "latency_ms": int(manifest.get("duration_seconds", 0) * 1000),
                "outcome": manifest.get("status", "ok"),
                "source": "sim",
                "payload": manifest,
            })
            if len(events) >= limit * 4:
                break
    return events


def _wildcard_match(pattern: str, event_type: str) -> bool:
    """`cron.*` matches `cron.X`; `*` matches anything; exact match otherwise."""
    if pattern == "*":
        return True
    if pattern.endswith(".*"):
        return event_type.startswith(pattern[:-1])  # keep the trailing dot
    return event_type == pattern


# _global BEFORE /{dept} to dodge FastAPI greedy-match (per §66.3).
@router.get("/_global")
def global_summary(http_request: Request) -> dict[str, Any]:
    """Cross-dept summary: per-dept event count for the last 24h."""
    log_holy_access(http_request, "transactions", "global_summary")
    since = time.time() - 24 * 3600
    summary: dict[str, dict[str, int]] = {}
    for dept in HOLY_DEPTS:
        events = (
            _scan_cron_events(dept, since, limit=100)
            + _scan_ml_events(dept, since, limit=100)
            + _scan_sim_events(dept, since, limit=100)
        )
        by_source: dict[str, int] = {"cron": 0, "ml": 0, "sim": 0}
        for ev in events:
            by_source[ev["source"]] = by_source.get(ev["source"], 0) + 1
        summary[dept] = by_source
    return {
        "n_depts": len(HOLY_DEPTS),
        "depts": HOLY_DEPTS,
        "window_hours": 24,
        "since_epoch": since,
        "per_dept_counts": summary,
        "scanned_at": time.time(),
    }


@router.get("/{dept}")
def list_transactions(
    http_request: Request,
    dept: str,
    source: str = Query("all", pattern="^(all|cron|ml|sim)$"),
    event_type: str = Query("*", description="Wildcard match: 'cron.*' or exact 'ml.churn_reference'"),
    since_epoch: float = Query(0.0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    include_pii: int = Query(0, ge=0, le=1),
) -> dict[str, Any]:
    """Per-dept chronological transaction feed (newest first)."""
    _validate_dept(dept)
    log_holy_access(http_request, "transactions", "list_transactions",
                    dept=dept, extra={"source": source, "include_pii": int(include_pii)})

    events: list[dict[str, Any]] = []
    if source in ("all", "cron"):
        events.extend(_scan_cron_events(dept, since_epoch, limit))
    if source in ("all", "ml"):
        events.extend(_scan_ml_events(dept, since_epoch, limit))
    if source in ("all", "sim"):
        events.extend(_scan_sim_events(dept, since_epoch, limit))

    # Event-type wildcard filter
    if event_type != "*":
        events = [e for e in events if _wildcard_match(event_type, e["event_type"])]

    # Sort newest first by timestamp
    events.sort(key=lambda e: e["timestamp"], reverse=True)
    events = events[:limit]

    # PII redaction (default ON); ?include_pii=1 must land an audit row
    # in production. MVP marks the path.
    if not include_pii:
        events = _redact_pii(events)

    return {
        "dept": dept,
        "filters": {
            "source": source,
            "event_type": event_type,
            "since_epoch": since_epoch,
            "limit": limit,
            "include_pii": bool(include_pii),
        },
        "n_events": len(events),
        "events": events,
        "scanned_at": time.time(),
    }


@router.get("/{dept}/{event_id}")
def get_event(http_request: Request, dept: str, event_id: str, include_pii: int = Query(0, ge=0, le=1)) -> dict[str, Any]:
    """Single-event detail by event_id."""
    _validate_dept(dept)
    log_holy_access(http_request, "transactions", "get_event",
                    dept=dept, extra={"event_id": event_id, "include_pii": int(include_pii)})

    # Parse event_id: evt-<source>-<run_id>
    m = re.match(r"^evt-(cron|ml|sim)-(.+)$", event_id)
    if not m:
        raise HTTPException(404, f"Malformed event_id '{event_id}' (expected evt-{{source}}-{{run_id}})")
    src, run_id = m.group(1), m.group(2)

    # Scan a broad window to find it (last 30 days) — could be optimized with index.
    since = time.time() - 30 * 24 * 3600
    candidates: list[dict[str, Any]] = []
    if src == "cron":
        candidates = _scan_cron_events(dept, since, limit=10000)
    elif src == "ml":
        candidates = _scan_ml_events(dept, since, limit=10000)
    elif src == "sim":
        candidates = _scan_sim_events(dept, since, limit=10000)

    match = next((ev for ev in candidates if ev["event_id"] == event_id), None)
    if match is None:
        raise HTTPException(404, f"Event '{event_id}' not found for dept '{dept}'")
    if not include_pii:
        match = _redact_pii(match)
    return match
