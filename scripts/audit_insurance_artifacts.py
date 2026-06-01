#!/usr/bin/env python3
"""
Insurance dept artifact audit — per global §70/§71.

Runs twice daily via cron (09:00 + 21:00). Output written to:
  - jobs/reports/insurance_audit_summary_<TS>.md (human-readable)
  - jobs/reports/insurance_audit_summary_latest.md (symlink to most recent)
  - jobs/logs/insurance_audit_<TS>.log (raw output)

Exits 0 if all checks green, 1 otherwise.
"""
from __future__ import annotations
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DEPT_ROOT = REPO / "global-ai-org" / "departments"
REPORTS_DIR = REPO / "jobs" / "reports"
LOGS_DIR = REPO / "jobs" / "logs"

INSURANCE_DEPTS = ["claims", "underwriting", "customer-service", "fraud-siu"]
REQUIRED_BL_FILES = [
    "INSUR_DEPT_SPEC.md", "INSUR_DEMO_STORY.md", "INSUR_ASIS_ASSESSMENT.md",
    "INSUR_DT_STRATEGY.md", "INSUR_PROCESS_FLOW.md", "INSUR_ARCHITECTURE_FLOW.md",
    "INSUR_BUSINESS_MODELS.md", "INSUR_DATA_MGMT.md", "INSUR_USE_CASES.md",
    "INSUR_INCIDENT_MGMT.md", "INSUR_AI_AGENTS.md", "INSUR_KPIS.md",
]


def audit_dept(slug: str) -> dict:
    dept_root = DEPT_ROOT / slug
    bl = dept_root / "business-layer"
    docs = dept_root / "docs"

    if not dept_root.is_dir():
        return {"slug": slug, "status": "missing", "issues": ["dept dir missing"]}

    issues = []
    for f in ("README.md", "GLOBAL_README.md"):
        if not (dept_root / f).is_file():
            issues.append(f"missing {f}")

    for f in REQUIRED_BL_FILES:
        p = bl / f
        if not p.is_file():
            issues.append(f"missing business-layer/{f}")
        elif p.stat().st_size < 200:
            issues.append(f"tiny (<200B) business-layer/{f}")

    for sub, fname in [("brd", "INSUR_BRD.md"), ("frd", "INSUR_FRD.md")]:
        if not (docs / sub / fname).is_file():
            issues.append(f"missing docs/{sub}/{fname}")

    return {
        "slug": slug,
        "status": "ok" if not issues else "fail",
        "issues": issues,
        "file_count": sum(1 for _ in dept_root.rglob("INSUR_*.md")),
    }


def audit_data() -> dict:
    manifest_path = REPO / "data" / "insurance" / "_manifest.json"
    if not manifest_path.is_file():
        return {"status": "fail", "reason": "manifest missing"}
    m = json.loads(manifest_path.read_text())
    statuses = [d["status"] for d in m["downloads"]]
    return {
        "status": "ok" if statuses.count("ok") > 0 else "fail",
        "ok": statuses.count("ok"),
        "fail": statuses.count("fail"),
        "skipped": statuses.count("skipped"),
        "total": len(statuses),
    }


def main() -> int:
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    LOGS_DIR.mkdir(parents=True, exist_ok=True)

    dept_results = [audit_dept(d) for d in INSURANCE_DEPTS]
    data_result = audit_data()

    n_dept_ok = sum(1 for r in dept_results if r["status"] == "ok")
    n_dept_total = len(dept_results)
    overall_ok = n_dept_ok == n_dept_total and data_result["status"] == "ok"

    lines = [
        f"# Insurance Audit Summary",
        f"",
        f"Generated: {datetime.now(timezone.utc).isoformat()}",
        f"Overall: {'PASS' if overall_ok else 'FAIL'}",
        f"",
        f"## Dept Artifacts",
        f"",
        f"| Dept | Status | INSUR_*.md count | Issues |",
        f"|---|---|---|---|",
    ]
    for r in dept_results:
        issues_str = "—" if not r["issues"] else f"{len(r['issues'])} ({'; '.join(r['issues'][:3])}{'...' if len(r['issues']) > 3 else ''})"
        lines.append(f"| {r['slug']} | {r['status']} | {r['file_count']} | {issues_str} |")

    lines += [
        f"",
        f"## Data Downloads",
        f"",
        f"- ok: {data_result.get('ok', 0)}",
        f"- skipped: {data_result.get('skipped', 0)}",
        f"- failed: {data_result.get('fail', 0)}",
        f"- total: {data_result.get('total', 0)}",
        f"",
    ]

    report = "\n".join(lines)
    out = REPORTS_DIR / f"insurance_audit_summary_{ts}.md"
    out.write_text(report)
    latest = REPORTS_DIR / "insurance_audit_summary_latest.md"
    if latest.exists() or latest.is_symlink():
        latest.unlink()
    latest.symlink_to(out.name)

    log = LOGS_DIR / f"insurance_audit_{ts}.log"
    log.write_text(report)

    print(report)
    print(f"\nReport: {out}")
    return 0 if overall_ok else 1


if __name__ == "__main__":
    sys.exit(main())
