"""council_v77 — Agent Arbitration via 3-stage Council (author → reviewer → chair).

Per global §77 row 1415 (Agent Arbitration: Custom → build via §64.43 #2 Council).
Per global §64.43 #2 — Council of Agents pattern.
Per global §38.3 — every council decision writes an audit row.
Per global §50.3 — model diversity catches mis-interpretations.

Three roles, three different Ollama models (configurable):
  AUTHOR    proposes a draft answer/decision
  REVIEWER  critiques the proposal (must flag at least one weakness or
             confirm soundness with reasoning)
  CHAIR     synthesizes the final decision + records dissent
"""
from __future__ import annotations

import json
import os
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import requests

OLLAMA = os.environ.get("OLLAMA_URL", "http://localhost:11434")
DEFAULT_AUTHOR = os.environ.get("COUNCIL_AUTHOR", "qwen2.5:latest")
DEFAULT_REVIEWER = os.environ.get("COUNCIL_REVIEWER", "gemma3:1b")
DEFAULT_CHAIR = os.environ.get("COUNCIL_CHAIR", "qwen2.5:latest")

REPO = Path(__file__).resolve().parents[2]
AUDIT_DIR = REPO / "data" / "eval" / "council"
AUDIT_DIR.mkdir(parents=True, exist_ok=True)


@dataclass
class CouncilDecision:
    request_id: str
    question: str
    author_draft: str
    reviewer_critique: str
    chair_final: str
    models: dict[str, str]
    latencies_ms: dict[str, int]
    ts: str = field(default_factory=lambda: time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))

    def to_dict(self) -> dict[str, Any]:
        return {
            "request_id": self.request_id,
            "question": self.question,
            "author_draft": self.author_draft,
            "reviewer_critique": self.reviewer_critique,
            "chair_final": self.chair_final,
            "models": self.models,
            "latencies_ms": self.latencies_ms,
            "ts": self.ts,
        }


def _generate(model: str, prompt: str, timeout: int = 180) -> tuple[str, int]:
    t0 = time.time()
    r = requests.post(
        f"{OLLAMA}/api/generate",
        json={"model": model, "prompt": prompt, "stream": False, "options": {"temperature": 0.2}},
        timeout=timeout,
    )
    r.raise_for_status()
    return r.json().get("response", "").strip(), int((time.time() - t0) * 1000)


def deliberate(
    question: str,
    context: str = "",
    author: str = DEFAULT_AUTHOR,
    reviewer: str = DEFAULT_REVIEWER,
    chair: str = DEFAULT_CHAIR,
) -> CouncilDecision:
    req_id = f"council-{uuid.uuid4().hex[:8]}"

    author_prompt = (
        "You are the AUTHOR agent in a council. Propose a clear, specific answer.\n"
        f"{'CONTEXT:\\n' + context + '\\n\\n' if context else ''}"
        f"QUESTION: {question}\n\nDRAFT:"
    )
    author_draft, lat_a = _generate(author, author_prompt)

    reviewer_prompt = (
        "You are the REVIEWER agent in a council. Critique the AUTHOR's draft. "
        "Identify at least one weakness, missing nuance, or unverified claim. "
        "If the draft is sound, explain why with reasoning.\n\n"
        f"QUESTION: {question}\n\nAUTHOR DRAFT:\n{author_draft}\n\nCRITIQUE:"
    )
    reviewer_critique, lat_r = _generate(reviewer, reviewer_prompt)

    chair_prompt = (
        "You are the CHAIR of a council. You see the AUTHOR's draft and the REVIEWER's critique. "
        "Synthesize a final decision that incorporates valid critique. "
        "Be concise. State remaining uncertainty explicitly if present.\n\n"
        f"QUESTION: {question}\n\nAUTHOR DRAFT:\n{author_draft}\n\n"
        f"REVIEWER CRITIQUE:\n{reviewer_critique}\n\nCHAIR FINAL:"
    )
    chair_final, lat_c = _generate(chair, chair_prompt)

    decision = CouncilDecision(
        request_id=req_id,
        question=question,
        author_draft=author_draft,
        reviewer_critique=reviewer_critique,
        chair_final=chair_final,
        models={"author": author, "reviewer": reviewer, "chair": chair},
        latencies_ms={"author": lat_a, "reviewer": lat_r, "chair": lat_c, "total": lat_a + lat_r + lat_c},
    )
    with (AUDIT_DIR / "audit.jsonl").open("a") as f:
        f.write(json.dumps(decision.to_dict()) + "\n")
    return decision


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser(description="council_v77 — 3-stage agent council")
    ap.add_argument("question", help="The question to deliberate")
    ap.add_argument("--context", default="", help="Optional context")
    args = ap.parse_args()
    d = deliberate(args.question, args.context)
    print(json.dumps(d.to_dict(), indent=2))
