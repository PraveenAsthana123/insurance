"""httpx auto-instrumentation hook · Iter 36.

Monkey-patches httpx.Client.request + httpx.AsyncClient.request to
auto-log every outbound call to outbound_audit. Operator opts in by
calling install_httpx_audit_hook() in main.py.

Per §47.6 + §38.3 · supply-chain visibility · transparent which
external services are being called.
"""
from __future__ import annotations

import time

_INSTALLED = False


def install_httpx_audit_hook() -> bool:
    """Install hook · returns True if successful."""
    global _INSTALLED
    if _INSTALLED:
        return True
    try:
        import httpx
    except ImportError:
        return False

    from outbound_audit.router import log_outbound

    _orig_send = httpx.Client.send

    def _patched_send(self, request, *args, **kwargs):
        t0 = time.perf_counter()
        err = None
        resp = None
        try:
            resp = _orig_send(self, request, *args, **kwargs)
            return resp
        except Exception as e:
            err = str(e)
            raise
        finally:
            log_outbound({
                "url": str(request.url),
                "method": request.method,
                "status_code": resp.status_code if resp is not None else None,
                "latency_ms": round((time.perf_counter() - t0) * 1000, 2),
                "error": err,
                "actor": "httpx-auto",
            })

    httpx.Client.send = _patched_send  # type: ignore

    # Async variant
    _orig_async_send = httpx.AsyncClient.send

    async def _patched_async_send(self, request, *args, **kwargs):
        t0 = time.perf_counter()
        err = None
        resp = None
        try:
            resp = await _orig_async_send(self, request, *args, **kwargs)
            return resp
        except Exception as e:
            err = str(e)
            raise
        finally:
            log_outbound({
                "url": str(request.url),
                "method": request.method,
                "status_code": resp.status_code if resp is not None else None,
                "latency_ms": round((time.perf_counter() - t0) * 1000, 2),
                "error": err,
                "actor": "httpx-auto-async",
            })

    httpx.AsyncClient.send = _patched_async_send  # type: ignore
    _INSTALLED = True
    return True


def is_installed() -> bool:
    return _INSTALLED
