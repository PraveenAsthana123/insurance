"""Unified agent platform setup/status API."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query, Request

from core.middleware import current_tenant_id
from schemas.agent_platform import (
    AgentPlatformManifestResponse,
    AgentPlatformStatusResponse,
    AgentPolicyEvaluationRequest,
    AgentPolicyEvaluationResponse,
    ApprovalBrokerRequest,
    ApprovalBrokerResponse,
    CuaAuditListResponse,
    CuaExecutionRequest,
    CuaExecutionResponse,
    TenantActivityResponse,
    TypedCouncilRunRequest,
    TypedCouncilRunResponse,
)
from services.agent_platform_service import AgentPlatformIntegrationService

router = APIRouter(prefix="/api/v1/agent-platform", tags=["agent-platform"])


def get_agent_platform_service() -> AgentPlatformIntegrationService:
    """Dependency provider for unified agent platform integrations."""
    return AgentPlatformIntegrationService()


@router.get("/status", response_model=AgentPlatformStatusResponse)
def get_status(
    service: AgentPlatformIntegrationService = Depends(get_agent_platform_service),
) -> AgentPlatformStatusResponse:
    """Return setup/runtime status for Harness, OpenClaw, Paperclip, PoliysAI, CUA, and Stagehand."""
    return service.status()


@router.get("/manifest", response_model=AgentPlatformManifestResponse)
def get_manifest(
    service: AgentPlatformIntegrationService = Depends(get_agent_platform_service),
) -> AgentPlatformManifestResponse:
    """Return the unified agent platform integration contract."""
    return service.manifest()


@router.post("/governance/evaluate", response_model=AgentPolicyEvaluationResponse)
def evaluate_governance(
    request: AgentPolicyEvaluationRequest,
    service: AgentPlatformIntegrationService = Depends(get_agent_platform_service),
) -> AgentPolicyEvaluationResponse:
    """Evaluate whether one agent/tool action is allowed."""
    return service.evaluate_policy(request)


@router.post("/cua/execute", response_model=CuaExecutionResponse)
def execute_cua(
    http_request: Request,
    request: CuaExecutionRequest,
    service: AgentPlatformIntegrationService = Depends(get_agent_platform_service),
) -> CuaExecutionResponse:
    """Run a policy-gated CUA/browser action envelope. Defaults to dry-run.

    The middleware-set tenant_id (from X-Tenant-ID header) is injected into the
    request metadata so the audit row + policy evaluation see the federated
    tenant scope. Per §64.43 #7 — header is the source of truth, metadata is
    the propagation channel. Explicit metadata.tenant_id is ignored when a
    middleware-set value exists (prevents tenant spoofing in the body).

    Idempotency: ``Idempotency-Key`` header is merged into the request as
    ``idempotency_key`` if the body doesn't already set one. Per §10.3 —
    header for HTTP convention, body field for strongly-typed clients.
    """
    tenant_id = current_tenant_id(http_request)
    # Pydantic v2: model has model_copy with update; mutate via metadata dict.
    metadata = dict(request.metadata) if request.metadata else {}
    metadata["tenant_id"] = tenant_id  # middleware wins over body
    metadata.setdefault("request_id", getattr(http_request.state, "correlation_id", ""))

    # Merge Idempotency-Key header into request if body didn't supply one.
    # Body field wins over header (more explicit; matches user intent).
    update_fields: dict[str, Any] = {"metadata": metadata}
    if request.idempotency_key is None:
        header_key = (
            http_request.headers.get("Idempotency-Key")
            or http_request.headers.get("idempotency-key")
        )
        if header_key:
            update_fields["idempotency_key"] = header_key.strip() or None

    enriched = request.model_copy(update=update_fields)
    return service.execute_cua(enriched)


@router.post("/approval-broker/decide", response_model=ApprovalBrokerResponse)
def decide_approval_broker(
    http_request: Request,
    request: ApprovalBrokerRequest,
    service: AgentPlatformIntegrationService = Depends(get_agent_platform_service),
) -> ApprovalBrokerResponse:
    """Classify approve/submit/next requests and optionally enqueue safe next work.

    This endpoint is for local workflow automation. It does not bypass GitHub,
    deployment, credential, destructive, or real browser/CUA approvals.
    """
    tenant_id = current_tenant_id(http_request)
    metadata = dict(request.metadata) if request.metadata else {}
    metadata["tenant_id"] = tenant_id
    metadata.setdefault("request_id", getattr(http_request.state, "correlation_id", ""))
    enriched = request.model_copy(update={"metadata": metadata})
    return service.decide_approval_broker(enriched)


@router.post("/typed-council/run", response_model=TypedCouncilRunResponse)
def run_typed_council(
    http_request: Request,
    request: TypedCouncilRunRequest,
    service: AgentPlatformIntegrationService = Depends(get_agent_platform_service),
) -> TypedCouncilRunResponse:
    """Run the opt-in Pydantic AI author/reviewer/chair council.

    The normal Redis-backed OpenClaw council remains the default async path.
    This endpoint is a typed synchronous adapter and returns disabled/unavailable
    safely unless explicitly enabled and importable.
    """
    tenant_id = current_tenant_id(http_request)
    metadata = dict(request.metadata) if request.metadata else {}
    metadata["tenant_id"] = tenant_id
    metadata.setdefault("request_id", getattr(http_request.state, "correlation_id", ""))
    enriched = request.model_copy(update={"metadata": metadata})
    return service.run_typed_council(enriched)


@router.get("/cua/audit", response_model=CuaAuditListResponse)
def list_cua_audit(
    http_request: Request,
    limit: int = Query(50, ge=1, le=500),
    since_ts: float = Query(0.0, ge=0.0),
    service: AgentPlatformIntegrationService = Depends(get_agent_platform_service),
) -> CuaAuditListResponse:
    """Read back the CUA audit log, tenant-scoped from the X-Tenant-ID header.

    Per §64.43 #7 — the middleware-set tenant_id is the AUTHORITATIVE filter;
    callers cannot pass a different tenant_id query parameter to cross-read
    another tenant's history (there's no such parameter to pass). Sorted
    descending by ts (most recent first), capped at ``limit`` rows.

    Use ``since_ts`` for incremental polling: pass the highest ts you've
    seen and you'll get only newer rows. ``total_count`` in the response
    is the tenant-scoped pre-pagination count so the UI can paginate
    without re-fetching the whole file.
    """
    tenant_id = current_tenant_id(http_request)
    return service.list_cua_audit(tenant_id, limit=limit, since_ts=since_ts)


@router.get("/adapters")
def get_adapters_status(
    http_request: Request,
    service: AgentPlatformIntegrationService = Depends(get_agent_platform_service),
) -> dict[str, Any]:
    """Aggregated snapshot of all §56 Stage-1 adapters.

    Read-only discovery surface — answers "which Stage-1 adapters are
    installed, opt-in flag set, and ready to invoke RIGHT NOW?" in one
    GET. Currently covers agentops + llm-gateway + typed-council +
    dspy-optimizer. Adding a 5th adapter = register its status() in
    `AgentPlatformIntegrationService.adapters_status()` and re-deploy.

    Response shape:
        {
          "scanned_at": <epoch>,
          "n_adapters": int,
          "n_enabled": int,
          "n_importable": int,
          "stage": "§56.2 Stage-1",
          "adapters": [ {key, name, enabled, importable, audit_path, detail, ...}, ... ]
        }

    Composes with §56.2 (Stage-1 lazy-import discipline) + §57.6 (canonical
    response fields) + §64.43 #7 (tenant attribution via middleware).
    """
    return service.adapters_status()


@router.get("/activity", response_model=TenantActivityResponse)
def get_tenant_activity(
    http_request: Request,
    limit: int = Query(50, ge=1, le=500),
    since_ts: float = Query(0.0, ge=0.0),
    service: AgentPlatformIntegrationService = Depends(get_agent_platform_service),
) -> TenantActivityResponse:
    """Unified per-tenant activity feed across CUA + admin + Paperclip.

    Per §64.43 #7 — tenant-scoped from the X-Tenant-ID middleware header.
    There is intentionally NO `?tenant_id=` query parameter; cross-tenant
    reads via URL manipulation are impossible by construction.

    Sources combined:
      - cua: rows where tool != 'admin.cua.audit.read'
      - admin: rows where tool == 'admin.cua.audit.read' AND
        tenant_id matches (admin reads ARE attributed to a tenant when
        the compliance role explicitly filters)
      - paperclip: artifacts in storage dir matching tenant_id
      - openclaw: NOT included (Redis-backed; future iteration)

    Sorted descending by ts; `total_items` is the pre-pagination count.
    """
    tenant_id = current_tenant_id(http_request)
    return service.get_tenant_activity(tenant_id, limit=limit, since_ts=since_ts)
