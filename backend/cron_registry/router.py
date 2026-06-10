"""/api/v1/cron-registry · Iter 36 · scheduled job inventory."""
from __future__ import annotations

import subprocess
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/cron-registry", tags=["cron-registry"])


def _crontab_lines() -> list[str]:
    """Best-effort read of operator's crontab."""
    try:
        out = subprocess.run(
            ["crontab", "-l"],
            capture_output=True, text=True, timeout=5,
        )
        if out.returncode == 0:
            return [l for l in out.stdout.splitlines() if l.strip() and not l.startswith("#")]
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    return []


def _parse_line(line: str) -> dict[str, Any] | None:
    """Parse a crontab line into schedule + command + tag."""
    parts = line.split()
    if len(parts) < 6:
        return None
    schedule = " ".join(parts[:5])
    rest = " ".join(parts[5:])
    # Extract # tag if present
    tag = None
    if " # " in rest:
        cmd, _, tail = rest.partition(" # ")
        rest = cmd.strip()
        tag = tail.strip()
    # Extract identifier (script name) heuristically
    identifier = None
    for token in rest.split():
        if token.endswith(".py") or token.endswith(".sh"):
            identifier = token.split("/")[-1]
            break
    return {
        "schedule": schedule,
        "command_preview": rest[:140] + ("…" if len(rest) > 140 else ""),
        "identifier": identifier,
        "tag": tag,
    }


@router.get("/health")
def health():
    return {
        "status": "ok",
        "module": "cron-registry",
        "scanner": "crontab -l",
    }


@router.get("")
def list_crons():
    lines = _crontab_lines()
    rows = []
    for line in lines:
        parsed = _parse_line(line)
        if parsed:
            rows.append(parsed)
    # Filter to insur-tagged jobs first · others below
    insur_jobs = [r for r in rows if (r.get("tag") or "").startswith("INSUR-")]
    other_jobs = [r for r in rows if not (r.get("tag") or "").startswith("INSUR-")]
    return {
        "insur_jobs": insur_jobs,
        "other_jobs": other_jobs,
        "n_insur": len(insur_jobs),
        "n_other": len(other_jobs),
        "n_total": len(rows),
        "scanned_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/by-tag")
def by_tag():
    lines = _crontab_lines()
    by_tag: dict[str, int] = {}
    for line in lines:
        parsed = _parse_line(line)
        if parsed and parsed.get("tag"):
            by_tag[parsed["tag"]] = by_tag.get(parsed["tag"], 0) + 1
    return {"by_tag": dict(sorted(by_tag.items())), "n_tags": len(by_tag)}
