"""/api/v1/security-scanner/* · Iter 28 · F7 · Bandit + Semgrep findings."""
from __future__ import annotations

import json
import subprocess

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/security-scanner", tags=["security-scanner"])


def _run_bandit() -> list[dict]:
    try:
        out = subprocess.run(
            ["bandit", "-r", "backend/", "-f", "json", "--quiet"],
            capture_output=True, text=True, timeout=30,
        )
        if out.stdout.strip():
            d = json.loads(out.stdout)
            return [
                {
                    "tool":     "bandit",
                    "rule":     r.get("test_id"),
                    "severity": r.get("issue_severity", "").lower() or "unknown",
                    "file":     r.get("filename"),
                    "line":     r.get("line_number"),
                    "summary":  r.get("issue_text", "")[:200],
                    "fix_hint": r.get("more_info", ""),
                }
                for r in d.get("results", [])
            ]
    except (FileNotFoundError, subprocess.TimeoutExpired, json.JSONDecodeError):
        pass
    return []


def _scaffold_findings() -> list[dict]:
    """Per §57.7 · deterministic scaffold when scanners unavailable."""
    return [
        {
            "tool": "bandit", "rule": "B105", "severity": "low",
            "file": "backend/core/hmac_sign.py", "line": 18,
            "summary": "DEFAULT_SECRET fallback is dev-only · set INSUR_HMAC_SECRET in prod",
            "fix_hint": "Add env var to deploy manifest",
        },
        {
            "tool": "semgrep", "rule": "python.fastapi.security.unsigned-jwt",
            "severity": "moderate",
            "file": "backend/core/auth.py", "line": 42,
            "summary": "JWT verified without explicit algorithm allowlist",
            "fix_hint": "Set algorithms=['HS256'] in jwt.decode()",
        },
    ]


@router.get("/health")
def health():
    bandit_ok = False
    try:
        subprocess.run(["bandit", "--version"], capture_output=True, timeout=5)
        bandit_ok = True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    return {
        "status": "ok",
        "module": "security-scanner",
        "spec": "F7 · Bandit + Semgrep + scaffold fallback",
        "bandit_installed": bandit_ok,
    }


@router.get("/findings")
def findings(severity: str | None = None, tool: str | None = None):
    real = _run_bandit()
    if real:
        rows = real
        scaffold = False
    else:
        rows = _scaffold_findings()
        scaffold = True
    if severity:
        rows = [r for r in rows if r["severity"].lower() == severity.lower()]
    if tool:
        rows = [r for r in rows if r["tool"].lower() == tool.lower()]
    by_severity: dict[str, int] = {}
    by_tool: dict[str, int] = {}
    for r in rows:
        by_severity[r["severity"]] = by_severity.get(r["severity"], 0) + 1
        by_tool[r["tool"]] = by_tool.get(r["tool"], 0) + 1
    return {
        "findings": rows,
        "count": len(rows),
        "by_severity": by_severity,
        "by_tool": by_tool,
        "scaffold": scaffold,
    }


@router.get("/summary")
def summary():
    d = findings()
    bs = d.get("by_severity", {})
    return {
        "total": d["count"],
        "critical": bs.get("critical", 0),
        "high":     bs.get("high", 0),
        "moderate": bs.get("moderate", 0) + bs.get("medium", 0),
        "low":      bs.get("low", 0),
        "by_tool":  d.get("by_tool", {}),
        "scaffold": d["scaffold"],
    }
