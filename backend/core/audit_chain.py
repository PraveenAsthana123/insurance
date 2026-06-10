"""Tamper-evident audit log HMAC chain · Iter 29 · C7 simplified closure.

Per §38.3 + §47.7: each audit row carries an HMAC computed over
(prev_hmac + content). Operator can replay the chain to detect any
row insertion · deletion · or modification.

Per §57.7: in-memory chain for dev · production wires to Postgres +
secret rotation.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import time
from typing import Any

DEFAULT_SECRET = os.environ.get("INSUR_AUDIT_CHAIN_SECRET", "dev-chain-secret")

# In-memory chain state · ((index, ts, hmac, content_json), ...)
_CHAIN: list[dict] = []
_GENESIS = "GENESIS"


def _hmac_for(prev_hmac: str, content: dict, secret: str) -> str:
    canonical = json.dumps(content, sort_keys=True, separators=(",", ":")).encode()
    payload = prev_hmac.encode() + b"\n" + canonical
    return hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()


def append(content: dict, secret: str | None = None) -> dict:
    """Append a new audit row · returns the chain entry."""
    sec = secret or DEFAULT_SECRET
    prev = _CHAIN[-1]["hmac"] if _CHAIN else _GENESIS
    h = _hmac_for(prev, content, sec)
    row = {
        "index": len(_CHAIN),
        "timestamp": time.time(),
        "prev_hmac": prev,
        "hmac": h,
        "content": content,
    }
    _CHAIN.append(row)
    return row


def verify_chain(secret: str | None = None) -> dict:
    """Replay chain and report tamper status."""
    sec = secret or DEFAULT_SECRET
    expected_prev = _GENESIS
    tampered_at: list[int] = []
    for row in _CHAIN:
        if row["prev_hmac"] != expected_prev:
            tampered_at.append(row["index"])
        expected_h = _hmac_for(row["prev_hmac"], row["content"], sec)
        if row["hmac"] != expected_h:
            tampered_at.append(row["index"])
        expected_prev = row["hmac"]
    return {
        "n_rows": len(_CHAIN),
        "tampered": len(tampered_at) > 0,
        "tampered_indices": sorted(set(tampered_at)),
        "secret_set": secret is not None or os.environ.get("INSUR_AUDIT_CHAIN_SECRET") is not None,
    }


def list_chain(limit: int = 20) -> list[dict]:
    return _CHAIN[-limit:]


def reset_for_test():
    _CHAIN.clear()
