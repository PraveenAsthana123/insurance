"""input_events_repo — append-only repository for user_input_events.

Per GLOBAL_INPUT_PERSISTENCE_POLICY · migration 051_user_input_events.sql.
Parameterized SQL only (rule 6). Tenant-scoped reads (rule 8).
"""
from __future__ import annotations

import json
from typing import Any, Optional


class InputEventsRepo:
    """Repository for the user_input_events table. Append-only writes."""

    def __init__(self, conn):
        self.conn = conn

    def insert(
        self,
        *,
        event_id: str,
        tenant_id: str,
        actor: str,
        role_code: Optional[str],
        session_id: Optional[str],
        request_id: Optional[str],
        idempotency_key: Optional[str],
        source_surface: str,
        route_path: Optional[str],
        component_id: Optional[str],
        department_id: Optional[str],
        process_id: Optional[str],
        input_kind: str,
        input_name: Optional[str],
        payload: Any,
        payload_redacted: bool,
        payload_hash: Optional[str],
        pii_classification: str,
        retention_class: str,
        purpose: Optional[str],
        metadata: dict,
    ) -> None:
        sql = """
            INSERT INTO user_input_events (
                id, tenant_id, actor, role_code, session_id, request_id,
                idempotency_key, source_surface, route_path, component_id,
                department_id, process_id, input_kind, input_name,
                payload, payload_redacted, payload_hash,
                pii_classification, retention_class, purpose, metadata, status
            ) VALUES (
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s::jsonb, %s, %s,
                %s, %s, %s, %s::jsonb, %s
            )
            ON CONFLICT (id) DO NOTHING
        """
        cur = self.conn.cursor()
        cur.execute(
            sql,
            (
                event_id, tenant_id, actor, role_code, session_id, request_id,
                idempotency_key, source_surface, route_path, component_id,
                department_id, process_id, input_kind, input_name,
                json.dumps(payload), payload_redacted, payload_hash,
                pii_classification, retention_class, purpose,
                json.dumps(metadata), "received",
            ),
        )
        self.conn.commit()
        cur.close()

    def get(self, event_id: str, tenant_id: str) -> Optional[dict]:
        sql = """
            SELECT id, tenant_id, actor, role_code, source_surface,
                   input_kind, payload_redacted, payload_hash, status,
                   created_at::text AS created_at
              FROM user_input_events
             WHERE id = %s AND tenant_id = %s AND deleted_at IS NULL
        """
        cur = self.conn.cursor()
        cur.execute(sql, (event_id, tenant_id))
        row = cur.fetchone()
        cur.close()
        if not row:
            return None
        cols = ["id", "tenant_id", "actor", "role_code", "source_surface",
                "input_kind", "payload_redacted", "payload_hash", "status", "created_at"]
        return dict(zip(cols, row))

    def list(
        self,
        *,
        tenant_id: str,
        source_surface: Optional[str] = None,
        input_kind: Optional[str] = None,
        department_id: Optional[str] = None,
        process_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict]:
        conds = ["tenant_id = %s", "deleted_at IS NULL"]
        params: list[Any] = [tenant_id]
        if source_surface:
            conds.append("source_surface = %s"); params.append(source_surface)
        if input_kind:
            conds.append("input_kind = %s"); params.append(input_kind)
        if department_id:
            conds.append("department_id = %s"); params.append(department_id)
        if process_id:
            conds.append("process_id = %s"); params.append(process_id)
        where = " AND ".join(conds)
        sql = f"""
            SELECT id, tenant_id, actor, role_code, source_surface,
                   input_kind, payload_redacted, payload_hash, status,
                   created_at::text AS created_at
              FROM user_input_events
             WHERE {where}
             ORDER BY created_at DESC
             LIMIT %s OFFSET %s
        """
        params.extend([limit, offset])
        cur = self.conn.cursor()
        cur.execute(sql, tuple(params))
        rows = cur.fetchall()
        cur.close()
        cols = ["id", "tenant_id", "actor", "role_code", "source_surface",
                "input_kind", "payload_redacted", "payload_hash", "status", "created_at"]
        return [dict(zip(cols, r)) for r in rows]
