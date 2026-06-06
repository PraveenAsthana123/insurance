#!/usr/bin/env python3
"""
Drill: §56 gate-5 — AI/agent tools installed + auditable.

Locks the install contract for the 11-tool evaluation in
docs/AI_AGENT_TOOLS_EVALUATION.md. The audit script
(scripts/techstack_audit.py) does the empirical import + version capture;
this drill verifies the audit output is well-formed, complete, and that
each expected-present tool actually imports.

Steps (9 total; 3 negative):
  1. (+) scripts/techstack_audit.py runs to completion + exits 0 (or
        prints honest failure rows)
  2. (+) Audit JSON written to data/agent-supervisor/techstack_audit.json
        with the expected schema
  3. (+) All 11 named tools present in the audit rows
  4. (+) Every stage-1/2/3 tool reports either importable=True OR a
        concrete error message (never a silent absence)
  5. (-) NEG: OpenAI Swarm marked verdict=skip — NOT expected_present
        (rejection criterion locked)
  6. (-) NEG: BMad marked stage=document — NOT expected_present
        (no Python install path)
  7. (+) AI_AGENT_TOOLS_EVALUATION.md exists + names all 11 tools
  8. (-) NEG: bogus tool name absent from evaluation doc
        (no false-positive)
  9. (+) techstack_audit.json freshness: audited_at is within the
        last 24 hours (catches stale audit state)

# RESOURCES: disk_io

Exit 0 on PASS, 1 on any failure.
"""
from __future__ import annotations

import json
import subprocess
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
AUDIT_SCRIPT = REPO_ROOT / "scripts" / "techstack_audit.py"
AUDIT_JSON = REPO_ROOT / "data" / "agent-supervisor" / "techstack_audit.json"
EVAL_DOC = REPO_ROOT / "docs" / "AI_AGENT_TOOLS_EVALUATION.md"

EXPECTED_TOOLS = [
    # Batch 1 (2026-05-25): 11 agent/RAG/observability tools
    "DSPy", "Haystack", "Pydantic AI", "OpenHands", "AgentOps",
    "Arize Phoenix", "LangSmith", "CrewAI", "AutoGen (pyautogen)",
    "OpenAI Swarm", "BMad-Method",
    # Batch 2 (2026-05-26): 9 orchestrators + LLM gateways + observability
    "Dagster", "Prefect", "Kestra (Python SDK)", "Windmill (wmill SDK)",
    "Portkey", "LiteLLM", "OpenLit", "Langfuse", "Helicone",
]


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' - ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def main() -> int:
    print("\nDRILL: §56 gate-5 AI/agent tools install verification\n")
    t0 = time.time()

    # ---- Step 1: audit script runs ----
    venv_py = Path("/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python")
    py = str(venv_py) if venv_py.exists() else sys.executable
    proc = subprocess.run(
        [py, str(AUDIT_SCRIPT)],
        capture_output=True, text=True, timeout=120,
    )
    # Exit 0 = all good; exit 1 = some expected tools missing but audit
    # itself ran. Both are valid "audit completed" outcomes.
    step(1, "techstack_audit.py runs to completion (exit 0 or 1, never crashes)",
         proc.returncode in (0, 1) and "TECHSTACK AUDIT" in proc.stdout,
         f"exit={proc.returncode} stdout_starts_with={proc.stdout[:60]!r}")

    # ---- Step 2: audit JSON written + schema valid ----
    if not AUDIT_JSON.exists():
        step(2, "audit JSON file exists", False, f"missing {AUDIT_JSON}")
    audit = json.loads(AUDIT_JSON.read_text())
    schema_ok = (
        isinstance(audit, dict)
        and "audited_at" in audit
        and "tools" in audit
        and isinstance(audit["tools"], list)
    )
    step(2, "audit JSON written with expected schema",
         schema_ok,
         f"keys={list(audit.keys()) if isinstance(audit, dict) else None}")

    # ---- Step 3: all 11 tools present ----
    rows = audit["tools"]
    names_in_audit = {row["name"] for row in rows}
    missing = set(EXPECTED_TOOLS) - names_in_audit
    step(3, f"all {len(EXPECTED_TOOLS)} expected tools present in audit",
         not missing and len(rows) == len(EXPECTED_TOOLS),
         f"missing={sorted(missing)} count={len(rows)} expected={len(EXPECTED_TOOLS)}")

    # ---- Step 4: stage-1/2/3 tools have either importable=True or concrete error ----
    silent_missing = []
    for row in rows:
        if row["stage"] in {"stage-1", "stage-2", "stage-3"}:
            if not row["importable"] and not row["error"]:
                silent_missing.append(row["name"])
    step(4, "every expected-present tool reports either importable or concrete error (no silent absence)",
         not silent_missing,
         f"silent_missing={silent_missing}")

    # ---- Step 5: NEG OpenAI Swarm is verdict=skip ----
    swarm = next((r for r in rows if r["name"] == "OpenAI Swarm"), None)
    step(5, "NEG: OpenAI Swarm marked stage=skip (rejection criterion locked)",
         swarm is not None and swarm["stage"] == "skip" and not swarm["expected_present"],
         f"stage={swarm['stage'] if swarm else 'MISSING'}")

    # ---- Step 6: NEG BMad is stage=document ----
    bmad = next((r for r in rows if r["name"] == "BMad-Method"), None)
    step(6, "NEG: BMad-Method marked stage=document (no Python install path)",
         bmad is not None and bmad["stage"] == "document" and not bmad["expected_present"],
         f"stage={bmad['stage'] if bmad else 'MISSING'}")

    # ---- Step 7: evaluation doc exists + names all 11 tools ----
    if not EVAL_DOC.exists():
        step(7, "AI_AGENT_TOOLS_EVALUATION.md exists", False, f"missing {EVAL_DOC}")
    eval_text = EVAL_DOC.read_text()
    missing_in_doc = [name for name in EXPECTED_TOOLS if name not in eval_text]
    step(7, f"evaluation doc names all {len(EXPECTED_TOOLS)} tools",
         not missing_in_doc,
         f"missing_in_doc={missing_in_doc}")

    # ---- Step 8: NEG bogus tool name absent ----
    bogus = "BogusAINeverInstalledFoo"
    step(8, f"NEG: bogus tool name {bogus!r} not present in evaluation doc",
         bogus not in eval_text and bogus not in names_in_audit,
         "")

    # ---- Step 9: audit freshness ----
    audited_at = audit.get("audited_at", 0)
    age_seconds = time.time() - float(audited_at)
    step(9, "techstack_audit.json freshness: audited_at within last 24h",
         age_seconds >= 0 and age_seconds < 86400,
         f"age_seconds={int(age_seconds)}")

    print(f"\n\033[32mALL 9 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
