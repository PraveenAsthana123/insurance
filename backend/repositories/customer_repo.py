"""customer_repo.py — read-only repository for the customer-pilot star schema.

All SQL for dim_customer_pilot, fact_customer_interaction, fact_churn_label
lives here. Services depend on this class — never touch SQL directly.

Only loaded for the Customer Analytics depth pilot — other departments
do not use this repo.
"""
from __future__ import annotations

import os
from contextlib import contextmanager
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


class CustomerRepo:
    """Read-only access to customer pilot tables."""

    def __init__(self, dsn: str | None = None) -> None:
        self._dsn = dsn or _pg_dsn()

    @contextmanager
    def _conn(self) -> Iterator[psycopg.Connection]:
        with psycopg.connect(self._dsn, row_factory=dict_row) as conn:
            yield conn

    # ----- feature extraction -----

    def fetch_training_frame(self) -> list[dict]:
        """All customers joined with churn labels, flattened for ML training."""
        sql = """
            SELECT
                c.customer_id,
                CASE WHEN c.gender = 'Female' THEN 1 ELSE 0 END       AS is_female,
                c.senior_citizen::int                                  AS senior_citizen,
                c.partner::int                                         AS partner,
                c.dependents::int                                      AS dependents,
                c.tenure_months                                        AS tenure_months,
                c.monthly_charges::float                               AS monthly_charges,
                COALESCE(c.total_charges, 0)::float                    AS total_charges,
                c.paperless_billing::int                               AS paperless_billing,
                c.phone_service::int                                   AS phone_service,
                c.service_count                                        AS service_count,
                CASE WHEN c.contract_type = 'Month-to-month' THEN 1 ELSE 0 END AS contract_monthly,
                CASE WHEN c.contract_type = 'One year'       THEN 1 ELSE 0 END AS contract_one_year,
                CASE WHEN c.contract_type = 'Two year'       THEN 1 ELSE 0 END AS contract_two_year,
                CASE WHEN c.internet_service = 'Fiber optic' THEN 1 ELSE 0 END AS internet_fiber,
                CASE WHEN c.internet_service = 'DSL'         THEN 1 ELSE 0 END AS internet_dsl,
                CASE WHEN c.internet_service = 'No'          THEN 1 ELSE 0 END AS internet_none,
                CASE WHEN c.payment_method = 'Electronic check' THEN 1 ELSE 0 END AS pay_echeck,
                l.churned::int                                         AS churned
            FROM dim_customer_pilot c
            JOIN fact_churn_label    l USING (customer_id)
            ORDER BY c.customer_id
        """
        with self._conn() as c, c.cursor() as cur:
            cur.execute(sql)
            return list(cur.fetchall())

    def get_customer(self, customer_id: str) -> dict | None:
        with self._conn() as c, c.cursor() as cur:
            cur.execute(
                """
                SELECT c.*, l.churned, l.predicted_probability
                FROM dim_customer_pilot c
                LEFT JOIN fact_churn_label l USING (customer_id)
                WHERE c.customer_id = %s
                """,
                (customer_id,),
            )
            return cur.fetchone()

    def list_customers(self, limit: int = 50, offset: int = 0) -> list[dict]:
        with self._conn() as c, c.cursor() as cur:
            cur.execute(
                """
                SELECT customer_id, contract_type, tenure_months, monthly_charges,
                       service_count, internet_service
                FROM dim_customer_pilot
                ORDER BY customer_id
                LIMIT %s OFFSET %s
                """,
                (limit, offset),
            )
            return list(cur.fetchall())

    def get_services(self, customer_id: str) -> list[dict]:
        with self._conn() as c, c.cursor() as cur:
            cur.execute(
                """
                SELECT service_name, status
                FROM fact_customer_interaction
                WHERE customer_id = %s
                ORDER BY service_name
                """,
                (customer_id,),
            )
            return list(cur.fetchall())

    def total_row_counts(self) -> dict:
        # Per global §1 rule 12 — no f-string SQL. Use psycopg.sql.Identifier.
        from psycopg import sql
        with self._conn() as c, c.cursor() as cur:
            out = {}
            for t in ("dim_customer_pilot", "fact_customer_interaction", "fact_churn_label"):
                cur.execute(
                    sql.SQL("SELECT COUNT(*) AS n FROM {}").format(sql.Identifier(t))
                )
                out[t] = cur.fetchone()["n"]
            return out
