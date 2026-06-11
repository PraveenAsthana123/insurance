"""/api/v1/sse/* · Iter 66 · Server-Sent Events for workflow status."""
from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from core.config import get_settings

router = APIRouter(prefix="/api/v1/sse", tags=["sse"])


def _conn():
    return psycopg2.connect(get_settings().database_url)


@router.get("/workflow/{run_id}")
async def workflow_stream(run_id: str):
    """SSE stream · polls invocation + emits status events every 2s."""
    async def event_source():
        last_status = None
        for _ in range(180):  # ~6 min max stream
            try:
                with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        SELECT invocation_id, agent_id, status, duration_ms,
                               trace_id, created_at, completed_at
                        FROM agent_invocation
                        WHERE invocation_id = %s OR correlation_id = %s
                        ORDER BY created_at DESC LIMIT 1
                    """, (run_id, run_id))
                    row = cur.fetchone()
                if row:
                    payload = {
                        "run_id": run_id,
                        "status": row["status"],
                        "agent_id": row["agent_id"],
                        "duration_ms": row["duration_ms"],
                        "trace_id": row["trace_id"],
                        "ts": datetime.now(timezone.utc).isoformat(),
                    }
                    if row["status"] != last_status:
                        yield f"event: status\ndata: {json.dumps(payload, default=str)}\n\n"
                        last_status = row["status"]
                        if row["status"] in ("Success", "Failed", "Cancelled", "Completed"):
                            break
                    else:
                        yield f": keepalive\n\n"
                else:
                    yield f": waiting\n\n"
            except Exception as e:
                yield f"event: error\ndata: {json.dumps({'error': str(e)[:200]})}\n\n"
                break
            await asyncio.sleep(2)
        yield "event: end\ndata: {\"reason\":\"stream-ended\"}\n\n"

    return StreamingResponse(event_source(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache",
                                      "X-Accel-Buffering": "no"})


@router.get("/health")
def health():
    return {"status": "ok", "module": "sse-stream",
            "spec": "§102.8.2 · SSE alternative to per-workflow WebSocket"}
