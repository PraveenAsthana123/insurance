from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

import psycopg2.extras

from repositories.base import BaseRepository


class DatasetRepository(BaseRepository):
    """All SQL for the datasets and dataset_departments tables."""

    def list_all(self, offset: int = 0, limit: int = 50) -> List[dict]:
        with self._connect() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT id, name, kaggle_url, description, columns_info, file_path, data_type
                    FROM datasets
                    ORDER BY name
                    LIMIT %s OFFSET %s
                    """,
                    (limit, offset),
                )
                return [dict(row) for row in cur.fetchall()]

    def count(self) -> int:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM datasets")
                return cur.fetchone()[0]

    def get_by_id(self, dataset_id: int) -> Optional[dict]:
        with self._connect() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT id, name, kaggle_url, description, columns_info, file_path, data_type
                    FROM datasets
                    WHERE id = %s
                    """,
                    (dataset_id,),
                )
                row = cur.fetchone()
                return dict(row) if row else None

    def create(
        self,
        name: str,
        kaggle_url: Optional[str] = None,
        description: Optional[str] = None,
        columns_info: Optional[Dict[str, Any]] = None,
        file_path: Optional[str] = None,
        data_type: Optional[str] = None,
    ) -> dict:
        with self._connect() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    INSERT INTO datasets (name, kaggle_url, description, columns_info, file_path, data_type)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id, name, kaggle_url, description, columns_info, file_path, data_type
                    """,
                    (
                        name,
                        kaggle_url,
                        description,
                        json.dumps(columns_info) if columns_info else None,
                        file_path,
                        data_type,
                    ),
                )
                return dict(cur.fetchone())

    def update_columns_info(
        self, dataset_id: int, columns_info: Dict[str, Any], file_path: str
    ) -> None:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE datasets SET columns_info = %s, file_path = %s WHERE id = %s
                    """,
                    (json.dumps(columns_info), file_path, dataset_id),
                )

    def list_by_department(self, dept_id: int, offset: int = 0, limit: int = 50) -> List[dict]:
        with self._connect() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT d.id, d.name, d.kaggle_url, d.description, d.columns_info,
                           d.file_path, d.data_type
                    FROM datasets d
                    JOIN dataset_departments dd ON dd.dataset_id = d.id
                    WHERE dd.department_id = %s
                    ORDER BY d.name
                    LIMIT %s OFFSET %s
                    """,
                    (dept_id, limit, offset),
                )
                return [dict(row) for row in cur.fetchall()]

    def link_department(self, dataset_id: int, dept_id: int) -> None:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO dataset_departments (dataset_id, department_id)
                    VALUES (%s, %s)
                    ON CONFLICT DO NOTHING
                    """,
                    (dataset_id, dept_id),
                )
