"""HMAC request signing · Iter 28 · C5 closure.

Per §47.6 + §6.x · for cross-service / webhook security · the receiver
verifies signature was computed with a shared secret.

Header contract:
  X-Insur-Signature: v1=<hex>
  X-Insur-Signature-Timestamp: <unix-epoch>

The signed payload is: f"v1\n{timestamp}\n{method}\n{path}\n{body_hash}"
where body_hash = sha256(body).hexdigest().

Verifier rejects if timestamp older than MAX_AGE_SECONDS (default 300).
"""
from __future__ import annotations

import hashlib
import hmac
import os
import time

from fastapi import HTTPException, Request

MAX_AGE_SECONDS = int(os.environ.get("INSUR_HMAC_MAX_AGE", "300"))
DEFAULT_SECRET = os.environ.get("INSUR_HMAC_SECRET", "dev-do-not-use-in-prod")


def _payload(method: str, path: str, body: bytes, timestamp: int) -> bytes:
    body_hash = hashlib.sha256(body).hexdigest()
    return f"v1\n{timestamp}\n{method.upper()}\n{path}\n{body_hash}".encode()


def sign(method: str, path: str, body: bytes,
         secret: str | None = None,
         timestamp: int | None = None) -> dict[str, str]:
    ts = timestamp if timestamp is not None else int(time.time())
    sec = (secret or DEFAULT_SECRET).encode()
    sig = hmac.new(sec, _payload(method, path, body, ts), hashlib.sha256).hexdigest()
    return {
        "X-Insur-Signature": f"v1={sig}",
        "X-Insur-Signature-Timestamp": str(ts),
    }


def verify(method: str, path: str, body: bytes,
           signature_header: str | None,
           timestamp_header: str | None,
           secret: str | None = None) -> bool:
    if not signature_header or not timestamp_header:
        return False
    if not signature_header.startswith("v1="):
        return False
    try:
        ts = int(timestamp_header)
    except ValueError:
        return False
    if abs(int(time.time()) - ts) > MAX_AGE_SECONDS:
        return False
    sec = (secret or DEFAULT_SECRET).encode()
    expected = hmac.new(sec, _payload(method, path, body, ts), hashlib.sha256).hexdigest()
    provided = signature_header[3:]
    return hmac.compare_digest(expected, provided)


async def require_hmac(request: Request) -> bool:
    """FastAPI dependency · raises 401 when signature invalid."""
    body = await request.body()
    sig = request.headers.get("X-Insur-Signature")
    ts = request.headers.get("X-Insur-Signature-Timestamp")
    if not verify(request.method, request.url.path, body, sig, ts):
        raise HTTPException(
            status_code=401,
            detail={
                "detail": "Missing or invalid HMAC signature",
                "error_code": "HMAC_INVALID",
                "hint": "Send X-Insur-Signature: v1=<hex> and X-Insur-Signature-Timestamp",
            },
        )
    return True
