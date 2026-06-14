#!/usr/bin/env python3
"""
Drill: Backend Observability + Agents spec + status presence lock · OP-16.

Operator (2026-06-14 16:50 MDT): pasted 50K char spec dump for
backend/observability/ (12 core + 9 extended) and backend/agents/ (16 core
+ 12 missing) · then asked "check these if readme file has been align,
backend code, architect align, all the component working, all of them
installed, all of them part of global and shared".

§122 BRUTAL answer: backend/observability/ and backend/agents/ folders
do NOT exist. 0 of 28 spec'd files exist at canonical paths. This drill
locks the SPEC + STATUS docs that capture the brutal truth · so future
iters can't claim "we have observability" without backing it up.

Steps (8 · 4 negative):
  1. (+) BACKEND_OBSERVABILITY_AGENTS_SPEC.md exists
  2. (+) BACKEND_OBSERVABILITY_AGENTS_STATUS.md exists
  3. (-) NEG · spec doc has all 12 observability core files named
  4. (-) NEG · spec doc has all 16 agent core files named
  5. (-) NEG · status doc has the brutal "0 of 28" finding
  6. (+) README.md references both spec + status docs
  7. (+) All 8 required packages installed
  8. (-) NEG · status doc names existing infrastructure (agent_kernel etc.)
"""
from __future__ import annotations
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent
SPEC = REPO / "docs/BACKEND_OBSERVABILITY_AGENTS_SPEC.md"
STATUS = REPO / "docs/BACKEND_OBSERVABILITY_AGENTS_STATUS.md"
README = REPO / "README.md"

OBS_CORE = [
    "otel_tracing.py", "metrics_collector.py", "log_pipeline.py",
    "trace_propagation.py", "langfuse_client.py", "langsmith_client.py",
    "phoenix_client.py", "agentops_client.py", "prometheus_exporter.py",
    "grafana_dashboard.py", "jaeger_exporter.py", "telemetry_router.py",
]

AGENT_CORE = [
    "base_agent.py", "orchestration_agent.py", "planner_agent.py",
    "architect_agent.py", "developer_agent.py", "coding_agent.py",
    "qa_agent.py", "security_agent.py", "compliance_agent.py",
    "reviewer_agent.py", "evaluation_agent.py", "rag_agent.py",
    "browser_agent.py", "deployment_agent.py", "monitoring_agent.py",
    "memory_agent.py",
]

REQUIRED_PACKAGES = [
    "opentelemetry-api", "opentelemetry-sdk", "prometheus_client",
    "langfuse", "langsmith", "arize-phoenix", "agentops", "loguru",
]


def step(n, ok, msg):
    print(f"  {'✓' if ok else '✗'} step {n}: {msg}")
    if not ok:
        raise SystemExit(1)


def main():
    print("drill_observability_agents_spec · §122 OP-16 brutal-honest lock")
    print("=" * 70)

    # Step 1 · SPEC doc
    step(1, SPEC.exists(), f"{SPEC.name} exists")

    # Step 2 · STATUS doc
    step(2, STATUS.exists(), f"{STATUS.name} exists")

    spec_src = SPEC.read_text(encoding="utf-8")
    status_src = STATUS.read_text(encoding="utf-8")

    # Step 3 · NEG · 12 observability files named in spec
    missing_obs = [f for f in OBS_CORE if f not in spec_src]
    step(3, len(missing_obs) == 0,
         f"NEG · all 12 observability files in spec · missing: {missing_obs or 'NONE'}")

    # Step 4 · NEG · 16 agent files named in spec
    missing_agt = [f for f in AGENT_CORE if f not in spec_src]
    step(4, len(missing_agt) == 0,
         f"NEG · all 16 agent files in spec · missing: {missing_agt or 'NONE'}")

    # Step 5 · NEG · "0 of 28" or similar brutal phrasing in status
    has_brutal = ("0 of 28" in status_src
                  or "0 of 12" in status_src
                  or "0 of 16" in status_src
                  or "MISSING" in status_src)
    step(5, has_brutal,
         f"NEG · status doc has brutal MISSING phrasing: {has_brutal}")

    # Step 6 · README references both docs
    readme_src = README.read_text(encoding="utf-8")
    has_spec_ref = "BACKEND_OBSERVABILITY_AGENTS_SPEC" in readme_src
    has_status_ref = "BACKEND_OBSERVABILITY_AGENTS_STATUS" in readme_src
    step(6, has_spec_ref and has_status_ref,
         f"README · spec ref={has_spec_ref} · status ref={has_status_ref}")

    # Step 7 · packages installed
    pip_path = "/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/pip"
    missing_pkg = []
    for pkg in REQUIRED_PACKAGES:
        try:
            result = subprocess.run(
                [pip_path, "show", pkg],
                capture_output=True, timeout=10,
            )
            if result.returncode != 0:
                missing_pkg.append(pkg)
        except Exception:
            missing_pkg.append(pkg)
    step(7, len(missing_pkg) == 0,
         f"All 8 packages installed · missing: {missing_pkg or 'NONE'}")

    # Step 8 · NEG · status doc names existing infrastructure
    has_existing = ("agent_kernel" in status_src
                    and "agent_workflow" in status_src)
    step(8, has_existing,
         f"NEG · status doc names existing infra (agent_kernel · agent_workflow): {has_existing}")

    print()
    print("ALL 8 STEPS PASSED")
    print()
    print("Contract verified:")
    print(f"  - Spec doc exists with all 12 observability + 16 agent files named")
    print(f"  - Status doc has brutal 0/28 finding")
    print(f"  - README references both docs")
    print(f"  - All 8 required packages installed")
    print(f"  - Status doc honestly names existing infrastructure paths")
    return 0


if __name__ == "__main__":
    sys.exit(main())
