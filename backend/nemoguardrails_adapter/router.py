"""/api/v1/nemoguardrails/* · Iter 89 · NVIDIA NeMo Guardrails Stage-1 adapter."""
from __future__ import annotations

import re
import httpx
from fastapi import APIRouter
from pydantic import BaseModel

from _adapter_helpers import stamp, configured_when, env_config, scaffold_note

router = APIRouter(prefix="/api/v1/nemoguardrails", tags=["nemoguardrails"])
ENV_KEY = "NEMOGUARDRAILS_URL"

# Built-in guardrails (when NeMo not deployed) · honest scaffold
TOPIC_BLOCKLIST = ["explosives", "weapons of mass destruction", "child", "exploit",
                   "racial slur", "self-harm", "suicide instructions"]
INJECTION_PATTERNS = [
    re.compile(r"ignore (previous|prior|above) (instructions?|prompt)", re.I),
    re.compile(r"forget what (i|you) (just |)said", re.I),
    re.compile(r"system prompt", re.I),
    re.compile(r"jailbreak", re.I),
    re.compile(r"DAN mode", re.I),
    re.compile(r"developer mode", re.I),
]


@router.get("/health")
def health():
    url = env_config(ENV_KEY, "http://localhost:8000")
    is_live = False
    if configured_when(ENV_KEY):
        try:
            r = httpx.get(f"{url}/health", timeout=2)
            is_live = r.status_code == 200
        except Exception:
            is_live = False
    return {**stamp(), "module": "nemoguardrails-adapter",
            "vendor": "NVIDIA NeMo Guardrails (OSS)",
            "configured": configured_when(ENV_KEY),
            "live_at": url if is_live else None,
            "scaffold_note": None if is_live else scaffold_note(ENV_KEY, "NeMo Guardrails"),
            "capabilities": ["topic-rail (block off-topic)",
                             "dialog rail (jailbreak/injection)",
                             "fact-check rail (RAG hallucination)",
                             "moderation rail (toxic/PII output)",
                             "execution rail (tool sandbox)"],
            "fallback": "Built-in topic blocklist + injection detection",
            "spec": "§56 Stage-1 · §57.7 honest · §76 Safety pillar"}


class CheckRequest(BaseModel):
    user_message: str
    direction: str = "input"  # input | output


@router.post("/check")
def check(body: CheckRequest):
    """Run guardrail check · live NeMo OR scaffold rule engine."""
    if configured_when(ENV_KEY):
        try:
            url = env_config(ENV_KEY, "http://localhost:8000")
            r = httpx.post(f"{url}/v1/chat/completions",
                           json={"messages": [{"role": "user",
                                                "content": body.user_message}]},
                           timeout=5)
            if r.status_code == 200:
                return {**stamp(), "status": "live", "vendor": "NeMo",
                        "result": r.json()}
        except Exception as e:
            return {**stamp(), "status": "error", "error": str(e)[:200]}

    # Scaffold path · built-in rails
    msg_lower = body.user_message.lower()
    blocks = []
    for topic in TOPIC_BLOCKLIST:
        if topic in msg_lower:
            blocks.append({"rail": "topic", "matched": topic, "severity": "high"})
    for pat in INJECTION_PATTERNS:
        if pat.search(body.user_message):
            blocks.append({"rail": "dialog/injection", "matched": pat.pattern[:30],
                           "severity": "high"})
    return {**stamp(), "status": "scaffold",
            "fallback": "built-in 6 topic + 6 injection rules",
            "direction": body.direction,
            "allow": len(blocks) == 0,
            "blocks": blocks,
            "advice": "Set NEMOGUARDRAILS_URL for full LLM-based rails"}


@router.get("/config-example")
def config_example():
    return {**stamp(), "vendor": "NVIDIA NeMo Guardrails",
            "setup_steps": [
                "1. pip install nemoguardrails",
                "2. Write config.yml + rails.co (Colang)",
                "3. nemoguardrails server start  → listens on :8000",
                "4. export NEMOGUARDRAILS_URL=http://localhost:8000",
                "5. Restart backend",
                "6. POST /api/v1/nemoguardrails/check",
            ],
            "current_fallback": "Built-in topic + injection rules (LLM-Gateway also has guardrails)",
            "oss_url": "https://github.com/NVIDIA/NeMo-Guardrails",
            "rai_alignment": "§76 Safety pillar · §103.4 decision policy",
            "alternatives": ["Llama Guard (Meta)", "Guardrails.ai", "Lakera Guard"]}
