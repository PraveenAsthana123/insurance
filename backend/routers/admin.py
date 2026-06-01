"""Admin API — cross-tenant compliance + reporting surfaces.

These endpoints intentionally bypass the per-tenant federation contract
(§64.43 #7) because they are gated by RBAC role (compliance or reporting-
monitoring) at the middleware layer. Every read here writes its own
``admin.cua.audit.read`` audit-of-audit row (§38.3 + SOC2 CC4 + CC7).

Do NOT add tenant-write endpoints here. Admin reads only.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request

from schemas.agent_platform import AdminCuaAuditListResponse
from services.agent_platform_service import AgentPlatformIntegrationService

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


def get_agent_platform_service() -> AgentPlatformIntegrationService:
    """Dependency provider for the agent-platform service.

    Defined locally instead of imported so admin tests can override
    independently of the agent-platform router.
    """
    return AgentPlatformIntegrationService()


@router.get("/cua/audit", response_model=AdminCuaAuditListResponse)
def admin_list_cua_audit(
    http_request: Request,
    tenant_id: str | None = Query(
        default=None,
        description="Optional filter — limit results to one tenant. Omit to scan all.",
        max_length=63,
    ),
    limit: int = Query(50, ge=1, le=500),
    since_ts: float = Query(0.0, ge=0.0),
    service: AgentPlatformIntegrationService = Depends(get_agent_platform_service),
) -> AdminCuaAuditListResponse:
    """Cross-tenant CUA audit readback (compliance + reporting-monitoring roles).

    Unlike /api/v1/agent-platform/cua/audit (which is tenant-scoped to the
    caller's X-Tenant-ID header), this endpoint:
      - Returns rows from ALL tenants when ?tenant_id= is omitted
      - Filters to one tenant when ?tenant_id=X is provided
      - Writes ONE §38.3 ``admin.cua.audit.read`` row per call (audit-of-audit)
      - Returns ``distinct_tenants`` so compliance can see what tenants exist
        without iterating

    RBAC: gated to {compliance, reporting-monitoring} in PERMS_MATRIX. The
    middleware already 403's other roles before this handler runs.

    The ``X-Demo-Role`` header (or future auth principal) is captured as the
    audit-of-audit ``actor`` so the trail shows WHO did the cross-tenant read.
    """
    actor = (
        http_request.headers.get("X-Demo-Role")
        or http_request.headers.get("x-demo-role")
        or "compliance"
    )
    request_id = getattr(http_request.state, "correlation_id", "")
    return service.list_cua_audit_admin(
        tenant_filter=tenant_id,
        limit=limit,
        since_ts=since_ts,
        admin_actor=actor,
        admin_request_id=request_id,
    )
