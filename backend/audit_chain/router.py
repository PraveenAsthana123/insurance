"""/api/v1/audit-chain/* · Iter 29 · C7 simplified · tamper-evident audit log."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from core.audit_chain import append, list_chain, verify_chain
from core.role_dependency import require_admin

router = APIRouter(prefix="/api/v1/audit-chain", tags=["audit-chain"])


class AppendRequest(BaseModel):
    actor: str
    action: str
    target: str | None = None
    metadata: dict | None = None


@router.get("/health")
def health():
    return {
        "status": "ok",
        "module": "audit-chain",
        "spec": "C7 · HMAC-chained tamper-evident log",
    }


@router.post("/append")
def append_row(body: AppendRequest):
    """Public · append a row · chain advances."""
    content = body.model_dump(exclude_none=True)
    row = append(content)
    return {"index": row["index"], "hmac": row["hmac"]}


@router.get("/verify", dependencies=[Depends(require_admin)])
def verify():
    """Admin · verify chain integrity end-to-end."""
    return verify_chain()


@router.get("/recent")
def recent(limit: int = 20):
    return {"rows": list_chain(limit=limit), "count": len(list_chain(limit=10000))}
