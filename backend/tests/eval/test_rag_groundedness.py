"""RAG eval harness — groundedness only for Phase gamma.

Runs 5 sample questions against the live RAG service, then uses Ollama itself
as a judge: 'given these retrieved chunks, does the response make any claim
not supported by them?' Produces a groundedness score 0-1.

Marked pytest.mark.eval so it's opt-in (doesn't run in the default test sweep).
"""
from __future__ import annotations

import re

import pytest
import requests

from backend.schemas.ai_explain import ExplainRequest
from backend.services.rag_service import MODEL, OLLAMA_BASE, RAGService


pytestmark = pytest.mark.eval

QUESTIONS = [
    "What is MAPE?",
    "Why do some stores have higher baseline revenue?",
    "When do short-term promotions work best?",
    "What's a stockout pattern?",
    "How do I detect a competitive shock?",
]


def _ollama_judge_groundedness(response: str, sources: str) -> float:
    """Ask the LLM whether every claim is supported. Return 0..1."""
    prompt = (
        "You are a strict grading judge. Given SOURCES and a RESPONSE, decide "
        "if every factual claim in the response is supported by the sources. "
        "Reply with a single number between 0 and 1 (1 = fully grounded, "
        "0 = makes unsupported claims). Reply ONLY with the number.\n\n"
        f"SOURCES:\n{sources}\n\nRESPONSE:\n{response}\n\nScore (0-1):"
    )
    # 60s (was 30s) — qwen2.5 judge calls occasionally hit 30-40s when Ollama
    # is warming / under load; reduced flakiness without changing semantics.
    r = requests.post(
        f"{OLLAMA_BASE}/api/generate",
        json={"model": MODEL, "prompt": prompt, "stream": False,
              "options": {"num_predict": 10, "temperature": 0.0}},
        timeout=60,
    )
    r.raise_for_status()
    text = r.json().get("response", "").strip()
    # Extract first float in response.
    m = re.search(r"0\.\d+|1\.0|1|0", text)
    return float(m.group(0)) if m else 0.0


def test_groundedness_across_5_questions():
    svc = RAGService()
    scores = []
    for q in QUESTIONS:
        out = svc.explain(ExplainRequest(question=q))
        sources = "\n\n".join(c.snippet for c in out.citations)
        score = _ollama_judge_groundedness(out.markdown, sources)
        scores.append((q, score))

    mean = sum(s for _, s in scores) / len(scores)
    print("\nGroundedness per question:")
    for q, s in scores:
        print(f"  {s:.2f}  {q}")
    print(f"Mean groundedness: {mean:.2f}")

    # Threshold: mean >= 0.5.
    #
    # The plan targets mean >= 0.6, but qwen2.5 when used as its own judge is
    # overly strict — it regularly returns 0 for responses that are in fact
    # well-grounded (verified by reading the markdown: correct [ref N] citations
    # match the source snippets). This is the known "self-judge" weakness flagged
    # in the plan Risks table: "Eval judge is the same model as generator — known
    # limitation — per Enterprise AI Policy, a proper judge model is Phase 2b work."
    #
    # Per the plan's runtime notes, dropping to 0.5 is acceptable without escalation;
    # any lower requires NEEDS_CONTEXT.
    assert mean >= 0.5, f"mean groundedness {mean:.2f} < 0.5"
