from __future__ import annotations

import os
import re
import time
from collections import defaultdict, deque
from typing import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from core.structured_logger import correlation_id_var, emit_event, new_correlation_id


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Attaches a correlation ID to every request for end-to-end tracing.

    - Honors incoming ``X-Correlation-ID`` header; otherwise mints a new 16-char hex id.
    - Stores the id in ``request.state`` and in the ``correlation_id_var`` contextvar
      so structured log events from deeper code paths pick it up automatically.
    - Emits a JSON ``http.request`` (or ``http.request.failed``) event with
      ``{path, method, status, latency_ms}`` at the end of each request.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Accept case-insensitive header; fall back to new id.
        correlation_id = (
            request.headers.get("X-Correlation-ID")
            or request.headers.get("x-correlation-id")
            or new_correlation_id()
        )
        request.state.correlation_id = correlation_id
        token = correlation_id_var.set(correlation_id)

        t0 = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            latency_ms = int((time.perf_counter() - t0) * 1000)
            emit_event(
                "http.request.failed",
                path=str(request.url.path),
                method=request.method,
                latency_ms=latency_ms,
            )
            correlation_id_var.reset(token)
            raise

        latency_ms = int((time.perf_counter() - t0) * 1000)
        response.headers["X-Correlation-ID"] = correlation_id
        emit_event(
            "http.request",
            path=str(request.url.path),
            method=request.method,
            status=response.status_code,
            latency_ms=latency_ms,
        )
        correlation_id_var.reset(token)
        return response


class TenantIdMiddleware(BaseHTTPMiddleware):
    """Per §64.43 #7 + §41.3 — federated multi-tenant request scoping.

    Reads ``X-Tenant-ID`` (case-insensitive); falls back to ``default``.
    Stores on ``request.state.tenant_id`` and echoes via response header so
    downstream services (audit rows, RBAC, AI agents) propagate the same value.

    Validation:
      - Tenant IDs are restricted to ``[a-z0-9][a-z0-9-]{0,62}`` (DNS-label safe)
        to keep them log-injection-safe and to forbid path traversal in filenames.
      - If ``TENANT_ID_ALLOWLIST`` env var is set (comma-separated), only those
        IDs are accepted; off-list IDs → 403 with structured error envelope.
      - If ``TENANT_ID_STRICT=true``, missing ``X-Tenant-ID`` header → 400 with
        structured error envelope (callers must opt in explicitly).
      - Health/docs paths bypass strict mode so probes still work.

    The tenant_id is exposed by ``current_tenant_id(request)`` helper for routers
    + services to inject into audit rows, decision logs, and per-tenant query
    scoping.
    """

    _BYPASS_PATHS: tuple[str, ...] = ("/api/health", "/health", "/docs", "/openapi.json", "/redoc")
    _ID_PATTERN: re.Pattern = re.compile(r"^[a-z0-9][a-z0-9-]{0,62}$")

    def __init__(self, app: ASGIApp, default_tenant: str = "default") -> None:
        super().__init__(app)
        self._default = default_tenant
        self._strict = os.environ.get("TENANT_ID_STRICT", "false").lower() == "true"
        raw = os.environ.get("TENANT_ID_ALLOWLIST", "")
        self._allowlist = {t.strip() for t in raw.split(",") if t.strip()} or None  # None = open

    def _bad_request(self, request: Request, detail: str, code: str, status: int = 400) -> JSONResponse:
        return JSONResponse(
            status_code=status,
            content={
                "detail": detail,
                "error_code": code,
                "correlation_id": getattr(request.state, "correlation_id", ""),
            },
        )

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.url.path in self._BYPASS_PATHS:
            request.state.tenant_id = self._default
            return await call_next(request)

        raw = request.headers.get("X-Tenant-ID") or request.headers.get("x-tenant-id")
        if raw is None:
            if self._strict:
                return self._bad_request(request, "X-Tenant-ID header required in strict mode", "TENANT_ID_MISSING")
            tenant_id = self._default
        else:
            tenant_id = raw.strip().lower()
            if not self._ID_PATTERN.match(tenant_id):
                return self._bad_request(
                    request,
                    "X-Tenant-ID must match [a-z0-9][a-z0-9-]{0,62}",
                    "TENANT_ID_INVALID",
                )
            if self._allowlist is not None and tenant_id not in self._allowlist:
                return self._bad_request(
                    request,
                    f"tenant {tenant_id!r} not in TENANT_ID_ALLOWLIST",
                    "TENANT_ID_FORBIDDEN",
                    status=403,
                )

        request.state.tenant_id = tenant_id
        response = await call_next(request)
        response.headers["X-Tenant-ID"] = tenant_id
        return response


def current_tenant_id(request: Request) -> str:
    """Helper for routers/services to read the middleware-set tenant_id.

    Returns ``"default"`` if TenantIdMiddleware did not run (e.g., in unit tests
    that mount only one router).
    """
    return getattr(request.state, "tenant_id", "default")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds security headers to every HTTP response."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Per-IP sliding-window rate limiter.

    Applies different limits to API vs upload endpoints.
    Returns 429 Too Many Requests with a Retry-After header when limit is exceeded.
    """

    # Paths that count toward the upload quota
    _UPLOAD_PATH_PREFIXES: tuple[str, ...] = ("/api/v1/datasets/upload",)

    def __init__(
        self,
        app: ASGIApp,
        requests_per_minute: int = 100,
        upload_requests_per_minute: int = 10,
    ) -> None:
        super().__init__(app)
        self._rpm = requests_per_minute
        self._upload_rpm = upload_requests_per_minute
        # ip -> deque of timestamps (float)
        self._api_windows: dict[str, deque[float]] = defaultdict(deque)
        self._upload_windows: dict[str, deque[float]] = defaultdict(deque)

    def _is_upload_path(self, path: str) -> bool:
        return any(path.startswith(prefix) for prefix in self._UPLOAD_PATH_PREFIXES)

    def _check_limit(
        self, windows: dict[str, deque[float]], ip: str, limit: int
    ) -> tuple[bool, int]:
        """
        Returns (allowed, retry_after_seconds).
        Prunes timestamps older than 60 seconds from the window.
        """
        now = time.monotonic()
        window = windows[ip]

        # Prune old timestamps
        while window and now - window[0] > 60:
            window.popleft()

        if len(window) >= limit:
            oldest = window[0]
            retry_after = max(1, int(60 - (now - oldest)) + 1)
            return False, retry_after

        window.append(now)
        return True, 0

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limiting for health checks
        if request.url.path in ("/api/health", "/health"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path

        if self._is_upload_path(path):
            allowed, retry_after = self._check_limit(
                self._upload_windows, client_ip, self._upload_rpm
            )
        else:
            allowed, retry_after = self._check_limit(
                self._api_windows, client_ip, self._rpm
            )

        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Too many requests. Please slow down.",
                    "error_code": "RATE_LIMIT_EXCEEDED",
                    "correlation_id": getattr(request.state, "correlation_id", ""),
                },
                headers={"Retry-After": str(retry_after)},
            )

        return await call_next(request)
