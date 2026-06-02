#!/usr/bin/env python3
"""Repo-local Spec Kit: create governed specs and route them into BMAD/OpenClaw."""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BASE = ROOT / "jobs" / "spec-kit"
KT_SCRIPT = ROOT / "scripts" / "kt_bmad_space.py"


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return slug[:80] or "spec"


def read_text(args: argparse.Namespace) -> str:
    if args.file:
        return Path(args.file).read_text(encoding="utf-8").strip()
    if args.text:
        return args.text.strip()
    if not sys.stdin.isatty():
        return sys.stdin.read().strip()
    raise SystemExit("provide --text, --file, or stdin")


def parse_lines(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in re.split(r"\n|;", value) if item.strip()]


def workspace_path(base_dir: str, title: str) -> Path:
    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    return Path(base_dir).resolve() / f"{stamp}-{slugify(title)}"


def build_payload(args: argparse.Namespace) -> dict:
    prompt = read_text(args)
    title = args.title or prompt.splitlines()[0][:90] or "Spec Kit Task"
    return {
        "schema_version": 1,
        "created_at": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
        "title": title,
        "department": args.department,
        "priority": args.priority,
        "profile": args.profile,
        "mode": args.mode,
        "problem": prompt,
        "users": parse_lines(args.users),
        "requirements": parse_lines(args.requirements),
        "acceptance_criteria": parse_lines(args.acceptance),
        "constraints": parse_lines(args.constraints),
        "risks": parse_lines(args.risks),
        "non_goals": parse_lines(args.non_goals),
        "validation": parse_lines(args.validation) or [
            "Update required docs per AGENTS.md when behavior changes.",
            "Run focused tests for touched code.",
            "Run ./scripts/project_doctor.sh before production-facing handoff when dependencies allow it.",
        ],
    }


def render_spec(payload: dict) -> str:
    def bullets(items: list[str], fallback: str) -> str:
        values = items or [fallback]
        return "\n".join(f"- {item}" for item in values)

    return f"""# Spec: {payload['title']}

- Created: {payload['created_at']}
- Department: {payload['department']}
- Priority: {payload['priority']}
- Mode: {payload['mode']}
- Model profile: {payload['profile']}

## Problem

{payload['problem']}

## Users

{bullets(payload['users'], 'Not specified yet')}

## Requirements

{bullets(payload['requirements'], 'Derive from problem statement during BMAD PRD/story pass')}

## Acceptance Criteria

{bullets(payload['acceptance_criteria'], 'Define measurable acceptance criteria before implementation')}

## Constraints

{bullets(payload['constraints'], 'Follow AGENTS.md, governance docs, architecture boundaries, and approval policy')}

## Non-Goals

{bullets(payload['non_goals'], 'Do not bypass hard approval gates, service boundaries, or validation')}

## Risks

{bullets(payload['risks'], 'Risk review required during BMAD architecture/story pass')}

## Validation Plan

{bullets(payload['validation'], 'Run focused validation')}
"""


def render_bmad_prompt(payload: dict, spec_rel: str) -> str:
    criteria = "\n".join(f"- {item}" for item in payload["acceptance_criteria"] or ["Create acceptance criteria during BMAD pass"])
    return f"""Spec Kit handoff for BMAD.

Spec path: {spec_rel}
Title: {payload['title']}
Department: {payload['department']}
Priority: {payload['priority']}

Task:
{payload['problem']}

Acceptance criteria:
{criteria}

Required BMAD route:
1. bmad-prd or bmad-product-brief for intent and scope.
2. bmad-create-architecture if API/backend/frontend/system behavior changes.
3. bmad-dev-story for implementation-ready story.
4. bmad-code-review before handoff when code changes are made.
"""


def create_spec(args: argparse.Namespace) -> tuple[Path, dict]:
    payload = build_payload(args)
    workspace = workspace_path(args.base_dir, payload["title"])
    workspace.mkdir(parents=True, exist_ok=False)
    spec_path = workspace / "SPEC.md"
    payload_path = workspace / "spec.json"
    bmad_prompt_path = workspace / "BMAD_PROMPT.md"
    spec_rel = str(spec_path.relative_to(ROOT)) if spec_path.is_relative_to(ROOT) else str(spec_path)
    spec_path.write_text(render_spec(payload), encoding="utf-8")
    payload_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    bmad_prompt_path.write_text(render_bmad_prompt(payload, spec_rel), encoding="utf-8")
    return workspace, payload


def route_to_bmad(workspace: Path, payload: dict, submit: bool) -> None:
    prompt_path = workspace / "BMAD_PROMPT.md"
    command = [str(KT_SCRIPT), "create", "--title", payload["title"], "--file", str(prompt_path), "--department", payload["department"], "--mode", payload["mode"], "--profile", payload["profile"]]
    if submit:
        command.append("--submit")
    proc = subprocess.run(command, cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, check=False)
    (workspace / "kt_bmad_output.txt").write_text(proc.stdout, encoding="utf-8")
    print(proc.stdout.rstrip())
    if proc.returncode != 0:
        raise SystemExit(proc.returncode)


def cmd_create(args: argparse.Namespace) -> int:
    workspace, payload = create_spec(args)
    print(f"workspace={workspace}")
    print(f"spec={workspace / 'SPEC.md'}")
    print(f"spec_json={workspace / 'spec.json'}")
    print(f"bmad_prompt={workspace / 'BMAD_PROMPT.md'}")
    if args.bmad or args.submit:
        route_to_bmad(workspace, payload, args.submit)
    return 0


def cmd_list(args: argparse.Namespace) -> int:
    base = Path(args.base_dir).resolve()
    if not base.exists():
        print(f"no spec-kit workspaces at {base}")
        return 0
    for path in sorted(base.iterdir(), reverse=True):
        if path.is_dir():
            print(path)
    return 0


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest="cmd", required=True)
    create = sub.add_parser("create", help="create a Spec Kit workspace")
    create.add_argument("--title")
    create.add_argument("--text")
    create.add_argument("--file")
    create.add_argument("--department", default="engineering")
    create.add_argument("--priority", default="normal", choices=("low", "normal", "high", "urgent"))
    create.add_argument("--mode", default="council", choices=("simple", "council"))
    create.add_argument("--profile", default="fast")
    create.add_argument("--users")
    create.add_argument("--requirements")
    create.add_argument("--acceptance")
    create.add_argument("--constraints")
    create.add_argument("--risks")
    create.add_argument("--non-goals")
    create.add_argument("--validation")
    create.add_argument("--base-dir", default=str(DEFAULT_BASE))
    create.add_argument("--bmad", action="store_true", help="also create a KT/BMAD handoff workspace")
    create.add_argument("--submit", action="store_true", help="also route KT/BMAD handoff into OpenClaw")
    create.set_defaults(func=cmd_create)
    list_cmd = sub.add_parser("list", help="list Spec Kit workspaces")
    list_cmd.add_argument("--base-dir", default=str(DEFAULT_BASE))
    list_cmd.set_defaults(func=cmd_list)
    return p


def main() -> int:
    args = parser().parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
