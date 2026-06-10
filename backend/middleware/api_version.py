"""API version negotiation middleware · Iter 30.

Per §47.7 + §6.5 · clients request a version via Accept header or
X-API-Version. Server pins responses to the latest supported version
when client doesn't specify · adds X-API-Version response header.
"""
from __future__ import annotations

import re

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

CURRENT = "1.0"
SUPPORTED = ["1.0"]

_ACCEPT_VERSION_RE = re.compile(r"application/vnd\.insur\.v(\d+(?:\.\d+)?)\+json")


class APIVersionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        version = self._negotiate(request)
        request.state.api_version = version
        resp = await call_next(request)
        resp.headers["X-API-Version"] = version
        return resp

    def _negotiate(self, request: Request) -> str:
        # 1. Explicit X-API-Version
        v = request.headers.get("X-API-Version")
        if v and v in SUPPORTED:
            return v
        # 2. Accept header content negotiation
        accept = request.headers.get("Accept", "")
        m = _ACCEPT_VERSION_RE.search(accept)
        if m and m.group(1) in SUPPORTED:
            return m.group(1)
        # 3. Default to current
        return CURRENT
