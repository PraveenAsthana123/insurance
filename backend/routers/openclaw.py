"""OpenClaw bridge API.

HTTP layer for the repo-local OpenClaw compatibility bridge. It delegates all
queue and polling behavior to OpenClawGatewayService so tests can replace the
service without requiring Redis.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response

from core import idempotency
from core.middleware import current_tenant_id
from schemas.openclaw import (
    OpenClawManifestResponse,
    OpenClawMode,
    OpenClawStatusResponse,
    OpenClawTaskRequest,
    OpenClawTaskResponse,
    OpenClawTaskResultResponse,
)
from services.openclaw_gateway_service import OpenClawGatewayService

router = APIRouter(prefix="/api/v1/openclaw", tags=["openclaw"])


def get_openclaw_service() -> OpenClawGatewayService:
    """Dependency provider for OpenClawGatewayService."""
    return OpenClawGatewayService()


@router.get("/status", response_model=OpenClawStatusResponse)
def get_status(
    service: OpenClawGatewayService = Depends(get_openclaw_service),
) -> OpenClawStatusResponse:
    """Return bridge availability and Redis queue status."""
    return service.status()


@router.get("/manifest", response_model=OpenClawManifestResponse)
def get_manifest(
    service: OpenClawGatewayService = Depends(get_openclaw_service),
) -> OpenClawManifestResponse:
    """Return the OpenClaw bridge contract and governance notes."""
    return service.manifest()


@router.post("/tasks", response_model=OpenClawTaskResponse)
def create_task(
    http_request: Request,
    response: Response,
    request: OpenClawTaskRequest,
    service: OpenClawGatewayService = Depends(get_openclaw_service),
) -> OpenClawTaskResponse:
    """Create an OpenClaw bridge task and enqueue it for workers.

    Per §64.43 #7 — the middleware-set tenant_id is injected into the task
    metadata BEFORE enqueueing, so workers + audit have authoritative tenant
    attribution. Body-supplied metadata.tenant_id is overridden (anti-spoof).

    Per §10.3 — Idempotency-Key (header or body field) is honored; cached
    responses replay within TTL with the `X-Idempotent-Replay: true` header.
    """
    tenant_id = current_tenant_id(http_request)

    # Idempotency check FIRST so retry storms don't re-enqueue the same task.
    idem_key = idempotency.extract_key(http_request, request.idempotency_key)
    if idem_key:
        cached = idempotency.lookup("openclaw", tenant_id, idem_key)
        if cached is not None:
            response.headers["X-Idempotent-Replay"] = "true"
            return OpenClawTaskResponse(**cached)

    metadata = dict(request.metadata) if request.metadata else {}
    metadata["tenant_id"] = tenant_id  # middleware wins over body
    enriched = request.model_copy(update={"metadata": metadata})
    result = service.enqueue(enriched)
    if idem_key:
        idempotency.store("openclaw", tenant_id, idem_key, result.model_dump())
    return result


@router.get("/tasks/{task_id}", response_model=OpenClawTaskResultResponse)
def get_task_result(
    task_id: str,
    mode: OpenClawMode = "council",
    service: OpenClawGatewayService = Depends(get_openclaw_service),
) -> OpenClawTaskResultResponse:
    """Poll a queued OpenClaw bridge task result."""
    return service.get_result(task_id=task_id, mode=mode)
