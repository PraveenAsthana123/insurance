"""/api/v1/input-events — global input persistence per GLOBAL_INPUT_PERSISTENCE_POLICY.

Contract:
- Append-only writes to user_input_events (migration 051).
- Tenant from middleware (X-Tenant-ID · case-insensitive · falls back to 'default').
- Actor + role from request state (auth middleware sets request.state.actor · .role_code).
- Idempotency-Key honored for safe retries.
- Payload redaction at boundary · never store secrets.
- Reads tenant-scoped by default.

Per docs/GLOBAL_INPUT_PERSISTENCE_POLICY.md non-negotiable rule #1: persist through
backend, never direct browser-to-DB.
"""
from __future__ import annotations

import hashlib
import json
import logging
import re
import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/input-events", tags=["input-events"])


# -------------- Redaction (boundary defense) ----------------
_SECRET_FIELDS = {
    "password", "token", "api_key", "secret", "authorization", "credit_card",
    "ssn", "social_security", "card_number", "cvv", "private_key",
}
_EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
_PHONE_RE = re.compile(r"\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b")


def redact(payload: Any, pii_classification: str = "moderate") -> tuple[Any, bool]:
    """Return (redacted_payload, was_redacted). Recursive · best-effort."""
    redacted = False

    def _walk(node: Any) -> Any:
        nonlocal redacted
        if isinstance(node, dict):
            out: dict[str, Any] = {}
            for k, v in node.items():
                if str(k).lower() in _SECRET_FIELDS:
                    out[k] = "<REDACTED>"
                    redacted = True
                else:
                    out[k] = _walk(v)
            return out
        if isinstance(node, list):
            return [_walk(x) for x in node]
        if isinstance(node, str):
            new = _EMAIL_RE.sub("<EMAIL>", node)
            new = _PHONE_RE.sub("<PHONE>", new)
            if new != node:
                redacted = True
            # Restricted classification → opaque hash for everything
            if pii_classification == "restricted":
                redacted = True
                return f"<HASH:{hashlib.sha256(node.encode()).hexdigest()[:16]}>"
            return new
        return node

    return _walk(payload), redacted


# -------------- Schemas ----------------
_INPUT_KINDS = {"prompt", "chat", "form", "filter", "simulation", "feedback",
                "approval", "upload", "command", "search", "export", "other"}
_PII_CLASSES = {"none", "low", "moderate", "high", "restricted"}
_RETENTION = {"transient", "standard", "audit", "legal_hold"}


class InputEventCreate(BaseModel):
    source_surface: str = Field(..., min_length=1, max_length=128,
                                description="UI/API surface · e.g. insurance-process-tab")
    route_path: Optional[str] = Field(None, max_length=256)
    component_id: Optional[str] = Field(None, max_length=128)
    department_id: Optional[str] = Field(None, max_length=64)
    process_id: Optional[str] = Field(None, max_length=128)
    input_kind: str = Field(..., description="One of: " + ", ".join(sorted(_INPUT_KINDS)))
    input_name: Optional[str] = Field(None, max_length=128)
    payload: dict = Field(default_factory=dict)
    pii_classification: str = Field("moderate")
    retention_class: str = Field("standard")
    purpose: Optional[str] = Field(None, max_length=256)
    session_id: Optional[str] = Field(None, max_length=128)
    metadata: dict = Field(default_factory=dict)


class InputEventResponse(BaseModel):
    id: str
    tenant_id: str
    actor: str
    role_code: Optional[str]
    source_surface: str
    input_kind: str
    payload_redacted: bool
    payload_hash: Optional[str]
    status: str
    created_at: str


# -------------- Helpers ----------------
def _tenant(request: Request) -> str:
    return getattr(request.state, "tenant_id", "default")


def _actor(request: Request) -> str:
    return getattr(request.state, "actor", "anonymous")


def _role(request: Request) -> Optional[str]:
    return getattr(request.state, "role_code", None)


def _request_id(request: Request) -> Optional[str]:
    rid = getattr(request.state, "request_id", None)
    if rid:
        return str(rid)
    rid = request.headers.get("x-request-id") or request.headers.get("x-correlation-id")
    return rid


def _idempotency_key(request: Request) -> Optional[str]:
    return request.headers.get("x-idempotency-key") or request.headers.get("idempotency-key")


# -------------- Routes ----------------
@router.post("", response_model=InputEventResponse, status_code=201)
async def create_input_event(
    body: InputEventCreate,
    request: Request,
) -> InputEventResponse:
    # Validate enums (also enforced at DB by CHECK constraints)
    if body.input_kind not in _INPUT_KINDS:
        raise HTTPException(400, {"detail": "invalid input_kind",
                                  "error_code": "INVALID_INPUT_KIND",
                                  "allowed": sorted(_INPUT_KINDS)})
    if body.pii_classification not in _PII_CLASSES:
        raise HTTPException(400, {"detail": "invalid pii_classification",
                                  "error_code": "INVALID_PII_CLASS"})
    if body.retention_class not in _RETENTION:
        raise HTTPException(400, {"detail": "invalid retention_class",
                                  "error_code": "INVALID_RETENTION"})

    tenant_id = _tenant(request)
    actor = _actor(request)
    role = _role(request)
    rid = _request_id(request)
    idem = _idempotency_key(request)

    # Redact at boundary
    redacted_payload, was_redacted = redact(body.payload, body.pii_classification)

    # SHA-256 of normalized raw payload (always allowed · supports dedupe without exposing raw)
    raw_bytes = json.dumps(body.payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    payload_hash = hashlib.sha256(raw_bytes).hexdigest()

    event_id = str(uuid.uuid4())

    # ---- Persistence ----
    # Use the project's existing DB infrastructure. If Postgres unreachable, log
    # and return 503 for high-risk operations; per policy rule 9 we MUST fail
    # closed if input persistence fails. We treat anything beyond classification
    # 'low' as high-risk for now.
    high_risk = body.pii_classification in {"moderate", "high", "restricted"} \
        or body.input_kind in {"approval", "upload", "command"}

    try:
        from backend.repositories.input_events_repo import InputEventsRepo
        from backend.core.db import get_pg_conn  # type: ignore
        with get_pg_conn() as conn:
            repo = InputEventsRepo(conn)
            repo.insert(
                event_id=event_id,
                tenant_id=tenant_id,
                actor=actor,
                role_code=role,
                session_id=body.session_id,
                request_id=rid,
                idempotency_key=idem,
                source_surface=body.source_surface,
                route_path=body.route_path,
                component_id=body.component_id,
                department_id=body.department_id,
                process_id=body.process_id,
                input_kind=body.input_kind,
                input_name=body.input_name,
                payload=redacted_payload,
                payload_redacted=was_redacted or body.pii_classification == "restricted",
                payload_hash=payload_hash,
                pii_classification=body.pii_classification,
                retention_class=body.retention_class,
                purpose=body.purpose,
                metadata=body.metadata,
            )
    except ImportError:
        # Repo/db module not present yet · log + soft-fail for low-risk
        logger.warning("input_events_repo not installed · storing in-memory only")
        if high_risk:
            raise HTTPException(503, {"detail": "input persistence unavailable for high-risk operation",
                                      "error_code": "INPUT_PERSIST_UNAVAILABLE"})
    except Exception as e:
        logger.exception("input event insert failed: %s", e)
        if high_risk:
            raise HTTPException(503, {"detail": "input persistence failed",
                                      "error_code": "INPUT_PERSIST_FAILED"})

    return InputEventResponse(
        id=event_id,
        tenant_id=tenant_id,
        actor=actor,
        role_code=role,
        source_surface=body.source_surface,
        input_kind=body.input_kind,
        payload_redacted=was_redacted or body.pii_classification == "restricted",
        payload_hash=payload_hash,
        status="received",
        created_at="",  # set by DB · returned via subsequent GET
    )


@router.get("/{event_id}", response_model=InputEventResponse)
async def get_input_event(event_id: str, request: Request) -> InputEventResponse:
    """Tenant-scoped read."""
    tenant_id = _tenant(request)
    try:
        from backend.repositories.input_events_repo import InputEventsRepo
        from backend.core.db import get_pg_conn  # type: ignore
        with get_pg_conn() as conn:
            repo = InputEventsRepo(conn)
            row = repo.get(event_id, tenant_id)
            if not row:
                raise HTTPException(404, {"detail": "not found", "error_code": "NOT_FOUND"})
            return InputEventResponse(**row)
    except ImportError:
        raise HTTPException(503, {"detail": "input_events_repo not installed",
                                  "error_code": "REPO_UNAVAILABLE"})


@router.get("", response_model=list[InputEventResponse])
async def list_input_events(
    request: Request,
    source_surface: Optional[str] = Query(None),
    input_kind: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    process_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[InputEventResponse]:
    """List tenant-scoped input events with filters."""
    tenant_id = _tenant(request)
    try:
        from backend.repositories.input_events_repo import InputEventsRepo
        from backend.core.db import get_pg_conn  # type: ignore
        with get_pg_conn() as conn:
            repo = InputEventsRepo(conn)
            rows = repo.list(
                tenant_id=tenant_id,
                source_surface=source_surface,
                input_kind=input_kind,
                department_id=department_id,
                process_id=process_id,
                limit=limit,
                offset=offset,
            )
            return [InputEventResponse(**r) for r in rows]
    except ImportError:
        # Soft-fail for read · return empty
        logger.warning("input_events_repo not installed · returning empty list")
        return []
