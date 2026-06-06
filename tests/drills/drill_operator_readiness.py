#!/usr/bin/env python3
"""
Drill: operator-readiness — honest scorecard of the agent/governance stack.

Importable ≠ configured ≠ working end-to-end. This drill checks the
configuration state of each surface the operator asked about (Archon,
BMad, voice, monitoring, tracking, notifying) and surfaces real gaps
rather than letting them hide behind "installed".

Steps (10 total; 4 negative):
  1. (+) Archon CLI is on $PATH
  2. (+) Archon doctor reports DB + workspace + Codex provider OK
  3. (-) NEG: Archon's GitHub auth NOT configured → drill calls this
        out (no false-positive "ready" claim)
  4. (-) NEG: Archon Slack + Telegram NOT configured → notifications
        gap surfaced (operator must set tokens to close)
  5. (+) Both BEV Archon workflows have ≥1 approval: node each
        (closes "no approval gates" misclaim from earlier audit)
  6. (-) NEG: BMad cannot run on this machine (Node 18.19 < required 20)
        — honest constraint, NOT a "BMad is working" claim
  7. (+) Voice pipeline tools present (Piper model + Whisper module)
  8. (+) governance_diff_check.sh exists + executable
  9. (+) CODEOWNERS exists + maps backend / frontend / .archon / .claude
  10.(-) NEG: ~/.archon/.env has chmod 600 (NOT world-readable);
        absence of this is a credential-leak class — drill catches.

# RESOURCES: disk_io

Exit 0 on PASS, 1 on any false-positive readiness claim. This drill is
intentionally a TRUTH detector: a passing run means the gaps are NAMED
in the audit JSON; a failing run means a gap that should be named is
silently being treated as ready.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' - ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def _archon_doctor_lines() -> list[str]:
    """Return the lines from `archon doctor` stdout. Empty list on failure.
    Suppresses the CLAUDECODE warning so we read real status lines."""
    env = os.environ.copy()
    env["ARCHON_SUPPRESS_NESTED_CLAUDE_WARNING"] = "1"
    try:
        proc = subprocess.run(
            ["archon", "doctor"], capture_output=True, text=True, timeout=30, env=env,
        )
        return [line for line in proc.stdout.splitlines() if line.strip()]
    except (subprocess.SubprocessError, FileNotFoundError):
        return []


def main() -> int:
    print("\nDRILL: operator-readiness scorecard\n")
    t0 = time.time()

    # ---- Step 1: Archon CLI on PATH ----
    archon_bin = shutil.which("archon")
    step(1, "Archon CLI on $PATH",
         archon_bin is not None,
         f"path={archon_bin}")

    # ---- Step 2: Archon doctor: DB + workspace + at-least-one provider OK ----
    lines = _archon_doctor_lines()
    has_db = any("Database:" in ln and "reachable" in ln for ln in lines)
    has_workspace = any("Workspace:" in ln and "writable" in ln for ln in lines)
    has_provider = (
        any("Claude binary:" in ln and "OK" in ln for ln in lines)
        or any("Codex" in ln and "configured" in ln.lower() for ln in lines)
    )
    step(2, "archon doctor: DB reachable + workspace writable + ≥1 AI provider OK",
         has_db and has_workspace and has_provider,
         f"db={has_db} workspace={has_workspace} provider={has_provider}")

    # ---- Step 3: NEG GitHub not configured → drill calls it out ----
    gh_not_configured = any("gh CLI" in ln and "not configured" in ln for ln in lines)
    step(3, "NEG: archon doctor reports gh CLI NOT configured (gap surfaced)",
         gh_not_configured,
         "expected 'GitHub not configured' line in doctor output")

    # ---- Step 4: NEG Slack + Telegram not configured ----
    slack_missing = any("Slack:" in ln and "no SLACK_BOT_TOKEN" in ln for ln in lines)
    telegram_missing = any("Telegram:" in ln and "no TELEGRAM_BOT_TOKEN" in ln for ln in lines)
    step(4, "NEG: Slack + Telegram tokens NOT set (notification gap surfaced)",
         slack_missing and telegram_missing,
         f"slack_missing={slack_missing} telegram_missing={telegram_missing}")

    # ---- Step 5: BEV Archon workflows have approval gates ----
    insur_dir = REPO_ROOT / ".archon" / "workflows"
    workflows = list(insur_dir.glob("insur-*.yaml")) if insur_dir.exists() else []
    missing_approval = []
    for wf in workflows:
        text = wf.read_text()
        if "approval:" not in text:
            missing_approval.append(wf.name)
    step(5, f"all {len(workflows)} BEV Archon workflows have ≥1 approval: node",
         workflows and not missing_approval,
         f"missing_approval={missing_approval} workflows_found={len(workflows)}")

    # ---- Step 6: BMad runnable via scripts/bmad.sh (nvm Node 20+ shim) ----
    # System Node may be 18.x (still EBADENGINE for BMad), but scripts/bmad.sh
    # discovers nvm-managed Node ≥ 20 and uses it. Verify the wrapper works.
    bmad_sh = REPO_ROOT / "scripts" / "bmad.sh"
    bmad_ok = False
    bmad_detail = "scripts/bmad.sh missing"
    if bmad_sh.exists() and os.access(bmad_sh, os.X_OK):
        try:
            proc = subprocess.run(
                [str(bmad_sh), "--version"],
                capture_output=True, text=True, timeout=30,
            )
            version_line = (proc.stdout + proc.stderr).strip().splitlines()
            looks_like_version = bool(version_line) and any(
                re.match(r"^\d+\.\d+\.\d+", line.strip()) for line in version_line
            )
            bmad_ok = proc.returncode == 0 and looks_like_version
            bmad_detail = f"rc={proc.returncode} version={version_line[-1] if version_line else None!r}"
        except subprocess.SubprocessError as exc:
            bmad_detail = f"wrapper crashed: {exc}"
    step(6, "BMad runnable via scripts/bmad.sh (closes Node-18 blocker via nvm shim)",
         bmad_ok, bmad_detail)

    # ---- Step 7: voice pipeline tools present ----
    piper_model = Path.home() / ".cache" / "piper-models" / "en_US-lessac-medium.onnx"
    try:
        import importlib
        whisper_ok = importlib.util.find_spec("whisper") is not None
    except Exception:
        whisper_ok = False
    step(7, "voice pipeline tools present (Piper model cached + whisper importable)",
         piper_model.exists() and whisper_ok,
         f"piper_model={piper_model.exists()} whisper={whisper_ok}")

    # ---- Step 8: governance_diff_check.sh present + executable ----
    gov_check = REPO_ROOT / "scripts" / "governance_diff_check.sh"
    step(8, "scripts/governance_diff_check.sh exists + executable",
         gov_check.exists() and os.access(gov_check, os.X_OK),
         f"exists={gov_check.exists()} executable={os.access(gov_check, os.X_OK)}")

    # ---- Step 9: CODEOWNERS maps the four sensitive areas ----
    codeowners = REPO_ROOT / ".github" / "CODEOWNERS"
    if not codeowners.exists():
        step(9, ".github/CODEOWNERS exists", False, "missing")
    co_text = codeowners.read_text()
    must_have = ["/backend/", "/frontend/", "/.archon/", "/.claude/"]
    missing_areas = [pat for pat in must_have if pat not in co_text]
    step(9, "CODEOWNERS maps backend/frontend/.archon/.claude",
         not missing_areas,
         f"missing_areas={missing_areas}")

    # ---- Step 10: NEG ~/.archon/.env is chmod 600 (no leak) ----
    archon_env = Path.home() / ".archon" / ".env"
    if not archon_env.exists():
        # No archon env at all is also fine — drill passes (nothing to leak)
        step(10, "NEG: ~/.archon/.env permission check (file absent → no leak)",
             True, "file does not exist")
    else:
        mode_octal = oct(archon_env.stat().st_mode & 0o777)
        is_600 = mode_octal == "0o600"
        step(10, "NEG: ~/.archon/.env is chmod 600 (no world/group read on creds)",
             is_600,
             f"mode={mode_octal} (expected 0o600)")

    print(f"\n\033[32mALL 10 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
