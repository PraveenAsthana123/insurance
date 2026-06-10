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
    try:
        __import__(name)
        return {"status": "ok"}
    except ImportError:
        return {"status": "not_installed"}


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
