"""/api/v1/insur/audit/* — surface audit reports for /admin/audit dashboard.

Per audit triad in scripts/audit_*.py (cron-installed weekly).
Reports land in jobs/reports/recommender-audit/ + jobs/reports/folder-readme-audit/.

Endpoints:
- GET /api/v1/insur/audit/list                   list all audit kinds + last run
- GET /api/v1/insur/audit/{kind}/latest          latest report for kind
- GET /api/v1/insur/audit/{kind}/history?n=10    last N reports
- POST /api/v1/insur/audit/{kind}/run            trigger immediate run

Read-only per §68.3 invariant.
"""
from __future__ import annotations

import logging
import re
import subprocess
import sys
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/insur/audit", tags=["audit"])

REPO = Path(__file__).resolve().parent.parent.parent

AUDITS = {
    "recommender-flavors": {
        "script": "scripts/audit_recommender_flavors.py",
        "report_dir": "jobs/reports/recommender-audit",
        "report_pattern": "audit-*.log",
        "spec": "§64.22",
        "description": "21 canonical depts · per-dept HOLY_RECOMMENDATION.md flavor coverage",
    },
    "dept-artifacts": {
        "script": "scripts/audit_dept_artifacts.py",
        "report_dir": "jobs/reports/recommender-audit",
        "report_pattern": "dept-artifacts-*.log",
        "spec": "§64.29",
        "description": "21 depts × 15 mandatory HOLY_*.md = 315 cells",
    },
    "folder-readmes": {
        "script": "scripts/audit_folder_readmes.py",
        "report_dir": "jobs/reports/folder-readme-audit",
        "report_pattern": "audit-*.log",
        "spec": "§58 + §63",
        "description": "50 ai-agents/ tools × 4 invariants (README · DEEP_DIVE · install.sh · §-refs)",
    },
    "voice-ai-artifacts": {
        "script": "scripts/audit_voice_ai_artifacts.py",
        "report_dir": "jobs/reports/voice-ai-audit",
        "report_pattern": "audit-*.log",
        "spec": "§90 L15 + §92",
        "description": "Voice AI E2E: 7 backend modules + migration + 3 frontends + DEMO_STORY w/ 14 sections (12 cells)",
    },
    "section-92-compliance": {
        "script": "scripts/audit_section_92_compliance.py",
        "report_dir": "jobs/reports/section-92-audit",
        "report_pattern": "audit-*.log",
        "spec": "§92",
        "description": "ai-agents/ mandatory · 19 paths checked (tree + scripts + CI + API surface)",
    },
    "marketing-campaigns-artifacts": {
        "script": "scripts/audit_marketing_campaigns_artifacts.py",
        "report_dir": "jobs/reports/marketing-campaigns-audit",
        "report_pattern": "audit-*.log",
        "spec": "§64.13 + §90 L13/L14",
        "description": "4 channels (email/banner/survey/form) · 16 checks (modules + migration + frontend + seeds + public endpoints)",
    },
}

AuditKind = Literal["recommender-flavors", "dept-artifacts", "folder-readmes", "voice-ai-artifacts", "section-92-compliance", "marketing-campaigns-artifacts"]


@router.get("/list")
def list_audits():
    """List all audit kinds + their latest run."""
    out = []
    for kind, cfg in AUDITS.items():
        report_dir = REPO / cfg["report_dir"]
        latest_file = None
        latest_mtime = 0.0
        if report_dir.exists():
            for f in report_dir.glob(cfg["report_pattern"]):
                if f.stat().st_mtime > latest_mtime:
                    latest_mtime = f.stat().st_mtime
                    latest_file = f
        out.append({
            "kind": kind,
            "spec": cfg["spec"],
            "description": cfg["description"],
            "script": cfg["script"],
            "latest_report": str(latest_file.relative_to(REPO)) if latest_file else None,
            "latest_run_at": latest_mtime if latest_mtime > 0 else None,
        })
    return {"audits": out, "count": len(out)}


@router.get("/{kind}/latest")
def latest(kind: AuditKind):
    """Return latest audit report for a given kind."""
    if kind not in AUDITS:
        raise HTTPException(404, {"detail": f"unknown audit kind: {kind}",
                                  "error_code": "UNKNOWN_AUDIT"})
    cfg = AUDITS[kind]
    report_dir = REPO / cfg["report_dir"]
    if not report_dir.exists():
        return {"kind": kind, "report": None, "note": "no runs yet"}

    files = sorted(report_dir.glob(cfg["report_pattern"]),
                   key=lambda f: f.stat().st_mtime, reverse=True)
    if not files:
        return {"kind": kind, "report": None, "note": "no runs yet"}

    latest_file = files[0]
    content = latest_file.read_text(errors="replace")[:50000]  # cap at 50 KB
    return {
        "kind": kind,
        "spec": cfg["spec"],
        "report_path": str(latest_file.relative_to(REPO)),
        "run_at": latest_file.stat().st_mtime,
        "content": content,
        "size_bytes": latest_file.stat().st_size,
    }


@router.get("/{kind}/history")
def history(kind: AuditKind, n: int = 10):
    """Last N reports for a kind, newest first."""
    if kind not in AUDITS:
        raise HTTPException(404, {"detail": f"unknown audit kind: {kind}"})
    cfg = AUDITS[kind]
    report_dir = REPO / cfg["report_dir"]
    if not report_dir.exists():
        return {"kind": kind, "history": []}
    files = sorted(report_dir.glob(cfg["report_pattern"]),
                   key=lambda f: f.stat().st_mtime, reverse=True)[:n]
    return {
        "kind": kind,
        "spec": cfg["spec"],
        "history": [
            {
                "path": str(f.relative_to(REPO)),
                "run_at": f.stat().st_mtime,
                "size_bytes": f.stat().st_size,
            }
            for f in files
        ],
    }


@router.post("/{kind}/run")
def run_audit(kind: AuditKind):
    """Trigger immediate run of an audit (synchronous · capped at 60s)."""
    if kind not in AUDITS:
        raise HTTPException(404, {"detail": f"unknown audit kind: {kind}"})
    cfg = AUDITS[kind]
    script_path = REPO / cfg["script"]
    if not script_path.exists():
        raise HTTPException(500, {"detail": f"audit script missing: {cfg['script']}"})
    try:
        # Use the current Python interpreter (or PY env override)
        result = subprocess.run(
            [sys.executable, str(script_path)],
            capture_output=True, text=True, timeout=60, cwd=str(REPO),
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(504, {"detail": "audit timed out (>60s)"})
    return {
        "kind": kind,
        "exit_code": result.returncode,
        "passed": result.returncode == 0,
        "stdout": result.stdout[:50000],
        "stderr": result.stderr[:10000],
    }
