"""/api/v1/service-health · Iter 29 · aggregated probe across all modules."""
from __future__ import annotations

import time

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/service-health", tags=["service-health"])


def _probe_db() -> dict:
    try:
        import psycopg2
        from core.config import get_settings
        t = time.perf_counter()
        with psycopg2.connect(get_settings().database_url) as c, c.cursor() as cur:
            cur.execute("SELECT 1")
            cur.fetchone()
        return {"status": "ok", "latency_ms": round((time.perf_counter() - t) * 1000, 1)}
    except Exception as e:
        return {"status": "error", "error": f"{type(e).__name__}: {e}"}


def _probe_redis() -> dict:
    import os
    if not os.environ.get("REDIS_URL"):
        return {"status": "not_configured"}
    try:
        import redis
        t = time.perf_counter()
        r = redis.from_url(os.environ["REDIS_URL"], decode_responses=True)
        r.ping()
        return {"status": "ok", "latency_ms": round((time.perf_counter() - t) * 1000, 1)}
    except Exception as e:
        return {"status": "error", "error": f"{type(e).__name__}: {e}"}


def _probe_library(name: str) -> dict:
    # Iter 29 fix: catch ALL exceptions · presidio raises RuntimeError due
    # to transformers/protobuf incompat · not ImportError.
    try:
        __import__(name)
        return {"status": "ok"}
    except ImportError:
        return {"status": "not_installed"}
    except BaseException as e:
        return {"status": "error", "error": f"{type(e).__name__}: {str(e)[:120]}"}


@router.get("")
def aggregate():
    components = {
        "database":    _probe_db(),
        "redis":       _probe_redis(),
        "mlflow":      _probe_library("mlflow"),
        "shap":        _probe_library("shap"),
        "fairlearn":   _probe_library("fairlearn"),
        "presidio":    _probe_library("presidio_analyzer"),
        "bandit":      _probe_library("bandit"),
        "pip_audit":   _probe_library("pip_audit"),
        "great_expectations": _probe_library("great_expectations"),
    }
    n_ok = sum(1 for v in components.values() if v.get("status") == "ok")
    n_error = sum(1 for v in components.values() if v.get("status") == "error")
    n_missing = sum(1 for v in components.values() if v.get("status") in ("not_installed", "not_configured"))
    overall = "ok" if n_error == 0 else ("degraded" if n_error <= 2 else "down")
    return {
        "overall": overall,
        "components": components,
        "n_ok": n_ok,
        "n_error": n_error,
        "n_missing": n_missing,
    }


# === §150 process supervision endpoint ===
@router.get("/processes")
def supervised_processes():
    """§150 · live status of every supervised process.

    Reads jobs/state/supervisor.json written by scripts/multi_supervisor.py.
    Augments each entry with a live port-bound check so the response is
    accurate even between supervisor ticks (§57.7 honest scaffold).
    """
    import json
    import socket
    from pathlib import Path

    state_file = Path("/mnt/deepa/insur_project/jobs/state/supervisor.json")
    base = {"services": {}, "updated_local": None, "updated_utc": None, "tick_count": 0}
    if state_file.exists():
        try:
            base = json.loads(state_file.read_text())
        except (json.JSONDecodeError, OSError):
            pass

    def _port_bound(p: int) -> bool:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(0.3)
                return s.connect_ex(("127.0.0.1", p)) == 0
        except OSError:
            return False

    # Override `alive` with live check + ensure all canonical ports are present
    canonical = {
        "backend":   {"port": 8001, "health_path": "/api/v1/health"},
        "vite-3210": {"port": 3210, "health_path": "/"},
        "vite-3000": {"port": 3000, "health_path": "/"},
        "postgres":  {"port": 5434, "health_path": None},
        "ollama":    {"port": 11434, "health_path": "/api/tags"},
    }
    services = base.get("services", {})
    for name, spec in canonical.items():
        s = services.get(name, {
            "port": spec["port"],
            "alive": False,
            "pid": None,
            "restart_count": 0,
            "last_restart_utc": None,
            "backoff_seconds": 5,
            "health_path": spec["health_path"],
        })
        s["alive"] = _port_bound(spec["port"])
        s["port"] = spec["port"]
        services[name] = s

    alive_count = sum(1 for s in services.values() if s.get("alive"))
    total = len(services)
    return {
        "policy": "§150 — apps must not die",
        "supervisor_pid_alive": _supervisor_alive(),
        "updated_local": base.get("updated_local"),
        "updated_utc": base.get("updated_utc"),
        "tick_count": base.get("tick_count", 0),
        "services": services,
        "summary": {
            "alive": alive_count,
            "total": total,
            "ratio": round(alive_count / total, 3) if total else 0.0,
            "overall": "ok" if alive_count == total else ("degraded" if alive_count >= total - 1 else "down"),
        },
        "watchdog_cron_installed": _watchdog_cron(),
        "watchdog_log_tail": _watchdog_tail(8),
    }


def _supervisor_alive() -> bool:
    import subprocess
    try:
        r = subprocess.run(
            ["pgrep", "-f", "multi_supervisor.py"],
            capture_output=True, text=True, timeout=2,
        )
        return bool(r.stdout.strip())
    except (subprocess.SubprocessError, OSError):
        return False


def _watchdog_cron() -> bool:
    import subprocess
    try:
        r = subprocess.run(
            ["crontab", "-l"], capture_output=True, text=True, timeout=2,
        )
        return "INSUR-WATCHDOG" in r.stdout
    except (subprocess.SubprocessError, OSError):
        return False


def _watchdog_tail(n: int) -> list[str]:
    from pathlib import Path
    log = Path("/mnt/deepa/insur_project/jobs/logs/process_watchdog.log")
    if not log.exists():
        return []
    try:
        lines = log.read_text().splitlines()
        return lines[-n:]
    except OSError:
        return []

