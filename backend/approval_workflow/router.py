"""/api/v1/approvals/* · Iter 31 · request → reviewer → decide state machine."""
from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.role_dependency import require_authenticated, require_manager_or_above

router = APIRouter(prefix="/api/v1/approvals", tags=["approvals"])

STORE = Path(os.environ.get("INSUR_APPROVALS_PATH", "data/approvals.json"))
STORE.parent.mkdir(parents=True, exist_ok=True)

VALID_STATES = {"requested", "approved", "rejected", "withdrawn"}


def _load() -> dict:
    if STORE.exists():
        try:
            return json.loads(STORE.read_text())
        except Exception:
            pass
    return {"approvals": {}}


def _save(d: dict) -> None:
    STORE.write_text(json.dumps(d, indent=2))


class RequestApproval(BaseModel):
    title: str
    kind: str            # e.g. 'model.promote', 'tier-change', 'data-export'
    payload: dict | None = None
    requester: str
    reviewers: list[str] = []


class Decide(BaseModel):
    decision: str  # 'approve' or 'reject'
    reviewer: str
    reason: str | None = None


@router.get("/health")
def health():
    return {
        "status": "ok",
        "module": "approvals",
        "spec": "Iter 31 · request → reviewer → decide",
    }


@router.post("/request", dependencies=[Depends(require_authenticated)])
def request_approval(body: RequestApproval):
    d = _load()
    req_id = f"AR-{uuid.uuid4().hex[:10]}"
    d["approvals"][req_id] = {
        "id": req_id,
        "title": body.title,
        "kind": body.kind,
        "payload": body.payload or {},
        "requester": body.requester,
        "reviewers": body.reviewers,
        "state": "requested",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "decisions": [],
    }
    _save(d)
    return d["approvals"][req_id]


@router.get("/{req_id}")
def get_approval(req_id: str):
    d = _load()
    if req_id not in d["approvals"]:
        raise HTTPException(404, {"detail": f"approval not found: {req_id}",
                                   "error_code": "APPROVAL_404"})
    return d["approvals"][req_id]


@router.get("")
def list_approvals(state: str | None = None, limit: int = 50):
    d = _load()
    rows = list(d["approvals"].values())
    if state:
        rows = [r for r in rows if r["state"] == state]
    rows.sort(key=lambda r: r["created_at"], reverse=True)
    return {"approvals": rows[:limit], "count": len(rows)}


@router.post("/{req_id}/decide", dependencies=[Depends(require_manager_or_above)])
def decide(req_id: str, body: Decide):
    d = _load()
    if req_id not in d["approvals"]:
        raise HTTPException(404, {"detail": "approval not found"})
    if body.decision not in ("approve", "reject"):
        raise HTTPException(400, {"detail": "decision must be approve or reject",
                                   "error_code": "BAD_DECISION"})
    appr = d["approvals"][req_id]
    if appr["state"] != "requested":
        raise HTTPException(409, {"detail": f"already in state '{appr['state']}'",
                                   "error_code": "STATE_LOCKED"})
    appr["decisions"].append({
        "reviewer": body.reviewer,
        "decision": body.decision,
        "reason": body.reason,
        "at": datetime.now(timezone.utc).isoformat(),
    })
    appr["state"] = "approved" if body.decision == "approve" else "rejected"
    appr["decided_at"] = datetime.now(timezone.utc).isoformat()
    _save(d)
    return appr


@router.post("/{req_id}/withdraw")
def withdraw(req_id: str, requester: str):
    d = _load()
    if req_id not in d["approvals"]:
        raise HTTPException(404, {"detail": "approval not found"})
    appr = d["approvals"][req_id]
    if appr["requester"] != requester:
        raise HTTPException(403, {"detail": "only requester can withdraw"})
    if appr["state"] != "requested":
        raise HTTPException(409, {"detail": f"already in state '{appr['state']}'"})
    appr["state"] = "withdrawn"
    appr["withdrawn_at"] = datetime.now(timezone.utc).isoformat()
    _save(d)
    return appr
