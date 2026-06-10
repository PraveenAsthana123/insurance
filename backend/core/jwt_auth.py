"""JWT session token helper · Iter 30 · F1 simplified.

Per §47.6 + §61 · session token for cross-request auth.
HS256 with shared secret · short TTL by default · refresh endpoint.

Per §57.7: dev fallback secret · operator wires real KMS-backed key
when shipping prod.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import time
from base64 import urlsafe_b64decode, urlsafe_b64encode

DEFAULT_SECRET = os.environ.get("INSUR_JWT_SECRET", "dev-do-not-use-in-prod")
DEFAULT_TTL_SECONDS = int(os.environ.get("INSUR_JWT_TTL", "3600"))


def _b64encode(b: bytes) -> str:
    return urlsafe_b64encode(b).rstrip(b"=").decode()


def _b64decode(s: str) -> bytes:
    pad = "=" * ((4 - len(s) % 4) % 4)
    return urlsafe_b64decode(s + pad)


def encode_jwt(
    payload: dict,
    secret: str | None = None,
    ttl_seconds: int | None = None,
) -> str:
    """Encode an HS256 JWT with iat + exp."""
    now = int(time.time())
    p = {
        **payload,
        "iat": now,
        "exp": now + (ttl_seconds or DEFAULT_TTL_SECONDS),
    }
    header_b64 = _b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    payload_b64 = _b64encode(json.dumps(p, separators=(",", ":"), sort_keys=True).encode())
    msg = f"{header_b64}.{payload_b64}".encode()
    sig = hmac.new((secret or DEFAULT_SECRET).encode(), msg, hashlib.sha256).digest()
    sig_b64 = _b64encode(sig)
    return f"{header_b64}.{payload_b64}.{sig_b64}"


def decode_jwt(token: str, secret: str | None = None) -> dict:
    """Decode + verify HS256 JWT. Raises ValueError on invalid/expired."""
    try:
        header_b64, payload_b64, sig_b64 = token.split(".")
    except ValueError as e:
        raise ValueError("malformed token") from e
    msg = f"{header_b64}.{payload_b64}".encode()
    expected_sig = hmac.new((secret or DEFAULT_SECRET).encode(), msg, hashlib.sha256).digest()
    provided_sig = _b64decode(sig_b64)
    if not hmac.compare_digest(expected_sig, provided_sig):
        raise ValueError("signature mismatch")
    payload = json.loads(_b64decode(payload_b64))
    if "exp" in payload and int(time.time()) > payload["exp"]:
        raise ValueError("token expired")
    return payload
