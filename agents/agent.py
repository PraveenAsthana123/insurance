"""
INSUR Beverage — 100-agent background worker.

Each agent process:
  1. Pulls a task from Redis queue (BRPOP)
  2. Calls Ollama (gemma3:1b on host) with the task prompt
  3. Pushes result to "done" list with agent_id + response + timing

Environment:
  REDIS_URL   redis://redis:6379/0
  OLLAMA_URL  http://host.docker.internal:11434  (host Ollama with gemma3:1b)
  MODEL       gemma3:1b
  AGENT_ID    auto-set by container (hostname)
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

from agent_observability import append_trace, attach_trace, build_trace

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("agent")

REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://host.docker.internal:11434")
MODEL = os.environ.get("MODEL", "gemma3:1b")
AGENT_ID = os.environ.get("AGENT_ID") or socket.gethostname()
POLL_TIMEOUT = int(os.environ.get("POLL_TIMEOUT", "5"))
OLLAMA_TIMEOUT = float(os.environ.get("OLLAMA_TIMEOUT", "60"))
STARTUP_SMOKE = os.environ.get("AGENT_STARTUP_SMOKE", "0") == "1"


def write_heartbeat(r: redis.Redis, state: str, processed: int, task_id: str = "") -> None:
    """Publish lightweight liveness/task state for supervisor dashboards."""
    payload = {
        "kind": "simple",
        "agent_id": AGENT_ID,
        "state": state,
        "processed": processed,
        "updated_at": time.time(),
        "last_task_id": task_id,
    }
    r.set(f"agent:heartbeat:{AGENT_ID}", json.dumps(payload), ex=90)


def call_ollama(prompt: str) -> dict[str, Any]:
    """Single inference call. Returns dict with response + timing."""
    t0 = time.time()
    try:
        r = httpx.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": MODEL, "prompt": prompt, "stream": False,
                  "options": {"num_predict": 80}},  # cap output for speed
            timeout=OLLAMA_TIMEOUT,
        )
        r.raise_for_status()
        data = r.json()
        return {
            "ok": True,
            "response": data.get("response", "").strip(),
            "duration_ms": int((time.time() - t0) * 1000),
            "tokens": data.get("eval_count", 0),
        }
    except Exception as e:
        return {
            "ok": False,
            "error": f"{type(e).__name__}: {e}",
            "duration_ms": int((time.time() - t0) * 1000),
        }


def main() -> int:
    log.info(f"agent {AGENT_ID} starting | redis={REDIS_URL} | ollama={OLLAMA_URL} | model={MODEL}")
    r = redis.from_url(REDIS_URL, decode_responses=True)

    # Smoke-test connections
    try:
        r.ping()
        log.info("redis OK")
    except Exception as e:
        log.error(f"redis unreachable: {e}")
        return 1

    if STARTUP_SMOKE:
        smoke = call_ollama("Reply with 'OK' only.")
        if smoke["ok"]:
            log.info(f"ollama OK ({smoke['duration_ms']}ms)")
        else:
            log.warning(f"ollama smoke failed: {smoke.get('error')} — will retry on each task")
    else:
        log.info("ollama startup smoke skipped; task execution remains the proof signal")

    processed = 0
    write_heartbeat(r, "idle", processed)
    while True:
        try:
            popped = r.brpop("tasks", timeout=POLL_TIMEOUT)
            if popped is None:
                # Idle — keep polling
                write_heartbeat(r, "idle", processed)
                continue
            _key, task_json = popped
            task = json.loads(task_json)
            task_id = task.get("id", "?")
            prompt = task.get("prompt", "")

            log.info(f"task {task_id} picked")
            write_heartbeat(r, "running", processed, task_id)
            result = call_ollama(prompt)

            output = {
                "task_id": task_id,
                "agent_id": AGENT_ID,
                "prompt": prompt[:120],
                "department": task.get("department"),
                **result,
                "completed_at": time.time(),
            }
            trace = build_trace("simple", task, output, MODEL, AGENT_ID)
            output = attach_trace(output, trace)
            append_trace(trace)
            r.lpush("done", json.dumps(output))
            processed += 1
            write_heartbeat(r, "idle", processed, task_id)
            log.info(f"task {task_id} done ({result.get('duration_ms')}ms, processed={processed})")
        except KeyboardInterrupt:
            log.info(f"shutdown after {processed} tasks")
            return 0
        except Exception as e:
            log.error(f"loop error: {type(e).__name__}: {e}")
            time.sleep(1)


if __name__ == "__main__":
    sys.exit(main())
