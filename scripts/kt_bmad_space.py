#!/usr/bin/env python3
"""Create a lightweight KT + BMAD workspace and optionally submit it to OpenClaw."""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BASE = ROOT / "jobs" / "kt-bmad"
DEFAULT_API_URL = "http://localhost:8000"


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", text.strip().lower()).strip("-")
    return slug[:80] or "task"


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


def read_prompt(args: argparse.Namespace) -> str:
    if args.file:
        return Path(args.file).read_text(encoding="utf-8").strip()
    if args.text:
        return args.text.strip()
    if not sys.stdin.isatty():
        return sys.stdin.read().strip()
    raise SystemExit("provide --text, --file, or stdin")


def build_workspace(args: argparse.Namespace) -> tuple[Path, dict[str, Any]]:
    prompt = read_prompt(args)
    title = args.title or prompt.splitlines()[0][:90] or "KT BMAD Task"
    run_id = f"{dt.datetime.now().strftime('%Y%m%d-%H%M%S')}-{slugify(title)}"
    workspace = Path(args.base_dir).resolve() / run_id
    workspace.mkdir(parents=True, exist_ok=False)
    payload = {
        "created_at": now(),
        "title": title,
        "department": args.department,
        "mode": args.mode,
        "profile": args.profile,
        "prompt": prompt,
        "bmad_next_steps": [
            "bmad-product-brief or bmad-prd for intent and scope",
            "bmad-create-architecture for system/API/frontend impact",
            "bmad-dev-story for implementation-ready tasks",
            "bmad-code-review before handoff when code changes are made",
        ],
        "execution_route": "BMAD planning -> OpenClaw task -> Ollama/agent profile -> validation -> docs update",
    }
    (workspace / "KT.md").write_text(render_kt(payload), encoding="utf-8")
    (workspace / "BMAD_HANDOFF.md").write_text(render_bmad_handoff(payload), encoding="utf-8")
    openclaw_payload = {
        "mode": args.mode,
        "department": args.department,
        "prompt": prompt,
        "source": "kt-bmad-space",
        "metadata": {
            "workspace": str(workspace),
            "profile": args.profile,
            "bmad": True,
            "created_at": payload["created_at"],
        },
    }
    (workspace / "openclaw_payload.json").write_text(json.dumps(openclaw_payload, indent=2) + "\n", encoding="utf-8")
    return workspace, openclaw_payload


def render_kt(payload: dict[str, Any]) -> str:
    return f"""# KT Space: {payload['title']}

- Created: {payload['created_at']}
- Department: {payload['department']}
- Mode: {payload['mode']}
- Model profile: {payload['profile']}

## Task

{payload['prompt']}

## Route

{payload['execution_route']}

## Working Notes

- Keep changes repo-local unless explicitly approved.
- Update docs required by AGENTS.md when behavior changes.
- Run `./scripts/project_doctor.sh` before production-facing handoff when dependencies allow it.
"""


def render_bmad_handoff(payload: dict[str, Any]) -> str:
    steps = "\n".join(f"1. {step}" for step in payload["bmad_next_steps"])
    return f"""# BMAD Handoff: {payload['title']}

Use this workspace as the shared context for Codex, Claude, Cursor, or shell-based agents.

## Recommended BMAD Flow

{steps}

## Automation Route

- Planner: BMAD methodology and `scripts/automation_job_runner.py`
- Executor: OpenClaw task queue
- Model routing: `{payload['profile']}` from `config/agent_model_profiles.json`
- Validation: project doctor, focused tests, and required docs

## Original Prompt

{payload['prompt']}
"""


def submit_openclaw(api_url: str, payload: dict[str, Any]) -> dict[str, Any]:
    url = api_url.rstrip("/") + "/api/v1/openclaw/tasks"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", "X-Tenant-ID": "default"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:  # noqa: S310 local/operator URL
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.URLError as exc:
        return {"submitted": False, "error": str(exc), "url": url}


def cmd_create(args: argparse.Namespace) -> int:
    workspace, payload = build_workspace(args)
    print(f"workspace={workspace}")
    print(f"kt={workspace / 'KT.md'}")
    print(f"bmad_handoff={workspace / 'BMAD_HANDOFF.md'}")
    print(f"openclaw_payload={workspace / 'openclaw_payload.json'}")
    if args.submit:
        result = submit_openclaw(args.api_url, payload)
        (workspace / "openclaw_response.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
        print(f"openclaw_response={workspace / 'openclaw_response.json'}")
        print(json.dumps(result, indent=2))
    return 0


def cmd_list(args: argparse.Namespace) -> int:
    base = Path(args.base_dir).resolve()
    if not base.exists():
        print(f"no kt+bmad workspaces at {base}")
        return 0
    for path in sorted(base.iterdir(), reverse=True):
        if path.is_dir():
            print(path)
    return 0


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest="cmd", required=True)
    create = sub.add_parser("create", help="create a kt+bmad workspace")
    create.add_argument("--title")
    create.add_argument("--text")
    create.add_argument("--file")
    create.add_argument("--department", default="engineering")
    create.add_argument("--mode", choices=("simple", "council"), default="council")
    create.add_argument("--profile", default="fast")
    create.add_argument("--base-dir", default=str(DEFAULT_BASE))
    create.add_argument("--submit", action="store_true", help="submit workspace prompt to OpenClaw")
    create.add_argument("--api-url", default=DEFAULT_API_URL)
    create.set_defaults(func=cmd_create)
    list_cmd = sub.add_parser("list", help="list kt+bmad workspaces")
    list_cmd.add_argument("--base-dir", default=str(DEFAULT_BASE))
    list_cmd.set_defaults(func=cmd_list)
    return p


def main() -> int:
    args = parser().parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
