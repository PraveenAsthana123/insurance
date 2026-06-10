"""ETag/304 caching middleware · Iter 27 · C4 closure.

Computes ETag from response body for GET responses · returns 304
Not Modified when If-None-Match matches. Saves bandwidth on
panels that re-poll the same data.

Per §47.7 + §6.3 spec.
"""
from __future__ import annotations

import hashlib

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class ETagMiddleware(BaseHTTPMiddleware):
    """Add ETag header to GET responses · respect If-None-Match."""

    def _should_etag(self, path: str) -> bool:
        # Iter 27 · only GET to safe API paths · skip streaming and SSE
        if path.endswith("/stream"):
            return False
        return path.startswith("/api/v1/")

    async def dispatch(self, request: Request, call_next):
        if request.method != "GET" or not self._should_etag(request.url.path):
            return await call_next(request)

        resp = await call_next(request)
        if resp.status_code != 200:
            return resp

        # Read body via iterator (necessary for hashing)
        chunks: list[bytes] = []
        async for chunk in resp.body_iterator:
            chunks.append(chunk)
        body = b"".join(chunks)

        etag = '"' + hashlib.sha256(body).hexdigest()[:24] + '"'
        client_inm = request.headers.get("if-none-match")

        if client_inm == etag:
            return Response(
                status_code=304,
                headers={"ETag": etag, "Cache-Control": "no-cache, must-revalidate"},
            )

        new_resp = Response(
            content=body,
            status_code=resp.status_code,
            media_type=resp.media_type,
        )
        for k, v in resp.headers.items():
            if k.lower() in ("content-length",):
                continue
            new_resp.headers[k] = v
        new_resp.headers["ETag"] = etag
        new_resp.headers["Cache-Control"] = "no-cache, must-revalidate"
        return new_resp
