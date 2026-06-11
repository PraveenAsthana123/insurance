"""/api/v1/frontend-audit/* · Iter 66 · §102.11."""
from __future__ import annotations

import json
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras
from fastapi import APIRouter
from pydantic import BaseModel

from core.config import get_settings

router = APIRouter(prefix="/api/v1/frontend-audit", tags=["frontend-audit"])

ALLOWED_EVENTS = {
    "LOGIN", "LOGOUT", "REFRESH", "PROMPT_SUBMIT", "FILE_UPLOAD",
    "APPROVAL", "REJECT", "EXPORT", "DOWNLOAD", "ERROR", "UNLOAD",
}


def _conn():
    return psycopg2.connect(get_settings().database_url)


def _ensure_table():
    with _conn() as c, c.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS frontend_audit_log (
                id          BIGSERIAL PRIMARY KEY,
                event       VARCHAR(50) NOT NULL,
                session_id  VARCHAR(100),
                url         TEXT,
                user_agent  TEXT,
                user_id     VARCHAR(100),
                trace_id    VARCHAR(64),
                payload     JSONB,
                created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_fe_audit_event_ts ON frontend_audit_log(event, created_at DESC)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_fe_audit_session ON frontend_audit_log(session_id)")


class AuditEvent(BaseModel):
    event: str
    session_id: str | None = None
    url: str | None = None
    user_agent: str | None = None
    user_id: str | None = None
    trace_id: str | None = None
    payload: dict | None = None
    ts: str | None = None


@router.post("/log")
def log_event(body: AuditEvent):
    _ensure_table()
    event = body.event.upper()
    # Allow any event but tag whether it's in the canonical set
    canonical = event in ALLOWED_EVENTS
    with _conn() as c, c.cursor() as cur:
        cur.execute("""
            INSERT INTO frontend_audit_log
              (event, session_id, url, user_agent, user_id, trace_id, payload)
            VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb)
            RETURNING id
        """, (event, body.session_id, body.url, body.user_agent,
              body.user_id, body.trace_id,
              json.dumps(body.payload) if body.payload else None))
        row_id = c.cursor().fetchone if False else None
    return {"ok": True, "canonical": canonical,
            "logged_at": datetime.now(timezone.utc).isoformat()}


@router.get("/events")
def list_events(limit: int = 50, event: str | None = None):
    _ensure_table()
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        if event:
            cur.execute("""
                SELECT * FROM frontend_audit_log
                WHERE event = %s ORDER BY created_at DESC LIMIT %s
            """, (event.upper(), limit))
        else:
            cur.execute("""
                SELECT * FROM frontend_audit_log
                ORDER BY created_at DESC LIMIT %s
            """, (limit,))
        rows = [dict(r) for r in cur.fetchall()]
    return {"events": rows, "count": len(rows)}


@router.get("/summary")
def summary():
    _ensure_table()
    with _conn() as c, c.cursor() as cur:
        cur.execute("""
            SELECT event, COUNT(*) AS n
            FROM frontend_audit_log
            WHERE created_at > NOW() - INTERVAL '24 hours'
            GROUP BY event ORDER BY COUNT(*) DESC
        """)
        rows = cur.fetchall()
    return {
        "by_event_24h": {e: n for e, n in rows},
        "canonical_events": sorted(ALLOWED_EVENTS),
        "total_24h": sum(n for _, n in rows),
    }
