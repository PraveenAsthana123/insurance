from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

import psycopg2.extras

from repositories.base import BaseRepository


class ModelRepository(BaseRepository):
    """All SQL for the ml_models table."""

    def list_all(self, offset: int = 0, limit: int = 50) -> List[dict]:
        with self._connect() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT id, department_id, process_id, dataset_id, name,
                           algorithm, status, mlflow_run_id, metrics, created_at, updated_at
                    FROM ml_models
                    ORDER BY created_at DESC
                    LIMIT %s OFFSET %s
                    """,
                    (limit, offset),
                )
                return [dict(row) for row in cur.fetchall()]

    def count(self) -> int:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM ml_models")
                return cur.fetchone()[0]

    def get_by_id(self, model_id: int) -> Optional[dict]:
        with self._connect() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT id, department_id, process_id, dataset_id, name,
                           algorithm, status, mlflow_run_id, metrics, created_at, updated_at
                    FROM ml_models
                    WHERE id = %s
                    """,
                    (model_id,),
                )
                row = cur.fetchone()
                return dict(row) if row else None

    def create(
        self,
        name: str,
        department_id: Optional[int] = None,
        process_id: Optional[int] = None,
        dataset_id: Optional[int] = None,
        algorithm: Optional[str] = None,
    ) -> dict:
        with self._connect() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    INSERT INTO ml_models (name, department_id, process_id, dataset_id, algorithm, status)
                    VALUES (%s, %s, %s, %s, %s, 'pending')
                    RETURNING id, department_id, process_id, dataset_id, name,
                              algorithm, status, mlflow_run_id, metrics, created_at, updated_at
                    """,
                    (name, department_id, process_id, dataset_id, algorithm),
                )
                return dict(cur.fetchone())

    def update_status(
        self,
        model_id: int,
        status: str,
        mlflow_run_id: Optional[str] = None,
        metrics: Optional[Dict[str, Any]] = None,
    ) -> None:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE ml_models
                    SET status = %s,
                        mlflow_run_id = COALESCE(%s, mlflow_run_id),
                        metrics = COALESCE(%s, metrics),
                        updated_at = NOW()
                    WHERE id = %s
                    """,
                    (
                        status,
                        mlflow_run_id,
                        json.dumps(metrics) if metrics else None,
                        model_id,
                    ),
                )

    def list_by_department(self, dept_id: int, offset: int = 0, limit: int = 50) -> List[dict]:
        with self._connect() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT id, department_id, process_id, dataset_id, name,
                           algorithm, status, mlflow_run_id, metrics, created_at, updated_at
                    FROM ml_models
                    WHERE department_id = %s
                    ORDER BY created_at DESC
                    LIMIT %s OFFSET %s
                    """,
                    (dept_id, limit, offset),
                )
                return [dict(row) for row in cur.fetchall()]
