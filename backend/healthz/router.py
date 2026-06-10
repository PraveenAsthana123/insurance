"""K8s liveness + readiness probes · Iter 32.

Per §47.8 (Kubernetes 3-probe pattern):
  · /healthz/live    · DUMB process check · 'am I alive?' · never deps
  · /healthz/ready   · SMART deps check · 'can I serve right now?' · DB + cache
  · /healthz/startup · Slow boot tolerance · 'have I finished booting?'

Liveness check must NOT check deps · cascade pod restart antipattern.
Readiness removes pod from service when deps degrade · still alive.
"""
from __future__ import annotations

import os
import time
from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(tags=["healthz"])

_STARTED_AT = time.time()
# Set to True only after lifespan startup has completed (read by /startup)
_STARTUP_DONE = False


def mark_startup_done() -> None:
    global _STARTUP_DONE
    _STARTUP_DONE = True


@router.get("/healthz/live")
def live():
    """Liveness · DUMB · always returns 200 if process can answer."""
    return {"status": "live", "uptime_seconds": round(time.time() - _STARTED_AT, 1)}


@router.get("/healthz/startup")
def startup():
    """Startup probe · returns 503 if not yet finished booting."""
    if not _STARTUP_DONE:
        return JSONResponse(
            status_code=503,
            content={"status": "starting", "uptime_seconds": round(time.time() - _STARTED_AT, 1)},
        )
    return {"status": "ready", "uptime_seconds": round(time.time() - _STARTED_AT, 1)}


@router.get("/healthz/ready")
def ready():
    """Readiness · checks DB + Redis (if configured) · returns 503 on dep failure."""
    deps: dict[str, dict] = {}
    overall_ok = True

    # DB probe
    try:
        import psycopg2
        from core.config import get_settings
        with psycopg2.connect(get_settings().database_url) as c, c.cursor() as cur:
            cur.execute("SELECT 1")
            cur.fetchone()
        deps["database"] = {"status": "ok"}
    except Exception as e:
        deps["database"] = {"status": "error", "error": f"{type(e).__name__}"}
        overall_ok = False

    # Redis probe (only if configured)
    if os.environ.get("REDIS_URL"):
        try:
            import redis
            r = redis.from_url(os.environ["REDIS_URL"], decode_responses=True)
            r.ping()
            deps["redis"] = {"status": "ok"}
        except Exception as e:
            deps["redis"] = {"status": "error", "error": f"{type(e).__name__}"}
            overall_ok = False

    body = {
        "status": "ready" if overall_ok else "not_ready",
        "deps": deps,
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }
    return JSONResponse(status_code=200 if overall_ok else 503, content=body)
