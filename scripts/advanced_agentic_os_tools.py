#!/usr/bin/env python3
"""Inspect the governed Advanced Agentic OS tool catalog."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "config" / "advanced_agentic_os_tools.json"


def load_catalog() -> dict:
    return json.loads(CATALOG.read_text(encoding="utf-8"))


def cmd_list(args: argparse.Namespace) -> int:
    data = load_catalog()
    tools = data["tools"]
    if args.stage:
        tools = [tool for tool in tools if tool["stage"] == args.stage]
    for tool in tools:
        print(f"{tool['name']}: {tool['stage']} | {tool['status']}")
        if args.verbose:
            print(f"  layer: {tool['layer']}")
            print(f"  use: {tool['use_for']}")
            print(f"  next: {tool['next_step']}")
    return 0


def cmd_markdown(_: argparse.Namespace) -> int:
    data = load_catalog()
    print("| Tool | Stage | Status | Layer | Next Step |")
    print("|---|---|---|---|---|")
    for tool in data["tools"]:
        print(f"| {tool['name']} | {tool['stage']} | {tool['status']} | {tool['layer']} | {tool['next_step']} |")
    return 0


def cmd_ladder(args: argparse.Namespace) -> int:
    data = load_catalog()
    ladder = data.get("maturity_ladder", [])
    if args.markdown:
        print("| Order | Layer | Purpose | Current Repo Status |")
        print("|---:|---|---|---|")
        for step in ladder:
            print(f"| {step['order']} | {step['name']} | {step['purpose']} | {step['current_repo_status']} |")
    else:
        for step in ladder:
            print(f"{step['order']:02d}. {step['name']}")
            if args.verbose:
                print(f"    purpose: {step['purpose']}")
                print(f"    status: {step['current_repo_status']}")
    return 0


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest="cmd", required=True)
    sp = sub.add_parser("list", help="list catalog entries")
    sp.add_argument("--stage", choices=("use-now", "pilot-wired", "design-now", "candidate", "future"))
    sp.add_argument("--verbose", action="store_true")
    sp.set_defaults(func=cmd_list)
    sp = sub.add_parser("markdown", help="print a markdown summary table")
    sp.set_defaults(func=cmd_markdown)
    sp = sub.add_parser("ladder", help="print the Spec Kit -> Autonomous Enterprise OS maturity ladder")
    sp.add_argument("--markdown", action="store_true")
    sp.add_argument("--verbose", action="store_true")
    sp.set_defaults(func=cmd_ladder)
    return p


def main() -> int:
    args = parser().parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
