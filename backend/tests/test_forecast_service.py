"""test_forecast_service.py — unit tests for ForecastService.

Uses synthetic sales data injected via a mock SalesRepo; no Postgres needed.
"""
from __future__ import annotations

from datetime import date as date_cls, timedelta
from unittest.mock import MagicMock

import pytest

from backend.services.forecast_service import ForecastService, _mape


def _make_synthetic_history(days: int = 540) -> list[dict]:
    """Generate deterministic sales series with weekly + trend signal."""
    start = date_cls(2024, 1, 1)
    out = []
    for i in range(days):
        d = start + timedelta(days=i)
        base = 5000 + i * 2                            # gentle trend
        weekly = 300 if d.weekday() in (4, 5) else 0   # Fri/Sat bump
        promo = i % 30 < 7                             # weekly-ish promo
        out.append({
            "store_id": 1,
            "date": d,
            "sales": int(base + weekly + (500 if promo else 0)),
            "customers": 100,
            "open": True,
            "promo": promo,
        })
    return out


@pytest.fixture
def mock_repo():
    repo = MagicMock()
    repo.get_sales_history.return_value = _make_synthetic_history(540)
    return repo


def test_mape_zero_when_perfect():
    assert _mape([100, 200, 300], [100, 200, 300]) == 0.0


def test_mape_skips_zero_actual():
    # (|100-110|/100 + |200-210|/200) / 2 = (0.1 + 0.05)/2 = 0.075
    result = _mape([0, 100, 200], [0, 110, 210])
    assert abs(result - 0.075) < 0.001


def test_forecast_returns_schema(mock_repo):
    svc = ForecastService(repo=mock_repo)
    resp = svc.forecast(store_id=1, horizon_days=14)
    assert resp.store_id == 1
    assert resp.horizon_days == 14
    assert len(resp.forecast) == 14
    assert len(resp.actual) > 0
    assert 0.0 <= resp.mape <= 1.0
    assert resp.fit_time_ms > 0
    assert resp.predict_time_ms > 0


def test_forecast_mape_reasonable_on_synthetic(mock_repo):
    svc = ForecastService(repo=mock_repo)
    resp = svc.forecast(store_id=1, horizon_days=14)
    # Synthetic data is easy — MAPE should be well below 30%.
    assert resp.mape < 0.30, f"mape {resp.mape:.3f} too high on synthetic data"


def test_cache_hit_skips_refit(mock_repo):
    svc = ForecastService(repo=mock_repo)
    r1 = svc.forecast(store_id=1, horizon_days=7)
    fit_ms_first = r1.fit_time_ms
    r2 = svc.forecast(store_id=1, horizon_days=7)
    # Second call reads cached _FittedModel so fit_time_ms is identical to first.
    assert r2.fit_time_ms == fit_ms_first


def test_missing_history_raises(mock_repo):
    mock_repo.get_sales_history.return_value = []
    svc = ForecastService(repo=mock_repo)
    with pytest.raises(ValueError, match="no sales history"):
        svc.forecast(store_id=9999, horizon_days=7)


def test_insufficient_history_raises(mock_repo):
    mock_repo.get_sales_history.return_value = _make_synthetic_history(days=20)
    svc = ForecastService(repo=mock_repo)
    with pytest.raises(ValueError, match="insufficient history"):
        svc.forecast(store_id=1, horizon_days=7)
