"""test_supply_chain_repo.py — unit tests for SupplyChainRepo SQL shape.

Uses monkeypatched _conn to exercise SQL without a live Postgres.
Pattern mirrors test_sales_repo.py.
"""
from __future__ import annotations

from contextlib import contextmanager
from unittest.mock import MagicMock

import pytest

from repositories.supply_chain_repo import SupplyChainRepo


@pytest.fixture
def mock_repo(monkeypatch):
    repo = SupplyChainRepo()
    mock_cur = MagicMock()
    mock_cur.fetchall.return_value = []
    mock_cur.fetchone.return_value = None
    mock_conn = MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cur
    mock_conn.cursor.return_value.__exit__.return_value = None

    @contextmanager
    def _fake_conn(self):
        yield mock_conn

    monkeypatch.setattr(SupplyChainRepo, "_conn", _fake_conn)
    return repo, mock_cur


def test_list_skus_sql(mock_repo):
    repo, cur = mock_repo
    repo.list_skus()
    assert "FROM dim_sku" in cur.execute.call_args[0][0]


def test_list_suppliers_sql(mock_repo):
    repo, cur = mock_repo
    repo.list_suppliers()
    assert "FROM dim_supplier" in cur.execute.call_args[0][0]


def test_get_sku_parameterized(mock_repo):
    repo, cur = mock_repo
    repo.get_sku("SKU-1")
    args = cur.execute.call_args
    assert "WHERE sku_id = %s" in args[0][0]
    assert args[0][1] == ("SKU-1",)


def test_get_shipments_for_sku(mock_repo):
    repo, cur = mock_repo
    repo.get_shipments_for_sku("SKU-1")
    assert "WHERE sku_id = %s" in cur.execute.call_args[0][0]
