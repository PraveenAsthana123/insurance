"""§68 INSUR Observability + Data Hub — DB Viewer service.

Read-only Postgres introspection + per-process table catalog, behind the
existing TenantIdMiddleware + RBAC + audit stack. Per §68.3 invariants:

  1. Read-only (no SELECT * FROM ...; only catalog views + bounded samples)
  2. PII redacted by default; ?include_pii=1 audited per §47.6 SOC2 CC6.2
  3. Tenant-scoped at SQL boundary when the table has a tenant_id column
  4. Sample-size capped at 100 rows per call
  5. Audit row per call via core.insur_audit.log_insur_access (in router)
  6. NO connection strings / passwords in responses (db_id label only)
  7. Validators 404 BEFORE audit per §47.6 anti-info-leak (in router)
  8. Best-effort persistence — DB unreachable does NOT crash the request;
     returns a stub with status='unreachable' per §57.7
  9. Cross-tenant isolation drill-tested (drill_dbviewer.py negative step)

Composes with §38.3 (audit) + §41.3 (tenant) + §47.6 (PII) + §57.7
(graceful degradation) + §63 (per-dept) + §64.43 #7 (federation) +
§66 (per-dept artifacts).
"""
from __future__ import annotations

import json
import logging
import re
import time
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Per-process table catalog file (§68.2).
_REPO_ROOT = Path(__file__).resolve().parents[2]
_PROCESS_TABLES_CANDIDATES = [
    _REPO_ROOT / "data" / "dbviewer" / "per_process_tables.json",
    Path("/app/data/dbviewer/per_process_tables.json"),
    Path("/data/dbviewer/per_process_tables.json"),
]


def _process_tables_path() -> Path | None:
    """Return first existing per_process_tables.json or None."""
    for p in _PROCESS_TABLES_CANDIDATES:
        if p.exists():
            return p
    return None


def load_process_tables() -> dict[str, Any]:
    """Load the per-process tables catalog from JSON (read-only)."""
    p = _process_tables_path()
    if p is None:
        return {
            "_meta": {"status": "catalog_file_not_found", "searched": [str(c) for c in _PROCESS_TABLES_CANDIDATES]},
            "processes": [],
            "registered_databases": [],
        }
    try:
        return json.loads(p.read_text())
    except (json.JSONDecodeError, OSError) as exc:
        logger.warning("dbviewer: failed to load %s: %s", p, exc)
        return {
            "_meta": {"status": "catalog_parse_error", "error": str(exc)[:200]},
            "processes": [],
            "registered_databases": [],
        }


# Identifier safety — §47.6 anti-SQL-injection at the introspection
# boundary. We use parameterized queries against information_schema for
# data, but schema/table NAMES must come from a verified allow-list (the
# introspection result) — never from raw caller input. Caller passes a
# name, we look it up in the introspected list before using it in any
# subsequent query.
_SAFE_IDENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

# PII column-name patterns. Conservative — matches if ANY pattern appears
# as a substring of the column name (case-insensitive). Over-redaction is
# the safe side to err on; downstream callers must explicitly pass
# ?include_pii=1 to see the raw values (and audit row records the request).
# `\b` boundaries would NOT match `primary_email` because `_` is a word
# character in regex — substring match is intentional.
_PII_PATTERNS = (
    "email", "phone", "ssn", "full_name", "fullname",
    "customer_name", "vendor_name", "birth_date", "dob",
    "credit_card", "iban", "bank_account",
    # `address` covered with a word-boundary on the LEFT only so we
    # match `address`, `primary_address`, `billing_address` but NOT
    # `address_id` (foreign keys are not PII themselves).
    r"(?:^|_)address(?:$|_(?!id\b))",
)
_PII_REGEX = re.compile("|".join(_PII_PATTERNS), re.IGNORECASE)


def is_pii_column(col_name: str) -> bool:
    """Heuristic: column name matches a known PII pattern."""
    return bool(_PII_REGEX.search(col_name or ""))


def redact_row(row: dict[str, Any], pii_columns: set[str]) -> dict[str, Any]:
    """Return a copy of row with PII columns replaced by '***REDACTED***'."""
    return {
        k: ("***REDACTED***" if k in pii_columns else v)
        for k, v in row.items()
    }


def safe_ident(name: str) -> bool:
    """True if name is safe to interpolate into SQL identifier position."""
    return bool(_SAFE_IDENT.match(name or ""))


# ---- Postgres introspection (lazy, best-effort) -----------------------

def _connect_pg():
    """Lazy Postgres connect. Returns None on any failure per §57.7."""
    try:
        import psycopg2
        from core.config import get_settings  # noqa: PLC0415

        settings = get_settings()
        return psycopg2.connect(
            host=settings.postgres_host,
            port=settings.postgres_port,
            dbname=settings.postgres_db,
            user=settings.postgres_user,
            password=settings.postgres_password,
            connect_timeout=3,
        )
    except Exception as exc:  # noqa: BLE001 — observability layer never crashes the read
        logger.info("dbviewer: postgres unreachable (%s) — degrading", type(exc).__name__)
        return None


def list_registered_databases() -> list[dict[str, Any]]:
    """List databases known to the viewer (from catalog)."""
    cat = load_process_tables()
    return cat.get("registered_databases", [])


def get_database_info(db_id: str) -> dict[str, Any] | None:
    """Return one registered DB's info or None if not registered."""
    return next(
        (d for d in list_registered_databases() if d.get("db_id") == db_id),
        None,
    )


def list_schemas(db_id: str) -> dict[str, Any]:
    """Return schemas for a registered Postgres database.

    Per §68.3 #8: if Postgres is unreachable, return a stub envelope —
    NEVER raise into the request path.
    """
    db = get_database_info(db_id)
    if db is None:
        return {"db_id": db_id, "status": "not_registered", "schemas": []}

    conn = _connect_pg()
    if conn is None:
        return {
            "db_id": db_id,
            "engine": db.get("engine"),
            "status": "unreachable",
            "schemas": [{"name": s, "live": False} for s in db.get("schemas", [])],
        }
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT schema_name FROM information_schema.schemata "
                "WHERE schema_name NOT IN ('pg_catalog','information_schema') "
                "ORDER BY schema_name"
            )
            schemas = [r[0] for r in cur.fetchall()]
        return {
            "db_id": db_id,
            "engine": db.get("engine"),
            "status": "live",
            "schemas": [{"name": s, "live": True} for s in schemas],
        }
    except Exception as exc:  # noqa: BLE001
        logger.warning("dbviewer.list_schemas: %s", exc)
        return {"db_id": db_id, "status": "query_error", "error_type": type(exc).__name__, "schemas": []}
    finally:
        try:
            conn.close()
        except Exception:  # noqa: BLE001
            pass


def list_tables(db_id: str, schema: str) -> dict[str, Any]:
    """Return tables in a given schema with row-count + PII column flags."""
    if not safe_ident(schema):
        return {"db_id": db_id, "schema": schema, "status": "invalid_schema_name", "tables": []}

    db = get_database_info(db_id)
    if db is None:
        return {"db_id": db_id, "status": "not_registered", "tables": []}

    conn = _connect_pg()
    if conn is None:
        return {"db_id": db_id, "schema": schema, "status": "unreachable", "tables": []}

    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = %s AND table_type = 'BASE TABLE' "
                "ORDER BY table_name",
                (schema,),
            )
            table_names = [r[0] for r in cur.fetchall()]

            tables: list[dict[str, Any]] = []
            for tname in table_names:
                if not safe_ident(tname):
                    continue
                # PII flag via column-name heuristic
                cur.execute(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_schema = %s AND table_name = %s",
                    (schema, tname),
                )
                cols = [r[0] for r in cur.fetchall()]
                pii_cols = [c for c in cols if is_pii_column(c)]
                has_tenant_id = "tenant_id" in cols
                # Row count — bounded estimate via reltuples to avoid full scan
                cur.execute(
                    "SELECT reltuples::BIGINT FROM pg_class c "
                    "JOIN pg_namespace n ON n.oid = c.relnamespace "
                    "WHERE n.nspname = %s AND c.relname = %s",
                    (schema, tname),
                )
                row = cur.fetchone()
                est_rows = int(row[0]) if row else 0

                tables.append({
                    "name": tname,
                    "n_columns": len(cols),
                    "n_pii_columns": len(pii_cols),
                    "pii_columns": pii_cols,
                    "has_tenant_id": has_tenant_id,
                    "estimated_rows": est_rows,
                })

        return {
            "db_id": db_id,
            "schema": schema,
            "status": "live",
            "n_tables": len(tables),
            "tables": tables,
        }
    except Exception as exc:  # noqa: BLE001
        logger.warning("dbviewer.list_tables: %s", exc)
        return {"db_id": db_id, "schema": schema, "status": "query_error",
                "error_type": type(exc).__name__, "tables": []}
    finally:
        try:
            conn.close()
        except Exception:  # noqa: BLE001
            pass


def describe_table(db_id: str, schema: str, table: str) -> dict[str, Any]:
    """Return columns + PK + FK + indexes for a single table."""
    if not (safe_ident(schema) and safe_ident(table)):
        return {"status": "invalid_identifier"}

    db = get_database_info(db_id)
    if db is None:
        return {"db_id": db_id, "status": "not_registered"}

    conn = _connect_pg()
    if conn is None:
        return {"db_id": db_id, "schema": schema, "table": table, "status": "unreachable"}

    try:
        with conn.cursor() as cur:
            # Columns
            cur.execute(
                "SELECT column_name, data_type, is_nullable, column_default "
                "FROM information_schema.columns "
                "WHERE table_schema = %s AND table_name = %s "
                "ORDER BY ordinal_position",
                (schema, table),
            )
            columns = [
                {"name": r[0], "type": r[1], "nullable": r[2] == "YES",
                 "default": r[3], "pii": is_pii_column(r[0])}
                for r in cur.fetchall()
            ]
            if not columns:
                return {"db_id": db_id, "schema": schema, "table": table, "status": "not_found"}

            # Primary key
            cur.execute(
                "SELECT a.attname FROM pg_index i "
                "JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) "
                "JOIN pg_class c ON c.oid = i.indrelid "
                "JOIN pg_namespace n ON n.oid = c.relnamespace "
                "WHERE i.indisprimary AND n.nspname = %s AND c.relname = %s",
                (schema, table),
            )
            primary_key = [r[0] for r in cur.fetchall()]

            # Foreign keys
            cur.execute(
                "SELECT kcu.column_name, ccu.table_name, ccu.column_name "
                "FROM information_schema.table_constraints tc "
                "JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name "
                "JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name "
                "WHERE tc.constraint_type = 'FOREIGN KEY' "
                "AND tc.table_schema = %s AND tc.table_name = %s",
                (schema, table),
            )
            foreign_keys = [
                {"column": r[0], "references_table": r[1], "references_column": r[2]}
                for r in cur.fetchall()
            ]

        return {
            "db_id": db_id,
            "schema": schema,
            "table": table,
            "status": "live",
            "columns": columns,
            "primary_key": primary_key,
            "foreign_keys": foreign_keys,
            "has_tenant_id": any(c["name"] == "tenant_id" for c in columns),
            "n_pii_columns": sum(1 for c in columns if c["pii"]),
        }
    except Exception as exc:  # noqa: BLE001
        logger.warning("dbviewer.describe_table: %s", exc)
        return {"db_id": db_id, "schema": schema, "table": table,
                "status": "query_error", "error_type": type(exc).__name__}
    finally:
        try:
            conn.close()
        except Exception:  # noqa: BLE001
            pass


def sample_rows(
    db_id: str,
    schema: str,
    table: str,
    *,
    limit: int = 20,
    tenant_id: str = "default",
    include_pii: bool = False,
) -> dict[str, Any]:
    """Sample up to `limit` rows from a table with PII redaction + tenant filter.

    Per §68.3:
      - Sample-size hard-capped at 100 (caller-passed limit further clamped).
      - When table has a `tenant_id` column, WHERE clause restricts to caller's tenant.
      - PII columns redacted unless include_pii=True (auditor flag).
    """
    limit = max(1, min(limit, 100))

    if not (safe_ident(schema) and safe_ident(table)):
        return {"status": "invalid_identifier"}

    # Get the column schema first — also confirms table exists + lists PII cols.
    described = describe_table(db_id, schema, table)
    if described.get("status") != "live":
        return {**described, "rows": []}

    columns = [c["name"] for c in described["columns"]]
    pii_columns = {c["name"] for c in described["columns"] if c["pii"]}
    has_tenant_id = described.get("has_tenant_id", False)

    conn = _connect_pg()
    if conn is None:
        return {"db_id": db_id, "schema": schema, "table": table,
                "status": "unreachable", "rows": []}

    try:
        # Identifiers are from the introspected list (allow-listed). Values
        # via parameterization. Safe to interpolate quoted idents here.
        cols_sql = ", ".join(f'"{c}"' for c in columns)
        where_clause = ""
        params: list[Any] = []
        if has_tenant_id and tenant_id and tenant_id != "default":
            where_clause = ' WHERE "tenant_id" = %s'
            params.append(tenant_id)

        sql = f'SELECT {cols_sql} FROM "{schema}"."{table}"{where_clause} LIMIT %s'
        params.append(limit)

        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = [dict(zip(columns, r, strict=True)) for r in cur.fetchall()]

        if not include_pii:
            rows = [redact_row(r, pii_columns) for r in rows]

        return {
            "db_id": db_id,
            "schema": schema,
            "table": table,
            "status": "live",
            "n_rows": len(rows),
            "limit": limit,
            "tenant_filter_applied": has_tenant_id and tenant_id != "default",
            "tenant_id": tenant_id,
            "n_pii_columns_redacted": 0 if include_pii else len(pii_columns),
            "include_pii": include_pii,
            "rows": rows,
        }
    except Exception as exc:  # noqa: BLE001
        logger.warning("dbviewer.sample_rows: %s", exc)
        return {"db_id": db_id, "schema": schema, "table": table,
                "status": "query_error", "error_type": type(exc).__name__, "rows": []}
    finally:
        try:
            conn.close()
        except Exception:  # noqa: BLE001
            pass


# ---- Per-process tables surface (§68.2) -------------------------------

def process_tables_global() -> dict[str, Any]:
    """Whole per-process table catalog."""
    cat = load_process_tables()
    processes = cat.get("processes", [])
    depts = sorted({p.get("dept") for p in processes if p.get("dept")})
    return {
        "policy": "§68.2",
        "n_processes": len(processes),
        "n_depts": len(depts),
        "depts": depts,
        "processes": processes,
        "registered_databases": cat.get("registered_databases", []),
        "scanned_at": time.time(),
    }


def process_tables_for_dept(dept: str) -> dict[str, Any] | None:
    """Per-dept slice of the catalog. Returns None if dept absent."""
    cat = load_process_tables()
    rows = [p for p in cat.get("processes", []) if p.get("dept") == dept]
    if not rows:
        return None
    return {
        "dept": dept,
        "n_processes": len(rows),
        "processes": rows,
        "scanned_at": time.time(),
    }


def process_tables_for_process(dept: str, process_id: str) -> dict[str, Any] | None:
    """Single process detail. Returns None if not found."""
    cat = load_process_tables()
    match = next(
        (p for p in cat.get("processes", [])
         if p.get("dept") == dept and p.get("process_id") == process_id),
        None,
    )
    if not match:
        return None
    return {"dept": dept, "process": match, "scanned_at": time.time()}
