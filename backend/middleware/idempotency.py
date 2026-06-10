"""Idempotency-Key middleware · Iter 25 · C2 closure.

Per §47.7 (write paths · safe retry contract):
  · POST/PUT/PATCH endpoints honor `Idempotency-Key` header
  · First request: process + cache response (status + body) by key
  · Retries with same key + same body hash: return cached response · skip handler
  · 24-hour TTL (in-memory · production would use Redis)

Per §57.7 honest: cache survives ONLY for the process lifetime
(in-memory dict). Cross-restart durability needs Redis.
"""
from __future__ import annotations

import hashlib
import time
from typing import Any

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse


_CACHE: dict[str, dict[str, Any]] = {}
_TTL_SECONDS = 86400


def _body_hash(body: bytes) -> str:
    return hashlib.sha256(body).hexdigest()[:16]


def _evict_expired() -> None:
    now = time.time()
    stale = [k for k, v in _CACHE.items() if v["expires_at"] < now]
    for k in stale:
        del _CACHE[k]


class IdempotencyMiddleware(BaseHTTPMiddleware):
    """Honor Idempotency-Key for write methods · cache successful responses."""

    WRITE_METHODS = {"POST", "PUT", "PATCH"}

    async def dispatch(self, request: Request, call_next):
        if request.method not in self.WRITE_METHODS:
            return await call_next(request)
        key = request.headers.get("Idempotency-Key")
        if not key:
            return await call_next(request)

        body_bytes = await request.body()
        body_h = _body_hash(body_bytes)
        cache_key = f"{request.method}:{request.url.path}:{key}"

        _evict_expired()
        cached = _CACHE.get(cache_key)
        if cached:
            if cached["body_hash"] != body_h:
                return JSONResponse(
                    status_code=409,
                    content={
                        "detail": "Idempotency-Key reused with different body",
                        "error_code": "IDEMPOTENCY_CONFLICT",
                    },
                )
            return Response(
                content=cached["body"],
                status_code=cached["status_code"],
                headers=dict(cached["headers"]) | {"X-Idempotency-Cache": "hit"},
                media_type=cached["media_type"],
            )

        # Rebuild request stream so handler can read body
        async def receive():
            return {"type": "http.request", "body": body_bytes, "more_body": False}
        request._receive = receive  # type: ignore[attr-defined]

        resp = await call_next(request)

        # Cache only successful responses
        if 200 <= resp.status_code < 300:
            chunks = []
            async for chunk in resp.body_iterator:
                chunks.append(chunk)
            body_out = b"".join(chunks)
            _CACHE[cache_key] = {
                "status_code": resp.status_code,
                "body": body_out,
                "headers": [(k, v) for k, v in resp.headers.items() if k.lower() != "content-length"],
                "media_type": resp.media_type,
                "body_hash": body_h,
                "expires_at": time.time() + _TTL_SECONDS,
            }
            return Response(
                content=body_out,
                status_code=resp.status_code,
                headers=dict(resp.headers) | {"X-Idempotency-Cache": "miss"},
                media_type=resp.media_type,
            )
        return resp
