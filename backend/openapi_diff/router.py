"""/api/v1/openapi-diff/* · Iter 35 · diff current OpenAPI vs saved baseline."""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, Request

from core.role_dependency import require_admin

router = APIRouter(prefix="/api/v1/openapi-diff", tags=["openapi-diff"])

BASELINE = Path(os.environ.get("INSUR_OPENAPI_BASELINE_PATH", "data/openapi-baseline.json"))
BASELINE.parent.mkdir(parents=True, exist_ok=True)


def _routes(spec: dict) -> set[str]:
    """Extract set of '{METHOD} {path}' strings from OpenAPI spec."""
    out = set()
    for path, methods in (spec.get("paths") or {}).items():
        for method, op in methods.items():
            if method in ("parameters", "summary", "description"):
                continue
            out.add(f"{method.upper()} {path}")
    return out


@router.get("/health")
def health():
    return {
        "status": "ok",
        "module": "openapi-diff",
        "baseline_exists": BASELINE.exists(),
    }


@router.post("/snapshot", dependencies=[Depends(require_admin)])
def snapshot_baseline(request: Request):
    """Save current spec as baseline · all future diffs compare to this."""
    spec = request.app.openapi()
    BASELINE.write_text(json.dumps({
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "spec": spec,
    }, indent=2))
    return {
        "captured": True,
        "n_paths": len(spec.get("paths", {})),
        "n_routes": len(_routes(spec)),
    }


@router.get("/diff")
def diff(request: Request):
    """Compare current OpenAPI against saved baseline."""
    if not BASELINE.exists():
        return {
            "baseline_exists": False,
            "note": "POST /openapi-diff/snapshot first to capture baseline",
        }
    try:
        baseline = json.loads(BASELINE.read_text())
        baseline_routes = _routes(baseline.get("spec", {}))
    except Exception as e:
        return {"error": f"baseline corrupted: {e}"}
    current = request.app.openapi()
    current_routes = _routes(current)

    added = sorted(current_routes - baseline_routes)
    removed = sorted(baseline_routes - current_routes)
    unchanged = current_routes & baseline_routes

    return {
        "baseline_captured_at": baseline.get("captured_at"),
        "current_at": datetime.now(timezone.utc).isoformat(),
        "added": added,
        "removed": removed,
        "n_added": len(added),
        "n_removed": len(removed),
        "n_unchanged": len(unchanged),
        "drift_detected": len(added) + len(removed) > 0,
    }
