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
    "marketing-e2e-flow": {
        "script": "scripts/audit_marketing_e2e_flow.py",
        "report_dir": "jobs/reports/marketing-e2e-audit",
        "report_pattern": "audit-*.log",
        "spec": "§47.6 + §57.7 + §64.13",
        "description": "Full consumer flow · 12 assertions (create + execute + preview + submit + status + DLP gate + anti-replay + metrics)",
    },
    "marketing-advanced": {
        "script": "scripts/audit_marketing_advanced.py",
        "report_dir": "jobs/reports/marketing-advanced-audit",
        "report_pattern": "audit-*.log",
        "spec": "§47.6 + §57.7 + §64.13 + §76 + §82.21",
        "description": "Advanced suite · 8 tests (multi-channel + 5-shape adversarial DLP + concurrency + autonomous AI + RAI fairness + anti-replay + invalid + channel help)",
    },
    "marketing-100-customers": {
        "script": "scripts/audit_marketing_100_customers.py",
        "report_dir": "jobs/reports/marketing-100-customers-audit",
        "report_pattern": "audit-*.log",
        "spec": "§47.6 + §75 + §76 + §82.7",
        "description": "100+ customer scale E2E · 9 assertions (pool · execute · timing · corr_id · metrics · cohort_dist · fairness · cleanup)",
    },
    "schedule-executor": {
        "script": "scripts/audit_schedule_executor.py",
        "report_dir": "jobs/reports/schedule-executor-audit",
        "report_pattern": "audit-*.log",
        "spec": "§41.3 + §47.6 + §70",
        "description": "Schedule cron executor · 12 assertions (monthly math · cadence semantics · EOM sentinel · 0-due no-op · 1-due execute · multi-tenant · state update)",
    },
    "postings-executor": {
        "script": "scripts/audit_postings_executor.py",
        "report_dir": "jobs/reports/postings-executor-audit",
        "report_pattern": "audit-*.log",
        "spec": "§38.3 + §41.3 + §47.6 + §70 + T2.4",
        "description": "Content posting cron */30 · 7 assertions (tenant discovery · 0-due no-op · 1-due publish · draft→published · TTP · quality_score · operation_log · per-platform runs)",
    },
    "multi-cohort-fairness": {
        "script": "scripts/audit_multi_cohort_fairness.py",
        "report_dir": "jobs/reports/multi-cohort-fairness-audit",
        "report_pattern": "audit-*.log",
        "spec": "§76 + T3.2",
        "description": "§76 RAI fairness gate · 9 assertions (DI math sanity · cross-cohort halt · single-cohort baseline · rai_halt action present in decisions chain · cleanup)",
    },
    "attribution-math": {
        "script": "scripts/audit_attribution_math.py",
        "report_dir": "jobs/reports/attribution-math-audit",
        "report_pattern": "audit-*.log",
        "spec": "§75 + T5.9",
        "description": "Multi-touch attribution math · 15 assertions (5 model invariants · revenue conservation · compare returns 5 · cohort sum)",
    },
    "presidio-adoption": {
        "script": "scripts/audit_presidio_adoption.py",
        "report_dir": "jobs/reports/presidio-adoption-audit",
        "report_pattern": "audit-*.log",
        "spec": "§56 + §82.21 + T6.10",
        "description": "Presidio Stage-1 adapter · 8 assertions (status ready · 12-entity coverage · SSN/CC/email detection · multi-entity · clean text negative)",
    },
    "confidence-routing": {
        "script": "scripts/audit_confidence_routing.py",
        "report_dir": "jobs/reports/confidence-routing-audit",
        "report_pattern": "audit-*.log",
        "spec": "§57.7 + §80 + T7.9",
        "description": "Confidence-score routing · 10 assertions (4 threshold tiers · sparse=low · single-cohort=high · live agent run produces confidence+routing fields)",
    },
    "decision-corrections": {
        "script": "scripts/audit_corrections.py",
        "report_dir": "jobs/reports/decision-corrections-audit",
        "report_pattern": "audit-*.log",
        "spec": "§38.3 + T7.10 + Tier 7 gate #5",
        "description": "RLHF correction DB · 11 assertions (schema · 3 severity tiers · invalid severity rejected · round-trip · filter · stats)",
    },
    "self-healing": {
        "script": "scripts/audit_self_healing.py",
        "report_dir": "jobs/reports/self-healing-audit",
        "report_pattern": "audit-*.log",
        "spec": "§57.7 + §40 + T7.13",
        "description": "Self-Healing AI fallback chain · 10 assertions (chain construction · single + multi-provider · all-fail honest · latency tracking · default 3-provider chain)",
    },
    "dept-submenu-deeplinks": {
        "script": "scripts/audit_dept_submenu_deeplinks.py",
        "report_dir": "jobs/reports/dept-submenu-deeplinks-audit",
        "report_pattern": "audit-*.log",
        "spec": "§73 + PATH_E P1",
        "description": "Dept sub-menu deep-link integrity · 11 assertions (catalog parse · 22 depts traversable · URL-safe IDs · unique IDs · all processes resolvable)",
    },
    "decision-feedback": {
        "script": "scripts/audit_feedback.py",
        "report_dir": "jobs/reports/decision-feedback-audit",
        "report_pattern": "audit-*.log",
        "spec": "§38.3 + Tier 7 gate #4",
        "description": "Decision feedback · 11 assertions (schema · explicit good/bad/correct · implicit accepted · invalid kind/value rejected · filter · stats)",
    },
    "pipeline-modes": {
        "script": "scripts/audit_pipeline_modes.py",
        "report_dir": "jobs/reports/pipeline-modes-audit",
        "report_pattern": "audit-*.log",
        "spec": "§93 (process-component-ipo-pattern)",
        "description": "Pipeline manual + automatic modes · 11 assertions (4 components · 4 IPO+V sub-sections · load/split/select/train state · 10 automatic phases · overall_quality_score = mean)",
    },
    "use-cases": {
        "script": "scripts/audit_use_cases.py",
        "report_dir": "jobs/reports/use-cases-audit",
        "report_pattern": "audit-*.log",
        "spec": "§94 (process-use-case-mandatory-structure)",
        "description": "Use Case 17-section structure · 11 assertions (5 parts · 4 impact axes · scored AI options · SWOT · first principles · 4P · Six Sigma · KPI/ROI/value realization · completeness score 0-17)",
    },
}

AuditKind = Literal["recommender-flavors", "dept-artifacts", "folder-readmes", "voice-ai-artifacts", "section-92-compliance", "marketing-campaigns-artifacts", "marketing-e2e-flow", "marketing-advanced", "marketing-100-customers", "schedule-executor", "postings-executor", "multi-cohort-fairness", "attribution-math", "presidio-adoption", "confidence-routing", "decision-corrections", "self-healing", "dept-submenu-deeplinks", "decision-feedback", "pipeline-modes", "use-cases"]


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
