"""Test-tier agent — picks tasks from Redis `test_tasks`, runs the tier,
pushes results to `test_results`. Per global §65.1 #8 + §65.8.

Each agent self-tags with a TIER_ROLE env var so the fleet specializes:
  pytest-agent       → unit + integration + boundary + security (pytest-based)
  api-agent          → tier 3 (api)
  drill-agent        → tier 7 (process drills)
  perf-agent         → tier 9-10 (k6 / locust)
  smoke-agent        → tier 8 (playwright)
  security-agent     → tier 11-12 (ZAP / Garak — auth env only per §42)

Task envelope (Redis LIST `test_tasks`):
  {
    "task_id": "...",
    "tier": "unit|integration|api|boundary|process|perf|smoke|security",
    "dept": "<dept>",
    "path": "tests/<dept>/<tier>/",
    "timeout_seconds": 600,
    "agent_role_required": "pytest-agent"   # optional — for routing
  }

Result envelope (Redis LIST `test_results`):
  {
    "task_id": "...",
    "agent_id": "...",
    "tier": "...",
    "dept": "...",
    "exit_code": 0,
    "stdout_tail": "...",
    "duration_seconds": 12.4,
    "completed_at": "2026-05-22T..."
  }
"""
from __future__ import annotations

import json
import logging
import os
import socket
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

import redis  # type: ignore

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")
AGENT_ROLE = os.environ.get("TIER_ROLE", "pytest-agent")
POLL_TIMEOUT = int(os.environ.get("POLL_TIMEOUT", "5"))
HOSTNAME = socket.gethostname()
REPO_ROOT = Path(os.environ.get("REPO_ROOT", "/app"))


# Tier → runner mapping
RUNNERS: dict[str, list[str]] = {
    "unit":        ["python", "-m", "pytest", "-q"],
    "integration": ["python", "-m", "pytest", "-q"],
    "api":         ["python", "-m", "pytest", "-q"],
    "boundary":    ["python", "-m", "pytest", "-q"],
    "process":     ["python", "-m", "pytest", "-q", "-s"],
    "security":    ["python", "-m", "pytest", "-q"],
    # Non-pytest tiers — defer to dedicated agents
    "perf":        ["k6", "run"],
    "smoke":       ["npx", "playwright", "test"],
}


def run_test_task(task: dict) -> dict:
    tier = task.get("tier")
    dept = task.get("dept", "")
    path = task.get("path", f"tests/{dept}/{tier}/")
    timeout = int(task.get("timeout_seconds", 600))
    target = REPO_ROOT / path

    if tier not in RUNNERS:
        return {
            "task_id": task.get("task_id"),
            "agent_id": HOSTNAME,
            "tier": tier,
            "dept": dept,
            "exit_code": 99,
            "stdout_tail": f"unknown tier '{tier}'",
            "duration_seconds": 0,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }

    # Role-routing: only run the tiers this agent role is qualified for
    if not _qualifies(tier, AGENT_ROLE):
        return {
            "task_id": task.get("task_id"),
            "agent_id": HOSTNAME,
            "tier": tier,
            "dept": dept,
            "exit_code": 98,  # 98 = "wrong agent role for this task"
            "stdout_tail": f"agent role '{AGENT_ROLE}' not qualified for tier '{tier}'",
            "duration_seconds": 0,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }

    cmd = RUNNERS[tier] + [str(target)]
    t0 = time.time()
    try:
        proc = subprocess.run(
            cmd, capture_output=True, text=True, timeout=timeout,
            cwd=str(REPO_ROOT), env={**os.environ, "PYTHONPATH": str(REPO_ROOT / "backend")},
        )
        out = (proc.stdout or "") + ("\n" + proc.stderr if proc.stderr else "")
        return {
            "task_id": task.get("task_id"),
            "agent_id": HOSTNAME,
            "tier": tier,
            "dept": dept,
            "exit_code": proc.returncode,
            "stdout_tail": out[-2000:],
            "duration_seconds": round(time.time() - t0, 2),
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }
    except subprocess.TimeoutExpired:
        return {
            "task_id": task.get("task_id"),
            "agent_id": HOSTNAME,
            "tier": tier,
            "dept": dept,
            "exit_code": 124,
            "stdout_tail": f"TIMEOUT after {timeout}s",
            "duration_seconds": timeout,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as exc:
        return {
            "task_id": task.get("task_id"),
            "agent_id": HOSTNAME,
            "tier": tier,
            "dept": dept,
            "exit_code": 1,
            "stdout_tail": f"runner error: {type(exc).__name__}: {exc}",
            "duration_seconds": round(time.time() - t0, 2),
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }


def _qualifies(tier: str, role: str) -> bool:
    """Role → allowed tiers map."""
    role_tiers = {
        "pytest-agent": {"unit", "integration", "api", "boundary", "process", "security"},
        "api-agent":    {"api"},
        "drill-agent":  {"process"},
        "perf-agent":   {"perf"},
        "smoke-agent":  {"smoke"},
        "security-agent": {"security"},
        # Generalist for local dev
        "all":          set(RUNNERS.keys()),
    }
    return tier in role_tiers.get(role, set())


def main() -> None:
    r = redis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=5)
    logger.info("test_agent starting | role=%s host=%s redis=%s", AGENT_ROLE, HOSTNAME, REDIS_URL)

    while True:
        try:
            popped = r.brpop("test_tasks", timeout=POLL_TIMEOUT)
        except redis.ConnectionError as exc:
            logger.warning("Redis disconnected: %s; retry in 5s", exc)
            time.sleep(5)
            continue

        if popped is None:
            continue  # timeout — loop back to BRPOP

        _key, raw = popped
        try:
            task = json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("malformed task: %s", raw[:200])
            continue

        logger.info("running task | id=%s tier=%s dept=%s",
                    task.get("task_id"), task.get("tier"), task.get("dept"))
        result = run_test_task(task)
        try:
            r.lpush("test_results", json.dumps(result))
            r.ltrim("test_results", 0, 999)  # cap at 1000
        except Exception as exc:
            logger.warning("result push failed: %s", exc)


if __name__ == "__main__":
    main()
