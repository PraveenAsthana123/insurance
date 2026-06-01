#!/usr/bin/env python3
"""Process test plan operator.

Lists and runs the global per-process testing assignments from
`docs/testing/PROCESS_AGENT_CRON_CATALOG.json`.

The `run` command submits a governed task into the existing OpenClaw bridge.
Use `--dry-run` to inspect the payload without making an HTTP request.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / 'docs' / 'testing' / 'PROCESS_AGENT_CRON_CATALOG.json'
DEFAULT_API_URL = os.environ.get('API_URL', 'http://localhost:8000')


def load_catalog() -> dict[str, Any]:
    return json.loads(CATALOG_PATH.read_text())


def entries(catalog: dict[str, Any]) -> list[dict[str, Any]]:
    return list(catalog.get('entries', []))


def find_suite(catalog: dict[str, Any], suite_id: str) -> dict[str, Any]:
    for entry in entries(catalog):
        if entry['suite_id'] == suite_id:
            return entry
    raise SystemExit(f'Unknown suite_id: {suite_id}')


def build_prompt(entry: dict[str, Any], mode: str) -> str:
    subprocesses = '\n'.join(
        f"- {item['name']} via {item['agent']}: {item['purpose']}"
        for item in entry['subprocess_tests']
    )
    return f"""Run the {mode.upper()} enterprise process test suite.

Department: {entry['department_name']} ({entry['department_route']})
Process: {entry['process_name']}
Suite ID: {entry['suite_id']}
Primary agent: {entry['primary_agent']}
Review agent: {entry['review_agent']}

Business process description:
{entry['description']}

Inputs:
{entry['inputs']}

Expected outputs:
{entry['outputs']}

KPI target:
{entry['kpi']}

Data needed:
{entry['data_needed']}

Subprocess test plan:
{subprocesses}

Required output:
1. Execution plan
2. Test cases to run
3. Expected evidence/artifacts
4. Pass/fail criteria
5. Risks and missing dependencies
6. Recommended remediation if any test fails
""".strip()


def build_payload(entry: dict[str, Any], mode: str) -> dict[str, Any]:
    execution = entry['execution_modes'][mode]
    return {
        'mode': execution['agent_mode'],
        'department': entry['department_route'],
        'prompt': build_prompt(entry, mode),
        'source': 'process-test-plan',
        'metadata': {
            'suite_id': entry['suite_id'],
            'process_name': entry['process_name'],
            'test_mode': mode,
            'primary_agent': entry['primary_agent'],
            'review_agent': entry['review_agent'],
            'cron': execution['cron'],
            'subprocess_count': len(entry['subprocess_tests']),
        },
    }


def post_openclaw(api_url: str, payload: dict[str, Any]) -> dict[str, Any]:
    data = json.dumps(payload).encode('utf-8')
    request = urllib.request.Request(
        f"{api_url.rstrip('/')}/api/v1/openclaw/tasks",
        data=data,
        headers={
            'Content-Type': 'application/json',
            'X-Demo-Role': 'manager',
        },
        method='POST',
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode('utf-8', errors='replace')
        raise SystemExit(f'OpenClaw HTTP {exc.code}: {body}') from exc
    except urllib.error.URLError as exc:
        raise SystemExit(f'OpenClaw unavailable at {api_url}: {exc}') from exc


def cmd_list(args: argparse.Namespace) -> int:
    catalog = load_catalog()
    rows = entries(catalog)
    if args.dept:
        rows = [row for row in rows if row['department_route'] == args.dept]
    if args.agent:
        rows = [row for row in rows if row['primary_agent'] == args.agent]
    for row in rows:
        print(
            f"{row['suite_id']} | dept={row['department_route']} | "
            f"process={row['process_name']} | agent={row['primary_agent']} | "
            f"smoke='{row['execution_modes']['smoke']['cron']}' | full='{row['execution_modes']['full']['cron']}'"
        )
    print(f'total={len(rows)}')
    return 0


def cmd_export_cron(args: argparse.Namespace) -> int:
    catalog = load_catalog()
    rows = entries(catalog)
    if args.dept:
        rows = [row for row in rows if row['department_route'] == args.dept]
    modes = ['smoke', 'full'] if args.mode == 'all' else [args.mode]
    python = args.python or '/usr/bin/env python3'
    script = ROOT / 'scripts' / 'process_test_plan.py'
    print('# Generated HOLY process testing cron entries')
    print(f'# Source: {CATALOG_PATH}')
    for row in rows:
        for mode in modes:
            cron = row['execution_modes'][mode]['cron']
            print(f"{cron} cd {ROOT} && mkdir -p logs && API_URL={args.api_url} {python} {script} run --suite-id {row['suite_id']} --mode {mode} >> logs/process-test-cron.log 2>&1")
    return 0


def cmd_run(args: argparse.Namespace) -> int:
    catalog = load_catalog()
    entry = find_suite(catalog, args.suite_id)
    payload = build_payload(entry, args.mode)
    if args.dry_run:
        print(json.dumps(payload, indent=2))
        return 0
    response = post_openclaw(args.api_url, payload)
    print(json.dumps(response, indent=2))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description='List/export/run global process testing agent assignments.')
    sub = parser.add_subparsers(dest='cmd', required=True)

    list_parser = sub.add_parser('list', help='List process test suites')
    list_parser.add_argument('--dept', help='Filter by department route')
    list_parser.add_argument('--agent', help='Filter by primary agent')
    list_parser.set_defaults(func=cmd_list)

    cron_parser = sub.add_parser('export-cron', help='Print crontab lines for process tests')
    cron_parser.add_argument('--dept', help='Filter by department route')
    cron_parser.add_argument('--mode', choices=['smoke', 'full', 'all'], default='all')
    cron_parser.add_argument('--api-url', default=DEFAULT_API_URL)
    cron_parser.add_argument('--python', help='Python executable to use in cron entries')
    cron_parser.set_defaults(func=cmd_export_cron)

    run_parser = sub.add_parser('run', help='Submit one process test suite to OpenClaw')
    run_parser.add_argument('--suite-id', required=True)
    run_parser.add_argument('--mode', choices=['smoke', 'full'], default='full')
    run_parser.add_argument('--api-url', default=DEFAULT_API_URL)
    run_parser.add_argument('--dry-run', action='store_true')
    run_parser.set_defaults(func=cmd_run)

    args = parser.parse_args()
    return args.func(args)


if __name__ == '__main__':
    raise SystemExit(main())
