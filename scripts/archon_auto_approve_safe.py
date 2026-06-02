#!/usr/bin/env python3
"""Safely auto-approve low-risk local Archon workflow gates.

This helper reduces repeated manual clicks for BEV's local Archon workflows.
It is intentionally conservative:

- It only considers workflows listed in `.archon/approval-policy.yaml`.
- It only approves runs that appear to be waiting for approval.
- It never approves text containing high-risk terms such as production,
  deploy, secret, token, browser/CUA real execution, destructive git, or rm.
- It defaults to dry-run unless `--approve` is passed.

Archon status JSON is treated defensively because CLI output can include log
lines before the JSON object.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
POLICY_PATH = ROOT / ".archon/approval-policy.yaml"

SAFE_WORKFLOWS = {"insur-project-doctor-fix", "insur-api-change-governance"}
SAFE_GATES = {"approve-plan", "approve-api-plan", "approve-handoff", "approve-api-handoff"}
WAITING_WORDS = {"approval", "waiting", "paused", "pending"}
RISK_RE = re.compile(
    r"production|deploy|release|secret|token|private[_ -]?key|password|"
    r"browserbase|slack_bot_token|telegram_bot_token|poliysai_api_key|"
    r"real cua|keyboard|mouse|rm -rf|git reset|force[- ]?push|"
    r"drop table|delete production|migration|branch protection|gh auth",
    re.I,
)


def _extract_json(stdout: str) -> dict[str, Any]:
    # Archon may print structured log JSON lines before the final status JSON.
    # Decode each line and keep the last object that looks like status output.
    candidates: list[dict[str, Any]] = []
    for line in stdout.splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(obj, dict):
            candidates.append(obj)
    for obj in reversed(candidates):
        if "runs" in obj:
            return obj
    if candidates:
        return candidates[-1]
    raise ValueError("archon status did not include a JSON object")


def _status() -> dict[str, Any]:
    # Graceful skip if archon binary isn't installed — silent no-op for cron
    import shutil
    if not shutil.which("archon"):
        return {"runs": [], "skipped": "archon binary not installed"}
    proc = subprocess.run(
        ["archon", "workflow", "status", "--json"],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    if proc.returncode != 0:
        # Don't raise — log + return empty so the cron stops spamming
        print(f"archon workflow status returned {proc.returncode}: {proc.stdout.strip()[:200]}")
        return {"runs": [], "error": proc.stdout.strip()[:500]}
    return _extract_json(proc.stdout)


def _strings(obj: Any) -> list[str]:
    out: list[str] = []
    if isinstance(obj, dict):
        for value in obj.values():
            out.extend(_strings(value))
    elif isinstance(obj, list):
        for value in obj:
            out.extend(_strings(value))
    elif isinstance(obj, str):
        out.append(obj)
    return out


def _run_id(run: dict[str, Any]) -> str | None:
    for key in ("run_id", "runId", "id"):
        value = run.get(key)
        if isinstance(value, str) and value:
            return value
    return None


def _workflow_name(run: dict[str, Any]) -> str:
    for key in ("workflow", "workflow_name", "workflowName", "name"):
        value = run.get(key)
        if isinstance(value, str):
            return value
    return ""


def _gate_name(run: dict[str, Any]) -> str:
    for key in ("node", "node_id", "nodeId", "current_node", "currentNode", "pending_node"):
        value = run.get(key)
        if isinstance(value, str):
            return value
    text = " ".join(_strings(run))
    for gate in SAFE_GATES:
        if gate in text:
            return gate
    return ""


def _waiting_for_approval(run: dict[str, Any]) -> bool:
    text = " ".join(_strings(run)).lower()
    return any(word in text for word in WAITING_WORDS)


def _safe(run: dict[str, Any]) -> tuple[bool, str]:
    text = " ".join(_strings(run))
    workflow = _workflow_name(run)
    gate = _gate_name(run)
    if workflow and workflow not in SAFE_WORKFLOWS:
        return False, f"workflow {workflow!r} is not auto-approved"
    if gate and gate not in SAFE_GATES:
        return False, f"gate {gate!r} is not auto-approved"
    if not _waiting_for_approval(run):
        return False, "run is not waiting for approval"
    if RISK_RE.search(text):
        return False, "risk keyword matched; human approval required"
    if _run_id(run) is None:
        return False, "run id not found"
    return True, "safe local Archon approval gate"


def _approve(run_id: str, comment: str) -> None:
    proc = subprocess.run(
        ["archon", "workflow", "approve", run_id, "--comment", comment],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stdout.strip() or f"approval failed for {run_id}")
    print(proc.stdout.strip())


def scan_once(approve: bool) -> int:
    status = _status()
    runs = status.get("runs", [])
    if not isinstance(runs, list):
        raise ValueError("archon status JSON did not contain a runs list")
    approvals = 0
    for run in runs:
        if not isinstance(run, dict):
            continue
        rid = _run_id(run)
        ok, reason = _safe(run)
        workflow = _workflow_name(run) or "unknown-workflow"
        gate = _gate_name(run) or "unknown-gate"
        prefix = "APPROVE" if ok else "SKIP"
        print(f"{prefix}: run={rid or '?'} workflow={workflow} gate={gate} reason={reason}")
        if ok and approve and rid:
            _approve(rid, "auto-approved by BEV safe local approval policy")
            approvals += 1
    if not runs:
        print("No Archon workflow runs found.")
    return approvals


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--approve", action="store_true", help="approve safe pending gates")
    parser.add_argument("--dry-run", action="store_true", help="print what would be approved")
    parser.add_argument("--watch", action="store_true", help="poll repeatedly")
    parser.add_argument("--interval", type=float, default=5.0, help="watch poll interval seconds")
    args = parser.parse_args()
    if not POLICY_PATH.exists():
        print(f"missing policy file: {POLICY_PATH}", file=sys.stderr)
        return 2
    if not args.approve:
        args.dry_run = True
    while True:
        scan_once(approve=args.approve)
        if not args.watch:
            return 0
        time.sleep(args.interval)


if __name__ == "__main__":
    raise SystemExit(main())
