"""/api/v1/deprecation/* · Iter 35 · per-route deprecation markers + Sunset header."""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from core.role_dependency import require_admin

router = APIRouter(prefix="/api/v1/deprecation", tags=["deprecation"])

STORE = Path(os.environ.get("INSUR_DEPRECATION_PATH", "data/deprecations.json"))
STORE.parent.mkdir(parents=True, exist_ok=True)


def _load() -> dict:
    if STORE.exists():
        try:
            return json.loads(STORE.read_text())
        except Exception:
            pass
    return {"routes": {}}


def _save(d: dict) -> None:
    STORE.write_text(json.dumps(d, indent=2))


class DeprecationMark(BaseModel):
    path: str
    method: str = "GET"
    sunset_date: str          # ISO 8601 date · when route stops serving
    replacement_path: str | None = None
    note: str | None = None


@router.get("/health")
def health():
    return {
        "status": "ok",
        "module": "deprecation",
        "n_deprecated": len(_load().get("routes", {})),
    }


@router.get("")
def list_deprecations():
    d = _load()
    rows = []
    now = datetime.now(timezone.utc).date().isoformat()
    for key, mark in d["routes"].items():
        method, path = key.split(":", 1)
        rows.append({
            "method": method,
            "path": path,
            "sunset_date": mark.get("sunset_date"),
            "replacement_path": mark.get("replacement_path"),
            "note": mark.get("note"),
            "expired": mark.get("sunset_date", "") < now,
        })
    rows.sort(key=lambda r: r["sunset_date"])
    return {"deprecations": rows, "count": len(rows)}


@router.post("", dependencies=[Depends(require_admin)])
def mark_deprecated(body: DeprecationMark):
    d = _load()
    key = f"{body.method.upper()}:{body.path}"
    d["routes"][key] = body.model_dump()
    _save(d)
    return {"marked": key, "config": d["routes"][key]}


@router.delete("", dependencies=[Depends(require_admin)])
def unmark_deprecated(path: str, method: str = "GET"):
    d = _load()
    key = f"{method.upper()}:{path}"
    if key in d["routes"]:
        del d["routes"][key]
        _save(d)
        return {"unmarked": key}
    return {"not_found": key}


@router.get("/check")
def check_path(path: str, method: str = "GET"):
    """Lookup a single path · used by middleware/headers."""
    d = _load()
    key = f"{method.upper()}:{path}"
    mark = d["routes"].get(key)
    return {
        "deprecated": mark is not None,
        "config": mark,
        "path": path,
    }
