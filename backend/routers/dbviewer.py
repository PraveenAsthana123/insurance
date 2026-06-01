"""§68.1 + §68.2 — HOLY DB Viewer + per-function table catalog.

Read-only API over registered databases. Composes with global §68 (HOLY
Observability + Data Hub Standard) + the existing TenantId + RBAC +
holy_audit federation (§64.43 #7) + PII redaction (§47.6).

Endpoints (8 total):
  §68.1 DB Viewer:
    GET /api/v1/holy/dbviewer/_global
    GET /api/v1/holy/dbviewer/databases/{db_id}
    GET /api/v1/holy/dbviewer/databases/{db_id}/schemas/{schema}
    GET /api/v1/holy/dbviewer/databases/{db_id}/schemas/{schema}/tables/{table}
    GET /api/v1/holy/dbviewer/databases/{db_id}/schemas/{schema}/tables/{table}/sample

  §68.2 Per-function tables:
    GET /api/v1/holy/dbviewer/process-tables/_global
    GET /api/v1/holy/dbviewer/process-tables/{dept}
    GET /api/v1/holy/dbviewer/process-tables/{dept}/{process_id}

All validators (db_id / schema / table / process_id format checks) run
BEFORE log_holy_access per §47.6 anti-info-leak.
"""
from __future__ import annotations

import re
import time
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request

from core.holy_audit import log_holy_access
from core.middleware import current_tenant_id
from services import dbviewer_service as dbv

router = APIRouter(prefix="/api/v1/holy/dbviewer", tags=["holy", "dbviewer"])

# 19 HOLY departments — single source of truth for cross-dept validation.
HOLY_DEPTS = [
    "digital-marketing", "customer-experience", "supply-chain", "manufacturing",
    "product-rd", "retail-operations", "sales", "finance", "hr", "procurement",
    "executive-leadership", "e-commerce", "customer-support", "engineering",
    "it-operations", "legal", "marketing", "operations", "security-operations",
]

# Identifier regex shared with the service module.
_IDENT_RE = re.compile(r"^[a-z][a-z0-9_]*$")


def _validate_db_id(db_id: str) -> None:
    if not _IDENT_RE.match(db_id):
        raise HTTPException(400, f"Malformed db_id '{db_id}' (lowercase letters/digits/underscores)")
    if dbv.get_database_info(db_id) is None:
        raise HTTPException(404, f"Database '{db_id}' not registered (see /_global)")


def _validate_ident(label: str, value: str) -> None:
    if not _IDENT_RE.match(value):
        raise HTTPException(400, f"Malformed {label} '{value}' (lowercase letters/digits/underscores)")


def _validate_dept(dept: str) -> None:
    if dept not in HOLY_DEPTS:
        raise HTTPException(404, f"Unknown dept '{dept}' — must be one of {len(HOLY_DEPTS)} HOLY depts")


# --- §68.1 DB Viewer surface --------------------------------------------

# IMPORTANT — _global BEFORE the parameterized paths per §66.3 FastAPI
# greedy-match trap.
@router.get("/_global")
def global_overview(http_request: Request) -> dict[str, Any]:
    """Cross-database overview — registered DBs + counts."""
    log_holy_access(http_request, "dbviewer", "global_overview")
    dbs = dbv.list_registered_databases()
    process_count = len(dbv.load_process_tables().get("processes", []))
    return {
        "policy": "§68.1 DB Viewer + §68.2 per-function tables",
        "n_registered_databases": len(dbs),
        "registered_databases": dbs,
        "n_processes_in_catalog": process_count,
        "endpoints": {
            "list_database": "GET /api/v1/holy/dbviewer/databases/{db_id}",
            "list_schemas":  "GET /api/v1/holy/dbviewer/databases/{db_id}/schemas/{schema}",
            "describe_table": "GET /api/v1/holy/dbviewer/databases/{db_id}/schemas/{schema}/tables/{table}",
            "sample_rows":    "GET /api/v1/holy/dbviewer/databases/{db_id}/schemas/{schema}/tables/{table}/sample",
            "process_tables": "GET /api/v1/holy/dbviewer/process-tables/{dept}/{process_id}",
        },
        "invariants": [
            "Read-only",
            "PII redacted by default",
            "Tenant-scoped at SQL boundary",
            "Sample-size capped at 100",
            "Audit row per call",
        ],
        "scanned_at": time.time(),
    }


@router.get("/databases/{db_id}")
def database_info(http_request: Request, db_id: str) -> dict[str, Any]:
    """Return registered DB info + list of schemas."""
    _validate_db_id(db_id)
    log_holy_access(http_request, "dbviewer", "database_info",
                    extra={"db_id": db_id})
    info = dbv.get_database_info(db_id) or {}
    schemas_envelope = dbv.list_schemas(db_id)
    # Strip any field that might carry connection details (defense in depth)
    info_clean = {k: v for k, v in info.items() if k not in {"password", "dsn", "url"}}
    return {
        "db_id": db_id,
        "info": info_clean,
        "schemas": schemas_envelope,
        "scanned_at": time.time(),
    }


@router.get("/databases/{db_id}/schemas/{schema}")
def schema_tables(http_request: Request, db_id: str, schema: str) -> dict[str, Any]:
    """List tables in a schema with PII + tenant_id flags + row estimates."""
    _validate_db_id(db_id)
    _validate_ident("schema", schema)
    log_holy_access(http_request, "dbviewer", "schema_tables",
                    extra={"db_id": db_id, "schema": schema})
    return {**dbv.list_tables(db_id, schema), "scanned_at": time.time()}


@router.get("/databases/{db_id}/schemas/{schema}/tables/{table}")
def table_detail(http_request: Request, db_id: str, schema: str, table: str) -> dict[str, Any]:
    """Column list + PK + FK + PII flags for a single table."""
    _validate_db_id(db_id)
    _validate_ident("schema", schema)
    _validate_ident("table", table)
    log_holy_access(http_request, "dbviewer", "table_detail",
                    extra={"db_id": db_id, "schema": schema, "table": table})
    result = dbv.describe_table(db_id, schema, table)
    if result.get("status") == "not_found":
        raise HTTPException(404, f"Table '{schema}.{table}' not found in '{db_id}'")
    return {**result, "scanned_at": time.time()}


@router.get("/databases/{db_id}/schemas/{schema}/tables/{table}/sample")
def table_sample(
    http_request: Request,
    db_id: str,
    schema: str,
    table: str,
    limit: int = Query(20, ge=1, le=100),
    include_pii: int = Query(0, ge=0, le=1),
) -> dict[str, Any]:
    """Sample rows (PII-redacted by default, tenant-scoped at SQL)."""
    _validate_db_id(db_id)
    _validate_ident("schema", schema)
    _validate_ident("table", table)
    tenant_id = current_tenant_id(http_request)
    log_holy_access(
        http_request, "dbviewer", "table_sample",
        extra={
            "db_id": db_id, "schema": schema, "table": table,
            "limit": limit, "include_pii": int(include_pii),
        },
    )
    return {
        **dbv.sample_rows(
            db_id, schema, table,
            limit=limit, tenant_id=tenant_id, include_pii=bool(include_pii),
        ),
        "scanned_at": time.time(),
    }


# --- §68.2 Per-function tables surface ----------------------------------

@router.get("/process-tables/_global")
def process_tables_global(http_request: Request) -> dict[str, Any]:
    """Whole per-process table catalog (§68.2)."""
    log_holy_access(http_request, "dbviewer", "process_tables_global")
    return dbv.process_tables_global()


@router.get("/process-tables/{dept}")
def process_tables_dept(http_request: Request, dept: str) -> dict[str, Any]:
    """Per-dept process table catalog."""
    _validate_dept(dept)
    log_holy_access(http_request, "dbviewer", "process_tables_dept", dept=dept)
    result = dbv.process_tables_for_dept(dept)
    if result is None:
        raise HTTPException(404, f"No processes annotated for dept '{dept}' in catalog")
    return result


@router.get("/process-tables/{dept}/{process_id}")
def process_tables_detail(http_request: Request, dept: str, process_id: str) -> dict[str, Any]:
    """Single process — primary + secondary tables + join keys + PII columns."""
    _validate_dept(dept)
    if not re.match(r"^[a-z0-9_]+$", process_id):
        raise HTTPException(400, f"Malformed process_id '{process_id}'")
    log_holy_access(
        http_request, "dbviewer", "process_tables_detail",
        dept=dept, extra={"process_id": process_id},
    )
    result = dbv.process_tables_for_process(dept, process_id)
    if result is None:
        raise HTTPException(404, f"Process '{process_id}' not found in '{dept}' catalog")
    return result
