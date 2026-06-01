from __future__ import annotations

from typing import List, Optional

import psycopg2.extras

from repositories.base import BaseRepository


class DepartmentRepository(BaseRepository):
    """All SQL for the departments table."""

    def list_all(self, offset: int = 0, limit: int = 50) -> List[dict]:
        with self._connect() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    "SELECT id, name, icon, description, color, route FROM departments ORDER BY name LIMIT %s OFFSET %s",
                    (limit, offset),
                )
                return [dict(row) for row in cur.fetchall()]

    def count(self) -> int:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM departments")
                return cur.fetchone()[0]

    def get_by_id(self, dept_id: int) -> Optional[dict]:
        with self._connect() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    "SELECT id, name, icon, description, color, route FROM departments WHERE id = %s",
                    (dept_id,),
                )
                row = cur.fetchone()
                return dict(row) if row else None

    def get_by_route(self, route: str) -> Optional[dict]:
        with self._connect() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    "SELECT id, name, icon, description, color, route FROM departments WHERE route = %s",
                    (route,),
                )
                row = cur.fetchone()
                return dict(row) if row else None

    def get_ai_mappings(self, dept_id: int) -> List[dict]:
        """Return AI mappings for all processes in this department."""
        with self._connect() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT am.id, am.process_id, am.ai_type, am.use_case, am.example_output,
                           p.name AS process_name
                    FROM ai_mappings am
                    JOIN processes p ON p.id = am.process_id
                    WHERE p.department_id = %s
                    ORDER BY p.name, am.ai_type
                    """,
                    (dept_id,),
                )
                return [dict(row) for row in cur.fetchall()]

    def get_roi_metrics(self, dept_id: int) -> List[dict]:
        """Return ROI metrics for this department."""
        with self._connect() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT id, department_id, benefit_area, impact_range, description, measurement_method
                    FROM roi_metrics
                    WHERE department_id = %s
                    ORDER BY benefit_area
                    """,
                    (dept_id,),
                )
                return [dict(row) for row in cur.fetchall()]
