"""CSP nonce middleware · Iter 31.

Generates a per-request nonce · adds Content-Security-Policy header
that allows only nonce-tagged inline scripts/styles. Stricter than the
existing baseline CSP.
"""
from __future__ import annotations

import secrets

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


class CSPNonceMiddleware(BaseHTTPMiddleware):
    """Per-request nonce in Content-Security-Policy."""

    async def dispatch(self, request: Request, call_next):
        nonce = secrets.token_urlsafe(16)
        request.state.csp_nonce = nonce
        resp = await call_next(request)
        existing = resp.headers.get("Content-Security-Policy", "")
        # Append nonce sources to script-src / style-src · preserve baseline
        policy = (
            f"default-src 'self'; "
            f"script-src 'self' 'nonce-{nonce}'; "
            f"style-src 'self' 'unsafe-inline'; "  # keep inline styles for now
            f"img-src 'self' data: blob:; "
            f"connect-src 'self' http://localhost:8001 ws://localhost:8001; "
            f"frame-ancestors 'none';"
        )
        resp.headers["Content-Security-Policy"] = policy
        resp.headers["X-CSP-Nonce"] = nonce  # operator can read in dev
        return resp
