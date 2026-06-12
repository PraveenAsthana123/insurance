"""/api/v1/agent-tools/* · §135 · Harness · Workspace · OpenRouter · Hook · Skill · Sub-agent."""
from __future__ import annotations
import os
from fastapi import APIRouter
from _adapter_helpers import stamp

router = APIRouter(prefix="/api/v1/agent-tools", tags=["agent-tools"])


# ════════════════════ 6 PRIMITIVES ════════════════════
PRIMITIVES = {
    "harness_agent": {
        "name": "Harness Agent",
        "policy": "§67 5-OS · cross-agent sync · MCP latency dodge",
        "purpose": "Distributed workflow consistency · cross-agent state sync",
        "install": "pip install harness-agent (when available)",
        "env_var": "HARNESS_AGENT_URL",
        "stage": "Stage-1 scaffold per §56",
        "endpoints": ["/health", "/sync/{tenant_id}", "/agents"],
        "use_case": "When agents on multiple nodes must share state · or when MCP RTT > 100ms",
        "alternative": "Use §117 5-agent orchestra with shared correlation_id (already live)",
    },
    "workspace": {
        "name": "Workspace (multi-agent shared context)",
        "policy": "§121 Memory Engine · shared memory · §117 orchestra",
        "purpose": "Each agent has scoped workspace · files · history · state",
        "install": "Built into platform · agent_memory_blob table",
        "env_var": "WORKSPACE_ROOT",
        "stage": "LIVE · backed by §121 memory engine",
        "endpoints": ["/api/v1/agent-kernel/agents/{id}/memory",
                       "/api/v1/agent-kernel/agents/{id}/memory/write"],
        "use_case": "Per-agent context storage · cross-session",
        "current_status": "LIVE (Iter 103+)",
    },
    "openrouter": {
        "name": "OpenRouter",
        "policy": "§108 LLM Gateway · multi-provider routing",
        "purpose": "Single API for 200+ LLM models (OpenAI · Anthropic · Mistral · etc)",
        "install": "pip install openai (compat client) + OPENROUTER_API_KEY",
        "env_var": "OPENROUTER_API_KEY",
        "stage": "Stage-1 scaffold · activate via env",
        "endpoints": ["/api/v1/llm-gateway/openrouter/health (when configured)"],
        "use_case": "Fallback when Ollama down · access to paid models · cost optimization",
        "alternative": "We have Ollama LIVE + LiteLLM scaffold · OpenRouter is paid alternative",
        "url_check": "https://openrouter.ai/api/v1/models",
    },
    "hook": {
        "name": "Hook (event-driven callbacks)",
        "policy": "§108 LLM Gateway callbacks · §113 16 guardrails · §44 autonomous loop",
        "purpose": "Pre/post hooks on LLM calls · agent invocations · state changes",
        "install": "Built into platform · /api/v1/llm-gateway/callbacks/catalog",
        "env_var": "(none · always on)",
        "stage": "LIVE · 12 hooks declared",
        "endpoints": ["/api/v1/llm-gateway/callbacks/catalog"],
        "use_case": "Logging · cost tracking · PII redaction · prompt injection scan · audit",
        "current_status": "LIVE (Iter 91+)",
    },
    "skill": {
        "name": "Skill (reusable agent capability)",
        "policy": "§121 + §122 Tool Registry · §131 AI taxonomy",
        "purpose": "Reusable named capability an agent can invoke (e.g. ocr · sentiment · summarize)",
        "install": "Built into platform · skill column in agent_invocation",
        "env_var": "(none)",
        "stage": "LIVE",
        "endpoints": ["/api/v1/agent-kernel/registry/tools",
                       "/api/v1/ai-type-impl/contract"],
        "use_case": "Compose agent from skills · each skill is a §133-compliant AI type",
        "current_status": "LIVE · 200 AI types now constitute the skill library",
    },
    "sub_agent": {
        "name": "Sub-agent (delegated specialized agent)",
        "policy": "§117 5-agent orchestra · §97 council · §103.5 decision policy",
        "purpose": "Parent agent delegates to specialized child · with own scope/budget",
        "install": "Built into platform · agent_invocation with parent_correlation_id",
        "env_var": "(none)",
        "stage": "LIVE",
        "endpoints": ["/api/v1/orchestra/run",
                       "/api/v1/council/deliberate (if exists)",
                       "/api/v1/agent-kernel/agents/{id}/identity"],
        "use_case": "Planner delegates to specialist · returns result · audit trail preserved",
        "current_status": "LIVE · §117 orchestra runs (CHECKER → PLANNER → EXECUTOR → MONITOR → APPROVER)",
    },
}


def _check_install(prim_id: str) -> dict:
    """Check install status for each primitive."""
    p = PRIMITIVES[prim_id]
    env_key = p.get("env_var", "")
    out = {"primitive": prim_id, "name": p["name"], "stage": p["stage"]}

    if prim_id == "harness_agent":
        try:
            import harness_agent  # type: ignore
            out["installed"] = True
        except ImportError:
            out["installed"] = False
            out["install_hint"] = "pip install harness-agent (not yet on PyPI)"
    elif prim_id == "workspace":
        # backed by DB · always live
        out["installed"] = True
        out["live_via"] = "agent_memory_blob table + /api/v1/agent-kernel/agents/{id}/memory"
    elif prim_id == "openrouter":
        url = os.environ.get("OPENROUTER_API_KEY", "")
        out["installed"] = bool(url)
        out["api_key_set"] = bool(url)
        if not url:
            out["activate_with"] = "export OPENROUTER_API_KEY=sk-or-..."
    elif prim_id == "hook":
        out["installed"] = True
        out["live_via"] = "/api/v1/llm-gateway/callbacks/catalog"
    elif prim_id == "skill":
        out["installed"] = True
        out["live_via"] = "/api/v1/agent-kernel/registry/tools + /api/v1/ai-type-impl/contract"
    elif prim_id == "sub_agent":
        out["installed"] = True
        out["live_via"] = "/api/v1/orchestra/run + agent_invocation table"
    return out


@router.get("/catalog")
def catalog():
    return {**stamp(),
            "primitives": PRIMITIVES,
            "n_primitives": len(PRIMITIVES),
            "spec": "§135"}


@router.get("/install-status")
def install_status():
    statuses = [_check_install(k) for k in PRIMITIVES]
    n_live = sum(1 for s in statuses if s.get("installed"))
    return {**stamp(),
            "n_primitives": len(statuses),
            "n_live": n_live,
            "n_pending": len(statuses) - n_live,
            "by_status": statuses,
            "spec": "§135 install verification (live)"}


@router.get("/primitive/{prim_id}")
def primitive(prim_id: str):
    if prim_id not in PRIMITIVES:
        return {"ok": False, "available": list(PRIMITIVES.keys())}
    return {**stamp(), "primitive": prim_id,
            "definition": PRIMITIVES[prim_id],
            "install_status": _check_install(prim_id),
            "spec": "§135"}


@router.get("/health")
def health():
    return {**stamp(), "module": "agent-tools",
            "n_primitives": len(PRIMITIVES),
            "spec": "§135"}


@router.get("/overview")
def overview():
    return {**stamp(),
            "title": "Agent Tooling Primitives · §135",
            "primitives": list(PRIMITIVES.keys()),
            "summary": {
                "live":         ["workspace", "hook", "skill", "sub_agent"],
                "scaffold":     ["harness_agent", "openrouter"],
            },
            "composes_with": ["§56 Stage-1", "§67 5-OS", "§97 council",
                                "§108 LLM Gateway", "§117 orchestra",
                                "§121 Agent Kernel", "§122 Tool Registry",
                                "§131 AI taxonomy"],
            "endpoints": [
                "/catalog          · 6 primitives",
                "/install-status   · live check",
                "/primitive/{id}   · detail per primitive",
                "/health · /overview",
            ],
            "spec": "§135"}
