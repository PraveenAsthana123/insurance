"""tenants_repo — SQL extracted from backend/routers/tenants_admin.py
per global §3 layer rule (no SQL in routers).

Uses the existing database._connect context manager (NOT BaseRepository's
psycopg2 path — kept consistent with the original routers.
"""
from __future__ import annotations

from typing import Any

from database import _connect


def list_tenants() -> list[dict[str, Any]]:
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
        cur = conn.execute(sql)
        return [dict(r) for r in cur.fetchall()]


def list_departments(family: str | None = None, canonical_only: bool = False) -> list[dict[str, Any]]:
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
        cur = conn.execute(sql, params)
        return [dict(r) for r in cur.fetchall()]


def list_tenant_departments(tenant_id: int) -> list[dict[str, Any]]:
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
        cur = conn.execute(sql, [tenant_id])
        return [dict(r) for r in cur.fetchall()]
