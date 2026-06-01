"""test_sales_repo.py — unit tests for SalesRepo that exercise SQL shape without needing Postgres.

Uses an in-memory SQLite via SQLAlchemy? No — we want psycopg semantics.
Instead: monkeypatch the repo's _conn to return a mock with recorded queries.
"""
from __future__ import annotations

from datetime import date
from unittest.mock import MagicMock

import pytest

from backend.repositories.sales_repo import SalesRepo


@pytest.fixture
def mock_repo(monkeypatch):
    repo = SalesRepo()
    # Prepare a mock connection + cursor that records executed SQL.
    mock_cur = MagicMock()
    mock_cur.fetchall.return_value = []
    mock_cur.fetchone.return_value = None

    mock_conn = MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cur
    mock_conn.cursor.return_value.__exit__.return_value = None

    # _conn is a @contextmanager
    from contextlib import contextmanager

    @contextmanager
    def _fake_conn(self):
        yield mock_conn

    monkeypatch.setattr(SalesRepo, "_conn", _fake_conn)
    return repo, mock_cur


def test_list_stores_executes_expected_sql(mock_repo):
    repo, cur = mock_repo
    repo.list_stores()
    sql = cur.execute.call_args[0][0]
    assert "FROM dim_store" in sql
    assert "ORDER BY store_id" in sql


def test_get_store_parameterized(mock_repo):
    repo, cur = mock_repo
    repo.get_store(42)
    args = cur.execute.call_args
    assert "WHERE store_id = %s" in args[0][0]
    assert args[0][1] == (42,)


def test_get_sales_history_no_dates(mock_repo):
    repo, cur = mock_repo
    repo.get_sales_history(store_id=1)
    sql = cur.execute.call_args[0][0]
    params = cur.execute.call_args[0][1]
    assert "WHERE store_id = %s" in sql
    assert "AND date >=" not in sql
    assert "ORDER BY date ASC" in sql
    assert params == [1]


def test_get_sales_history_with_dates(mock_repo):
    repo, cur = mock_repo
    start, end = date(2015, 1, 1), date(2015, 6, 30)
    repo.get_sales_history(store_id=1, start=start, end=end)
    sql = cur.execute.call_args[0][0]
    params = cur.execute.call_args[0][1]
    assert "AND date >= %s" in sql
    assert "AND date <= %s" in sql
    assert params == [1, start, end]
