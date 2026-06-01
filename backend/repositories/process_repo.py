from __future__ import annotations

from typing import List, Optional

import psycopg2.extras

from repositories.base import BaseRepository


class ProcessRepository(BaseRepository):
    """All SQL for the processes, ai_mappings, and process_data_flow tables."""

    def list_by_department(self, dept_id: int, offset: int = 0, limit: int = 50) -> List[dict]:
        with self._connect() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT id, department_id, name, description, inputs, outputs,
                           pain_points, kpi, data_needed
                    FROM processes
                    WHERE department_id = %s
                    ORDER BY name
                    LIMIT %s OFFSET %s
                    """,
                    (dept_id, limit, offset),
                )
                return [dict(row) for row in cur.fetchall()]

    def count_by_department(self, dept_id: int) -> int:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT COUNT(*) FROM processes WHERE department_id = %s",
                    (dept_id,),
                )
                return cur.fetchone()[0]

    def get_by_id(self, process_id: int) -> Optional[dict]:
        with self._connect() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT id, department_id, name, description, inputs, outputs,
                           pain_points, kpi, data_needed
                    FROM processes
                    WHERE id = %s
                    """,
                    (process_id,),
                )
                row = cur.fetchone()
                return dict(row) if row else None

    def get_ai_mappings(self, process_id: int) -> List[dict]:
        with self._connect() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT id, process_id, ai_type, use_case, example_output
                    FROM ai_mappings
                    WHERE process_id = %s
                    ORDER BY ai_type
                    """,
                    (process_id,),
                )
                return [dict(row) for row in cur.fetchall()]

    def get_data_flow(self, process_id: int) -> List[dict]:
        with self._connect() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT id, process_id, step_order, step_name, step_type,
                           input_data, output_data, description
                    FROM process_data_flow
                    WHERE process_id = %s
                    ORDER BY step_order
                    """,
                    (process_id,),
                )
                return [dict(row) for row in cur.fetchall()]

    def get_models(self, process_id: int) -> List[dict]:
        with self._connect() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT id, department_id, process_id, dataset_id, name,
                           algorithm, status, mlflow_run_id, metrics, created_at, updated_at
                    FROM ml_models
                    WHERE process_id = %s
                    ORDER BY created_at DESC
                    """,
                    (process_id,),
                )
                return [dict(row) for row in cur.fetchall()]
