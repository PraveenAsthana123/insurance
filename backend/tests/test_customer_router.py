"""test_customer_router.py — end-to-end HTTP tests for /api/v1/customer/*.

Requires the customer pilot tables to be ingested (skips otherwise).
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from main import app
from repositories.customer_repo import CustomerRepo


@pytest.fixture(scope="module")
def client():
    repo = CustomerRepo()
    counts = repo.total_row_counts()
    if counts["dim_customer_pilot"] == 0:
        pytest.skip("customer pilot tables empty — run ingest_customer_telco.py")
    return TestClient(app)


def test_churn_metrics(client):
    r = client.get("/api/v1/customer/churn-metrics")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["auc"] > 0.80
    assert body["precision_at_10"] > 0.60
    assert body["n_train"] > 4000
    assert body["model_version"]


def test_churn_top(client):
    r = client.get("/api/v1/customer/churn-top?n=20")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["n"] == 20
    assert len(body["customers"]) == 20
    # Sorted descending by probability.
    probs = [c["probability"] for c in body["customers"]]
    assert probs == sorted(probs, reverse=True)
    assert body["auc"] > 0.80


def test_churn_top_limit_bounds(client):
    # Outside 1..200 → 422 validation error.
    r = client.get("/api/v1/customer/churn-top?n=0")
    assert r.status_code == 422
    r = client.get("/api/v1/customer/churn-top?n=500")
    assert r.status_code == 422


def test_churn_predict_known(client):
    r = client.post(
        "/api/v1/customer/churn-predict",
        json={"customer_id": "7590-VHVEG"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["customer_id"] == "7590-VHVEG"
    assert 0.0 <= body["probability"] <= 1.0
    assert len(body["top_drivers"]) >= 1
    assert body["model_version"]


def test_churn_predict_unknown(client):
    r = client.post(
        "/api/v1/customer/churn-predict",
        json={"customer_id": "no-such-cust"},
    )
    assert r.status_code == 404
    body = r.json()
    assert "detail" in body


def test_churn_predict_validation(client):
    # Missing field → 422.
    r = client.post("/api/v1/customer/churn-predict", json={})
    assert r.status_code == 422


def test_rbac_reporting_monitoring_allowed(client):
    r = client.get(
        "/api/v1/customer/churn-top?n=5",
        headers={"X-Demo-Role": "reporting-monitoring"},
    )
    assert r.status_code == 200


def test_rbac_invalid_role_400(client):
    r = client.get(
        "/api/v1/customer/churn-top",
        headers={"X-Demo-Role": "nonsense"},
    )
    assert r.status_code == 400
