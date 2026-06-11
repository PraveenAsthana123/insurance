"""/api/v1/frontend-telemetry · drafts · Iter 64."""
from __future__ import annotations

import json
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras
from fastapi import APIRouter, Request
from pydantic import BaseModel

from core.config import get_settings

router = APIRouter(tags=["frontend-telemetry"])


def _conn():
    return psycopg2.connect(get_settings().database_url)


def _ensure_tables():
    with _conn() as c, c.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS frontend_telemetry (
                id          BIGSERIAL PRIMARY KEY,
                session_id  VARCHAR(100),
                metric      VARCHAR(50),
                value       NUMERIC,
                url         TEXT,
                user_agent  TEXT,
                screen_width INT,
                screen_height INT,
                event_payload JSONB,
                created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_fe_telemetry_metric_ts ON frontend_telemetry(metric, created_at DESC)")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS draft_storage (
                draft_key  VARCHAR(200) PRIMARY KEY,
                value      JSONB,
                user_id    VARCHAR(100),
                tenant_id  VARCHAR(100) DEFAULT 'default',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)


class Vital(BaseModel):
    session_id: str | None = None
    metric: str
    value: float | None = None
    url: str | None = None
    user_agent: str | None = None
    screen_width: int | None = None
    screen_height: int | None = None
    event_payload: dict | None = None


@router.post("/api/v1/frontend-telemetry/vital")
def post_vital(body: Vital):
    """Capture LCP / FID / CLS / TTFB · POST from useWebVitals hook."""
    _ensure_tables()
    with _conn() as c, c.cursor() as cur:
        cur.execute("""
            INSERT INTO frontend_telemetry
              (session_id, metric, value, url, user_agent, screen_width, screen_height, event_payload)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb)
        """, (body.session_id, body.metric, body.value, body.url,
              body.user_agent, body.screen_width, body.screen_height,
              json.dumps(body.event_payload) if body.event_payload else None))
    return {"ok": True}


@router.get("/api/v1/frontend-telemetry/summary")
def telemetry_summary():
    """Aggregate · last 24h per metric · p50/p95."""
    _ensure_tables()
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT metric,
                   COUNT(*) AS n,
                   COALESCE(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY value), 0) AS p50,
                   COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value), 0) AS p95
            FROM frontend_telemetry
            WHERE value IS NOT NULL AND created_at > NOW() - INTERVAL '24 hours'
            GROUP BY metric
            ORDER BY metric
        """)
        rows = [dict(r) for r in cur.fetchall()]
        for r in rows:
            r["p50"] = float(r["p50"])
            r["p95"] = float(r["p95"])
    return {"metrics": rows, "n_metrics": len(rows),
            "as_of": datetime.now(timezone.utc).isoformat()}


@router.put("/api/v1/drafts/{key}")
async def save_draft(key: str, request: Request):
    """Upsert draft state · used by useAutoSave hook."""
    _ensure_tables()
    body = await request.body()
    try:
        value = json.loads(body) if body else None
    except Exception:
        value = {"raw": body.decode("utf-8", errors="replace")}
    with _conn() as c, c.cursor() as cur:
        cur.execute("""
            INSERT INTO draft_storage (draft_key, value, updated_at)
            VALUES (%s, %s::jsonb, CURRENT_TIMESTAMP)
            ON CONFLICT (draft_key) DO UPDATE SET
              value = EXCLUDED.value,
              updated_at = CURRENT_TIMESTAMP
        """, (key, json.dumps(value)))
    return {"ok": True, "key": key,
            "saved_at": datetime.now(timezone.utc).isoformat()}


@router.get("/api/v1/drafts/{key}")
def get_draft(key: str):
    """Load draft · returns null if none."""
    _ensure_tables()
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT value, updated_at FROM draft_storage WHERE draft_key = %s",
                    (key,))
        row = cur.fetchone()
    if not row:
        return {"key": key, "value": None}
    return {"key": key, "value": row["value"], "updated_at": str(row["updated_at"])}


@router.delete("/api/v1/drafts/{key}")
def delete_draft(key: str):
    _ensure_tables()
    with _conn() as c, c.cursor() as cur:
        cur.execute("DELETE FROM draft_storage WHERE draft_key = %s", (key,))
    return {"ok": True}
