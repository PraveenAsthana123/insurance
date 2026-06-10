"""LLM client abstraction · Iter 41.

Backend resolution order:
  1. OPENAI_API_KEY set → call OpenAI Chat Completions API
  2. ANTHROPIC_API_KEY set → call Anthropic Messages API
  3. Neither → deterministic stub (honest · seeded by agent_id + input hash)

Per §57.7: stub is HONEST · returns deterministic plan + clearly tagged
'executed_with_stub': True so the UI + audit row can show it.
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import time
from typing import Any

logger = logging.getLogger(__name__)


# Pricing per 1M tokens (USD) · approximate · for cost telemetry
PRICING = {
    "gpt-4o":         {"input": 2.50,  "output": 10.00},
    "gpt-4o-mini":    {"input": 0.15,  "output": 0.60},
    "claude-3-5-sonnet": {"input": 3.00,  "output": 15.00},
    "claude-3-5-haiku":  {"input": 0.80,  "output": 4.00},
    "stub":           {"input": 0.00,  "output": 0.00},
}


def _compute_cost(model: str, tokens_in: int, tokens_out: int) -> float:
    p = PRICING.get(model, PRICING["stub"])
    return round(
        (tokens_in / 1_000_000.0) * p["input"]
        + (tokens_out / 1_000_000.0) * p["output"],
        6,
    )


def _stub_plan(agent_id: str, input_text: str, skills: list[str]) -> dict:
    """Deterministic plan from agent_id + input hash · honest §57.7."""
    seed = int(hashlib.sha256(f"{agent_id}|{input_text}".encode()).hexdigest()[:8], 16)
    # Pick 2-4 skills deterministically
    n_pick = 2 + (seed % 3)
    picked = []
    if skills:
        for i in range(min(n_pick, len(skills))):
            picked.append(skills[(seed + i * 7) % len(skills)])
    plan = {
        "rationale": (
            f"Stub planner · seeded by hash({agent_id[:10]}, input[:20]). "
            f"Selected {len(picked)} skills from {len(skills)} available."
        ),
        "steps": [
            {"step": i + 1, "skill_id": s, "args": {"input": input_text[:80]},
             "depends_on": [i] if i > 0 else []}
            for i, s in enumerate(picked)
        ],
        "n_steps": len(picked),
    }
    return plan


def _openai_plan(model: str, agent_id: str, input_text: str, skills: list[str]) -> tuple[dict, int, int]:
    """Real OpenAI call · returns (plan, tokens_in, tokens_out)."""
    import httpx
    prompt = (
        f"You are the planner for agent '{agent_id}'. "
        f"Available skills: {', '.join(skills)}. "
        f"User input: {input_text}\n\n"
        "Output a JSON plan with this schema:\n"
        '{"rationale": "...", "steps": [{"step": 1, "skill_id": "...", "args": {}, "depends_on": []}], "n_steps": N}\n'
        "Pick 2-5 skills · ordered by dependency · no prose outside JSON."
    )
    r = httpx.post(
        "https://api.openai.com/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"},
            "max_tokens": 800,
        },
        timeout=30,
    )
    r.raise_for_status()
    data = r.json()
    content = data["choices"][0]["message"]["content"]
    plan = json.loads(content)
    usage = data.get("usage", {})
    return plan, usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0)


def _anthropic_plan(model: str, agent_id: str, input_text: str, skills: list[str]) -> tuple[dict, int, int]:
    """Real Anthropic call · returns (plan, tokens_in, tokens_out)."""
    import httpx
    prompt = (
        f"You are the planner for agent '{agent_id}'. "
        f"Available skills: {', '.join(skills)}. "
        f"User input: {input_text}\n\n"
        "Output ONLY a JSON object with this schema:\n"
        '{"rationale": "...", "steps": [{"step": 1, "skill_id": "...", "args": {}, "depends_on": []}], "n_steps": N}'
    )
    r = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": os.environ["ANTHROPIC_API_KEY"],
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "max_tokens": 800,
            "messages": [{"role": "user", "content": prompt}],
        },
        timeout=30,
    )
    r.raise_for_status()
    data = r.json()
    content = data["content"][0]["text"]
    # Try to extract JSON if model wrapped it
    if "```json" in content:
        content = content.split("```json", 1)[1].split("```", 1)[0]
    plan = json.loads(content.strip())
    usage = data.get("usage", {})
    return plan, usage.get("input_tokens", 0), usage.get("output_tokens", 0)


def plan(agent_id: str, agent_model: str, input_text: str, skills: list[str]) -> dict:
    """Returns dict with: plan + provider + model + tokens + cost + latency_ms + scaffold."""
    t0 = time.perf_counter()
    provider = "stub"
    model_used = "stub"
    tokens_in = 0
    tokens_out = 0
    error = None
    plan_dict: dict[str, Any] = {}

    # Resolve backend
    has_openai = bool(os.environ.get("OPENAI_API_KEY"))
    has_anthropic = bool(os.environ.get("ANTHROPIC_API_KEY"))

    try:
        if agent_model and agent_model.startswith("gpt-") and has_openai:
            provider = "openai"
            model_used = agent_model
            plan_dict, tokens_in, tokens_out = _openai_plan(agent_model, agent_id, input_text, skills)
        elif agent_model and agent_model.startswith("claude-") and has_anthropic:
            provider = "anthropic"
            model_used = agent_model
            plan_dict, tokens_in, tokens_out = _anthropic_plan(agent_model, agent_id, input_text, skills)
        elif has_openai:
            provider = "openai"
            model_used = "gpt-4o-mini"
            plan_dict, tokens_in, tokens_out = _openai_plan(model_used, agent_id, input_text, skills)
        elif has_anthropic:
            provider = "anthropic"
            model_used = "claude-3-5-haiku"
            plan_dict, tokens_in, tokens_out = _anthropic_plan(model_used, agent_id, input_text, skills)
        else:
            plan_dict = _stub_plan(agent_id, input_text, skills)
            # Honest stub token count (sentence-count × ~6)
            tokens_in = len(input_text.split())
            tokens_out = sum(len(str(s).split()) for s in plan_dict.get("steps", []))
    except Exception as e:
        logger.warning("LLM call failed · falling back to stub: %s", e)
        error = f"{type(e).__name__}: {e}"
        provider = "stub-after-error"
        plan_dict = _stub_plan(agent_id, input_text, skills)

    elapsed_ms = round((time.perf_counter() - t0) * 1000, 1)
    cost_usd = _compute_cost(model_used, tokens_in, tokens_out)

    return {
        "plan": plan_dict,
        "provider": provider,
        "model": model_used,
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "cost_usd": cost_usd,
        "latency_ms": elapsed_ms,
        "scaffold": provider in ("stub", "stub-after-error"),
        "error": error,
    }
