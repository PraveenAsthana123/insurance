"""Tenant scope guard · Iter 31.

Per §41.3 multi-tenant isolation: every query that reads org-scoped
data MUST filter by tenant_id. This module provides:

  1. require_tenant_filter(sql) → raise if missing
  2. ensure_tenant_filter(sql, tenant_id) → injects WHERE tenant_id = '...'
  3. assert_tenant_match(rows, expected) → drill audit · raise on mismatch
"""
from __future__ import annotations

import re

_TENANT_RE = re.compile(r"\btenant_id\b", re.IGNORECASE)


class TenantIsolationError(RuntimeError):
    pass


def require_tenant_filter(sql: str) -> None:
    """Raise TenantIsolationError if the SQL has no tenant_id reference."""
    if not _TENANT_RE.search(sql):
        raise TenantIsolationError(
            f"SQL missing tenant_id filter (§41.3): {sql[:120]!r}"
        )


def ensure_tenant_filter(sql: str, tenant_id: str) -> str:
    """Inject WHERE tenant_id = '...' if not present.

    Per §57.7: simple string concatenation only · operator must
    sanitize tenant_id at the route boundary first.
    """
    if _TENANT_RE.search(sql):
        return sql
    if " WHERE " in sql.upper():
        return sql.replace(" WHERE ", f" WHERE tenant_id = '{tenant_id}' AND ", 1)
    if " GROUP BY " in sql.upper() or " ORDER BY " in sql.upper() or " LIMIT " in sql.upper():
        # Insert WHERE before clause
        for kw in (" GROUP BY ", " ORDER BY ", " LIMIT "):
            if kw in sql.upper():
                pos = sql.upper().find(kw)
                return sql[:pos] + f" WHERE tenant_id = '{tenant_id}' " + sql[pos:]
    return sql + f" WHERE tenant_id = '{tenant_id}'"


def assert_tenant_match(rows: list[dict], expected: str) -> int:
    """Return count of rows that violated tenant_id == expected.

    Operator uses this in drills to prove no cross-tenant leakage.
    """
    violators = sum(1 for r in rows if r.get("tenant_id", expected) != expected)
    if violators:
        raise TenantIsolationError(
            f"{violators}/{len(rows)} rows have wrong tenant_id (expected={expected!r})"
        )
    return violators
