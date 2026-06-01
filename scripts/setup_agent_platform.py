#!/usr/bin/env python3
"""Operator CLI for the local HOLY agent platform setup.

It verifies the same requested stack as the API: Harness Agent, OpenClaw,
Paperclip, PoliysAI governance, CUA, Stagehand, and Playwright.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

from services.agent_platform_service import AgentPlatformIntegrationService  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Check local agent platform setup.")
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("status", help="Print human-readable setup status")
    sub.add_parser("manifest", help="Print JSON integration manifest")
    sub.add_parser("json", help="Print JSON setup status")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    service = AgentPlatformIntegrationService()
    if args.cmd == "manifest":
        print(service.manifest().model_dump_json(indent=2))
        return 0
    status = service.status()
    if args.cmd == "json":
        print(status.model_dump_json(indent=2))
        return 0
    print(f"{status.name}: {status.status}")
    for tool in status.tools:
        env_note = f" env={','.join(tool.required_env)}" if tool.required_env else ""
        print(f"- {tool.key}: {tool.state} available={tool.available} external={tool.external_installed}{env_note}")
        print(f"  {tool.detail}")
    print()
    print("Commands:")
    for name, command in status.command_surface.items():
        print(f"- {name}: {command}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
