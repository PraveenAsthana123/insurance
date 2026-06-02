"""reflection_loop — §77 row 1419, §64.43 #10.

Iterative self-improvement loop with bounded retries. Each iteration:
  1. Generate / refine the proposed output via Ollama
  2. Score against acceptance criteria (operator-provided callable)
  3. Terminate on: (a) score ≥ threshold, (b) max_iters reached,
     (c) cost cap hit, (d) score plateau (no improvement for 2 iters)

Every iteration writes an audit row per §38.3.
"""
from __future__ import annotations
import json
import os
import time
import uuid
from pathlib import Path
from typing import Callable
import requests

OLLAMA = os.environ.get("OLLAMA_URL", "http://localhost:11434")
MODEL = os.environ.get("REFLECTION_MODEL", "qwen2.5:latest")
REPO = Path(__file__).resolve().parents[2]
AUDIT_DIR = REPO / "data" / "eval" / "reflection"
AUDIT_DIR.mkdir(parents=True, exist_ok=True)


def reflect(
    task: str,
    scorer: Callable[[str], float],
    threshold: float = 0.8,
    max_iters: int = 4,
    cost_cap_tokens: int = 8000,
) -> dict:
    req_id = f"refl-{uuid.uuid4().hex[:8]}"
    history: list[dict] = []
    draft = ""
    last_score = -1.0
    plateau = 0
    tokens_used = 0

    for it in range(max_iters):
        if tokens_used >= cost_cap_tokens:
            term = "cost_cap"
            break
        prompt = task if it == 0 else (
            f"{task}\n\nPREVIOUS DRAFT:\n{draft}\n\n"
            f"Score so far: {last_score:.2f} (target {threshold:.2f}). Improve."
        )
        t0 = time.time()
        r = requests.post(f"{OLLAMA}/api/generate",
                          json={"model": MODEL, "prompt": prompt, "stream": False,
                                "options": {"temperature": 0.3}},
                          timeout=180)
        r.raise_for_status()
        body = r.json()
        draft = body.get("response", "").strip()
        tokens_used += body.get("eval_count", len(draft) // 4)
        score = float(scorer(draft))
        history.append({"iter": it, "score": score, "latency_ms": int((time.time() - t0) * 1000),
                        "draft_len": len(draft), "tokens_used": tokens_used})
        if score >= threshold:
            term = "threshold_met"
            break
        if score <= last_score:
            plateau += 1
            if plateau >= 2:
                term = "plateau"
                break
        else:
            plateau = 0
        last_score = score
    else:
        term = "max_iters"

    result = {"request_id": req_id, "task": task, "final_draft": draft,
              "final_score": last_score, "termination": term,
              "iterations": len(history), "history": history,
              "tokens_used": tokens_used,
              "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    with (AUDIT_DIR / "audit.jsonl").open("a") as f:
        f.write(json.dumps(result) + "\n")
    return result


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("task")
    ap.add_argument("--keyword", default="answer", help="keyword whose presence scores the draft")
    args = ap.parse_args()
    res = reflect(args.task, scorer=lambda t: float(args.keyword.lower() in t.lower()))
    print(json.dumps(res, indent=2))
