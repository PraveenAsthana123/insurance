"""Tenants + Departments admin router — surfaces migration 017 tables.

Read-only for now. Mutation endpoints (create_tenant, enable_dept,
grant_role) deferred to a future migration once §47.6 RBAC contracts
are fully wired.

Composes with §41.3 multi-tenant, §47.6 SOC2 CC6.1+CC6.2, §63 19-dept
scaffold, §66 per-dept artifacts.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query

from repositories import tenants_repo

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/tenants", summary="List tenants")
def list_tenants() -> dict[str, Any]:
    try:
        rows = tenants_repo.list_tenants()
    except Exception as exc:  # noqa: BLE001
        return {"items": [], "error": str(exc), "source": "fallback"}
    return {"items": rows, "total": len(rows), "source": "live"}


@router.get("/departments", summary="List departments (canonical + project-specific)")
def list_departments(
    family: str | None = Query(default=None, description="standard | insurerage_specific | healthcare_specific | etc."),
    canonical_only: bool = Query(default=False, description="filter to is_canonical=TRUE"),
) -> dict[str, Any]:
    try:
        rows = tenants_repo.list_departments(family=family, canonical_only=canonical_only)
    except Exception as exc:  # noqa: BLE001
        return {"items": [], "error": str(exc), "source": "fallback"}
    return {"items": rows, "total": len(rows), "source": "live"}


@router.get("/tenant-departments", summary="List dept enablement for a tenant")
def list_tenant_departments(tenant_id: int = Query(...)) -> dict[str, Any]:
    try:
        rows = tenants_repo.list_tenant_departments(tenant_id)
    except Exception as exc:  # noqa: BLE001
        return {"items": [], "error": str(exc), "source": "fallback"}
    return {"items": rows, "total": len(rows), "tenant_id": tenant_id, "source": "live"}
