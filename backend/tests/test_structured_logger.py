"""Unit tests for core.structured_logger — JSON emitter + correlation_id contextvar."""
from __future__ import annotations

import json
import logging
from io import StringIO

from core.structured_logger import (
    correlation_id_var,
    emit_event,
    get_correlation_id,
    new_correlation_id,
    set_correlation_id,
)


def _capture_logs(func):
    """Attach a temp StringIO handler to the insur.events logger, run func, return parsed JSON rows."""
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
    int(cid, 16)  # valid hex — raises ValueError if not


def test_emit_event_includes_correlation_id():
    set_correlation_id("abc123")
    rows = _capture_logs(lambda: emit_event("test.event", foo=1))
    assert len(rows) == 1
    assert rows[0]["correlation_id"] == "abc123"
    assert rows[0]["event"] == "test.event"
    assert rows[0]["foo"] == 1
    assert "timestamp" in rows[0]
    # Round-trip via contextvar getter
    assert get_correlation_id() == "abc123"


def test_emit_event_default_correlation_id():
    correlation_id_var.set("-")  # default sentinel
    rows = _capture_logs(lambda: emit_event("default.test"))
    assert rows[0]["correlation_id"] == "-"


def test_emit_event_stringifies_nonjson_values():
    set_correlation_id("xyz")
    rows = _capture_logs(lambda: emit_event("complex", obj=object()))
    assert isinstance(rows[0]["obj"], str)
    assert rows[0]["correlation_id"] == "xyz"
