#!/usr/bin/env python3
"""Voice/text automation runner for BMAD + Archon + OpenClaw + Ollama.

This runner treats "voice" as already-transcribed text. It does not record audio
or perform speech-to-text. It turns text into an execution plan with Ollama,
submits tasks through the OpenClaw-compatible API, and can install managed cron
entries for repeated execution.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "jobs" / "automation"
LOG_DIR = ROOT / "jobs" / "logs"
DEFAULT_API_URL = os.environ.get("API_URL", "http://localhost:8000")
DEFAULT_OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
DEFAULT_MODEL = os.environ.get("OLLAMA_MODEL", os.environ.get("AGENT_MODEL", "kivi:local"))
CRON_START = "# === INSUR-AUTOMATION-JOBS (insur_project) - managed by scripts/automation_job_runner.py ==="
CRON_END = "# === INSUR-AUTOMATION-JOBS (insur_project) - end ==="


def read_text(args: argparse.Namespace) -> str:
    if getattr(args, "file", None):
        return Path(args.file).read_text(encoding="utf-8").strip()
    if getattr(args, "text", None):
        return args.text.strip()
    raise SystemExit("provide --text or --file")


def http_json(method: str, url: str, payload: dict[str, Any] | None = None, headers: dict[str, str] | None = None) -> dict[str, Any]:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:  # noqa: S310 - local/operator configured URLs
            raw = resp.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code} from {url}: {body}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"failed to reach {url}: {exc}") from exc
    return json.loads(raw) if raw else {}


def ollama_plan(text: str, model: str, ollama_url: str) -> str:
    prompt = f"""You are the local automation planner for an insurance analytics project.
Turn the operator's text into a concise executable plan.
Return sections: Goal, Inputs, Steps, Schedule, Execution Target, Validation, Risks.
Keep it practical and suitable for BMAD/Archon/OpenClaw automation.

Operator text:
{text}
"""
    payload = {"model": model, "prompt": prompt, "stream": False, "options": {"temperature": 0.2}}
    result = http_json("POST", f"{ollama_url.rstrip('/')}/api/generate", payload)
    return str(result.get("response", "")).strip()


def save_plan(text: str, plan: str, model: str) -> Path:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    run_id = time.strftime("%Y%m%d-%H%M%S")
    path = OUT_DIR / f"plan-{run_id}.md"
    path.write_text(
        f"# Automation Plan {run_id}\n\n"
        f"Model: `{model}`\n\n"
        f"## Source Text\n\n{text}\n\n"
        f"## Plan\n\n{plan}\n",
        encoding="utf-8",
    )
    return path


def openclaw_submit(text: str, api_url: str, mode: str, department: str, source: str) -> dict[str, Any]:
    payload = {
        "mode": mode,
        "department": department,
        "prompt": text,
        "source": source,
        "metadata": {"submitted_by": "automation_job_runner.py", "kind": "voice_text_automation"},
    }
    return http_json(
        "POST",
        f"{api_url.rstrip('/')}/api/v1/openclaw/tasks",
        payload,
        headers={"X-Demo-Role": "manager", "X-Tenant-ID": "automation"},
    )


def add_interval_schedule(name: str, every: int, mode: str, department: str, prompt: str) -> None:
    cmd = [
        str(ROOT / "scripts" / "agent_fleet.sh"),
        "schedule-add",
        name,
        str(every),
        mode,
        prompt,
        department,
    ]
    subprocess.run(cmd, cwd=ROOT, check=True)


def cron_command(name: str, text: str, mode: str, department: str, api_url: str, model: str, ollama_url: str) -> str:
    safe_text = text.replace("'", "'\\''")
    log = LOG_DIR / f"automation_{name}.log"
    return (
        f"cd {ROOT} && API_URL={api_url} OLLAMA_URL={ollama_url} OLLAMA_MODEL={model} "
        f"{sys.executable} {ROOT / 'scripts' / 'automation_job_runner.py'} run-once "
        f"--mode {mode} --department {department} --text '{safe_text}' >> {log} 2>&1"
    )


def install_cron(name: str, cron_expr: str, command: str) -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    current = subprocess.run(["crontab", "-l"], text=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, check=False).stdout
    lines = current.splitlines()
    filtered: list[str] = []
    skip = False
    for line in lines:
        if line == CRON_START:
            skip = True
            continue
        if line == CRON_END:
            skip = False
            continue
        if not skip:
            filtered.append(line)
    block = [
        CRON_START,
        f"# {name}",
        f"{cron_expr} {command}",
        CRON_END,
    ]
    new_cron = "\n".join(filtered + block) + "\n"
    proc = subprocess.run(["crontab", "-"], input=new_cron, text=True, check=True)
    if proc.returncode != 0:
        raise RuntimeError("crontab install failed")


def cmd_plan(args: argparse.Namespace) -> int:
    text = read_text(args)
    plan = ollama_plan(text, args.model, args.ollama_url)
    path = save_plan(text, plan, args.model)
    print(f"plan written: {path}")
    print(plan)
    return 0


def cmd_execute(args: argparse.Namespace) -> int:
    text = read_text(args)
    result = openclaw_submit(text, args.api_url, args.mode, args.department, "automation-runner")
    print(json.dumps(result, indent=2))
    return 0


def cmd_run_once(args: argparse.Namespace) -> int:
    text = read_text(args)
    plan = ollama_plan(text, args.model, args.ollama_url) if not args.skip_plan else text
    path = save_plan(text, plan, args.model) if not args.skip_plan else None
    submit_text = f"Automation source text:\n{text}\n\nExecution plan:\n{plan}"
    result = openclaw_submit(submit_text, args.api_url, args.mode, args.department, "automation-runner")
    if path:
        print(f"plan written: {path}")
    print(json.dumps(result, indent=2))
    return 0


def cmd_schedule_interval(args: argparse.Namespace) -> int:
    text = read_text(args)
    add_interval_schedule(args.name, args.every, args.mode, args.department, text)
    return 0


def cmd_install_cron(args: argparse.Namespace) -> int:
    text = read_text(args)
    command = cron_command(args.name, text, args.mode, args.department, args.api_url, args.model, args.ollama_url)
    install_cron(args.name, args.cron, command)
    print("installed managed automation cron block")
    print(f"{args.cron} {command}")
    return 0


def cmd_status(args: argparse.Namespace) -> int:
    checks = {
        "ollama": f"{args.ollama_url.rstrip('/')}/api/tags",
        "openclaw": f"{args.api_url.rstrip('/')}/api/v1/openclaw/status",
    }
    for name, url in checks.items():
        try:
            result = http_json("GET", url)
            print(f"{name}: OK")
            print(json.dumps(result, indent=2)[:1200])
        except Exception as exc:  # noqa: BLE001 - operator status output
            print(f"{name}: WARN {exc}")
    return 0


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--api-url", default=DEFAULT_API_URL)
    p.add_argument("--ollama-url", default=DEFAULT_OLLAMA_URL)
    p.add_argument("--model", default=DEFAULT_MODEL)
    sub = p.add_subparsers(dest="cmd", required=True)

    def text_args(sp: argparse.ArgumentParser) -> None:
        group = sp.add_mutually_exclusive_group(required=True)
        group.add_argument("--text")
        group.add_argument("--file")

    sp = sub.add_parser("plan", help="turn voice/transcribed text into an Ollama plan")
    text_args(sp)
    sp.set_defaults(func=cmd_plan)

    sp = sub.add_parser("execute", help="submit text directly to OpenClaw")
    text_args(sp)
    sp.add_argument("--mode", choices=["simple", "council"], default="council")
    sp.add_argument("--department", default="engineering")
    sp.set_defaults(func=cmd_execute)

    sp = sub.add_parser("run-once", help="plan with Ollama, then submit to OpenClaw")
    text_args(sp)
    sp.add_argument("--mode", choices=["simple", "council"], default="council")
    sp.add_argument("--department", default="engineering")
    sp.add_argument("--skip-plan", action="store_true")
    sp.set_defaults(func=cmd_run_once)

    sp = sub.add_parser("schedule-interval", help="add Redis-backed interval schedule")
    text_args(sp)
    sp.add_argument("--name", required=True)
    sp.add_argument("--every", type=int, required=True, help="interval seconds")
    sp.add_argument("--mode", choices=["simple", "council"], default="council")
    sp.add_argument("--department", default="engineering")
    sp.set_defaults(func=cmd_schedule_interval)

    sp = sub.add_parser("install-cron", help="install managed crontab entry for a text automation")
    text_args(sp)
    sp.add_argument("--name", required=True)
    sp.add_argument("--cron", required=True, help='cron expression, e.g. "*/30 * * * *"')
    sp.add_argument("--mode", choices=["simple", "council"], default="council")
    sp.add_argument("--department", default="engineering")
    sp.set_defaults(func=cmd_install_cron)

    sp = sub.add_parser("status", help="check Ollama and OpenClaw endpoints")
    sp.set_defaults(func=cmd_status)
    return p


def main() -> int:
    args = parser().parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
