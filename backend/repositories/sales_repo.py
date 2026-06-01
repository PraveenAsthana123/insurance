"""sales_repo.py — read-only repository for the sales star schema.

All SQL for fact_sales, dim_store, dim_date lives here. Services should
depend on this class, never touch SQL directly.
"""
from __future__ import annotations

import os
from contextlib import contextmanager
from datetime import date as date_cls
from typing import Iterator

import psycopg
from psycopg.rows import dict_row


def _pg_dsn() -> str:
    host = os.getenv("BEV_POSTGRES_HOST", "localhost")
    port = os.getenv("BEV_POSTGRES_PORT", "5432")
    db = os.getenv("BEV_POSTGRES_DB", "insur_analytics")
    user = os.getenv("BEV_POSTGRES_USER", "insur_user")
    pwd = os.getenv("BEV_POSTGRES_PASSWORD", "insur_secret_password")
    return f"host={host} port={port} dbname={db} user={user} password={pwd}"


class SalesRepo:
    def __init__(self, dsn: str | None = None):
        self._dsn = dsn or _pg_dsn()

    @contextmanager
    def _conn(self) -> Iterator[psycopg.Connection]:
        with psycopg.connect(self._dsn, row_factory=dict_row) as conn:
            yield conn

    def list_stores(self) -> list[dict]:
        with self._conn() as c, c.cursor() as cur:
            cur.execute("""
                SELECT store_id, store_type, assortment, competition_distance
                FROM dim_store
                ORDER BY store_id
            """)
            return list(cur.fetchall())

    def get_store(self, store_id: int) -> dict | None:
        with self._conn() as c, c.cursor() as cur:
            cur.execute("SELECT * FROM dim_store WHERE store_id = %s", (store_id,))
            return cur.fetchone()

    def get_sales_history(
        self, store_id: int, start: date_cls | None = None, end: date_cls | None = None
    ) -> list[dict]:
        params: list = [store_id]
        sql = "SELECT store_id, date, sales, customers, open, promo FROM fact_sales WHERE store_id = %s"
        if start is not None:
            sql += " AND date >= %s"
            params.append(start)
        if end is not None:
            sql += " AND date <= %s"
            params.append(end)
        sql += " ORDER BY date ASC"
        with self._conn() as c, c.cursor() as cur:
            cur.execute(sql, params)
            return list(cur.fetchall())

    def total_row_counts(self) -> dict:
        """Smoke check — for health / data-quality tests."""
        with self._conn() as c, c.cursor() as cur:
            out = {}
            for t in ("dim_store", "dim_date", "fact_sales"):
                cur.execute(f"SELECT COUNT(*) AS n FROM {t}")
                out[t] = cur.fetchone()["n"]
            return out
