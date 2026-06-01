#!/usr/bin/env python3
"""
Gate-4 empirical install verification per global CLAUDE.md §56.

Imports each AI/agent tool listed in docs/AI_AGENT_TOOLS_EVALUATION.md and
reports installed version (or honest absence). Writes a JSON snapshot to
data/agent-supervisor/techstack_audit.json so the drill + governance check
can read from a deterministic location.

Exit 0 if all tools either import cleanly OR are explicitly verdict=skip.
Exit 1 if any tool that should be installed (stage-1/2/3) is missing or
unimportable. Detailed report on stdout.
"""
from __future__ import annotations

import importlib
import importlib.metadata
import json
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = REPO_ROOT / "data" / "agent-supervisor" / "techstack_audit.json"


@dataclass
class Tool:
    """One row in the techstack audit. Stage maps to §56 adoption stages."""

    name: str
    import_name: str          # what we `import`
    pypi: str | None          # `pip install <pypi>` (None if not on PyPI)
    stage: str                # stage-1 / stage-2 / stage-3 / skip / document
    purpose: str
    version: str | None = None
    importable: bool = False
    error: str = ""
    expected_present: bool = field(init=False, default=False)

    def __post_init__(self) -> None:
        # stage-1/2/3 are expected to be installed; skip/document are not.
        self.expected_present = self.stage in {"stage-1", "stage-2", "stage-3"}


TOOLS: list[Tool] = [
    Tool("DSPy", "dspy", "dspy-ai", "stage-1",
         "Prompt optimization for LMs (Stanford)"),
    Tool("Haystack", "haystack", "haystack-ai", "stage-1",
         "RAG framework (deepset)"),
    Tool("Pydantic AI", "pydantic_ai", "pydantic-ai", "stage-1",
         "Pydantic-typed agent framework"),
    Tool("OpenHands", "openhands", "openhands-ai", "stage-3",
         "Autonomous coding agent (formerly OpenDevin)"),
    Tool("AgentOps", "agentops", "agentops", "stage-1",
         "Agent observability + cost tracking"),
    Tool("Arize Phoenix", "phoenix", "arize-phoenix", "stage-1",
         "Self-hosted LLM tracing UI"),
    Tool("LangSmith", "langsmith", "langsmith", "stage-1",
         "LangChain tracing (SaaS)"),
    Tool("CrewAI", "crewai", "crewai", "stage-2",
         "Role-based multi-agent framework"),
    Tool("AutoGen (pyautogen)", "autogen_agentchat", "pyautogen", "stage-2",
         "Microsoft multi-agent conversation framework (v0.4 split SDK: autogen_agentchat + autogen_core)"),
    Tool("OpenAI Swarm", "swarm", None, "skip",
         "Experimental educational multi-agent; CrewAI/AutoGen preferred"),
    Tool("BMad-Method", "bmad", None, "document",
         "Methodology only; Node.js/CLI, not a Python pkg"),
    # ---- Batch 2 (2026-05-26): orchestrators + LLM gateways + observability
    Tool("Dagster", "dagster", "dagster", "stage-2",
         "Data orchestrator (alternative to Airflow/Prefect)"),
    Tool("Prefect", "prefect", "prefect", "stage-2",
         "Workflow orchestrator (Python-native)"),
    Tool("Kestra (Python SDK)", "kestra", "kestra", "stage-2",
         "Workflow orchestration Python SDK; server is Java/Kotlin (Docker)"),
    Tool("Windmill (wmill SDK)", "wmill", "wmill", "stage-2",
         "Open-source dev/workflow platform Python SDK; server is Rust (Docker)"),
    Tool("Portkey", "portkey_ai", "portkey-ai", "stage-1",
         "LLM gateway: load balancing, fallbacks, caching, observability"),
    Tool("LiteLLM", "litellm", "litellm", "stage-1",
         "Universal LLM API gateway — call 100+ providers via one OpenAI-shaped API"),
    Tool("OpenLit", "openlit", "openlit", "stage-1",
         "Open-source LLM observability + OTel auto-instrumentation"),
    Tool("Langfuse", "langfuse", "langfuse", "stage-1",
         "Open-source LLM observability (self-host alternative to LangSmith)"),
    Tool("Helicone", "helicone", None, "document",
         "LLM observability + caching gateway; integrated via OpenAI base_url override, not pip"),
]


def _try_import(tool: Tool) -> None:
    """Set tool.importable/version/error. Never crashes the audit run."""
    if tool.import_name is None or not tool.expected_present:
        return
    try:
        importlib.import_module(tool.import_name)
        tool.importable = True
        try:
            # Prefer the PyPI package name for version metadata (some packages
            # use a different import name vs distribution name).
            dist_name = tool.pypi or tool.import_name
            tool.version = importlib.metadata.version(dist_name)
        except importlib.metadata.PackageNotFoundError:
            tool.version = "unknown"
    except ImportError as exc:
        tool.importable = False
        tool.error = f"ImportError: {exc}"[:200]
    except Exception as exc:  # noqa: BLE001 — capture init-time crashes
        tool.importable = False
        tool.error = f"{type(exc).__name__}: {exc}"[:200]


def main() -> int:
    print(f"\nTECHSTACK AUDIT  (§56 gate-4)\n")
    t0 = time.time()

    for tool in TOOLS:
        _try_import(tool)

    rows = [
        {
            "name": t.name,
            "import_name": t.import_name,
            "pypi": t.pypi,
            "stage": t.stage,
            "purpose": t.purpose,
            "expected_present": t.expected_present,
            "importable": t.importable,
            "version": t.version,
            "error": t.error,
        }
        for t in TOOLS
    ]
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps({"audited_at": time.time(), "tools": rows}, indent=2) + "\n")

    # Pretty-print to stdout
    print(f"{'tool':<24} {'stage':<10} {'importable':<11} {'version':<12} note")
    print("-" * 90)
    exit_code = 0
    for t in TOOLS:
        if t.expected_present and not t.importable:
            marker, note = "✗", t.error or "missing"
            exit_code = 1
        elif t.expected_present and t.importable:
            marker, note = "✓", "ok"
        else:
            marker, note = "—", t.purpose[:40]
        print(f"{marker} {t.name:<22} {t.stage:<10} {str(t.importable):<11} {(t.version or '-'):<12} {note}")

    print(f"\nwrote {OUTPUT_PATH.relative_to(REPO_ROOT)} ({len(rows)} tools)")
    print(f"elapsed: {time.time() - t0:.1f}s  exit_code={exit_code}")
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
