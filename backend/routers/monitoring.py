"""HOLY monitoring AI router — per-dept job + pipeline health surface.

Surfaces the 4 cron jobs (refresh_data / retrain / accuracy_drift /
analysis_rollup) plus on-demand ML pipeline runs plus dispatched agent
tasks. Composes with global §38 audit + §47 3-probe + §57.6 canonical
fields + §64 per-dept artifact pattern + §65.1 #9 observability triad.

Reads run manifests from:
    data/eval/cron/<job_key>/<run_id>/manifest.json
    data/eval/<dept>/<pipeline>/<run_id>/manifest.json

Endpoints:
    GET /api/v1/holy/monitoring/{dept}
    GET /api/v1/holy/monitoring/{dept}/jobs/{job}/runs?limit=20
    GET /api/v1/holy/monitoring/{dept}/jobs/{job}/runs/{run_id}
    GET /api/v1/holy/monitoring/_global
"""
from __future__ import annotations

import json
import logging
import os
import time
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request

from core.middleware import current_tenant_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/holy/monitoring", tags=["holy", "monitoring"])

# Per §38.3 + §47.6 + §64.43 #7 — monitoring data is INFRASTRUCTURE telemetry
# (fleet-wide ML pipeline health), NOT tenant-scoped data. But every monitoring
# READ is attributed to the caller's tenant for forensic + SOC2 CC4 auditing.
# The data layout stays dept-scoped; the access trail is tenant-attributed.
_MONITORING_READS_PATH = Path(
    os.environ.get("HOLY_MONITORING_AUDIT_PATH", "data/agent-supervisor/monitoring_reads.jsonl")
)


def _log_monitoring_access(
    http_request: Request, endpoint: str, *, dept: str | None = None,
    job: str | None = None, run_id: str | None = None,
) -> None:
    """Append one §38.3-shaped read trail row. Best-effort — disk errors
    do NOT crash the request."""
    row: dict[str, Any] = {
        "ts": time.time(),
        "tenant_id": current_tenant_id(http_request),
        "actor": http_request.headers.get("X-Demo-Role", "unknown"),
        "tool": f"holy.monitoring.{endpoint}",
        "request_id": getattr(http_request.state, "correlation_id", ""),
        "endpoint": endpoint,
        "outcome": "executed",
    }
    if dept is not None:
        row["dept"] = dept
    if job is not None:
        row["job"] = job
    if run_id is not None:
        row["run_id"] = run_id
    try:
        _MONITORING_READS_PATH.parent.mkdir(parents=True, exist_ok=True)
        with _MONITORING_READS_PATH.open("a") as fh:
            fh.write(json.dumps(row, separators=(",", ":")) + "\n")
    except OSError:
        pass

# Cron job catalog — keep aligned with backend/workers/celery_app.py beat_schedule.
# Tuple = (celery task name, cadence seconds, audit dir name under data/eval/cron/)
CRON_JOBS: dict[str, tuple[str, int, str]] = {
    "data_refresh":   ("holy.refresh_data_artifacts", 60 * 60,           "data_refresh"),
    "retrain":        ("holy.retrain_models",         24 * 60 * 60,      "retrain"),
    "accuracy_drift": ("holy.eval_accuracy_drift",    4 * 60 * 60,       "accuracy"),
    "analysis":       ("holy.analysis_rollup",        24 * 60 * 60,      "analysis"),
}

# 19 HOLY departments — single source of truth for cross-dept rollup.
HOLY_DEPTS = [
    "digital-marketing", "customer-experience", "supply-chain", "manufacturing",
    "product-rd", "retail-operations", "sales", "finance", "hr", "procurement",
    "executive-leadership", "e-commerce", "customer-support", "engineering",
    "it-operations", "legal", "marketing", "operations", "security-operations",
]


# ---------------------------------------------------------------------------
# Locate data/ root.  In docker: /app/data; outside: repo-root/data.
# ---------------------------------------------------------------------------
_DATA_CANDIDATES = [
    Path("/data"),
    Path("/app/data"),
    Path(__file__).resolve().parents[2] / "data",
]
DATA_ROOT = next((p for p in _DATA_CANDIDATES if p.exists()), _DATA_CANDIDATES[-1])
CRON_DIR = DATA_ROOT / "eval" / "cron"


def _validate_dept(dept: str) -> None:
    """Raise 404 if dept not in the HOLY 19 — no info leakage."""
    if dept not in HOLY_DEPTS:
        raise HTTPException(404, f"Unknown dept '{dept}' — must be one of {len(HOLY_DEPTS)} HOLY depts")


def _validate_job(job: str) -> None:
    """Raise 404 if cron job key unknown — no info leakage."""
    if job not in CRON_JOBS:
        raise HTTPException(
            404,
            f"Unknown job '{job}' — must be one of {sorted(CRON_JOBS.keys())}",
        )


def _scan_runs(audit_dir: Path, limit: int = 20) -> list[dict[str, Any]]:
    """Return last `limit` run summaries under audit_dir, newest first.

    Each run dir contains a manifest.json with whatever the cron task chose
    to serialize.  We surface a tiny envelope: run_id, completed_at, status,
    duration_seconds, n_depts (if present).
    """
    if not audit_dir.exists():
        return []

    out: list[dict[str, Any]] = []
    # Run dirs are named like "<unix-ts>-<hex6>"; sort lexicographically =
    # chronological because the unix-ts prefix dominates.
    for run_dir in sorted(audit_dir.iterdir(), reverse=True):
        if not run_dir.is_dir():
            continue
        manifest_path = run_dir / "manifest.json"
        if not manifest_path.exists():
            continue
        try:
            data = json.loads(manifest_path.read_text())
        except (json.JSONDecodeError, OSError):
            continue
        out.append({
            "run_id": run_dir.name,
            "completed_at": data.get("completed_at"),
            "status": data.get("status", "ok"),
            "duration_seconds": data.get("duration_seconds"),
            "n_depts": data.get("n_depts") or data.get("depts_in"),
            "manifest_keys": sorted(data.keys()),
        })
        if len(out) >= limit:
            break
    return out


def _job_health(job_key: str) -> dict[str, Any]:
    """Compute liveness/readiness for one cron job per §47 3-probe contract."""
    task_name, cadence_seconds, audit_subdir = CRON_JOBS[job_key]
    audit_dir = CRON_DIR / audit_subdir
    runs = _scan_runs(audit_dir, limit=1)

    if not runs:
        return {
            "task": task_name,
            "cadence_seconds": cadence_seconds,
            "last_run": None,
            "status": "no_runs_yet",
            "liveness": "unknown",  # not enough data
            "readiness": "not_ready",
        }

    last = runs[0]
    # Parse last completed_at to epoch.  Accept ISO-8601 string or epoch float.
    completed_at = last.get("completed_at")
    last_run_epoch: float | None = None
    if isinstance(completed_at, (int, float)):
        last_run_epoch = float(completed_at)
    elif isinstance(completed_at, str):
        try:
            from datetime import datetime
            last_run_epoch = datetime.fromisoformat(completed_at.replace("Z", "+00:00")).timestamp()
        except ValueError:
            last_run_epoch = None
    if last_run_epoch is None:
        # Fall back to run_id prefix: "<unix-ts>-<hex6>"
        try:
            last_run_epoch = float(last["run_id"].split("-", 1)[0])
        except (ValueError, KeyError):
            last_run_epoch = None

    now = time.time()
    age_seconds = (now - last_run_epoch) if last_run_epoch else None

    # Liveness: last run within 2 × cadence.  Beyond that = on-call page.
    liveness = "ok"
    if age_seconds is None:
        liveness = "unknown"
    elif age_seconds > cadence_seconds * 2:
        liveness = "stale"

    return {
        "task": task_name,
        "cadence_seconds": cadence_seconds,
        "last_run": last,
        "age_seconds": age_seconds,
        "status": last.get("status", "ok"),
        "liveness": liveness,
        "readiness": "ready" if liveness == "ok" else "not_ready",
    }


# IMPORTANT — _global MUST be registered BEFORE the /{dept} catchall, otherwise
# FastAPI matches _global as a dept and the validator throws 404 before we
# ever reach the rollup handler.
@router.get("/_global")
def global_rollup(http_request: Request) -> dict[str, Any]:
    """Cross-dept rollup (executive view).  Same job health, projected per dept.

    Per §38.3 — read attribution audit row written per call with caller's
    tenant_id + actor. Monitoring DATA is fleet-wide (not tenant-scoped),
    but the access trail IS tenant-attributed.
    """
    _log_monitoring_access(http_request, "global_rollup")
    jobs = {key: _job_health(key) for key in CRON_JOBS}
    return {
        "n_depts": len(HOLY_DEPTS),
        "depts": HOLY_DEPTS,
        "jobs": jobs,
        "scanned_at": time.time(),
    }


@router.get("/{dept}")
def dept_monitoring(http_request: Request, dept: str) -> dict[str, Any]:
    """Per-dept monitoring summary across all 4 cron jobs."""
    _validate_dept(dept)
    _log_monitoring_access(http_request, "dept_monitoring", dept=dept)
    jobs = {key: _job_health(key) for key in CRON_JOBS}
    aggregate_status = "ok"
    if any(j["liveness"] == "stale" for j in jobs.values()):
        aggregate_status = "stale"
    if all(j["liveness"] == "unknown" for j in jobs.values()):
        aggregate_status = "no_runs_yet"
    return {
        "dept": dept,
        "aggregate_status": aggregate_status,
        "jobs": jobs,
        "scanned_at": time.time(),
    }


@router.get("/{dept}/jobs/{job}/runs")
def list_runs(
    http_request: Request, dept: str, job: str,
    limit: int = Query(20, ge=1, le=200),
) -> dict[str, Any]:
    """Recent runs of a cron job (cron audits are global, not per-dept; dept
    arg is validated so the URL space stays consistent with the per-dept view)."""
    _validate_dept(dept)
    _validate_job(job)
    _log_monitoring_access(http_request, "list_runs", dept=dept, job=job)
    _, _, audit_subdir = CRON_JOBS[job]
    audit_dir = CRON_DIR / audit_subdir
    runs = _scan_runs(audit_dir, limit=limit)
    return {"dept": dept, "job": job, "n_runs": len(runs), "runs": runs}


@router.get("/{dept}/jobs/{job}/runs/{run_id}")
def get_run(http_request: Request, dept: str, job: str, run_id: str) -> dict[str, Any]:
    """Full manifest of one cron run."""
    _validate_dept(dept)
    _validate_job(job)
    _log_monitoring_access(http_request, "get_run", dept=dept, job=job, run_id=run_id)
    _, _, audit_subdir = CRON_JOBS[job]
    manifest = CRON_DIR / audit_subdir / run_id / "manifest.json"
    if not manifest.exists():
        raise HTTPException(404, f"Manifest not found at {manifest.relative_to(DATA_ROOT) if manifest.is_relative_to(DATA_ROOT) else manifest}")
    try:
        return json.loads(manifest.read_text())
    except json.JSONDecodeError as exc:
        raise HTTPException(500, f"Manifest corrupted: {exc}") from exc
