"""structured_logger — JSON log emitter with correlation_id contextvar.

Usage:
    from core.structured_logger import emit_event, correlation_id_var

    emit_event("sales.forecast", store_id=1, mape=0.147, fit_time_ms=100)

Every event automatically includes:
    {timestamp, correlation_id, event}
"""
from __future__ import annotations

import json
import logging
import sys
import uuid
from contextvars import ContextVar
from datetime import datetime, timezone

correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="-")

_json_logger = logging.getLogger("insur.events")
if not _json_logger.handlers:
    _h = logging.StreamHandler(sys.stdout)
    _h.setFormatter(logging.Formatter("%(message)s"))
    _json_logger.addHandler(_h)
    _json_logger.setLevel(logging.INFO)
    _json_logger.propagate = False


def new_correlation_id() -> str:
    """Generate a new correlation id. Middleware sets it per request."""
    return uuid.uuid4().hex[:16]


def set_correlation_id(cid: str) -> None:
    correlation_id_var.set(cid)


def get_correlation_id() -> str:
    return correlation_id_var.get()


def emit_event(event: str, **fields) -> None:
    """Log a structured JSON event row. Drops non-JSON-serializable fields."""
    row = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "correlation_id": correlation_id_var.get(),
        "event": event,
        **{k: _safe(v) for k, v in fields.items()},
    }
    _json_logger.info(json.dumps(row, default=str))


def _safe(v):
    try:
        json.dumps(v)
        return v
    except (TypeError, ValueError):
        return str(v)
