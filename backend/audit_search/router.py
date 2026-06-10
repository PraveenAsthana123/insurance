"""/api/v1/audit-search/* · Iter 30 · search across audit rows + activity log."""
from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter

from core.pagination import paginate

router = APIRouter(prefix="/api/v1/audit-search", tags=["audit-search"])


def _search_chain(query: str) -> list[dict]:
    from core.audit_chain import list_chain
    rows = list_chain(limit=10000)
    if not query:
        return rows
    q = query.lower()
    return [
        r for r in rows
        if q in json.dumps(r.get("content", {})).lower()
    ]


def _search_activity(query: str) -> list[dict]:
    from alerts.router import _ACTIVITY  # in-memory store
    if not query:
        return list(_ACTIVITY)
    q = query.lower()
    out = []
    for r in _ACTIVITY:
        blob = json.dumps(r).lower()
        if q in blob:
            out.append(r)
    return out


@router.get("/health")
def health():
    return {
        "status": "ok",
        "module": "audit-search",
        "spec": "Iter 30 · full-text search · in-memory stores",
    }


@router.get("")
def search(q: str = "", source: str = "all", offset: int = 0, limit: int = 50):
    """Search audit chain + activity log by substring (case-insensitive)."""
    rows: list[dict] = []
    if source in ("all", "audit-chain"):
        rows.extend({**r, "source": "audit-chain"} for r in _search_chain(q))
    if source in ("all", "activity"):
        rows.extend({**r, "source": "activity"} for r in _search_activity(q))
    rows.sort(key=lambda r: r.get("timestamp", 0), reverse=True)
    total = len(rows)
    page = rows[offset:offset + limit]
    env = paginate(page, total, offset, limit)
    env["query"] = q
    env["source"] = source
    return env


@router.get("/stats")
def stats():
    from core.audit_chain import list_chain
    from alerts.router import _ACTIVITY
    return {
        "audit_chain_rows": len(list_chain(limit=10000)),
        "activity_rows": len(_ACTIVITY),
        "now_utc": datetime.now(timezone.utc).isoformat(),
    }
