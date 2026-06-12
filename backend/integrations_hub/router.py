"""/api/v1/integrations-hub/* · Iter 92 · unified view of all platform integrations."""
from __future__ import annotations

import os
import re

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

from _adapter_helpers import stamp, conn

router = APIRouter(prefix="/api/v1/integrations-hub", tags=["integrations-hub"])


# ─────────────────────────────────────────────────────────────────────
# THE INTEGRATIONS REGISTRY · single source of truth

INTEGRATIONS = [
    # === LLM Infrastructure ===
    {"id": "ollama", "name": "Ollama", "category": "Inference",
     "type": "primary", "version_env": None,
     "check": {"url_env": "OLLAMA_HOST", "default": "http://localhost:11434",
               "path": "/api/tags"},
     "ui_path": "/api/v1/llm-gateway/ollama/plan",
     "config_link": "/api/v1/llm-gateway/ollama/plan",
     "docs": "https://ollama.com", "license": "MIT",
     "purpose": "Primary LLM runtime · 4-tier model plan",
     "iter": 87, "global_policy": "§111"},

    {"id": "vllm", "name": "vLLM", "category": "Inference",
     "type": "adapter", "version_env": None,
     "check": {"url_env": "VLLM_URL", "default": "http://localhost:8000",
               "path": "/health"},
     "ui_path": "/api/v1/vllm/health",
     "config_link": "/api/v1/vllm/config-example",
     "docs": "https://github.com/vllm-project/vllm", "license": "Apache 2.0",
     "purpose": "High-throughput inference · 5-10x Ollama at scale",
     "iter": 90, "global_policy": "§110"},

    # === LLM Gateway ===
    {"id": "llm_gateway", "name": "LLM Gateway", "category": "Gateway",
     "type": "core", "version_env": None,
     "check": {"endpoint": "/api/v1/llm-gateway/health"},
     "ui_path": "/api/v1/llm-gateway/health",
     "config_link": "/api/v1/llm-gateway/load-balancer/info",
     "docs": "internal", "license": "internal",
     "purpose": "9-capability gateway: route/fallback/cache/RL/guard/cost/audit",
     "iter": 87, "global_policy": "§108"},

    # === Observability · Traces ===
    {"id": "langsmith", "name": "LangSmith", "category": "Observability",
     "type": "adapter",
     "check": {"env": "LANGSMITH_API_KEY"},
     "ui_path": "/api/v1/langsmith/health",
     "config_link": "/api/v1/langsmith/config-example",
     "docs": "https://smith.langchain.com", "license": "Proprietary (free tier)",
     "purpose": "LLM observability · traces · datasets · evals",
     "iter": 88, "global_policy": "§110"},

    {"id": "langfuse", "name": "Langfuse", "category": "Observability",
     "type": "adapter",
     "check": {"env": "LANGFUSE_PUBLIC_KEY"},
     "ui_path": "/api/v1/langfuse/health",
     "config_link": "/api/v1/langfuse/config-example",
     "docs": "https://github.com/langfuse/langfuse", "license": "Apache 2.0 (OSS)",
     "purpose": "OSS LangSmith alternative · self-hostable",
     "iter": 89, "global_policy": "§110"},

    {"id": "agentops", "name": "AgentOps", "category": "Observability",
     "type": "adapter",
     "check": {"env": "AGENTOPS_API_KEY"},
     "ui_path": "/api/v1/agentops/health",
     "config_link": "/api/v1/agentops/config-example",
     "docs": "https://agentops.ai", "license": "Proprietary",
     "purpose": "Agent session tracking · step recording",
     "iter": 89, "global_policy": "§110"},

    {"id": "jaeger", "name": "Jaeger", "category": "Observability",
     "type": "adapter",
     "check": {"url_env": "JAEGER_URL", "default": "http://localhost:16686",
               "path": ""},
     "ui_path": "/api/v1/jaeger/health",
     "config_link": "/api/v1/jaeger/config-example",
     "docs": "https://jaegertracing.io", "license": "Apache 2.0 (CNCF)",
     "purpose": "Distributed tracing · service map",
     "iter": 90, "global_policy": "§112"},

    {"id": "tempo", "name": "Grafana Tempo", "category": "Observability",
     "type": "adapter",
     "check": {"url_env": "TEMPO_URL", "default": "http://localhost:3200",
               "path": "/ready"},
     "ui_path": "/api/v1/tempo/health",
     "config_link": "/api/v1/tempo/config-example",
     "docs": "https://grafana.com/oss/tempo", "license": "AGPL",
     "purpose": "Tempo · pairs with Loki+Mimir for L+T+M stack",
     "iter": 90, "global_policy": "§112"},

    {"id": "opensearch", "name": "OpenSearch", "category": "Observability",
     "type": "adapter",
     "check": {"url_env": "OPENSEARCH_URL", "default": "http://localhost:9200",
               "path": ""},
     "ui_path": "/api/v1/opensearch/health",
     "config_link": "/api/v1/opensearch/config-example",
     "docs": "https://opensearch.org", "license": "Apache 2.0",
     "purpose": "Full-text + vector search · log aggregation",
     "iter": 89, "global_policy": "§110"},

    # === Security / Safety ===
    {"id": "presidio", "name": "Microsoft Presidio", "category": "Safety",
     "type": "adapter",
     "check": {"url_env": "PRESIDIO_ANALYZER_URL", "default": "http://localhost:5002",
               "path": "/health"},
     "ui_path": "/api/v1/presidio/health",
     "config_link": "/api/v1/presidio/config-example",
     "docs": "https://github.com/microsoft/presidio", "license": "MIT",
     "purpose": "PII detection · 50+ entity types · §76 Privacy",
     "iter": 89, "global_policy": "§110"},

    {"id": "nemoguardrails", "name": "NeMo Guardrails", "category": "Safety",
     "type": "adapter",
     "check": {"url_env": "NEMOGUARDRAILS_URL", "default": "http://localhost:8000",
               "path": "/health"},
     "ui_path": "/api/v1/nemoguardrails/health",
     "config_link": "/api/v1/nemoguardrails/config-example",
     "docs": "https://github.com/NVIDIA/NeMo-Guardrails", "license": "Apache 2.0",
     "purpose": "Topic/dialog/fact/moderation rails · §76 Safety",
     "iter": 89, "global_policy": "§110"},

    {"id": "opa", "name": "Open Policy Agent", "category": "Governance",
     "type": "adapter",
     "check": {"url_env": "OPA_URL", "default": "http://localhost:8181",
               "path": "/health"},
     "ui_path": "/api/v1/opa/health",
     "config_link": "/api/v1/opa/config-example",
     "docs": "https://openpolicyagent.org", "license": "Apache 2.0 (CNCF)",
     "purpose": "Rego policy engine · decision logs",
     "iter": 89, "global_policy": "§110"},

    # === Data ===
    {"id": "postgres", "name": "PostgreSQL", "category": "Database",
     "type": "core",
     "check": {"db": True},
     "ui_path": "/api/v1/health",
     "docs": "https://www.postgresql.org", "license": "PostgreSQL License",
     "purpose": "Primary DB · 32+ governance tables · §101.E",
     "iter": 1, "global_policy": "§101"},

    # === Cron / Workflow ===
    {"id": "auto_next_loop", "name": "Auto-Next Loop", "category": "Automation",
     "type": "core",
     "check": {"cron_tag": "INSUR-AUTO-NEXT"},
     "ui_path": "/api/v1/missing-items-advisor/scan",
     "config_link": "/api/v1/missing-items-advisor/scan",
     "docs": "internal", "license": "internal",
     "purpose": "Cron-driven §105 picker · every 5 min",
     "iter": 85, "global_policy": "§106"},
]


def _check_url(url: str, path: str = "/health", timeout: float = 2.0) -> dict:
    try:
        full = f"{url}{path}" if not url.endswith(path) else url
        r = httpx.get(full, timeout=timeout)
        return {"reachable": r.status_code < 500, "status_code": r.status_code,
                "url": full}
    except Exception as e:
        return {"reachable": False, "error": str(e)[:100], "url": url + path}


def _status_one(integ: dict) -> dict:
    check = integ.get("check", {})
    status = "unknown"
    detail = {}

    if "env" in check:
        configured = bool(os.environ.get(check["env"], ""))
        status = "live" if configured else "scaffold"
        detail = {"env_set": configured, "env_var": check["env"]}
    elif "url_env" in check or "default" in check:
        env_key = check.get("url_env")
        env_value = os.environ.get(env_key, "") if env_key else ""
        configured = bool(env_value)
        target_url = env_value or check.get("default", "")
        if target_url:
            check_result = _check_url(target_url, check.get("path", ""))
            if check_result["reachable"]:
                status = "live"
            else:
                status = "live_unreachable" if configured else "scaffold"
            detail = {"env_set": configured, "target": target_url,
                      "reachable": check_result["reachable"]}
        else:
            status = "scaffold"
    elif "endpoint" in check:
        # Internal endpoint check
        status = "core"
        detail = {"endpoint": check["endpoint"]}
    elif "db" in check:
        try:
            with conn() as c, c.cursor() as cur:
                cur.execute("SELECT 1")
            status = "live"
            detail = {"db_reachable": True}
        except Exception:
            status = "scaffold"
    elif "cron_tag" in check:
        # Best-effort cron detection
        import subprocess
        try:
            out = subprocess.run(["crontab", "-l"], capture_output=True, text=True, timeout=2)
            status = "live" if check["cron_tag"] in out.stdout else "scaffold"
            detail = {"cron_tag_found": status == "live"}
        except Exception:
            status = "unknown"
            detail = {"crontab_check_failed": True}

    return {**integ, "status": status, "detail": detail}


@router.get("/health")
def health():
    return {**stamp(), "module": "integrations-hub",
            "integrations_total": len(INTEGRATIONS),
            "categories": list({i["category"] for i in INTEGRATIONS}),
            "spec": "Unified admin view · all installed tools/adapters"}


@router.get("")
def list_all():
    """Live status check for every integration · returns sorted by status."""
    results = [_status_one(i) for i in INTEGRATIONS]
    # Sort: live first · then scaffold · then unknown
    order = {"live": 0, "live_unreachable": 1, "core": 2, "scaffold": 3, "unknown": 4}
    results.sort(key=lambda r: (order.get(r["status"], 99), r["category"], r["name"]))

    summary = {
        "live":             sum(1 for r in results if r["status"] == "live"),
        "live_unreachable": sum(1 for r in results if r["status"] == "live_unreachable"),
        "core":             sum(1 for r in results if r["status"] == "core"),
        "scaffold":         sum(1 for r in results if r["status"] == "scaffold"),
        "unknown":          sum(1 for r in results if r["status"] == "unknown"),
        "total":            len(results),
    }
    by_category = {}
    for r in results:
        by_category.setdefault(r["category"], 0)
        by_category[r["category"]] += 1
    return {**stamp(), "integrations": results, "summary": summary,
            "by_category": by_category}


@router.get("/by-category/{category}")
def by_category(category: str):
    results = [_status_one(i) for i in INTEGRATIONS
                if i["category"].lower() == category.lower()]
    return {**stamp(), "category": category, "count": len(results),
            "integrations": results}


# ─────────────────────────────────────────────────────────────────────
# Prompt injection scanner (per operator brief in Iter 92)

INJECTION_PATTERNS_EXTENDED = [
    # Direct injection attempts
    (r"ignore (previous|prior|above|all) (instructions?|prompt)", "direct_override", "high"),
    (r"forget (what|everything) (i|you) (just |)said", "memory_wipe", "high"),
    (r"system prompt", "system_probe", "medium"),
    (r"reveal (your|the) (prompt|instructions)", "prompt_extract", "high"),
    (r"jailbreak", "jailbreak_marker", "high"),
    (r"DAN mode", "dan_attempt", "high"),
    (r"developer mode", "dev_mode_attempt", "high"),
    # Role manipulation
    (r"you are now (a|an) (.+?)(\.|$)", "role_change", "medium"),
    (r"act as (a|an) (.+?)(\.|$)", "role_switch", "medium"),
    (r"pretend (to be|you are)", "role_pretend", "medium"),
    (r"simulate (a|an) (.+?)(\.|$)", "role_simulate", "medium"),
    # Output manipulation
    (r"output (only|just) (.+?)$", "output_constraint", "low"),
    (r"do not (apologize|warn|disclaim)", "warning_suppression", "medium"),
    (r"no (matter what|exceptions)", "rule_break", "medium"),
    # Indirect injection
    (r"\[\s*system\s*\]", "structured_injection", "high"),
    (r"<\s*system\s*>", "xml_injection", "high"),
    (r"###\s*SYSTEM", "markdown_injection", "high"),
    (r"INSTRUCTIONS\s*[:;]", "instruction_label", "medium"),
    # Encoding tricks
    (r"base64[:\s]+[A-Za-z0-9+/=]{20,}", "base64_payload", "high"),
    (r"rot13[:\s]+", "encoding_trick", "medium"),
    (r"hex[:\s]+0x[a-fA-F0-9]{10,}", "hex_payload", "medium"),
    # Tool/MCP abuse
    (r"call (tool|function|mcp) (.+?) with", "tool_abuse_attempt", "high"),
    (r"execute (script|code|command)", "code_exec_attempt", "high"),
    (r"download (from|file)", "exfil_attempt", "high"),
    # Multi-turn context attacks
    (r"previous (conversation|chat)", "context_extract", "medium"),
    (r"summarize (everything|all) (you|we)", "context_extract", "medium"),
    # Authority claims
    (r"as (the )?(admin|owner|developer|operator)", "authority_claim", "medium"),
    (r"i am (the )?(admin|owner|developer|operator)", "authority_claim", "high"),
    # Persona break
    (r"break character", "persona_break", "medium"),
    (r"step out of (your|the) role", "persona_break", "medium"),
]


class InjectionScanRequest(BaseModel):
    text: str
    block_threshold: str = "medium"  # low/medium/high


@router.post("/prompt-injection/scan")
def prompt_injection_scan(body: InjectionScanRequest):
    """30-pattern prompt injection scanner · returns severity + class."""
    sev_level = {"low": 0, "medium": 1, "high": 2}
    threshold = sev_level.get(body.block_threshold, 1)
    findings = []
    should_block = False
    for pat_str, klass, sev in INJECTION_PATTERNS_EXTENDED:
        try:
            pat = re.compile(pat_str, re.I)
            for m in pat.finditer(body.text):
                findings.append({
                    "class": klass, "severity": sev,
                    "matched": m.group()[:60],
                    "start": m.start(), "end": m.end(),
                })
                if sev_level[sev] >= threshold:
                    should_block = True
        except re.error:
            pass
    by_class = {}
    for f in findings:
        by_class[f["class"]] = by_class.get(f["class"], 0) + 1
    return {**stamp(),
            "n_findings": len(findings),
            "should_block": should_block,
            "block_threshold": body.block_threshold,
            "by_severity": {
                "high": sum(1 for f in findings if f["severity"] == "high"),
                "medium": sum(1 for f in findings if f["severity"] == "medium"),
                "low": sum(1 for f in findings if f["severity"] == "low"),
            },
            "by_class": by_class,
            "findings": findings[:30]}


@router.get("/prompt-injection/catalog")
def prompt_injection_catalog():
    """30-pattern catalog · grouped by attack class."""
    by_class = {}
    for pat_str, klass, sev in INJECTION_PATTERNS_EXTENDED:
        by_class.setdefault(klass, []).append({"pattern": pat_str, "severity": sev})
    return {**stamp(),
            "total_patterns": len(INJECTION_PATTERNS_EXTENDED),
            "attack_classes": list(by_class.keys()),
            "by_class": by_class,
            "deployment_options": [
                "Built-in (default · this catalog)",
                "NeMo Guardrails adapter (Iter 89 · live when configured)",
                "Llama Guard (Meta · external)",
                "Lakera Guard / Guardrails.ai (commercial)",
            ],
            "spec": "§108 + §113 · §76 Security pillar"}
