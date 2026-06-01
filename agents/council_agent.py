"""
HOLY Beverage — Council-of-Agents worker.

Each task is processed by a 3-stage council:
  1. AUTHOR    (gemma3:4b)  — generates initial response
  2. REVIEWER  (gemma3:4b)  — critiques author's response + suggests improvement
  3. CHAIR     (gemma3:1b)  — selects/merges; produces final answer

Pulls from Redis 'council_tasks' queue; pushes results (full audit trail —
all 3 stage outputs + final choice) to 'council_done' list.

Pattern inspired by /mnt/deepa/rag/scripts/gemma_agent_council.py (Stage-1
adapter, §56 compliance). Simplified to 3 stages for HOLY POC.

Environment:
  REDIS_URL          redis://redis:6379/0
  OLLAMA_URL         http://ollama:11434
  AUTHOR_MODEL       gemma3:4b
  REVIEWER_MODEL     gemma3:4b
  CHAIR_MODEL        gemma3:1b
  POLL_TIMEOUT       5
  STAGE_TIMEOUT      60
"""
from __future__ import annotations
import json
import logging
import os
import socket
import sys
import time
from typing import Any

import httpx
import redis

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("council")

REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://ollama:11434")
AUTHOR_MODEL = os.environ.get("AUTHOR_MODEL", "gemma3:4b")
REVIEWER_MODEL = os.environ.get("REVIEWER_MODEL", "gemma3:4b")
CHAIR_MODEL = os.environ.get("CHAIR_MODEL", "gemma3:1b")
POLL_TIMEOUT = int(os.environ.get("POLL_TIMEOUT", "5"))
STAGE_TIMEOUT = float(os.environ.get("STAGE_TIMEOUT", "60"))
AGENT_ID = os.environ.get("AGENT_ID") or socket.gethostname()


def call_ollama(model: str, prompt: str, num_predict: int = 200) -> dict[str, Any]:
    t0 = time.time()
    try:
        r = httpx.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": model, "prompt": prompt, "stream": False,
                  "options": {"num_predict": num_predict}},
            timeout=STAGE_TIMEOUT,
        )
        r.raise_for_status()
        data = r.json()
        return {
            "ok": True,
            "model": model,
            "response": data.get("response", "").strip(),
            "ms": int((time.time() - t0) * 1000),
            "tokens": data.get("eval_count", 0),
        }
    except Exception as e:
        return {
            "ok": False,
            "model": model,
            "error": f"{type(e).__name__}: {e}",
            "ms": int((time.time() - t0) * 1000),
        }


def run_council(task_prompt: str, department: str = "") -> dict[str, Any]:
    """Execute the 3-stage council on one task. Returns full audit trail."""
    t0 = time.time()
    dept_ctx = f" (Department: {department})" if department else ""

    # Stage 1: AUTHOR generates initial response
    author_prompt = (
        f"You are a insurerage industry expert{dept_ctx}.\n"
        f"Task: {task_prompt}\n"
        f"Reply concisely in 2-3 sentences."
    )
    author = call_ollama(AUTHOR_MODEL, author_prompt, num_predict=150)
    if not author["ok"]:
        return {"ok": False, "stage_failed": "author", "author": author, "elapsed_ms": int((time.time() - t0) * 1000)}

    # Stage 2: REVIEWER critiques author's output
    reviewer_prompt = (
        f"You are a critical reviewer for a insurerage company{dept_ctx}.\n"
        f"Original task: {task_prompt}\n"
        f"Author's answer: {author['response']}\n\n"
        f"Critique this answer in 1-2 sentences. If it's good, say so. "
        f"If it's wrong or missing key info, briefly explain what's missing."
    )
    reviewer = call_ollama(REVIEWER_MODEL, reviewer_prompt, num_predict=120)
    if not reviewer["ok"]:
        return {"ok": False, "stage_failed": "reviewer", "author": author, "reviewer": reviewer,
                "elapsed_ms": int((time.time() - t0) * 1000)}

    # Stage 3: CHAIR synthesizes final answer
    chair_prompt = (
        f"You are the chair making the final decision.\n"
        f"Task: {task_prompt}\n"
        f"Author said: {author['response']}\n"
        f"Reviewer said: {reviewer['response']}\n\n"
        f"Produce the FINAL ANSWER in 1-2 sentences, integrating valid critique."
    )
    chair = call_ollama(CHAIR_MODEL, chair_prompt, num_predict=120)

    return {
        "ok": chair.get("ok", False),
        "final": chair.get("response", "") if chair.get("ok") else "",
        "author": author,
        "reviewer": reviewer,
        "chair": chair,
        "elapsed_ms": int((time.time() - t0) * 1000),
    }


def main() -> int:
    log.info(f"council agent {AGENT_ID} starting | redis={REDIS_URL} | ollama={OLLAMA_URL}")
    log.info(f"  models: author={AUTHOR_MODEL} reviewer={REVIEWER_MODEL} chair={CHAIR_MODEL}")
    r = redis.from_url(REDIS_URL, decode_responses=True)
    r.ping()
    log.info("redis OK")

    smoke = call_ollama(CHAIR_MODEL, "Reply OK.", num_predict=3)
    if smoke["ok"]:
        log.info(f"ollama OK ({smoke['ms']}ms)")
    else:
        log.warning(f"ollama smoke failed: {smoke.get('error')}")

    processed = 0
    while True:
        try:
            popped = r.brpop("council_tasks", timeout=POLL_TIMEOUT)
            if popped is None:
                continue
            _key, task_json = popped
            task = json.loads(task_json)
            tid = task.get("id", "?")
            prompt = task.get("prompt", "")
            dept = task.get("department", "")

            log.info(f"task {tid} picked (dept={dept})")
            result = run_council(prompt, dept)
            output = {
                "task_id": tid,
                "agent_id": AGENT_ID,
                "prompt": prompt[:140],
                "department": dept,
                **result,
                "completed_at": time.time(),
            }
            r.lpush("council_done", json.dumps(output))
            processed += 1
            log.info(f"task {tid} done in {result.get('elapsed_ms')}ms (processed={processed})")
        except KeyboardInterrupt:
            log.info(f"shutdown after {processed} tasks")
            return 0
        except Exception as e:
            log.error(f"loop error: {type(e).__name__}: {e}")
            time.sleep(1)


if __name__ == "__main__":
    sys.exit(main())
