"""test_rossmann_ingestion.py — data-quality assertions against the ingested tables.

These run against whatever Postgres the BEV backend points at. If the tables
are empty (ingestion not run), tests are skipped with a clear message.
"""
from __future__ import annotations

import pytest

from backend.repositories.sales_repo import SalesRepo


@pytest.fixture(scope="module")
def repo() -> SalesRepo:
    return SalesRepo()


@pytest.fixture(scope="module")
def counts(repo: SalesRepo) -> dict:
    return repo.total_row_counts()


def _require_ingested(counts: dict) -> None:
    if counts["fact_sales"] == 0:
        pytest.skip("fact_sales is empty; run scripts/ingest_rossmann.py first")


def test_dim_store_row_count_matches_expected(counts: dict) -> None:
    _require_ingested(counts)
    assert counts["dim_store"] == 1115, (
        f"expected 1115 Rossmann stores, got {counts['dim_store']}"
    )


def test_fact_sales_row_count_is_order_of_magnitude_correct(counts: dict) -> None:
    _require_ingested(counts)
    # Rossmann train.csv has 1,017,209 rows; allow ±1% tolerance.
    assert 1_000_000 <= counts["fact_sales"] <= 1_030_000, (
        f"expected ~1.017M fact_sales rows, got {counts['fact_sales']}"
    )


def test_dim_date_row_count_is_reasonable(counts: dict) -> None:
    _require_ingested(counts)
    # Rossmann covers ~942 unique days across 2.5 years.
    assert 900 <= counts["dim_date"] <= 980, (
        f"expected ~942 dim_date rows, got {counts['dim_date']}"
    )


def test_no_null_sales(repo: SalesRepo, counts: dict) -> None:
    _require_ingested(counts)
    # Use raw connection for a fast check.
    with repo._conn() as c, c.cursor() as cur:
        cur.execute("SELECT COUNT(*) AS n FROM fact_sales WHERE sales IS NULL")
        n = cur.fetchone()["n"]
    assert n == 0, f"{n} rows with NULL sales"


def test_store_123_exists(repo: SalesRepo, counts: dict) -> None:
    _require_ingested(counts)
    store = repo.get_store(123)
    assert store is not None, "store 123 (a known Rossmann store) missing"
    assert store["store_type"] in {"a", "b", "c", "d"}


def test_get_sales_history_returns_nonempty(repo: SalesRepo, counts: dict) -> None:
    _require_ingested(counts)
    rows = repo.get_sales_history(store_id=1)
    assert len(rows) > 500, f"expected many days for store 1, got {len(rows)}"
    assert rows[0]["date"] < rows[-1]["date"], "rows must be ordered by date asc"
