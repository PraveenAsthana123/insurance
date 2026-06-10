"""/api/v1/jobs/* · Iter 29 · C10 · persistent job queue.

Redis-backed when REDIS_URL set · JSONL file fallback per §57.7.
"""
from __future__ import annotations

import json
import os
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/job-queue", tags=["job-queue"])  # Iter 29 · avoid /jobs collision

_REDIS = None
try:
    if os.environ.get("REDIS_URL"):
        import redis  # type: ignore
        _REDIS = redis.from_url(os.environ["REDIS_URL"], decode_responses=True)
except Exception:
    _REDIS = None

_FALLBACK = Path(os.environ.get("INSUR_JOBS_PATH", "data/job_queue.jsonl"))
_FALLBACK.parent.mkdir(parents=True, exist_ok=True)

_KEY = "insur:jobs"


def _file_append(row: dict) -> None:
    with _FALLBACK.open("a") as f:
        f.write(json.dumps(row) + "\n")


def _file_load() -> list[dict]:
    if not _FALLBACK.exists(): return []
    rows = []
    for line in _FALLBACK.read_text().splitlines():
        if not line.strip(): continue
        try:
            rows.append(json.loads(line))
        except Exception:
            continue
    return rows


def _backing() -> str:
    return "redis" if _REDIS is not None else "jsonl-file"


class EnqueueRequest(BaseModel):
    name: str
    kind: str  # 'pipeline' | 'eval' | 'export' | etc.
    payload: dict | None = None
    priority: int = 5  # 0..10


@router.get("/health")
def health():
    return {
        "status": "ok",
        "module": "jobs",
        "spec": "C10 · persistent queue",
        "backing": _backing(),
        "fallback_path": str(_FALLBACK),
    }


@router.post("/enqueue")
def enqueue(body: EnqueueRequest):
    row = {
        "job_id": f"J-{uuid.uuid4().hex[:12]}",
        "name": body.name,
        "kind": body.kind,
        "payload": body.payload or {},
        "priority": body.priority,
        "status": "queued",
        "enqueued_at": datetime.now(timezone.utc).isoformat(),
        "backing": _backing(),
    }
    if _REDIS is not None:
        _REDIS.lpush(_KEY, json.dumps(row))
    else:
        _file_append(row)
    return row


@router.get("")
def list_jobs(limit: int = 50, status: str | None = None):
    if _REDIS is not None:
        raw = _REDIS.lrange(_KEY, 0, limit * 4)
        rows = [json.loads(r) for r in raw if r]
    else:
        rows = list(reversed(_file_load()))
    if status:
        rows = [r for r in rows if r.get("status") == status]
    rows.sort(key=lambda r: r.get("enqueued_at", ""), reverse=True)
    return {
        "jobs": rows[:limit],
        "count": len(rows),
        "backing": _backing(),
    }


@router.get("/stats")
def stats():
    rows = list_jobs(limit=10000)["jobs"]
    by_status: dict[str, int] = {}
    by_kind: dict[str, int] = {}
    for r in rows:
        by_status[r.get("status", "unknown")] = by_status.get(r.get("status", "unknown"), 0) + 1
        by_kind[r.get("kind", "unknown")] = by_kind.get(r.get("kind", "unknown"), 0) + 1
    return {
        "total": len(rows),
        "by_status": by_status,
        "by_kind": by_kind,
        "backing": _backing(),
    }
