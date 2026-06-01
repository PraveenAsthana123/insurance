"""test_supply_chain_router — TestClient integration tests against real DB.

Mirrors backend/tests/test_sales_router.py pattern. Hits real Postgres via
SupplyChainRepo. If any of the 4 supply-chain tables are empty, tests skip.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.repositories.supply_chain_repo import SupplyChainRepo


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def _require_ingested() -> None:
    repo = SupplyChainRepo()
    counts = repo.total_row_counts()
    for table in ("dim_sku", "dim_supplier", "fact_shipment"):
        if counts[table] == 0:
            pytest.skip(f"{table} empty; run scripts/ingest_supply_chain.py first")


def test_list_skus(client: TestClient) -> None:
    r = client.get("/api/v1/supply-chain/skus")
    assert r.status_code == 200, r.text
    body = r.json()
    assert isinstance(body, list)
    assert len(body) > 0
    first = body[0]
    assert "sku_id" in first
    assert first["sku_id"].startswith("SKU")


def test_list_suppliers_scored(client: TestClient) -> None:
    r = client.get("/api/v1/supply-chain/suppliers")
    assert r.status_code == 200, r.text
    body = r.json()
    assert isinstance(body, list)
    assert len(body) > 0
    # Ranked descending by score
    scores = [s["score"] for s in body]
    assert scores == sorted(scores, reverse=True)
    assert set(body[0]["sub_scores"].keys()) == {"defect", "lead_time", "inspection"}


def test_stockout_risk_happy_path(client: TestClient) -> None:
    r = client.post(
        "/api/v1/supply-chain/stockout-risk",
        json={"sku_id": "SKU0"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["sku_id"] == "SKU0"
    assert 0.0 <= body["risk_score"] <= 1.0
    assert body["risk_band"] in {"high", "medium", "low"}


def test_stockout_risk_unknown_sku_returns_404(client: TestClient) -> None:
    r = client.post(
        "/api/v1/supply-chain/stockout-risk",
        json={"sku_id": "SKU_DOES_NOT_EXIST"},
    )
    assert r.status_code == 404


def test_stockout_risk_rejects_unknown_field(client: TestClient) -> None:
    r = client.post(
        "/api/v1/supply-chain/stockout-risk",
        json={"sku_id": "SKU0", "bogus": 1},
    )
    assert r.status_code == 422  # extra='forbid'


def test_eta_happy_path(client: TestClient) -> None:
    r = client.post(
        "/api/v1/supply-chain/eta",
        json={"sku_id": "SKU0", "transportation_mode": "Road"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["sku_id"] == "SKU0"
    assert body["transportation_mode"] == "Road"
    assert body["eta_days"] > 0
    assert 0.0 <= body["confidence"] <= 1.0


def test_simulate_happy_path(client: TestClient) -> None:
    r = client.post(
        "/api/v1/supply-chain/simulate",
        json={"supplier_id": "Supplier 1", "delay_days": 7, "affected_sku_count": 10},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["supplier_id"] == "Supplier 1"
    assert body["delay_days"] == 7
    assert body["affected_sku_count"] == 10
    assert body["service_level_delta_pct"] <= 0
    assert body["revenue_at_risk"] >= 0
    assert 0.0 <= body["stockout_probability_change"] <= 1.0


def test_simulate_rejects_out_of_range(client: TestClient) -> None:
    # delay_days le=30
    r = client.post(
        "/api/v1/supply-chain/simulate",
        json={"supplier_id": "Supplier 1", "delay_days": 99, "affected_sku_count": 10},
    )
    assert r.status_code == 422
