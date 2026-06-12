"""/api/v1/tags/* · Iter 34 · resource tagging (processes · models · alerts · any string ref)."""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/tags", tags=["tags"])

STORE = Path(os.environ.get("INSUR_TAGS_PATH", "data/resource_tags.json"))
STORE.parent.mkdir(parents=True, exist_ok=True)


def _load() -> dict:
    if STORE.exists():
        try:
            return json.loads(STORE.read_text())
        except Exception:
            pass
    return {"tags": {}}  # resource_ref → list of tags


def _save(d: dict) -> None:
    STORE.write_text(json.dumps(d, indent=2))


class TagBody(BaseModel):
    tag: str
    actor: str | None = None


@router.get("/health")
def health():
    d = _load()
    return {
        "status": "ok",
        "module": "resource-tags",
        "n_resources": len(d.get("tags", {})),
    }


@router.post("/{resource_ref}")
def add_tag(resource_ref: str, body: TagBody):
    d = _load()
    rec = d["tags"].setdefault(resource_ref, [])
    if any(t["tag"] == body.tag for t in rec):
        return {"resource_ref": resource_ref, "tag": body.tag, "result": "already_tagged"}
    rec.append({
        "tag": body.tag,
        "actor": body.actor or "anon",
        "tagged_at": datetime.now(timezone.utc).isoformat(),
    })
    _save(d)
    return {"resource_ref": resource_ref, "tag": body.tag, "result": "added"}


@router.delete("/{resource_ref}/{tag}")
def remove_tag(resource_ref: str, tag: str):
    d = _load()
    rec = d["tags"].get(resource_ref, [])
    before = len(rec)
    d["tags"][resource_ref] = [t for t in rec if t["tag"] != tag]
    if not d["tags"][resource_ref]:
        d["tags"].pop(resource_ref, None)
    _save(d)
    return {"removed": before - len(d["tags"].get(resource_ref, [])),
            "resource_ref": resource_ref, "tag": tag}


@router.get("/{resource_ref}")
def get_tags(resource_ref: str):
    d = _load()
    return {"resource_ref": resource_ref, "tags": d["tags"].get(resource_ref, [])}


@router.get("")
def search_by_tag(tag: str | None = None, limit: int = 100):
    """Find resources tagged with `tag`."""
    d = _load()
    if not tag:
        return {"resources": list(d["tags"].keys())[:limit], "count": len(d["tags"])}
    matches = [
        ref for ref, tags in d["tags"].items()
        if any(t["tag"] == tag for t in tags)
    ]
    return {"resources": matches[:limit], "count": len(matches), "tag": tag}
