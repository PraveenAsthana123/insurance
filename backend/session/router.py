"""/api/v1/session/* · Iter 30 · F1 simplified · JWT session tokens."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.jwt_auth import encode_jwt, decode_jwt

router = APIRouter(prefix="/api/v1/session", tags=["session"])


class SessionRequest(BaseModel):
    actor: str
    role: str = "manager"
    tenant_id: str = "default"


@router.get("/health")
def health():
    return {
        "status": "ok",
        "module": "session",
        "spec": "F1 simplified · HS256 JWT · Iter 30",
    }


@router.post("/issue")
def issue_token(body: SessionRequest):
    """Issue a session token · returns access_token + expiry."""
    token = encode_jwt({
        "sub": body.actor,
        "role": body.role,
        "tenant_id": body.tenant_id,
    })
    return {"access_token": token, "token_type": "bearer"}


@router.post("/verify")
def verify_token(body: dict):
    """Verify token validity · returns decoded payload or 401."""
    token = body.get("token")
    if not token:
        raise HTTPException(400, {"detail": "token required",
                                   "error_code": "BAD_REQUEST"})
    try:
        payload = decode_jwt(token)
    except ValueError as e:
        raise HTTPException(401, {"detail": str(e),
                                   "error_code": "TOKEN_INVALID"})
    return {"valid": True, "payload": payload}


@router.post("/refresh")
def refresh_token(body: dict):
    """Refresh a non-expired token · re-issues with new TTL."""
    token = body.get("token")
    if not token:
        raise HTTPException(400, {"detail": "token required"})
    try:
        payload = decode_jwt(token)
    except ValueError as e:
        raise HTTPException(401, {"detail": str(e),
                                   "error_code": "TOKEN_INVALID"})
    # Re-issue with same identity claims · new iat/exp
    new_token = encode_jwt({
        "sub": payload.get("sub"),
        "role": payload.get("role", "manager"),
        "tenant_id": payload.get("tenant_id", "default"),
    })
    return {"access_token": new_token, "token_type": "bearer"}
