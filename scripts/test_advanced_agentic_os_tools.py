#!/usr/bin/env python3
"""Readiness tests for the Advanced Agentic OS maturity ladder."""
from __future__ import annotations

import argparse
import importlib
import importlib.metadata
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Callable

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "config" / "advanced_agentic_os_tools.json"
REPORT_JSON = ROOT / "jobs" / "reports" / "advanced_agentic_os_tool_tests.json"
REPORT_MD = ROOT / "jobs" / "reports" / "advanced_agentic_os_tool_tests.md"
DEFAULT_API_URL = os.environ.get("API_URL", "http://localhost:8000")
DEFAULT_OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")


@dataclass
class Check:
    name: str
    ok: bool
    evidence: str


@dataclass
class ToolResult:
    order: int
    name: str
    status: str
    summary: str
    checks: list[Check] = field(default_factory=list)


def path_exists(path: str) -> Check:
    p = ROOT / path
    return Check(f"path:{path}", p.exists(), "exists" if p.exists() else "missing")


def command_ok(name: str, command: list[str], timeout: int = 20) -> Check:
    try:
        proc = subprocess.run(command, cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=timeout, check=False)
        out = " ".join(proc.stdout.strip().split())[:240]
        return Check(name, proc.returncode == 0, out or f"exit={proc.returncode}")
    except FileNotFoundError as exc:
        return Check(name, False, f"missing command: {exc.filename}")
    except subprocess.TimeoutExpired:
        return Check(name, False, f"timeout after {timeout}s")
    except Exception as exc:  # noqa: BLE001 - readiness report must not crash
        return Check(name, False, f"{type(exc).__name__}: {exc}")


def import_check(import_name: str, dist_name: str | None = None) -> Check:
    try:
        importlib.import_module(import_name)
        version = "unknown"
        try:
            version = importlib.metadata.version(dist_name or import_name)
        except importlib.metadata.PackageNotFoundError:
            pass
        return Check(f"import:{import_name}", True, f"importable version={version}")
    except Exception as exc:  # noqa: BLE001
        return Check(f"import:{import_name}", False, f"{type(exc).__name__}: {exc}"[:240])


def dist_check(dist_name: str) -> Check:
    try:
        version = importlib.metadata.version(dist_name)
        return Check(f"dist:{dist_name}", True, f"installed version={version}")
    except importlib.metadata.PackageNotFoundError:
        return Check(f"dist:{dist_name}", False, "distribution not installed")


def http_check(name: str, url: str, timeout: int = 5) -> Check:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:  # noqa: S310 local/operator URLs only
            body = resp.read(240).decode("utf-8", errors="replace")
            return Check(name, 200 <= resp.status < 300, f"http={resp.status} {body[:160]}")
    except urllib.error.HTTPError as exc:
        return Check(name, False, f"http={exc.code}")
    except Exception as exc:  # noqa: BLE001
        return Check(name, False, f"{type(exc).__name__}: {exc}"[:240])


def env_check(name: str, env_var: str) -> Check:
    value = os.environ.get(env_var)
    return Check(name, bool(value), f"{env_var} set" if value else f"{env_var} not set")


def result(order: int, name: str, checks: list[Check], *, gated: bool = False, summary: str | None = None) -> ToolResult:
    ok_count = sum(1 for check in checks if check.ok)
    if gated:
        status = "GATED"
    elif checks and ok_count == len(checks):
        status = "PASS"
    elif ok_count:
        status = "PARTIAL"
    else:
        status = "MISSING"
    if summary is None:
        summary = f"{ok_count}/{len(checks)} checks passed" if checks else "no checks defined"
    return ToolResult(order=order, name=name, status=status, summary=summary, checks=checks)


def test_spec_kit() -> ToolResult:
    checks = [
        path_exists("scripts/spec_kit.py"),
        path_exists("docs/SPEC_KIT_RUNBOOK.md"),
        command_ok("spec-kit:list", [str(ROOT / "scripts" / "spec_kit.py"), "list"]),
        path_exists("scripts/kt_bmad_space.py"),
        path_exists("docs/KT_BMAD_SPACE_RUNBOOK.md"),
        command_ok("kt-bmad:list", [str(ROOT / "scripts" / "kt_bmad_space.py"), "list"]),
    ]
    return result(1, "Spec Kit", checks, summary="Repo-local Spec Kit command plus KT/BMAD workspace are available.")


def test_bmad() -> ToolResult:
    checks = [
        path_exists("scripts/bmad.sh"),
        path_exists("_bmad"),
        path_exists(".claude/skills"),
        command_ok("bmad:status", [str(ROOT / "scripts" / "bmad.sh"), "status"], timeout=30),
    ]
    return result(2, "BMAD", checks)


def test_langgraph() -> ToolResult:
    checks = [import_check("langgraph", "langgraph"), path_exists("docs/ADVANCED_AGENTIC_OS_TOOLING_PLAN.md")]
    return result(3, "LangGraph", checks, summary="Import proves SDK availability; repo still treats it as candidate.")


def test_openai_agents_sdk() -> ToolResult:
    checks = [dist_check("openai-agents"), path_exists("docs/ADVANCED_AGENTIC_OS_TOOLING_PLAN.md")]
    # Avoid import `agents` because this repo has an `agents/` source directory.
    return result(4, "OpenAI Agents SDK", checks, summary="Distribution check avoids collision with local agents/ directory.")


def test_autogen() -> ToolResult:
    checks = [import_check("autogen_agentchat", "pyautogen"), import_check("autogen_core", "pyautogen")]
    return result(5, "AutoGen", checks)


def test_crewai() -> ToolResult:
    return result(6, "CrewAI", [import_check("crewai", "crewai")])


def test_agentic_os() -> ToolResult:
    checks = [
        path_exists("config/advanced_agentic_os_tools.json"),
        path_exists("docs/ADVANCED_AGENTIC_OS_TOOLING_PLAN.md"),
        path_exists("docs/GLOBAL_AGENT_ARCHITECTURE_POLICY.md"),
        http_check("ollama:tags", f"{DEFAULT_OLLAMA_URL.rstrip('/')}/api/tags"),
        http_check("openclaw:status", f"{DEFAULT_API_URL.rstrip('/')}/api/v1/openclaw/status"),
    ]
    return result(7, "Agentic OS", checks, summary="Control-map readiness across catalog, governance docs, Ollama, and OpenClaw.")


def test_mem0_letta() -> ToolResult:
    checks = [import_check("mem0", "mem0ai"), import_check("letta", "letta")]
    return result(8, "Mem0 + Letta", checks, summary="Candidate memory layer; install is not enough without retention/tenant policy.")


def test_graphrag_neo4j() -> ToolResult:
    checks = [
        import_check("neo4j", "neo4j"),
        path_exists("docs/PRODUCTION_AGENT_PLATFORM_ARCHITECTURE.md"),
        path_exists("frontend/src/components/process-tabs/ProcessDatabaseTab.jsx"),
    ]
    return result(9, "GraphRAG + Neo4j", checks, summary="Graph target has docs/UI references; backend graph store is not wired by this check.")


def test_langsmith_phoenix() -> ToolResult:
    checks = [import_check("langsmith", "langsmith"), import_check("phoenix", "arize-phoenix"), env_check("langsmith:env", "LANGSMITH_API_KEY")]
    return result(10, "LangSmith + Phoenix", checks, summary="Phoenix can be local; LangSmith remains opt-in SaaS via env key.")


def test_nemo_guardrails() -> ToolResult:
    checks = [
        import_check("nemoguardrails", "nemoguardrails"),
        path_exists("backend/services/guardrails_service.py"),
        path_exists("backend/routers/guardrails.py"),
        http_check("guardrails:global", f"{DEFAULT_API_URL.rstrip('/')}/api/v1/holy/guardrails/_global"),
    ]
    return result(11, "NeMo Guardrails", checks, summary="Local guardrails service exists; NeMo package is a separate candidate check.")


def test_agentops() -> ToolResult:
    checks = [import_check("agentops", "agentops"), env_check("agentops:env", "AGENTOPS_API_KEY"), path_exists("backend/services/agent_platform_service.py")]
    return result(12, "AgentOps", checks, summary="SDK can be present, but external dashboard requires AGENTOPS_API_KEY.")


def test_ai_command_center() -> ToolResult:
    checks = [
        path_exists("scripts/agent_supervisor.py"),
        path_exists("frontend/src/components/AgenticConsole.jsx"),
        path_exists("docs/AGENT_SUPERVISOR_RUNBOOK.md"),
        command_ok("advanced-catalog:ladder", [str(ROOT / "scripts" / "advanced_agentic_os_tools.py"), "ladder"]),
    ]
    return result(13, "AI Command Center", checks, summary="Composed local command center surfaces, not a single product install.")


def test_enterprise_decision_os() -> ToolResult:
    checks = [path_exists("backend/core/hitl_approval.py"), path_exists("docs/APPROVAL_GOVERNANCE.md"), path_exists("docs/PRODUCTION_AGENT_PLATFORM_ARCHITECTURE.md")]
    return result(14, "Enterprise Decision OS", checks, gated=True, summary="Future enterprise layer; local evidence exists but production signoff is gated.")


def test_autonomous_enterprise_os() -> ToolResult:
    checks = [path_exists("docs/ADVANCED_AGENTIC_OS_TOOLING_PLAN.md"), path_exists("docs/NO_APPROVAL_AUTONOMY_POLICY.md"), path_exists("docs/APPROVAL_GOVERNANCE.md")]
    return result(15, "Autonomous Enterprise OS", checks, gated=True, summary="Future target only; autonomy remains bounded by approval and governance policy.")


TESTS: list[Callable[[], ToolResult]] = [
    test_spec_kit,
    test_bmad,
    test_langgraph,
    test_openai_agents_sdk,
    test_autogen,
    test_crewai,
    test_agentic_os,
    test_mem0_letta,
    test_graphrag_neo4j,
    test_langsmith_phoenix,
    test_nemo_guardrails,
    test_agentops,
    test_ai_command_center,
    test_enterprise_decision_os,
    test_autonomous_enterprise_os,
]


def write_reports(results: list[ToolResult]) -> None:
    REPORT_JSON.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generated_at": time.time(),
        "api_url": DEFAULT_API_URL,
        "ollama_url": DEFAULT_OLLAMA_URL,
        "results": [
            {**asdict(res), "checks": [asdict(check) for check in res.checks]}
            for res in results
        ],
    }
    REPORT_JSON.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    lines = [
        "# Advanced Agentic OS Tool Test Report",
        "",
        f"API URL: `{DEFAULT_API_URL}`",
        f"Ollama URL: `{DEFAULT_OLLAMA_URL}`",
        "",
        "| # | Tool | Status | Summary |",
        "|---:|---|---|---|",
    ]
    for res in results:
        lines.append(f"| {res.order} | {res.name} | {res.status} | {res.summary} |")
    lines.append("")
    for res in results:
        lines.append(f"## {res.order}. {res.name}")
        for check in res.checks:
            mark = "PASS" if check.ok else "FAIL"
            lines.append(f"- {mark} `{check.name}`: {check.evidence}")
        lines.append("")
    REPORT_MD.write_text("\n".join(lines), encoding="utf-8")


def print_summary(results: list[ToolResult]) -> None:
    print(f"{'#':>2} {'tool':<28} {'status':<8} summary")
    print("-" * 90)
    for res in results:
        print(f"{res.order:>2} {res.name:<28} {res.status:<8} {res.summary}")
    print(f"\nwrote {REPORT_JSON.relative_to(ROOT)}")
    print(f"wrote {REPORT_MD.relative_to(ROOT)}")

def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--json", action="store_true", help="print JSON payload to stdout")
    p.add_argument("--fail-on-missing", action="store_true", help="exit 1 if any non-gated tool is missing")
    return p


def main() -> int:
    args = parser().parse_args()
    # Load catalog to catch malformed JSON before running tests.
    json.loads(CATALOG.read_text(encoding="utf-8"))
    results = [test() for test in TESTS]
    write_reports(results)
    if args.json:
        print(REPORT_JSON.read_text(encoding="utf-8"))
    else:
        print_summary(results)
    if args.fail_on_missing:
        for res in results:
            if res.status == "MISSING":
                return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
