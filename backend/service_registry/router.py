"""/api/v1/service-registry · Iter 30 · live route + version inventory."""
from __future__ import annotations

from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/v1/service-registry", tags=["service-registry"])


@router.get("/health")
def health():
    return {"status": "ok", "module": "service-registry"}


@router.get("")
def list_routes(request: Request, prefix: str | None = None):
    """List every registered route + tag + module · for ops audit."""
    rows = []
    app = request.app
    for route in app.routes:
        path = getattr(route, "path", None) or ""
        if prefix and not path.startswith(prefix):
            continue
        methods = sorted(getattr(route, "methods", []) or [])
        tags = list(getattr(route, "tags", []) or [])
        rows.append({
            "path": path,
            "methods": [m for m in methods if m != "HEAD"],
            "tags": tags,
            "name": getattr(route, "name", None),
        })
    rows.sort(key=lambda r: r["path"])
    return {
        "routes": rows,
        "count": len(rows),
        "filter": {"prefix": prefix},
    }


@router.get("/by-tag")
def by_tag(request: Request):
    """Aggregate · count routes per tag."""
    by_tag: dict[str, int] = {}
    for route in request.app.routes:
        for t in (getattr(route, "tags", None) or []):
            by_tag[t] = by_tag.get(t, 0) + 1
    return {"by_tag": dict(sorted(by_tag.items())), "n_tags": len(by_tag)}
