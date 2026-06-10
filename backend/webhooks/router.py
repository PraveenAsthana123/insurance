"""/api/v1/webhooks/* · Iter 29 · webhook receiver registry."""
from __future__ import annotations

import json
import os
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, HttpUrl

from core.role_dependency import require_admin
from core.hmac_sign import verify as verify_hmac

router = APIRouter(prefix="/api/v1/webhooks", tags=["webhooks"])

STORE = Path(os.environ.get("INSUR_WEBHOOKS_PATH", "data/webhooks.json"))
STORE.parent.mkdir(parents=True, exist_ok=True)


def _load() -> dict:
    if STORE.exists():
        try:
            return json.loads(STORE.read_text())
        except Exception:
            pass
    return {"hooks": {}, "deliveries": []}


def _save(data: dict) -> None:
    STORE.write_text(json.dumps(data, indent=2))


class HookCreate(BaseModel):
    name: str
    url: HttpUrl
    event_types: list[str]
    secret: str
    enabled: bool = True


@router.get("/health")
def health():
    d = _load()
    return {
        "status": "ok",
        "module": "webhooks",
        "registered": len(d.get("hooks", {})),
        "n_deliveries": len(d.get("deliveries", [])),
    }


@router.post("", dependencies=[Depends(require_admin)])
def register(body: HookCreate):
    d = _load()
    hook_id = f"WH-{uuid.uuid4().hex[:10]}"
    d["hooks"][hook_id] = {
        "id": hook_id,
        "name": body.name,
        "url": str(body.url),
        "event_types": body.event_types,
        "secret": body.secret,
        "enabled": body.enabled,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _save(d)
    return d["hooks"][hook_id]


@router.get("")
def list_hooks():
    d = _load()
    # Per §57.7: hide secrets in list response
    sanitized = []
    for h in d["hooks"].values():
        sanitized.append({**h, "secret": "***REDACTED***" if h.get("secret") else None})
    return {"hooks": sanitized, "count": len(sanitized)}


@router.delete("/{hook_id}", dependencies=[Depends(require_admin)])
def delete_hook(hook_id: str):
    d = _load()
    if hook_id not in d["hooks"]:
        raise HTTPException(404, {"detail": f"hook not found: {hook_id}",
                                   "error_code": "HOOK_404"})
    h = d["hooks"].pop(hook_id)
    _save(d)
    return {"deleted": hook_id, "name": h["name"]}


@router.post("/receive/{hook_id}")
async def receive_webhook(hook_id: str, request: Request):
    """Generic webhook receiver · verifies HMAC against the registered secret."""
    d = _load()
    hook = d["hooks"].get(hook_id)
    if not hook:
        raise HTTPException(404, {"detail": "hook not registered"})
    if not hook.get("enabled"):
        raise HTTPException(400, {"detail": "hook disabled"})

    body = await request.body()
    sig = request.headers.get("X-Insur-Signature")
    ts = request.headers.get("X-Insur-Signature-Timestamp")
    valid = verify_hmac(
        request.method, request.url.path, body, sig, ts,
        secret=hook["secret"],
    )
    if not valid:
        raise HTTPException(401, {"detail": "HMAC verification failed",
                                   "error_code": "HMAC_INVALID"})

    delivery = {
        "delivery_id": f"D-{uuid.uuid4().hex[:10]}",
        "hook_id": hook_id,
        "received_at": datetime.now(timezone.utc).isoformat(),
        "size_bytes": len(body),
    }
    d["deliveries"].append(delivery)
    d["deliveries"] = d["deliveries"][-100:]  # cap at 100 most recent
    _save(d)
    return delivery


@router.get("/deliveries")
def list_deliveries(limit: int = 20):
    d = _load()
    rows = list(reversed(d.get("deliveries", [])))[:limit]
    return {"deliveries": rows, "count": len(d.get("deliveries", []))}
