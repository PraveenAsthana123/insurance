# Sales Phase ζ — Observability (structured logs + prompt logs)

**Goal:** Every sales endpoint emits a structured JSON log row with `{timestamp, correlation_id, endpoint, latency_ms, status, domain-specific-fields}`. `/api/v1/ai/explain` adds `{prompt_tokens, response_tokens, citation_count, retrieved_doc_ids, model}`. `/api/v1/sales/forecast` adds `{store_id, horizon, mape, fit_time_ms, predict_time_ms}`. `/api/v1/sales/simulate` adds `{store_id, discount_pct, duration_days, net_impact}`.

**Scope:** backend only. No new deps. Uses stdlib `logging` + `json`. OpenTelemetry tracing is deferred to Phase 2b.

**Architecture:**
- Middleware attaches correlation_id to every request (reuse existing if `backend/core/middleware.py` has one; otherwise create)
- `core/structured_logger.py` — JSON-log helper that adds correlation_id from contextvar
- Each service emits a domain-specific event via the helper
- Router boundary logs `{endpoint, latency_ms, status}` for every request

**Files:**
```
CREATE: backend/core/structured_logger.py
CREATE: backend/tests/test_structured_logger.py
MODIFY: backend/core/middleware.py                       (ensure correlation_id middleware)
MODIFY: backend/main.py                                   (register middleware if not already)
MODIFY: backend/services/forecast_service.py              (emit forecast event)
MODIFY: backend/services/simulation_service.py            (emit simulation event)
MODIFY: backend/services/rag_service.py                   (emit ai-explain event)
```

## Tasks

### Task 1 — structured_logger

Create `/mnt/deepa/insur/backend/core/structured_logger.py`:

```python
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
```

### Task 2 — correlation-id middleware

Check `backend/core/middleware.py`. If there's no correlation-id middleware, append:

```python
from core.structured_logger import correlation_id_var, emit_event, new_correlation_id

class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Accept incoming X-Correlation-Id header, or mint one. Emit request event."""
    async def dispatch(self, request, call_next):
        import time
        cid = request.headers.get("x-correlation-id") or new_correlation_id()
        token = correlation_id_var.set(cid)
        t0 = time.perf_counter()
        try:
            resp = await call_next(request)
        except Exception:
            latency_ms = int((time.perf_counter() - t0) * 1000)
            emit_event("http.request.failed", path=str(request.url.path),
                       method=request.method, latency_ms=latency_ms)
            correlation_id_var.reset(token)
            raise
        latency_ms = int((time.perf_counter() - t0) * 1000)
        resp.headers["X-Correlation-Id"] = cid
        emit_event("http.request", path=str(request.url.path),
                   method=request.method, status=resp.status_code,
                   latency_ms=latency_ms)
        correlation_id_var.reset(token)
        return resp
```

(If `BaseHTTPMiddleware` isn't already imported, add `from starlette.middleware.base import BaseHTTPMiddleware`.)

Register in `backend/main.py` (only if not already). Add BEFORE any other middleware so correlation_id is set first.

### Task 3 — emit per-endpoint events

In `backend/services/forecast_service.py`, at the end of `_fit_and_cache` (before the return):
```python
from core.structured_logger import emit_event
emit_event("sales.forecast.fit", store_id=store_id, mape=mape,
           fit_time_ms=fit_ms, history_rows=len(train))
```

And at the end of `forecast()` before return:
```python
emit_event("sales.forecast", store_id=store_id, horizon_days=horizon_days,
           mape=fitted.mape, predict_time_ms=predict_ms)
```

In `backend/services/simulation_service.py`, at the end of `simulate()`:
```python
from core.structured_logger import emit_event
emit_event("sales.simulate", store_id=req.store_id, discount_pct=req.discount_pct,
           duration_days=req.duration_days, baseline_revenue=req.duration_days * 0 or 0,  # compute below
           net_impact=net_impact, elasticity=DEFAULT_ELASTICITY)
```
(Actually just use the computed values from the return statement.)

In `backend/services/rag_service.py`, at the end of `explain()`:
```python
from core.structured_logger import emit_event
emit_event("ai.explain", model=MODEL, prompt_chars=len(prompt),
           response_chars=len(response_md), citation_count=len(citations),
           retrieved_ids=[c.id for c in citations],
           retrieval_time_ms=retrieval_ms, generation_time_ms=generation_ms)
```

### Task 4 — tests

Create `/mnt/deepa/insur/backend/tests/test_structured_logger.py`:

```python
import json
import logging
from io import StringIO

from core.structured_logger import (
    correlation_id_var, emit_event, new_correlation_id,
    set_correlation_id, get_correlation_id,
)


def _capture_logs(func):
    buf = StringIO()
    h = logging.StreamHandler(buf)
    h.setFormatter(logging.Formatter("%(message)s"))
    lg = logging.getLogger("insur.events")
    lg.addHandler(h)
    try:
        func()
    finally:
        lg.removeHandler(h)
    return [json.loads(line) for line in buf.getvalue().strip().splitlines() if line]


def test_new_correlation_id_is_16_chars_hex():
    cid = new_correlation_id()
    assert len(cid) == 16
    int(cid, 16)  # valid hex


def test_emit_event_includes_correlation_id():
    set_correlation_id("abc123")
    rows = _capture_logs(lambda: emit_event("test.event", foo=1))
    assert len(rows) == 1
    assert rows[0]["correlation_id"] == "abc123"
    assert rows[0]["event"] == "test.event"
    assert rows[0]["foo"] == 1
    assert "timestamp" in rows[0]


def test_emit_event_default_correlation_id():
    correlation_id_var.set("-")  # default
    rows = _capture_logs(lambda: emit_event("default.test"))
    assert rows[0]["correlation_id"] == "-"


def test_emit_event_stringifies_nonjson_values():
    set_correlation_id("xyz")
    rows = _capture_logs(lambda: emit_event("complex", obj=object()))
    assert isinstance(rows[0]["obj"], str)
```

Run: `python -m pytest backend/tests/test_structured_logger.py -v` → 4/4 pass.

### Task 5 — smoke + verify

Restart backend, curl an endpoint, and confirm logs are JSON with a correlation_id:

```bash
curl -s http://localhost:8001/api/v1/sales/stores > /dev/null
# Check recent backend log output — should show {"timestamp": ..., "correlation_id": ..., "event": "http.request", "path": "/api/v1/sales/stores", ...}
```

Run full backend test sweep: 36 + 4 = 40/40 pass.

## Commits (one per task)

1. `feat(core): structured_logger with correlation_id contextvar`
2. `feat(middleware): CorrelationIdMiddleware — sets contextvar + emits http.request event`
3. `feat(obs): sales services emit forecast/simulate/ai.explain events`
4. `test(core): structured_logger unit tests`
5. (verification only, no commit)

Push.

## Completion criteria

- [ ] All sales endpoints emit JSON log rows with correlation_id
- [ ] `/ai/explain` log includes retrieved_ids + citation_count + model
- [ ] `/forecast` log includes store_id + mape + fit/predict times
- [ ] `/simulate` log includes store_id + net_impact
- [ ] 4 new unit tests pass; 36 prior tests still pass
- [ ] Incoming `X-Correlation-Id` header is echoed back on response
