"""Insurance dept router — filesystem-backed read-only views of the
scaffolded INSUR_*.md content + pipeline runner invocation API.

Per global §47 (HTTP only — no SQL here), §47.6 (tenant-aware), §38.3
(every read writes an audit row when --include-pii=1).

Endpoints:
    GET  /api/v1/insurance/depts                         — list 4 depts
    GET  /api/v1/insurance/depts/{dept}/spec             — INSUR_DEPT_SPEC.md
    GET  /api/v1/insurance/depts/{dept}/dashboards/{role}— INSUR_DASHBOARD.md per role
    GET  /api/v1/insurance/depts/{dept}/reports/{role}   — INSUR_REPORTS.md per role
    GET  /api/v1/insurance/depts/{dept}/pipelines        — registered pipelines
    POST /api/v1/insurance/depts/{dept}/pipelines/{pid}/run — invoke pipeline (smoke)
    GET  /api/v1/insurance/depts/{dept}/manual_vs_auto   — manual-vs-auto flow
    GET  /api/v1/insurance/depts/{dept}/simulation_ui    — simulation UI spec
    GET  /api/v1/insurance/depts/{dept}/system_design    — system design doc
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

from fastapi import APIRouter, HTTPException, Response

REPO_ROOT = Path(__file__).resolve().parents[2]
DEPT_ROOT = REPO_ROOT / "global-ai-org" / "departments"
RUNNER = REPO_ROOT / "backend" / "ml" / "insurance" / "run_dept_pipelines.py"

# Per Phase 2.2 of docs/AUDIT_FIX_PLAN.md — single source of truth lives in
# backend/core/insurance_config.py and is env-driven (INSUR_DEPT_SCOPE).
from backend.core.insurance_config import get_insurance_depts, get_roles
INSURANCE_DEPTS = list(get_insurance_depts())
ROLES = list(get_roles())

# Anti-info-leak per §47.6 — validate path components before file access
_SAFE = re.compile(r"^[a-z][a-z0-9-]{0,40}$")

router = APIRouter(prefix="/api/v1/insurance", tags=["insurance"])


def _validate(dept: str | None = None, role: str | None = None) -> None:
    """Reject unknown depts/roles with 404 (anti-enumeration per §47.6)."""
    if dept is not None and dept not in INSURANCE_DEPTS:
        raise HTTPException(status_code=404, detail="not found")
    if role is not None and role not in ROLES:
        raise HTTPException(status_code=404, detail="not found")


def _read_md(path: Path) -> str:
    if not path.is_file():
        raise HTTPException(status_code=404, detail="not found")
    return path.read_text()


@router.get("/depts")
def list_depts() -> dict:
    return {"depts": INSURANCE_DEPTS, "count": len(INSURANCE_DEPTS)}


@router.get("/depts/{dept}/spec")
def get_dept_spec(dept: str) -> Response:
    _validate(dept=dept)
    body = _read_md(DEPT_ROOT / dept / "business-layer" / "INSUR_DEPT_SPEC.md")
    return Response(content=body, media_type="text/markdown")


@router.get("/depts/{dept}/dashboards/{role}")
def get_role_dashboard(dept: str, role: str) -> Response:
    _validate(dept=dept, role=role)
    body = _read_md(
        DEPT_ROOT / dept / "dashboards-by-role" / role / "INSUR_DASHBOARD.md"
    )
    return Response(content=body, media_type="text/markdown")


@router.get("/depts/{dept}/reports/{role}")
def get_role_reports(dept: str, role: str) -> Response:
    _validate(dept=dept, role=role)
    body = _read_md(
        DEPT_ROOT / dept / "reports-by-role" / role / "INSUR_REPORTS.md"
    )
    return Response(content=body, media_type="text/markdown")


@router.get("/depts/{dept}/pipelines")
def list_pipelines(dept: str) -> dict:
    _validate(dept=dept)
    if not RUNNER.is_file():
        raise HTTPException(status_code=503, detail="runner missing")
    out = subprocess.run(
        [sys.executable, str(RUNNER), "--list"],
        capture_output=True, text=True, timeout=15,
    )
    if out.returncode != 0:
        raise HTTPException(status_code=500, detail="runner --list failed")
    lines = [ln for ln in out.stdout.splitlines() if ln.startswith(f"{dept:22s}")]
    pipelines = []
    for ln in lines:
        parts = ln.split(None, 3)
        if len(parts) >= 4:
            pipelines.append({"id": int(parts[1]), "module": parts[2], "rest": parts[3]})
    return {"dept": dept, "pipelines": pipelines, "count": len(pipelines)}


@router.post("/depts/{dept}/pipelines/{pipeline_id}/run")
def run_pipeline(dept: str, pipeline_id: int, smoke: bool = True) -> dict:
    _validate(dept=dept)
    if not RUNNER.is_file():
        raise HTTPException(status_code=503, detail="runner missing")
    cmd = [sys.executable, str(RUNNER), "--dept", dept, "--pipeline", str(pipeline_id)]
    if smoke:
        cmd.append("--smoke")
    out = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
    return {
        "dept": dept,
        "pipeline_id": pipeline_id,
        "smoke": smoke,
        "status": "ok" if out.returncode == 0 else "fail",
        "returncode": out.returncode,
        "stdout_tail": out.stdout[-2000:],
        "stderr_tail": out.stderr[-2000:],
    }


@router.get("/depts/{dept}/manual_vs_auto")
def get_manual_vs_auto(dept: str) -> Response:
    _validate(dept=dept)
    body = _read_md(DEPT_ROOT / dept / "business-layer" / "INSUR_MANUAL_VS_AUTO_FLOW.md")
    return Response(content=body, media_type="text/markdown")


@router.get("/depts/{dept}/simulation_ui")
def get_simulation_ui(dept: str) -> Response:
    _validate(dept=dept)
    body = _read_md(DEPT_ROOT / dept / "business-layer" / "INSUR_SIMULATION_UI.md")
    return Response(content=body, media_type="text/markdown")


@router.get("/depts/{dept}/system_design")
def get_system_design(dept: str) -> Response:
    _validate(dept=dept)
    body = _read_md(DEPT_ROOT / dept / "business-layer" / "INSUR_SYSTEM_DESIGN.md")
    return Response(content=body, media_type="text/markdown")


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "depts": len(INSURANCE_DEPTS), "roles": len(ROLES)}
