"""test_customer_ingestion.py — smoke-check the customer pilot schema after ingest.

Validates dim_customer_pilot / fact_customer_interaction / fact_churn_label row
counts and basic invariants. Assumes `python scripts/ingest_customer_telco.py`
has run against the test/dev database.

If the tables are empty (fresh DB without ingest), tests skip rather than fail.
"""
from __future__ import annotations

import os

import psycopg2
import pytest


def _dsn() -> dict:
    return dict(
        host=os.getenv("BEV_POSTGRES_HOST", "localhost"),
        port=int(os.getenv("BEV_POSTGRES_PORT", "5432")),
        dbname=os.getenv("BEV_POSTGRES_DB", "insur_analytics"),
        user=os.getenv("BEV_POSTGRES_USER", "insur_user"),
        password=os.getenv("BEV_POSTGRES_PASSWORD", "insur_secret_password"),
    )


@pytest.fixture(scope="module")
def conn():
    c = psycopg2.connect(**_dsn())
    try:
        yield c
    finally:
        c.close()


def _count(conn, table: str) -> int:
    with conn.cursor() as cur:
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        return cur.fetchone()[0]


@pytest.fixture(scope="module")
def _ingested(conn) -> bool:
    """Only run assertions if ingestion has populated the tables."""
    n = _count(conn, "dim_customer_pilot")
    if n == 0:
        pytest.skip("customer pilot tables empty — run ingest_customer_telco.py first")
    return True


def test_customer_pilot_row_count(conn, _ingested):
    n = _count(conn, "dim_customer_pilot")
    assert n == 7043, f"expected 7043 Telco customers, got {n}"


def test_churn_label_matches_customers(conn, _ingested):
    customers = _count(conn, "dim_customer_pilot")
    labels = _count(conn, "fact_churn_label")
    assert customers == labels, f"label/customer mismatch: {customers} vs {labels}"


def test_interaction_count_reasonable(conn, _ingested):
    n = _count(conn, "fact_customer_interaction")
    # 7043 customers × 7 service types = 49301 interactions.
    assert n == 49301, f"expected 49301 interactions, got {n}"


def test_churn_rate_matches_benchmark(conn, _ingested):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT ROUND(AVG(churned::int)::numeric, 3) FROM fact_churn_label"
        )
        rate = float(cur.fetchone()[0])
    # Telco benchmark ≈ 0.265 (1869 / 7043)
    assert 0.20 < rate < 0.32, f"unexpected churn rate {rate}"


def test_contract_types_complete(conn, _ingested):
    with conn.cursor() as cur:
        cur.execute("SELECT DISTINCT contract_type FROM dim_customer_pilot")
        types = {row[0] for row in cur.fetchall()}
    assert types == {"Month-to-month", "One year", "Two year"}, f"unexpected: {types}"
