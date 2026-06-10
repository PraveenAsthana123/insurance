"""/api/v1/openapi-export/* · Iter 34 · download OpenAPI spec + stats."""
from __future__ import annotations

import json

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/v1/openapi-export", tags=["openapi-export"])


@router.get("/health")
def health():
    return {"status": "ok", "module": "openapi-export"}


@router.get("")
def download_spec(request: Request):
    """Download the live OpenAPI spec with Content-Disposition."""
    spec = request.app.openapi()
    body = json.dumps(spec, indent=2, default=str)
    return JSONResponse(
        content=spec,
        headers={
            "Content-Disposition": "attachment; filename=openapi.json",
            "X-Spec-Size-Bytes": str(len(body)),
        },
    )


@router.get("/stats")
def spec_stats(request: Request):
    """Per-tag + per-method counts from live OpenAPI."""
    spec = request.app.openapi()
    paths = spec.get("paths", {}) or {}
    by_method: dict[str, int] = {}
    by_tag: dict[str, int] = {}
    n_endpoints = 0
    for path, methods in paths.items():
        for method, op in methods.items():
            if method in ("parameters", "summary", "description"):
                continue
            n_endpoints += 1
            by_method[method.upper()] = by_method.get(method.upper(), 0) + 1
            for t in (op or {}).get("tags", []) or ["untagged"]:
                by_tag[t] = by_tag.get(t, 0) + 1
    return {
        "paths": len(paths),
        "endpoints": n_endpoints,
        "by_method": by_method,
        "by_tag": dict(sorted(by_tag.items())),
        "n_tags": len(by_tag),
        "spec_version": spec.get("openapi", "unknown"),
    }
