"""test_supply_chain_ingestion.py — data-quality assertions against ingested tables.

Run against the live Postgres the backend points at. Skip gracefully when tables
are empty (ingestion not yet run).
"""
from __future__ import annotations

import pytest

from repositories.supply_chain_repo import SupplyChainRepo


@pytest.fixture(scope="module")
def repo() -> SupplyChainRepo:
    return SupplyChainRepo()


@pytest.fixture(scope="module")
def counts(repo: SupplyChainRepo) -> dict:
    return repo.total_row_counts()


def _require_ingested(counts: dict) -> None:
    if counts["fact_shipment"] == 0:
        pytest.skip("fact_shipment empty; run scripts/ingest_supply_chain.py first")


def test_fact_shipment_has_rows(counts):
    _require_ingested(counts)
    assert counts["fact_shipment"] >= 50, f"expected at least 50 shipments, got {counts['fact_shipment']}"


def test_dim_sku_has_at_least_one_entry_per_product_type(repo, counts):
    _require_ingested(counts)
    skus = repo.list_skus()
    product_types = {s["product_type"] for s in skus if s["product_type"]}
    assert len(product_types) >= 3, f"expected >=3 product types, got {product_types}"


def test_dim_supplier_has_unique_locations(repo, counts):
    _require_ingested(counts)
    suppliers = repo.list_suppliers()
    locations = {s["location"] for s in suppliers if s["location"]}
    assert len(locations) >= 2


def test_get_shipments_for_known_sku_returns_records(repo, counts):
    _require_ingested(counts)
    skus = repo.list_skus()
    assert skus, "dim_sku empty"
    ships = repo.get_shipments_for_sku(skus[0]["sku_id"])
    assert len(ships) >= 1, f"no shipments for SKU {skus[0]['sku_id']}"
