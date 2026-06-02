"""catalogs_repo — SQL extracted from backend/routers/catalogs.py
per global §3 layer rule (no SQL in routers).
"""
from __future__ import annotations

from typing import Any

from database import _connect


def list_phases(family: str | None = None) -> list[dict[str, Any]]:
    sql = "SELECT id, code, name, answers_question, owner, family FROM analysis_phase"
    params: list = []
    if family:
        sql += " WHERE family = ?"
        params.append(family)
    sql += " ORDER BY id"

    with _connect() as conn:
        cur = conn.execute(sql, params)
        return [dict(r) for r in cur.fetchall()]


def list_modules(phase_id: int) -> list[dict[str, Any]]:
    sql = """
        SELECT seq, slug, name, core_question, details, status, tags
        FROM analysis_module
        WHERE phase_id = ?
        ORDER BY seq
    """
    with _connect() as conn:
        cur = conn.execute(sql, [phase_id])
        return [dict(r) for r in cur.fetchall()]
