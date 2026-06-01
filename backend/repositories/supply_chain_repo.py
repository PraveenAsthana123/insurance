"""supply_chain_repo.py — read-only repository for supply chain star schema."""
from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Iterator

import psycopg
from psycopg.rows import dict_row


def _pg_dsn() -> str:
    return (
        f"host={os.getenv('BEV_POSTGRES_HOST', 'localhost')} "
        f"port={os.getenv('BEV_POSTGRES_PORT', '5432')} "
        f"dbname={os.getenv('BEV_POSTGRES_DB', 'insur_analytics')} "
        f"user={os.getenv('BEV_POSTGRES_USER', 'insur_user')} "
        f"password={os.getenv('BEV_POSTGRES_PASSWORD', 'insur_secret_password')}"
    )


class SupplyChainRepo:
    def __init__(self, dsn: str | None = None):
        self._dsn = dsn or _pg_dsn()

    @contextmanager
    def _conn(self) -> Iterator[psycopg.Connection]:
        with psycopg.connect(self._dsn, row_factory=dict_row) as conn:
            yield conn

    def list_skus(self) -> list[dict]:
        with self._conn() as c, c.cursor() as cur:
            cur.execute("SELECT * FROM dim_sku ORDER BY sku_id")
            return list(cur.fetchall())

    def list_suppliers(self) -> list[dict]:
        with self._conn() as c, c.cursor() as cur:
            cur.execute("SELECT * FROM dim_supplier ORDER BY supplier_id")
            return list(cur.fetchall())

    def get_sku(self, sku_id: str) -> dict | None:
        with self._conn() as c, c.cursor() as cur:
            cur.execute("SELECT * FROM dim_sku WHERE sku_id = %s", (sku_id,))
            return cur.fetchone()

    def get_shipments_for_sku(self, sku_id: str) -> list[dict]:
        with self._conn() as c, c.cursor() as cur:
            cur.execute(
                "SELECT * FROM fact_shipment WHERE sku_id = %s ORDER BY shipment_id DESC",
                (sku_id,),
            )
            return list(cur.fetchall())

    def total_row_counts(self) -> dict:
        with self._conn() as c, c.cursor() as cur:
            out = {}
            for t in ("dim_sku", "dim_supplier", "dim_customer", "fact_shipment"):
                cur.execute(f"SELECT COUNT(*) AS n FROM {t}")
                out[t] = cur.fetchone()["n"]
            return out
