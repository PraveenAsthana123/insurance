"""test_sales_router.py — integration tests against FastAPI TestClient.

Hits real Postgres via SalesRepo. Requires Phase α ingestion to have run
(1.017M fact_sales rows). If fact_sales is empty, tests skip.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.repositories.sales_repo import SalesRepo


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def _require_ingested() -> None:
    repo = SalesRepo()
    counts = repo.total_row_counts()
    if counts["fact_sales"] == 0:
        pytest.skip("fact_sales empty; run scripts/ingest_rossmann.py first")


def test_list_stores_returns_1115(client: TestClient) -> None:
    r = client.get("/api/v1/sales/stores")
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1115
    assert body[0]["store_id"] == 1
    assert body[0]["store_type"] in {"a", "b", "c", "d"}


def test_forecast_happy_path(client: TestClient) -> None:
    r = client.post("/api/v1/sales/forecast", json={"store_id": 1, "horizon_days": 14})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["store_id"] == 1
    assert body["horizon_days"] == 14
    assert len(body["forecast"]) == 14
    assert 0.0 <= body["mape"] <= 1.0


def test_forecast_bad_store_returns_404(client: TestClient) -> None:
    r = client.post("/api/v1/sales/forecast", json={"store_id": 99999, "horizon_days": 14})
    # 404 from service's ValueError; Pydantic validation is ge=1 so 99999 passes schema.
    assert r.status_code == 404


def test_forecast_rejects_unknown_field(client: TestClient) -> None:
    r = client.post(
        "/api/v1/sales/forecast",
        json={"store_id": 1, "horizon_days": 14, "unexpected": True},
    )
    assert r.status_code == 422  # extra='forbid' in schema


def test_forecast_bounds(client: TestClient) -> None:
    r = client.post("/api/v1/sales/forecast", json={"store_id": 1, "horizon_days": 1})
    assert r.status_code == 422  # horizon_days ge=7

    r = client.post("/api/v1/sales/forecast", json={"store_id": 1, "horizon_days": 1000})
    assert r.status_code == 422  # horizon_days le=180


def test_simulate_happy_path(client: TestClient) -> None:
    r = client.post(
        "/api/v1/sales/simulate",
        json={"store_id": 1, "discount_pct": 15, "duration_days": 7},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["store_id"] == 1
    assert body["discount_pct"] == 15.0
    assert body["duration_days"] == 7
    assert body["baseline_revenue"] > 0
    assert len(body["waterfall"]) == 4
    assert body["elasticity_used"] == -2.0
    assert body["margin_factor_used"] == 0.3


def test_simulate_bad_discount_returns_422(client: TestClient) -> None:
    r = client.post(
        "/api/v1/sales/simulate",
        json={"store_id": 1, "discount_pct": 75, "duration_days": 7},
    )
    assert r.status_code == 422  # ge=0, le=50


def test_simulate_unknown_field_returns_422(client: TestClient) -> None:
    r = client.post(
        "/api/v1/sales/simulate",
        json={"store_id": 1, "discount_pct": 15, "duration_days": 7, "extra": 1},
    )
    assert r.status_code == 422  # extra='forbid'
