"""Decision corrections services · T7.10."""
from __future__ import annotations

import json
import logging
import uuid
from collections import Counter
from datetime import datetime
from typing import Any, Optional

import psycopg2
import psycopg2.extras
from pydantic import BaseModel, Field

from core.config import get_settings

logger = logging.getLogger(__name__)


def _conn():
    return psycopg2.connect(get_settings().database_url)


def _row(r):
    return dict(r) if r else {}


# ─── Schemas ─────────────────────────────────────────────
class CorrectionCreate(BaseModel):
    run_ref: str = Field(..., min_length=1, max_length=64)
    decision_iter: int = Field(..., ge=1)
    decision_action: str = Field(..., min_length=1, max_length=64)
    ai_decision: dict[str, Any]
    human_decision: dict[str, Any]
    reason: str = Field(..., min_length=1, max_length=1000)
    reviewer: str = Field(..., min_length=1, max_length=128)
    severity: str = "minor"   # minor · major · critical
    use_for_training: bool = True


class Correction(BaseModel):
    id: int
    correction_ref: str
    run_ref: str
    decision_iter: int
    decision_action: str
    ai_decision: dict[str, Any]
    human_decision: dict[str, Any]
    reason: str
    reviewer: str
    severity: str
    use_for_training: bool
    correlation_id: Optional[str] = None
    created_at: datetime


class CorrectionStats(BaseModel):
    total_corrections: int
    by_severity: dict[str, int]
    by_action: dict[str, int]
    by_reviewer: dict[str, int]
    trainable_count: int
    n_distinct_runs: int


# ─── CRUD ────────────────────────────────────────────────
def create_correction(data: CorrectionCreate, tenant_id: str = "default",
                        correlation_id: Optional[str] = None) -> Correction:
    if data.severity not in ("minor", "major", "critical"):
        raise ValueError("severity must be minor/major/critical")
    ref = f"CORR-{uuid.uuid4().hex[:10].upper()}"
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO decision_corrections
            (correction_ref, run_ref, decision_iter, decision_action,
             ai_decision, human_decision, reason, reviewer,
             severity, use_for_training, correlation_id, tenant_id)
            VALUES (%s, %s, %s, %s, %s::jsonb, %s::jsonb, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (ref, data.run_ref, data.decision_iter, data.decision_action,
             json.dumps(data.ai_decision), json.dumps(data.human_decision),
             data.reason, data.reviewer, data.severity,
             data.use_for_training, correlation_id, tenant_id),
        )
        row = cur.fetchone()
        c.commit()
    return Correction(**_row(row))


def list_corrections(tenant_id: str = "default",
                       run_ref: Optional[str] = None,
                       severity: Optional[str] = None,
                       limit: int = 100) -> list[Correction]:
    q = "SELECT * FROM decision_corrections WHERE tenant_id = %s"
    params: list[Any] = [tenant_id]
    if run_ref:
        q += " AND run_ref = %s"
        params.append(run_ref)
    if severity:
        q += " AND severity = %s"
        params.append(severity)
    q += " ORDER BY id DESC LIMIT %s"
    params.append(limit)
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(q, params)
        rows = cur.fetchall()
    return [Correction(**_row(r)) for r in rows]


def stats(tenant_id: str = "default") -> CorrectionStats:
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT severity, decision_action, reviewer, use_for_training, run_ref "
            "FROM decision_corrections WHERE tenant_id = %s",
            (tenant_id,),
        )
        rows = cur.fetchall()
    by_severity = Counter(r["severity"] for r in rows)
    by_action   = Counter(r["decision_action"] for r in rows)
    by_reviewer = Counter(r["reviewer"] for r in rows)
    trainable = sum(1 for r in rows if r["use_for_training"])
    distinct_runs = len({r["run_ref"] for r in rows})
    return CorrectionStats(
        total_corrections=len(rows),
        by_severity=dict(by_severity),
        by_action=dict(by_action),
        by_reviewer=dict(by_reviewer),
        trainable_count=trainable,
        n_distinct_runs=distinct_runs,
    )


def get_correction(correction_ref: str, tenant_id: str = "default") -> Optional[Correction]:
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM decision_corrections "
            "WHERE correction_ref = %s AND tenant_id = %s",
            (correction_ref, tenant_id),
        )
        row = cur.fetchone()
    return Correction(**_row(row)) if row else None
