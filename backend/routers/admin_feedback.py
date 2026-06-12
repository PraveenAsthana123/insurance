"""/api/v1/admin/feedback — rollup view over user_input_events for operators.

Reads aggregated feedback from the global input persistence layer. Tenant-scoped
by default (per rule 8). Aggregations are operator-friendly (counts, ratings
breakdown, comments by tab, recency).

This is a READ-ONLY surface · no writes through this router.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Query, Request

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/admin/feedback", tags=["admin", "feedback"])


def _tenant(request: Request) -> str:
    return getattr(request.state, "tenant_id", "default")


@router.get("/summary")
async def feedback_summary(
    request: Request,
    days: int = Query(7, ge=1, le=90),
    department_id: Optional[str] = Query(None),
    process_id: Optional[str] = Query(None),
) -> dict[str, Any]:
    """Aggregated feedback summary for the tenant.

    Returns:
      - total_count: int
      - up_count / down_count / no_rating
      - by_tab: { tab_name: { up, down, no_rating, total } }
      - by_process: top-N processes by feedback volume
      - by_day: time series of feedback counts
    """
    tenant_id = _tenant(request)
    try:
        from core.db import get_pg_conn  # type: ignore
    except ImportError:
        # Soft-fail per rule 9 · reads can fail open
        return _empty_summary(days)

    try:
        with get_pg_conn() as conn:
            cur = conn.cursor()

            # ---- Top-level totals (tenant-scoped + recency-filtered) ----
            conds = [
                "tenant_id = %s",
                "input_kind = 'feedback'",
                "created_at >= NOW() - (%s || ' days')::interval",
                "deleted_at IS NULL",
            ]
            params: list[Any] = [tenant_id, str(days)]
            if department_id:
                conds.append("department_id = %s"); params.append(department_id)
            if process_id:
                conds.append("process_id = %s"); params.append(process_id)
            where = " AND ".join(conds)

            cur.execute(
                f"""
                SELECT
                  COUNT(*) AS total,
                  SUM(CASE WHEN payload->>'rating' = 'up' THEN 1 ELSE 0 END) AS up_count,
                  SUM(CASE WHEN payload->>'rating' = 'down' THEN 1 ELSE 0 END) AS down_count,
                  SUM(CASE WHEN payload->>'rating' IS NULL THEN 1 ELSE 0 END) AS no_rating
                FROM user_input_events
                WHERE {where}
                """,
                tuple(params),
            )
            total, up_count, down_count, no_rating = cur.fetchone() or (0, 0, 0, 0)

            # ---- Breakdown by active tab ----
            cur.execute(
                f"""
                SELECT
                  payload->>'active_tab' AS tab,
                  SUM(CASE WHEN payload->>'rating' = 'up' THEN 1 ELSE 0 END) AS up,
                  SUM(CASE WHEN payload->>'rating' = 'down' THEN 1 ELSE 0 END) AS down,
                  SUM(CASE WHEN payload->>'rating' IS NULL THEN 1 ELSE 0 END) AS no_rating,
                  COUNT(*) AS total
                FROM user_input_events
                WHERE {where}
                GROUP BY payload->>'active_tab'
                ORDER BY total DESC
                """,
                tuple(params),
            )
            by_tab = {
                (row[0] or "unknown"): {
                    "up": int(row[1] or 0),
                    "down": int(row[2] or 0),
                    "no_rating": int(row[3] or 0),
                    "total": int(row[4] or 0),
                }
                for row in cur.fetchall()
            }

            # ---- Top-N processes by volume ----
            cur.execute(
                f"""
                SELECT
                  COALESCE(process_id, payload->>'process_name', '(unknown)') AS process,
                  COUNT(*) AS total
                FROM user_input_events
                WHERE {where}
                GROUP BY 1
                ORDER BY total DESC
                LIMIT 10
                """,
                tuple(params),
            )
            by_process = [{"process": row[0], "total": int(row[1])} for row in cur.fetchall()]

            # ---- Per-day time series ----
            cur.execute(
                f"""
                SELECT
                  date_trunc('day', created_at)::date AS day,
                  COUNT(*) AS total
                FROM user_input_events
                WHERE {where}
                GROUP BY 1
                ORDER BY 1
                """,
                tuple(params),
            )
            by_day = [{"day": str(row[0]), "total": int(row[1])} for row in cur.fetchall()]
            cur.close()

            return {
                "tenant_id": tenant_id,
                "days": days,
                "total_count": int(total or 0),
                "up_count": int(up_count or 0),
                "down_count": int(down_count or 0),
                "no_rating": int(no_rating or 0),
                "by_tab": by_tab,
                "by_process": by_process,
                "by_day": by_day,
            }
    except Exception as e:
        logger.exception("admin feedback summary failed: %s", e)
        return _empty_summary(days)


@router.get("/comments")
async def feedback_comments(
    request: Request,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    rating: Optional[str] = Query(None, pattern="^(up|down)$"),
) -> list[dict[str, Any]]:
    """Recent feedback comments (filtered tenant-scoped)."""
    tenant_id = _tenant(request)
    try:
        from core.db import get_pg_conn  # type: ignore
    except ImportError:
        return []

    try:
        with get_pg_conn() as conn:
            cur = conn.cursor()
            conds = [
                "tenant_id = %s",
                "input_kind = 'feedback'",
                "deleted_at IS NULL",
                "payload->>'comment' IS NOT NULL",
                "payload->>'comment' <> ''",
            ]
            params: list[Any] = [tenant_id]
            if rating:
                conds.append("payload->>'rating' = %s"); params.append(rating)
            where = " AND ".join(conds)
            params.extend([limit, offset])

            cur.execute(
                f"""
                SELECT
                  id::text,
                  created_at::text,
                  payload->>'rating' AS rating,
                  payload->>'comment' AS comment,
                  payload->>'active_tab' AS active_tab,
                  payload->>'process_name' AS process_name,
                  payload->>'department_name' AS department_name,
                  actor
                FROM user_input_events
                WHERE {where}
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
                """,
                tuple(params),
            )
            rows = cur.fetchall()
            cur.close()
            return [
                {
                    "id": r[0],
                    "created_at": r[1],
                    "rating": r[2],
                    "comment": r[3],
                    "active_tab": r[4],
                    "process_name": r[5],
                    "department_name": r[6],
                    "actor": r[7],
                }
                for r in rows
            ]
    except Exception as e:
        logger.exception("admin feedback comments failed: %s", e)
        return []


def _empty_summary(days: int) -> dict[str, Any]:
    return {
        "tenant_id": "default",
        "days": days,
        "total_count": 0,
        "up_count": 0,
        "down_count": 0,
        "no_rating": 0,
        "by_tab": {},
        "by_process": [],
        "by_day": [],
    }
