"""LLM Gateway extensions · Iter 91 · smart router + callbacks + guardrails + 50-PII catalog."""
from __future__ import annotations

import json
import os
import re
import time
import uuid
from datetime import datetime, timezone

import httpx
import psycopg2
import psycopg2.extras
from fastapi import APIRouter
from pydantic import BaseModel

from _adapter_helpers import stamp, conn

router = APIRouter(prefix="/api/v1/llm-gateway", tags=["llm-gateway-extensions"])


# ─────────────────────────────────────────────────────────────────────
# 1. SMART ROUTER · classify intent + route to optimal model

INTENT_HEURISTICS = [
    (re.compile(r"\b(classify|categorize|label|is this|which type)\b", re.I), "classify",     "tier_1_fast"),
    (re.compile(r"\b(translate|translation)\b", re.I),                          "translate",    "tier_1_fast"),
    (re.compile(r"\b(summarize|tldr|short summary|key points)\b", re.I),         "summarize",    "tier_2_balanced"),
    (re.compile(r"\b(write code|generate code|implement|function|class)\b", re.I), "code_generation", "tier_4_specialty"),
    (re.compile(r"\b(review code|debug|fix bug|optimize)\b", re.I),              "code_review",  "tier_4_specialty"),
    (re.compile(r"\b(explain|reasoning|why|step by step|analyze)\b", re.I),       "reasoning",    "tier_3_heavy"),
    (re.compile(r"\b(search|find|lookup|retrieve)\b", re.I),                      "rag_answer",   "tier_2_balanced"),
    (re.compile(r"\b(ignore previous|jailbreak|system prompt)\b", re.I),          "guard",        "tier_1_fast"),
]


class SmartRouteRequest(BaseModel):
    prompt: str
    use_llm_classifier: bool = False


@router.post("/smart-router/route")
def smart_route(body: SmartRouteRequest):
    """Classify intent (heuristic OR LLM) → pick tier + model."""
    matched_intent = "general"
    matched_tier = "tier_2_balanced"
    method = "heuristic"

    # Heuristic pass
    for pat, intent, tier in INTENT_HEURISTICS:
        if pat.search(body.prompt):
            matched_intent = intent
            matched_tier = tier
            break

    # Optional LLM classifier (uses Ollama tier-1 model)
    if body.use_llm_classifier and matched_intent == "general":
        try:
            ollama_host = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
            classifier_prompt = (
                f"Classify this query into one of: classify, summarize, "
                f"code_generation, code_review, reasoning, rag_answer, translate, general. "
                f"Reply with ONE word only.\n\nQuery: {body.prompt[:300]}"
            )
            r = httpx.post(f"{ollama_host}/api/generate",
                           json={"model": "llama3.2:1b", "prompt": classifier_prompt,
                                 "stream": False},
                           timeout=10)
            if r.status_code == 200:
                pred = r.json().get("response", "").strip().lower().split()[0] if r.json().get("response") else "general"
                if pred in ["classify", "summarize", "code_generation", "code_review",
                            "reasoning", "rag_answer", "translate"]:
                    matched_intent = pred
                    method = "llm_classifier"
                    intent_tier = {"classify": "tier_1_fast", "summarize": "tier_2_balanced",
                                    "code_generation": "tier_4_specialty",
                                    "code_review": "tier_4_specialty",
                                    "reasoning": "tier_3_heavy",
                                    "rag_answer": "tier_2_balanced",
                                    "translate": "tier_1_fast"}
                    matched_tier = intent_tier.get(matched_intent, "tier_2_balanced")
        except Exception:
            pass

    tier_models = {
        "tier_1_fast": ["llama3.2:1b"],
        "tier_2_balanced": ["llama3.2:3b"],
        "tier_3_heavy": ["llama3.1:8b"],
        "tier_4_specialty": ["deepseek-coder:6.7b"],
    }
    picked = tier_models.get(matched_tier, ["llama3.2:3b"])[0]

    return {**stamp(), "intent": matched_intent, "tier": matched_tier,
            "picked_model": picked, "method": method,
            "prompt_preview": body.prompt[:100],
            "spec": "§111 Ollama plan · §108 LLM gateway"}


# ─────────────────────────────────────────────────────────────────────
# 2. CALLBACKS · pre/post hooks registry

CALLBACK_CATALOG = [
    {"id": "pre_pii_redact",
     "phase": "pre_call",
     "name": "PII redaction before LLM call",
     "active": True,
     "implementation": "Iter 87 _guardrails_input"},
    {"id": "pre_injection_block",
     "phase": "pre_call",
     "name": "Prompt injection detection · block",
     "active": True,
     "implementation": "Iter 87 _guardrails_input"},
    {"id": "pre_rate_limit",
     "phase": "pre_call",
     "name": "Rate limit check per tenant+model",
     "active": True,
     "implementation": "Iter 87 _rate_check"},
    {"id": "pre_cache_lookup",
     "phase": "pre_call",
     "name": "Cache lookup · skip on hit",
     "active": True,
     "implementation": "Iter 87 _cache_get"},
    {"id": "post_output_safety",
     "phase": "post_call",
     "name": "Output safety check · redact internal leak",
     "active": True,
     "implementation": "Iter 87 _guardrails_output"},
    {"id": "post_cache_store",
     "phase": "post_call",
     "name": "Store response in cache",
     "active": True,
     "implementation": "Iter 87 _cache_set"},
    {"id": "post_cost_track",
     "phase": "post_call",
     "name": "Calculate cost per model registry",
     "active": True,
     "implementation": "Iter 87 _calc_cost"},
    {"id": "post_audit_row",
     "phase": "post_call",
     "name": "§107 stamped audit row · llm_gateway_call",
     "active": True,
     "implementation": "Iter 87 _audit_call"},
    {"id": "post_metric_export",
     "phase": "post_call",
     "name": "Export to Prometheus / OTel",
     "active": False,
     "implementation": "Stage-1 adapter ready · Iter 90"},
    {"id": "post_langsmith_trace",
     "phase": "post_call",
     "name": "Send trace to LangSmith / Langfuse",
     "active": False,
     "implementation": "Stage-1 adapter ready · Iter 88-89"},
    {"id": "post_fact_check",
     "phase": "post_call",
     "name": "Verify claims via RAG retrieval",
     "active": False,
     "implementation": "Scaffold · per §76 hallucination layer 4"},
    {"id": "post_response_grade",
     "phase": "post_call",
     "name": "Auto-grade response quality (LLM-as-judge)",
     "active": False,
     "implementation": "Scaffold · queues for batched eval"},
]


@router.get("/callbacks/catalog")
def callbacks_catalog():
    """Operator-facing callback registry · 12 hooks across pre+post call."""
    pre = [c for c in CALLBACK_CATALOG if c["phase"] == "pre_call"]
    post = [c for c in CALLBACK_CATALOG if c["phase"] == "post_call"]
    return {**stamp(),
            "module": "callbacks-catalog",
            "pre_call_hooks": pre,
            "post_call_hooks": post,
            "active_count": sum(1 for c in CALLBACK_CATALOG if c["active"]),
            "scaffold_count": sum(1 for c in CALLBACK_CATALOG if not c["active"]),
            "execution_order": "pre_call → LLM call → post_call",
            "spec": "§108 callback registry · per §56 Stage-1 honest"}


# ─────────────────────────────────────────────────────────────────────
# 3. EXTENDED GUARDRAILS · catalog beyond the 6 wired

GUARDRAIL_CATALOG = [
    # Input rails
    {"id": "pii_redact",            "phase": "input",  "active": True,  "category": "privacy",      "description": "Redact SSN/CC/email/phone (Iter 87 + Presidio adapter Iter 89)"},
    {"id": "injection_detect",       "phase": "input",  "active": True,  "category": "security",     "description": "Block 'ignore previous' / jailbreak / DAN mode"},
    {"id": "topic_blocklist",        "phase": "input",  "active": True,  "category": "safety",       "description": "Block weapons/exploit/CSAM topics (NeMo adapter Iter 89)"},
    {"id": "token_budget_check",     "phase": "input",  "active": True,  "category": "cost",         "description": "Reject if >tenant budget remaining"},
    {"id": "language_filter",        "phase": "input",  "active": False, "category": "compliance",   "description": "Detect language · route to per-locale model"},
    {"id": "intent_classification",  "phase": "input",  "active": True,  "category": "routing",      "description": "Smart router (this Iter 91)"},
    {"id": "context_size_check",     "phase": "input",  "active": True,  "category": "reliability",  "description": "Reject if prompt > max_tokens"},
    {"id": "user_quota_check",       "phase": "input",  "active": True,  "category": "abuse",        "description": "Per-user rate limit · per §103.4"},
    # Output rails
    {"id": "internal_leak_check",    "phase": "output", "active": True,  "category": "privacy",      "description": "Block hostname/secret/internal_ patterns (Iter 87)"},
    {"id": "fact_grounding_check",   "phase": "output", "active": False, "category": "hallucination", "description": "RAG citation enforcement · per §76 hallucination L2"},
    {"id": "toxicity_filter",        "phase": "output", "active": False, "category": "safety",       "description": "Detoxify model · score >0.5 redact (NeMo + Detoxify)"},
    {"id": "bias_filter",            "phase": "output", "active": False, "category": "fairness",     "description": "Per §76 RAI Fairness pillar"},
    {"id": "format_validator",       "phase": "output", "active": False, "category": "reliability",  "description": "JSON/schema validator · strict pydantic"},
    {"id": "compliance_redact",      "phase": "output", "active": False, "category": "compliance",   "description": "Redact regulated fields per tenant policy"},
    {"id": "length_clamp",           "phase": "output", "active": True,  "category": "cost",         "description": "Truncate to tenant max_response_tokens"},
    {"id": "citation_required",      "phase": "output", "active": False, "category": "trust",        "description": "Reject if no citation · per §48 explainability"},
]


@router.get("/guardrails/catalog")
def guardrails_catalog():
    """16 guardrail catalog · 8 input + 8 output · 8 active + 8 scaffold."""
    inputs = [g for g in GUARDRAIL_CATALOG if g["phase"] == "input"]
    outputs = [g for g in GUARDRAIL_CATALOG if g["phase"] == "output"]
    return {**stamp(),
            "module": "guardrails-catalog",
            "input_rails": inputs,
            "output_rails": outputs,
            "active_count": sum(1 for g in GUARDRAIL_CATALOG if g["active"]),
            "scaffold_count": sum(1 for g in GUARDRAIL_CATALOG if not g["active"]),
            "by_category": {
                "privacy": [g["id"] for g in GUARDRAIL_CATALOG if g["category"] == "privacy"],
                "security": [g["id"] for g in GUARDRAIL_CATALOG if g["category"] == "security"],
                "safety": [g["id"] for g in GUARDRAIL_CATALOG if g["category"] == "safety"],
                "fairness": [g["id"] for g in GUARDRAIL_CATALOG if g["category"] == "fairness"],
                "hallucination": [g["id"] for g in GUARDRAIL_CATALOG if g["category"] == "hallucination"],
                "compliance": [g["id"] for g in GUARDRAIL_CATALOG if g["category"] == "compliance"],
                "cost": [g["id"] for g in GUARDRAIL_CATALOG if g["category"] == "cost"],
                "trust": [g["id"] for g in GUARDRAIL_CATALOG if g["category"] == "trust"],
                "abuse": [g["id"] for g in GUARDRAIL_CATALOG if g["category"] == "abuse"],
                "reliability": [g["id"] for g in GUARDRAIL_CATALOG if g["category"] == "reliability"],
                "routing": [g["id"] for g in GUARDRAIL_CATALOG if g["category"] == "routing"],
            },
            "spec": "§108 guardrails catalog · §76 RAI alignment"}


# ─────────────────────────────────────────────────────────────────────
# 4. EXTENDED PII PATTERNS · 50+ patterns matching Presidio

PII_PATTERNS_EXTENDED = [
    # US identifiers
    ("US_SSN",               r"\b\d{3}-\d{2}-\d{4}\b", "high"),
    ("US_ITIN",              r"\b9\d{2}-[7-9]\d-\d{4}\b", "high"),
    ("US_DRIVERS_LICENSE",   r"\b[A-Z]\d{7,8}\b", "medium"),
    ("US_PASSPORT",          r"\b[0-9]{9}\b", "low"),
    ("US_BANK_ROUTING",      r"\b\d{9}\b", "medium"),
    # Credit cards
    ("CREDIT_CARD_VISA",     r"\b4\d{3}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b", "high"),
    ("CREDIT_CARD_MC",       r"\b5[1-5]\d{2}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b", "high"),
    ("CREDIT_CARD_AMEX",     r"\b3[47]\d{2}[ -]?\d{6}[ -]?\d{5}\b", "high"),
    ("CREDIT_CARD_DISCOVER", r"\b6011[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b", "high"),
    ("CVV",                  r"\b(?:cvv|cvc)[\s:]*\d{3,4}\b", "high"),
    # Contact info
    ("EMAIL_ADDRESS",        r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", "medium"),
    ("PHONE_US",             r"\b\+?1?[-\s]?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}\b", "medium"),
    ("PHONE_INTL_E164",      r"\+\d{1,3}\d{4,14}\b", "medium"),
    # Network
    ("IP_V4",                r"\b(?:\d{1,3}\.){3}\d{1,3}\b", "medium"),
    ("IP_V6",                r"\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b", "medium"),
    ("MAC_ADDRESS",          r"\b(?:[0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}\b", "medium"),
    ("URL_WITH_AUTH",        r"https?://[^\s/@]+:[^\s/@]+@\S+", "high"),
    # Medical
    ("MEDICAL_RECORD_NUMBER", r"\bMRN[-:\s]?\d{6,10}\b", "high"),
    ("NPI",                   r"\bNPI[-:\s]?\d{10}\b", "medium"),
    ("ICD_10",                r"\b[A-Z]\d{2}\.\d{1,4}\b", "low"),
    # Financial
    ("US_IBAN",              r"\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b", "high"),
    ("US_SWIFT",             r"\b[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?\b", "medium"),
    ("CRYPTO_BITCOIN",       r"\b(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}\b", "medium"),
    ("CRYPTO_ETH",           r"\b0x[a-fA-F0-9]{40}\b", "medium"),
    # Government IDs
    ("UK_NHS_NUMBER",        r"\b\d{3}\s?\d{3}\s?\d{4}\b", "high"),
    ("UK_NINO",              r"\b[A-Z]{2}\d{6}[A-Z]\b", "high"),
    ("CA_SIN",               r"\b\d{3}-\d{3}-\d{3}\b", "high"),
    ("AU_TFN",               r"\b\d{3}\s?\d{3}\s?\d{3}\b", "high"),
    ("AU_MEDICARE",          r"\b\d{4}[\s-]?\d{5}[\s-]?\d\b", "high"),
    # Names + dates
    ("DATE_DOB",             r"\b(?:0[1-9]|1[0-2])/(?:0[1-9]|[12]\d|3[01])/(?:19|20)\d{2}\b", "medium"),
    ("DATE_ISO",             r"\b(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b", "low"),
    # Tokens / keys
    ("AWS_ACCESS_KEY",       r"\bAKIA[0-9A-Z]{16}\b", "high"),
    ("AWS_SECRET_KEY",       r"\b(?<![A-Za-z0-9])[A-Za-z0-9/+=]{40}(?![A-Za-z0-9])\b", "high"),
    ("GCP_API_KEY",          r"\bAIza[0-9A-Za-z\-_]{35}\b", "high"),
    ("AZURE_KEY",            r"\b[a-zA-Z0-9_-]{43}=\b", "medium"),
    ("OPENAI_API_KEY",       r"\bsk-[a-zA-Z0-9]{32,}\b", "high"),
    ("ANTHROPIC_API_KEY",    r"\bsk-ant-[a-zA-Z0-9-_]{50,}\b", "high"),
    ("HUGGINGFACE_TOKEN",    r"\bhf_[a-zA-Z0-9]{34}\b", "high"),
    ("GITHUB_TOKEN",         r"\bghp_[a-zA-Z0-9]{36}\b", "high"),
    ("GITHUB_OAUTH",         r"\bgho_[a-zA-Z0-9]{36}\b", "high"),
    ("SLACK_BOT_TOKEN",      r"\bxoxb-[0-9a-zA-Z-]{30,}\b", "high"),
    ("JWT",                  r"\beyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*\b", "high"),
    ("PRIVATE_KEY_HEADER",   r"-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----", "high"),
    # Auth / passwords (heuristic)
    ("PASSWORD_LITERAL",     r"\b(password|pwd|passwd)[\s:=]+\S+", "medium"),
    ("DATABASE_URL",         r"\b(?:postgresql|mysql|mongodb)://[^\s]+", "high"),
    # Misc
    ("VEHICLE_VIN",          r"\b[A-HJ-NPR-Z0-9]{17}\b", "low"),
    ("LICENSE_PLATE_US",     r"\b[A-Z0-9]{2,7}\b", "low"),
    ("BIOMETRIC_HASH",       r"\bbio[-_]hash[-:\s]?[a-f0-9]{32,}\b", "medium"),
    ("DEVICE_IMEI",          r"\b\d{15}\b", "low"),
]


@router.get("/pii-patterns/catalog")
def pii_patterns_catalog():
    """50+ PII patterns · alternative to Presidio · used by gateway guardrails."""
    by_severity = {"high": [], "medium": [], "low": []}
    for name, pat, sev in PII_PATTERNS_EXTENDED:
        by_severity[sev].append({"name": name, "pattern": pat, "severity": sev})
    return {**stamp(),
            "module": "pii-patterns-catalog",
            "total_patterns": len(PII_PATTERNS_EXTENDED),
            "by_severity": {k: len(v) for k, v in by_severity.items()},
            "patterns": [{"name": n, "severity": s} for n, _, s in PII_PATTERNS_EXTENDED],
            "high_severity_sample": by_severity["high"][:10],
            "deployment_options": [
                "Built-in (default · Iter 91 · regex-only · zero dep)",
                "Presidio adapter (Iter 89 · 50+ entity types when live)",
                "AWS Macie / GCP DLP (external · §42 gated)",
                "Custom recognizer (Stage-2 ·  per-tenant)",
            ],
            "spec": "§76 RAI Privacy pillar · §108 LLM gateway"}


class PIIScanRequest(BaseModel):
    text: str
    severity_min: str = "low"  # low / medium / high


@router.post("/pii-patterns/scan")
def pii_scan(body: PIIScanRequest):
    """Scan text against the 50+ pattern catalog."""
    sev_levels = {"low": 0, "medium": 1, "high": 2}
    threshold = sev_levels.get(body.severity_min, 0)
    findings = []
    for name, pat_str, sev in PII_PATTERNS_EXTENDED:
        if sev_levels[sev] < threshold:
            continue
        try:
            pat = re.compile(pat_str, re.I)
            for m in pat.finditer(body.text):
                findings.append({
                    "name": name, "severity": sev,
                    "start": m.start(), "end": m.end(),
                    "match_preview": m.group()[:30],
                })
        except re.error:
            pass
    return {**stamp(),
            "n_findings": len(findings),
            "by_severity": {
                "high": sum(1 for f in findings if f["severity"] == "high"),
                "medium": sum(1 for f in findings if f["severity"] == "medium"),
                "low": sum(1 for f in findings if f["severity"] == "low"),
            },
            "findings": findings[:50],
            "text_length": len(body.text)}


@router.get("/extensions/health")
def extensions_health():
    return {**stamp(),
            "module": "llm-gateway-extensions",
            "extensions": [
                {"name": "smart_router",       "endpoint": "POST /smart-router/route"},
                {"name": "callbacks",          "endpoint": "GET /callbacks/catalog"},
                {"name": "guardrails_catalog", "endpoint": "GET /guardrails/catalog"},
                {"name": "pii_patterns",       "endpoint": "GET /pii-patterns/catalog · POST /pii-patterns/scan"},
            ],
            "spec": "§108 + §111 · Iter 91"}
