#!/usr/bin/env python3
"""Start or inspect OpenClaw/Ollama agent model profiles."""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
PROFILE_PATH = ROOT / "config" / "agent_model_profiles.json"
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")


def load_profiles() -> dict[str, dict[str, Any]]:
    return json.loads(PROFILE_PATH.read_text(encoding="utf-8"))


def local_models() -> set[str]:
    try:
        with urllib.request.urlopen(f"{OLLAMA_URL.rstrip('/')}/api/tags", timeout=10) as resp:  # noqa: S310 local/operator URL
            data = json.loads(resp.read().decode("utf-8"))
        return {m.get("name", "") for m in data.get("models", [])}
    except Exception:
        return set()


def env_for(profile: dict[str, Any]) -> dict[str, str]:
    env = os.environ.copy()
    for key in ("AGENT_MODEL", "COUNCIL_AUTHOR_MODEL", "COUNCIL_REVIEWER_MODEL", "COUNCIL_CHAIR_MODEL"):
        env[key] = str(profile[key])
    return env


def print_profile(name: str, profile: dict[str, Any], installed: set[str]) -> None:
    print(f"{name}: {profile['description']}")
    for key in ("AGENT_MODEL", "COUNCIL_AUTHOR_MODEL", "COUNCIL_REVIEWER_MODEL", "COUNCIL_CHAIR_MODEL"):
        model = profile[key]
        mark = "OK" if model in installed else "MISSING"
        print(f"  {key}={model} [{mark}]")
    print(f"  recommended_agents={profile['recommended_agents']} recommended_council_agents={profile['recommended_council_agents']}")


def cmd_list(_: argparse.Namespace) -> int:
    profiles = load_profiles()
    installed = local_models()
    for name, profile in profiles.items():
        print_profile(name, profile, installed)
    return 0


def cmd_export(args: argparse.Namespace) -> int:
    profile = load_profiles()[args.profile]
    for key in ("AGENT_MODEL", "COUNCIL_AUTHOR_MODEL", "COUNCIL_REVIEWER_MODEL", "COUNCIL_CHAIR_MODEL"):
        print(f"export {key}='{profile[key]}'")
    return 0


def cmd_start(args: argparse.Namespace) -> int:
    profiles = load_profiles()
    profile = profiles[args.profile]
    installed = local_models()
    missing = [profile[k] for k in ("AGENT_MODEL", "COUNCIL_AUTHOR_MODEL", "COUNCIL_REVIEWER_MODEL", "COUNCIL_CHAIR_MODEL") if profile[k] not in installed]
    if missing:
        print(f"missing local Ollama models: {', '.join(sorted(set(missing)))}", file=sys.stderr)
        print("run `scripts/agent_model_profiles.py list` to inspect installed models", file=sys.stderr)
        return 2
    agents = args.agents if args.agents is not None else int(profile["recommended_agents"])
    council = args.council_agents if args.council_agents is not None else int(profile["recommended_council_agents"])
    env = env_for(profile)
    print_profile(args.profile, profile, installed)
    subprocess.run(["docker", "compose", "up", "-d", "redis", "ollama"], cwd=ROOT, env=env, check=True)
    subprocess.run(["docker", "compose", "up", "-d", "--scale", f"agents={agents}", "agents", "--scale", f"council_agents={council}", "council_agents"], cwd=ROOT, env=env, check=True)
    subprocess.run([str(ROOT / "scripts" / "agent_fleet.sh"), "supervisor"], cwd=ROOT, env=env, check=False)
    return 0


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest="cmd", required=True)
    sp = sub.add_parser("list", help="list profiles and installed model status")
    sp.set_defaults(func=cmd_list)
    sp = sub.add_parser("export", help="print shell exports for a profile")
    sp.add_argument("profile", choices=load_profiles().keys())
    sp.set_defaults(func=cmd_export)
    sp = sub.add_parser("start", help="start agents with a model profile")
    sp.add_argument("profile", choices=load_profiles().keys())
    sp.add_argument("--agents", type=int)
    sp.add_argument("--council-agents", type=int)
    sp.set_defaults(func=cmd_start)
    return p


def main() -> int:
    args = parser().parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
