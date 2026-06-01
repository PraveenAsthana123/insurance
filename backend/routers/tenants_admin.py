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

from database import _connect

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/tenants", summary="List tenants")
def list_tenants() -> dict[str, Any]:
    sql = """
        SELECT
            t.id, t.slug, t.display_name, t.legal_name, t.industry,
            t.jurisdiction, t.region, t.status, t.data_residency,
            t.monthly_budget_usd, t.rate_limit_per_min,
            COALESCE(
                (SELECT count(*) FROM tenant_departments td
                 WHERE td.tenant_id = t.id AND td.enabled),
                0
            ) AS departments_enabled
        FROM tenants t
        WHERE t.archived_at IS NULL
        ORDER BY t.created_at DESC
    """
    with _connect() as conn:
        try:
            cur = conn.execute(sql)
            rows = [dict(r) for r in cur.fetchall()]
        except Exception as exc:  # noqa: BLE001
            return {"items": [], "error": str(exc), "source": "fallback"}

    return {"items": rows, "total": len(rows), "source": "live"}


@router.get("/departments", summary="List departments (canonical + project-specific)")
def list_departments(
    family: str | None = Query(default=None, description="standard | insurerage_specific | healthcare_specific | etc."),
    canonical_only: bool = Query(default=False, description="filter to is_canonical=TRUE"),
) -> dict[str, Any]:
    sql = """
        SELECT
            id, code, display_name, family, description,
            artifact_path, process_catalog_ref, sort_order, is_canonical
        FROM departments
        WHERE 1=1
    """
    params: list = []
    if family:
        sql += " AND family = ?"
        params.append(family)
    if canonical_only:
        sql += " AND is_canonical = TRUE"
    sql += " ORDER BY sort_order, id"

    with _connect() as conn:
        try:
            cur = conn.execute(sql, params)
            rows = [dict(r) for r in cur.fetchall()]
        except Exception as exc:  # noqa: BLE001
            return {"items": [], "error": str(exc), "source": "fallback"}

    return {"items": rows, "total": len(rows), "source": "live"}


@router.get("/tenant-departments", summary="List dept enablement for a tenant")
def list_tenant_departments(tenant_id: int = Query(...)) -> dict[str, Any]:
    sql = """
        SELECT
            td.id, td.enabled, td.activated_at,
            d.id AS department_id, d.code, d.display_name, d.family, d.sort_order
        FROM tenant_departments td
        JOIN departments d ON d.id = td.department_id
        WHERE td.tenant_id = ?
        ORDER BY d.sort_order
    """
    with _connect() as conn:
        try:
            cur = conn.execute(sql, [tenant_id])
            rows = [dict(r) for r in cur.fetchall()]
        except Exception as exc:  # noqa: BLE001
            return {"items": [], "error": str(exc), "source": "fallback"}

    return {"items": rows, "total": len(rows), "tenant_id": tenant_id, "source": "live"}
