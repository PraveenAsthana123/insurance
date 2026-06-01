"""Generic §10.3 idempotency cache layer — namespace-scoped.

The CUA execute path has its own bespoke cache in
`services/agent_platform_service.py` because that path also drives the
Playwright session + audit row + tenant federation. This module is the
LIGHTER reusable version for routers that just need
"don't double-process the same Idempotency-Key from the same tenant
within TTL".

Used by:
  - POST /api/v1/openclaw/tasks  (don't re-enqueue the same task)
  - POST /api/v1/paperclip/clips (don't store the same artifact twice)

Per global CLAUDE.md §10.3 + §41.3 + §47.6:
  - Cross-tenant isolated by construction — `(namespace, tenant_id, key)`
    is the cache key
  - Only successful responses are cached (caller may legitimately retry
    after a 4xx/5xx)
  - Disk-persisted JSONL backing (survives restart, multi-replica share)
  - Replay marker via response header `X-Idempotent-Replay: true`
    rather than mutating the response body (cleaner — no schema change
    needed on the router-side response models)
  - TTL via env override per namespace, defaults to 300s

Per §57.7:
  - Corrupt JSON lines on load are skipped (never crash)
  - Disk errors do NOT crash the request (best-effort persistence)
  - API key / token values in metadata are NEVER cached (only the
    response body of the underlying service)
"""
from __future__ import annotations

import json
import os
import time
from pathlib import Path
from threading import Lock
from typing import Any

from fastapi import HTTPException

# (namespace, tenant_id, key) → (cached_response_dict, stored_at_ts)
_CACHE: dict[tuple[str, str, str], tuple[dict[str, Any], float]] = {}
_CACHE_LOCK = Lock()

# Track which on-disk path we last loaded from, per namespace. If env changes
# (typical in tests), we drop the namespace's cached entries and reload.
_LOADED_FROM: dict[str, str] = {}

_DEFAULT_TTL = float(os.environ.get("IDEMPOTENCY_TTL_SECONDS", "300"))
_DEFAULT_MAX_ENTRIES = int(os.environ.get("IDEMPOTENCY_MAX_ENTRIES", "1000"))
_MAX_KEY_LENGTH = 128


def _disk_path(namespace: str) -> Path:
    """Per-namespace JSONL path; default `data/agent-supervisor/idempotency_{namespace}.jsonl`.

    Override via `IDEMPOTENCY_PATH_<NAMESPACE_UPPER>` env var.
    """
    env_key = f"IDEMPOTENCY_PATH_{namespace.upper()}"
    if env_key in os.environ:
        return Path(os.environ[env_key])
    return Path(f"data/agent-supervisor/idempotency_{namespace}.jsonl")


def _ttl_seconds() -> float:
    """Read TTL fresh per call so test env overrides take effect."""
    return float(os.environ.get("IDEMPOTENCY_TTL_SECONDS", _DEFAULT_TTL))


def _load_from_disk(namespace: str) -> None:
    """Populate in-memory cache for the given namespace from its JSONL file.

    Called lazily on first lookup per process. Skips corrupt JSON + blank
    lines + TTL-expired entries. Latest write wins for duplicate keys
    (matches append-only semantics).
    """
    path = _disk_path(namespace)
    if _LOADED_FROM.get(namespace) == str(path):
        return
    # Drop existing in-memory entries for this namespace before reloading
    with _CACHE_LOCK:
        for k in list(_CACHE):
            if k[0] == namespace:
                _CACHE.pop(k, None)
        _LOADED_FROM[namespace] = str(path)
    if not path.exists():
        return
    ttl = _ttl_seconds()
    now = time.time()
    try:
        for line in path.read_text().splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            try:
                tenant_id = entry["tenant_id"]
                key = entry["idempotency_key"]
                stored_at = float(entry["stored_at"])
                response = entry["response"]
            except (KeyError, TypeError, ValueError):
                continue
            if now - stored_at > ttl:
                continue
            with _CACHE_LOCK:
                _CACHE[(namespace, tenant_id, key)] = (response, stored_at)
    except OSError:
        pass


def _append_to_disk(
    namespace: str, tenant_id: str, key: str, response: dict[str, Any], stored_at: float,
) -> None:
    """Best-effort JSONL append. Never crashes the request."""
    path = _disk_path(namespace)
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        entry = {
            "namespace": namespace,
            "tenant_id": tenant_id,
            "idempotency_key": key,
            "stored_at": stored_at,
            "response": response,
        }
        with path.open("a") as fh:
            fh.write(json.dumps(entry, separators=(",", ":")) + "\n")
    except OSError:
        pass


def lookup(namespace: str, tenant_id: str, key: str | None) -> dict[str, Any] | None:
    """Return the cached response dict for (namespace, tenant_id, key), or None.

    Cross-tenant lookup is impossible by construction — tenant_id is part
    of the cache key. Caller is responsible for passing the MIDDLEWARE-set
    tenant_id (not body-supplied), preserving the anti-spoof guarantee
    from §64.43 #7.
    """
    if not key:
        return None
    _load_from_disk(namespace)
    with _CACHE_LOCK:
        entry = _CACHE.get((namespace, tenant_id, key))
    if entry is None:
        return None
    response, stored_at = entry
    if time.time() - stored_at > _ttl_seconds():
        with _CACHE_LOCK:
            _CACHE.pop((namespace, tenant_id, key), None)
        return None
    return response


def store(
    namespace: str, tenant_id: str, key: str | None, response: dict[str, Any],
) -> None:
    """Persist response to disk + in-memory cache. No-op if `key` is None."""
    if not key:
        return
    stored_at = time.time()
    with _CACHE_LOCK:
        _CACHE[(namespace, tenant_id, key)] = (response, stored_at)
    _append_to_disk(namespace, tenant_id, key, response, stored_at)
    # LRU trim to bound memory
    max_entries = int(os.environ.get("IDEMPOTENCY_MAX_ENTRIES", _DEFAULT_MAX_ENTRIES))
    if len(_CACHE) > max_entries:
        with _CACHE_LOCK:
            sorted_entries = sorted(_CACHE.items(), key=lambda kv: kv[1][1])
            drop_count = max(1, len(sorted_entries) // 10)
            for cache_key, _ in sorted_entries[:drop_count]:
                _CACHE.pop(cache_key, None)


def extract_key(http_request, body_key: str | None = None) -> str | None:
    """Helper for router-side: prefer body field, fall back to header.

    `body_key`: the value of `request.idempotency_key` if your Pydantic
    request schema has one. None if your schema does not.

    Returns the resolved key (stripped), or None.
    """
    if body_key:
        stripped = body_key.strip()
        if stripped:
            if len(stripped) > _MAX_KEY_LENGTH:
                raise HTTPException(status_code=400, detail="Idempotency-Key must be <= 128 characters")
            return stripped
    header = (
        http_request.headers.get("Idempotency-Key")
        or http_request.headers.get("idempotency-key")
    )
    if header:
        stripped = header.strip()
        if stripped:
            if len(stripped) > _MAX_KEY_LENGTH:
                raise HTTPException(status_code=400, detail="Idempotency-Key must be <= 128 characters")
            return stripped
    return None
