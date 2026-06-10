"""/api/v1/comments/* · in-memory comment threads per panel/process · P1 #18."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1/comments", tags=["comments"])

# threads keyed by f"{panel_id}:{process_id}"
_THREADS: dict[str, list[dict[str, Any]]] = {}


class CommentCreate(BaseModel):
    panel_id: str = Field(..., min_length=1, max_length=64)
    process_id: str = Field(..., min_length=1, max_length=64)
    author: str = Field(..., min_length=1, max_length=64)
    body: str = Field(..., min_length=1, max_length=2000)
    mentions: list[str] = []


def _key(panel_id: str, process_id: str) -> str:
    return f"{panel_id}:{process_id}"


@router.get("/health")
def health():
    return {
        "status": "ok",
        "module": "comments",
        "spec": "P1 #18 · per-panel comment threads",
        "n_threads": len(_THREADS),
        "n_comments": sum(len(t) for t in _THREADS.values()),
    }


@router.post("")
def post_comment(body: CommentCreate):
    k = _key(body.panel_id, body.process_id)
    thread = _THREADS.setdefault(k, [])
    c = {
        "id": f"c-{uuid.uuid4().hex[:10]}",
        "panel_id": body.panel_id,
        "process_id": body.process_id,
        "author": body.author,
        "body": body.body,
        "mentions": body.mentions,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    thread.append(c)
    return c


@router.get("/{panel_id}/{process_id}")
def list_thread(panel_id: str, process_id: str, limit: int = 50):
    k = _key(panel_id, process_id)
    thread = _THREADS.get(k, [])
    return {
        "panel_id": panel_id,
        "process_id": process_id,
        "comments": thread[-limit:],
        "count": len(thread),
    }
