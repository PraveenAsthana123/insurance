"""Deprecation header middleware · Iter 35.

Per RFC 8594 + RFC 9745 · serve Deprecation + Sunset headers on routes
marked as deprecated. Other requests pass through untouched.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

STORE = Path(os.environ.get("INSUR_DEPRECATION_PATH", "data/deprecations.json"))


def _load() -> dict:
    if STORE.exists():
        try:
            return json.loads(STORE.read_text())
        except Exception:
            pass
    return {"routes": {}}


class DeprecationHeaderMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        resp = await call_next(request)
        d = _load()
        key = f"{request.method}:{request.url.path}"
        mark = d.get("routes", {}).get(key)
        if mark:
            resp.headers["Deprecation"] = "true"
            resp.headers["Sunset"] = mark.get("sunset_date", "")
            if mark.get("replacement_path"):
                resp.headers["Link"] = (
                    f'<{mark["replacement_path"]}>; rel="alternate"; '
                    f'type="application/json"'
                )
            if mark.get("note"):
                resp.headers["X-Deprecation-Note"] = mark["note"][:200]
        return resp
