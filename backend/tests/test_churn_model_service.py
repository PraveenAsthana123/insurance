"""test_churn_model_service.py — smoke + quality checks for the churn model.

Requires the customer pilot tables to be ingested (skips if empty).
"""
from __future__ import annotations

import pytest

from repositories.customer_repo import CustomerRepo
from services.churn_model_service import ChurnModelService


@pytest.fixture(scope="module")
def svc() -> ChurnModelService:
    repo = CustomerRepo()
    counts = repo.total_row_counts()
    if counts["dim_customer_pilot"] == 0:
        pytest.skip("customer pilot tables empty — run ingest_customer_telco.py")
    return ChurnModelService(repo=repo)


def test_fit_and_metrics(svc):
    m = svc.backtest_metrics()
    assert m["n_train"] > 4000
    assert m["n_test"] > 1000
    # Benchmark: IBM Telco GBM reaches AUC ~0.80–0.86.
    assert m["auc"] > 0.80, f"expected AUC > 0.80, got {m['auc']}"
    # Random baseline for precision@top10% ≈ 0.27 (churn rate). We expect > 2× that.
    assert m["precision_at_10"] > 0.60, f"precision@10 too low: {m['precision_at_10']}"


def test_rank_top_n(svc):
    top = svc.rank_top_n(n=20)
    assert len(top) == 20
    # Each has keys expected by the frontend.
    for r in top:
        assert "customer_id" in r and "probability" in r and "segment" in r
        assert 0.0 <= r["probability"] <= 1.0
    # Top of list should all be high probability (> 0.6).
    assert top[0]["probability"] > 0.6
    # Sorted descending.
    probs = [r["probability"] for r in top]
    assert probs == sorted(probs, reverse=True)


def test_predict_single_customer(svc):
    # 7590-VHVEG is the first customer in the Telco dataset (well-known).
    result = svc.predict("7590-VHVEG")
    assert result["customer_id"] == "7590-VHVEG"
    assert 0.0 <= result["probability"] <= 1.0
    assert result["segment"] in {"High Risk", "At Risk", "Stable", "Loyal High-Value", "New Adopter"}
    assert isinstance(result["top_drivers"], list)
    assert 1 <= len(result["top_drivers"]) <= 3
    assert result["model_version"]


def test_predict_unknown_customer(svc):
    with pytest.raises(ValueError):
        svc.predict("does-not-exist-xyz")


def test_predict_cached_same_result(svc):
    a = svc.predict("7590-VHVEG")
    b = svc.predict("7590-VHVEG")
    assert a["probability"] == b["probability"]
