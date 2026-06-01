"""Paperclip local artifact/context adapter API.

Per §64.43 #7 — every write+read+delete is tenant-scoped via X-Tenant-ID
middleware. Cross-tenant access returns 404 (anti-enumeration), not 403.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response, status

from core import idempotency
from core.middleware import current_tenant_id
from schemas.paperclip import (
    PaperclipArtifactDetail,
    PaperclipArtifactResponse,
    PaperclipContextPackRequest,
    PaperclipContextPackResponse,
    PaperclipCreateRequest,
    PaperclipStatusResponse,
)
from services.paperclip_service import PaperclipService

router = APIRouter(prefix="/api/v1/paperclip", tags=["paperclip"])


def get_paperclip_service() -> PaperclipService:
    """Dependency provider for the local Paperclip service."""
    return PaperclipService()


@router.get("/status", response_model=PaperclipStatusResponse)
def get_status(service: PaperclipService = Depends(get_paperclip_service)) -> PaperclipStatusResponse:
    """Return local Paperclip adapter status and artifact count."""
    return service.status()


@router.post("/clips", response_model=PaperclipArtifactResponse, status_code=status.HTTP_201_CREATED)
def create_clip(
    http_request: Request,
    response: Response,
    request: PaperclipCreateRequest,
    service: PaperclipService = Depends(get_paperclip_service),
) -> PaperclipArtifactResponse:
    """Store a text artifact stamped with the caller's tenant_id.

    Per §10.3 — Idempotency-Key (header or body) is honored; replays return
    the cached PaperclipArtifactResponse with `X-Idempotent-Replay: true`
    header. Critical for retry storms — without this, a re-submitted form
    would create N copies of the same artifact on disk.
    """
    tenant_id = current_tenant_id(http_request)

    idem_key = idempotency.extract_key(http_request, request.idempotency_key)
    if idem_key:
        cached = idempotency.lookup("paperclip", tenant_id, idem_key)
        if cached is not None:
            response.headers["X-Idempotent-Replay"] = "true"
            return PaperclipArtifactResponse(**cached)

    metadata = dict(request.metadata) if request.metadata else {}
    metadata["tenant_id"] = tenant_id  # middleware wins over body metadata
    enriched = request.model_copy(update={"metadata": metadata})

    result = service.create(enriched, tenant_id=tenant_id)
    if idem_key:
        idempotency.store("paperclip", tenant_id, idem_key, result.model_dump())
    return result


@router.get("/clips", response_model=list[PaperclipArtifactResponse])
def list_clips(
    http_request: Request,
    service: PaperclipService = Depends(get_paperclip_service),
) -> list[PaperclipArtifactResponse]:
    """List ONLY the caller's tenant's artifacts. Cross-tenant rows hidden."""
    tenant_id = current_tenant_id(http_request)
    return service.list(tenant_id=tenant_id)


@router.get("/clips/{clip_id}", response_model=PaperclipArtifactDetail)
def get_clip(
    http_request: Request,
    clip_id: str,
    service: PaperclipService = Depends(get_paperclip_service),
) -> PaperclipArtifactDetail:
    """Return one artifact only if it belongs to the caller's tenant. 404 otherwise."""
    tenant_id = current_tenant_id(http_request)
    return service.get(clip_id, tenant_id=tenant_id)


@router.delete("/clips/{clip_id}")
def delete_clip(
    http_request: Request,
    clip_id: str,
    service: PaperclipService = Depends(get_paperclip_service),
) -> dict[str, str]:
    """Delete an artifact only if it belongs to the caller's tenant. 404 otherwise."""
    tenant_id = current_tenant_id(http_request)
    return service.delete(clip_id, tenant_id=tenant_id)


@router.post("/context-pack", response_model=PaperclipContextPackResponse)
def build_context_pack(
    http_request: Request,
    request: PaperclipContextPackRequest,
    service: PaperclipService = Depends(get_paperclip_service),
) -> PaperclipContextPackResponse:
    """Compose a context pack from the caller's tenant's artifacts only.
    Foreign clip_ids appear as missing_ids (same shape as truly absent ids).
    """
    tenant_id = current_tenant_id(http_request)
    return service.build_context_pack(request, tenant_id=tenant_id)
