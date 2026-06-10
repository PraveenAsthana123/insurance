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
    # Iter 30 fix: normalize timestamps to comparable strings (ISO or float→str)
    def _ts(r):
        t = r.get("timestamp", "")
        if isinstance(t, (int, float)):
            return str(t)
        return str(t)
    rows.sort(key=_ts, reverse=True)
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


@router.get("/export")
def export(q: str = "", source: str = "all", fmt: str = "json"):
    """Iter 33 · export audit search results · JSON or CSV."""
    rows: list[dict] = []
    if source in ("all", "audit-chain"):
        rows.extend({**r, "source": "audit-chain"} for r in _search_chain(q))
    if source in ("all", "activity"):
        rows.extend({**r, "source": "activity"} for r in _search_activity(q))

    if fmt == "csv":
        from fastapi.responses import PlainTextResponse
        if not rows:
            return PlainTextResponse("", media_type="text/csv")
        cols = sorted(set().union(*[r.keys() for r in rows]))
        out_lines = [",".join(cols)]
        for r in rows:
            vals = []
            for c in cols:
                v = r.get(c, "")
                if isinstance(v, (dict, list)):
                    v = json.dumps(v)
                s = str(v).replace('"', '""')
                if "," in s or '"' in s or "\n" in s:
                    s = f'"{s}"'
                vals.append(s)
            out_lines.append(",".join(vals))
        return PlainTextResponse(
            "\n".join(out_lines) + "\n",
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=audit-export.csv"},
        )

    # default JSON
    from fastapi.responses import JSONResponse
    return JSONResponse(
        {"rows": rows, "count": len(rows), "query": q, "source": source},
        headers={"Content-Disposition": "attachment; filename=audit-export.json"},
    )
