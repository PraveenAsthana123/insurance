"""Discover every backend router · enumerate endpoints · classify capability."""
from __future__ import annotations

import importlib
import inspect
from pathlib import Path
from typing import Any

BACKEND = Path(__file__).resolve().parent.parent

# Routers already covered by the 4 agentic namespaces · skip those
AGENTIC_NAMESPACES = {
    "agentic_core", "agentic_ops", "enterprise_governance",
    "risk_incident_learning", "agentic_adapter",
}

# Heuristic category mapping based on router module name
CATEGORY_MAP = {
    "alert":        "Observability",
    "audit":        "Governance",
    "approval":     "Governance",
    "comment":      "Collaboration",
    "feedback":     "Quality",
    "feature_flag": "Platform",
    "webhook":      "Integration",
    "notification": "Communication",
    "session":      "Security",
    "pii":          "Security",
    "vulnerab":     "Security",
    "security":     "Security",
    "cors":         "Security",
    "settings":     "Platform",
    "healthz":      "Operations",
    "health_history":"Operations",
    "service":      "Operations",
    "metric":       "Observability",
    "latency":      "Observability",
    "heatmap":      "Observability",
    "heartbeat":    "Observability",
    "outbound":     "Observability",
    "trace":        "Observability",
    "regulator":    "Compliance",
    "migration":    "Platform",
    "deprecation":  "Platform",
    "well_known":   "Platform",
    "openapi":      "Platform",
    "api_changelog":"Platform",
    "resource_tag": "Platform",
    "cron":         "Operations",
    "tenant_config":"Platform",
    "data_pipeline":"DataOps",
    "pipeline":     "DataOps",
    "ml_runtime":   "MLOps",
    "voice_ai":     "AI",
    "responsible_ai":"AI",
    "ai_tool":      "AI",
    "webllm":       "AI",
    "marketing":    "Marketing",
    "content_ops":  "Marketing",
    "attribution":  "Marketing",
    "hitl":         "Governance",
    "correction":   "Governance",
    "use_cases":    "Business",
    "test_status":  "Quality",
    "job_queue":    "Operations",
    "ws_broadcast": "Communication",
    "audit_chain":  "Security",
    "audit_search": "Governance",
    "autonomous_dept":"AI",
}


def _category(module_name: str) -> str:
    for key, cat in CATEGORY_MAP.items():
        if key in module_name:
            return cat
    return "Platform"


def discover_router_modules() -> list[str]:
    """Find every backend/<X>/router.py · skip agentic namespaces + sub-folders."""
    out = []
    for path in sorted(BACKEND.glob("*/router.py")):
        ns = path.parent.name
        if ns in AGENTIC_NAMESPACES:
            continue
        out.append(ns)
    return out


def introspect_router(module_name: str) -> dict[str, Any]:
    """Load a router module · return endpoint inventory + classification."""
    try:
        mod = importlib.import_module(f"{module_name}.router")
    except Exception as e:
        return {"module": module_name, "error": f"{type(e).__name__}: {e}"}

    router = getattr(mod, "router", None)
    if router is None:
        return {"module": module_name, "error": "no router attribute"}

    endpoints = []
    for r in router.routes:
        methods = sorted(getattr(r, "methods", []) or [])
        methods = [m for m in methods if m != "HEAD"]
        path = getattr(r, "path", "")
        name = getattr(r, "name", "") or ""
        # Endpoint becomes a skill candidate
        endpoint_fn = getattr(r, "endpoint", None)
        doc = (inspect.getdoc(endpoint_fn) or "")[:200] if endpoint_fn else ""
        endpoints.append({
            "path": path,
            "methods": methods,
            "name": name,
            "doc": doc,
        })

    prefix = getattr(router, "prefix", "")
    tags = list(getattr(router, "tags", []) or [])

    return {
        "module": module_name,
        "prefix": prefix,
        "tags": tags,
        "category": _category(module_name),
        "n_endpoints": len(endpoints),
        "endpoints": endpoints,
    }


def discover_all() -> list[dict[str, Any]]:
    """Run discovery + introspection over all non-agentic routers."""
    out = []
    for mod_name in discover_router_modules():
        out.append(introspect_router(mod_name))
    return out
