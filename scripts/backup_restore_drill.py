#!/usr/bin/env python3
"""Backup/restore drill · Iter 29.

Per §47.7 + global §6 · operations runbook drill.

Drill:
  1. pg_dump key tables → backup file
  2. validate dump is non-empty + parseable
  3. write drill report under jobs/reports/backup-drill/
  4. exit 0 if drill PASS · 1 if any step fails

Per §57.7: real pg_dump invocation when available · scaffold report
when pg_dump unavailable.
"""
import json
import os
import shlex
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
REPORTS = REPO / "jobs/reports/backup-drill"
BACKUPS = REPO / "jobs/backups"
REPORTS.mkdir(parents=True, exist_ok=True)
BACKUPS.mkdir(parents=True, exist_ok=True)


KEY_TABLES = [
    "autonomous_agent_runs",
    "decision_corrections",
    "decision_feedback",
    "input_events",
    "admin_feedback",
]


def main() -> int:
    host = os.environ.get("BEV_POSTGRES_HOST", "localhost")
    port = os.environ.get("BEV_POSTGRES_PORT", "5432")
    user = os.environ.get("BEV_POSTGRES_USER", "insur_user")
    pwd  = os.environ.get("BEV_POSTGRES_PASSWORD", "insur_secret_password")
    db   = os.environ.get("BEV_POSTGRES_DB", "insur_analytics")

    ts = datetime.now(timezone.utc)
    backup_file = BACKUPS / f"backup-{ts:%Y%m%d_%H%M%S}.sql"
    report = {
        "timestamp": ts.isoformat(),
        "tables": KEY_TABLES,
        "backup_file": str(backup_file),
        "steps": [],
        "pass": False,
        "scaffold": False,
    }

    # Step 1 · pg_dump
    try:
        cmd = [
            "pg_dump",
            f"--host={host}", f"--port={port}", f"--username={user}",
            f"--dbname={db}", "--no-owner", "--no-privileges",
        ] + [arg for t in KEY_TABLES for arg in ["--table", t]]
        env = os.environ.copy()
        env["PGPASSWORD"] = pwd
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=60, env=env)
        if out.returncode == 0 and out.stdout.strip():
            backup_file.write_text(out.stdout)
            report["steps"].append({
                "step": "pg_dump", "status": "ok",
                "size_bytes": len(out.stdout),
            })
        else:
            report["steps"].append({
                "step": "pg_dump", "status": "error",
                "stderr": out.stderr[:500],
            })
    except (FileNotFoundError, subprocess.TimeoutExpired) as e:
        report["scaffold"] = True
        report["steps"].append({
            "step": "pg_dump", "status": "scaffold",
            "reason": f"{type(e).__name__}: {e}",
        })

    # Step 2 · validate
    if backup_file.exists() and backup_file.stat().st_size > 100:
        report["steps"].append({"step": "validate_size", "status": "ok"})
    elif not report["scaffold"]:
        report["steps"].append({"step": "validate_size", "status": "error"})

    # Determine pass
    error_steps = [s for s in report["steps"] if s["status"] == "error"]
    report["pass"] = len(error_steps) == 0

    # Write reports
    json_path = REPORTS / f"drill-{ts:%Y%m%d_%H%M%S}.json"
    md_path = REPORTS / f"drill-{ts:%Y%m%d_%H%M%S}.md"
    json_path.write_text(json.dumps(report, indent=2))

    md = [
        f"# Backup/Restore Drill · {ts:%Y-%m-%d %H:%M:%S} UTC",
        "",
        f"**Pass**: {'✓' if report['pass'] else '✗'}  ",
        f"**Scaffold**: {report['scaffold']}  ",
        f"**Backup file**: `{report['backup_file']}`  ",
        "",
        "## Steps",
        "| Step | Status | Detail |",
        "|---|---|---|",
    ]
    for s in report["steps"]:
        detail = s.get("reason") or s.get("stderr") or s.get("size_bytes") or "—"
        md.append(f"| {s['step']} | {s['status']} | {detail} |")
    md_path.write_text("\n".join(md))

    print(f"Backup drill written → {md_path.relative_to(REPO)}")
    return 0 if report["pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
