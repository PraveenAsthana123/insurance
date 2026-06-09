"""/api/v1/feedback/* — explicit + implicit feedback capture · gate #4."""
from __future__ import annotations

import logging
import uuid
from collections import Counter
from datetime import datetime
from typing import Any, Optional

import psycopg2
import psycopg2.extras
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from core.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/feedback", tags=["feedback"])

EXPLICIT_VALUES = {"good", "bad", "correct", "incorrect"}
IMPLICIT_VALUES = {"accepted", "modified", "rejected", "ignored"}


class FeedbackCreate(BaseModel):
    run_ref: str = Field(..., min_length=1, max_length=64)
    decision_iter: int = Field(..., ge=1)
    decision_action: str = Field(..., min_length=1, max_length=64)
    feedback_kind: str  # 'explicit' or 'implicit'
    feedback_value: str
    reviewer: str = Field(..., min_length=1, max_length=128)
    note: Optional[str] = None


class Feedback(BaseModel):
    id: int
    feedback_ref: str
    run_ref: str
    decision_iter: int
    decision_action: str
    feedback_kind: str
    feedback_value: str
    note: Optional[str] = None
    reviewer: str
    correlation_id: Optional[str] = None
    tenant_id: str
    created_at: datetime


class FeedbackStats(BaseModel):
    total: int
    explicit: dict[str, int]
    implicit: dict[str, int]
    n_distinct_runs: int
    n_reviewers: int


def _conn():
    return psycopg2.connect(get_settings().database_url)


def _validate_value(kind: str, value: str) -> None:
    if kind == "explicit" and value not in EXPLICIT_VALUES:
        raise ValueError(f"explicit feedback_value must be one of {EXPLICIT_VALUES}")
    if kind == "implicit" and value not in IMPLICIT_VALUES:
        raise ValueError(f"implicit feedback_value must be one of {IMPLICIT_VALUES}")
    if kind not in ("explicit", "implicit"):
        raise ValueError("feedback_kind must be 'explicit' or 'implicit'")


@router.get("/health")
def health():
    return {
        "status": "ok",
        "module": "feedback",
        "spec": "§38.3 + T7.10 sibling + Tier 7 gate #4",
        "explicit_values": sorted(EXPLICIT_VALUES),
        "implicit_values": sorted(IMPLICIT_VALUES),
    }


@router.post("", response_model=Feedback, status_code=201)
def create_feedback(body: FeedbackCreate, request: Request):
    try:
        _validate_value(body.feedback_kind, body.feedback_value)
    except ValueError as e:
        raise HTTPException(400, {"detail": str(e), "error_code": "INVALID_FEEDBACK"})

    ref = f"FB-{uuid.uuid4().hex[:10].upper()}"
    correlation_id = getattr(request.state, "correlation_id", None)
    tenant_id = getattr(request.state, "tenant_id", None) or "default"

    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO decision_feedback
            (feedback_ref, run_ref, decision_iter, decision_action,
             feedback_kind, feedback_value, note, reviewer,
             correlation_id, tenant_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (ref, body.run_ref, body.decision_iter, body.decision_action,
             body.feedback_kind, body.feedback_value, body.note, body.reviewer,
             correlation_id, tenant_id),
        )
        row = cur.fetchone()
        c.commit()
    return Feedback(**dict(row))


@router.get("", response_model=list[Feedback])
def list_feedback(
    request: Request,
    run_ref: Optional[str] = None,
    kind: Optional[str] = None,
    value: Optional[str] = None,
    limit: int = 100,
):
    tenant_id = getattr(request.state, "tenant_id", None) or "default"
    q = "SELECT * FROM decision_feedback WHERE tenant_id = %s"
    params: list[Any] = [tenant_id]
    if run_ref:
        q += " AND run_ref = %s"
        params.append(run_ref)
    if kind:
        q += " AND feedback_kind = %s"
        params.append(kind)
    if value:
        q += " AND feedback_value = %s"
        params.append(value)
    q += " ORDER BY id DESC LIMIT %s"
    params.append(limit)

    try:
        with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(q, params)
            rows = cur.fetchall()
        return [Feedback(**dict(r)) for r in rows]
    except Exception as e:
        logger.warning("Feedback list query failed: %s", e)
        return []


@router.get("/stats/summary", response_model=FeedbackStats)
def stats(request: Request):
    tenant_id = getattr(request.state, "tenant_id", None) or "default"
    try:
        with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT feedback_kind, feedback_value, reviewer, run_ref "
                "FROM decision_feedback WHERE tenant_id = %s",
                (tenant_id,),
            )
            rows = cur.fetchall()
        explicit = Counter(r["feedback_value"] for r in rows if r["feedback_kind"] == "explicit")
        implicit = Counter(r["feedback_value"] for r in rows if r["feedback_kind"] == "implicit")
        return FeedbackStats(
            total=len(rows),
            explicit=dict(explicit),
            implicit=dict(implicit),
            n_distinct_runs=len({r["run_ref"] for r in rows}),
            n_reviewers=len({r["reviewer"] for r in rows}),
        )
    except Exception as e:
        logger.warning("Feedback stats failed: %s", e)
        return FeedbackStats(
            total=0, explicit={}, implicit={}, n_distinct_runs=0, n_reviewers=0,
        )
