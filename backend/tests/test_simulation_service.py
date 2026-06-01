"""test_simulation_service.py — unit tests for the price × promo simulation."""
from __future__ import annotations

from datetime import date, timedelta
from unittest.mock import MagicMock

from schemas.sales import (
    ForecastComponents,
    ForecastPoint,
    ForecastResponse,
    SimulationRequest,
)
from services.simulation_service import (
    DEFAULT_ELASTICITY,
    DEFAULT_MARGIN_FACTOR,
    SimulationService,
)


def _mock_forecast_service(daily_revenue: float = 5000.0, days: int = 7) -> MagicMock:
    """Produce a forecast service returning a flat daily_revenue per day for `days` days."""
    start = date.today()
    forecast = [ForecastPoint(date=start + timedelta(i), value=daily_revenue) for i in range(days)]
    actual = [ForecastPoint(date=start - timedelta(i + 1), value=daily_revenue) for i in range(56)]
    resp = ForecastResponse(
        store_id=1,
        horizon_days=days,
        actual=actual,
        forecast=forecast,
        components=ForecastComponents(trend=[], weekly=[], yearly=[]),
        mape=0.1,
        fit_time_ms=1,
        predict_time_ms=1,
    )
    mock = MagicMock()
    mock.forecast.return_value = resp
    return mock


def test_simulate_baseline_revenue_matches_forecast_sum() -> None:
    svc = SimulationService(forecast_service=_mock_forecast_service(5000, 7))
    out = svc.simulate(SimulationRequest(store_id=1, discount_pct=15, duration_days=7))
    assert out.baseline_revenue == 5000 * 7


def test_simulate_elasticity_uplift_sign() -> None:
    """Higher discount → higher uplift_units."""
    svc_low = SimulationService(forecast_service=_mock_forecast_service(5000, 7))
    svc_high = SimulationService(forecast_service=_mock_forecast_service(5000, 7))
    low = svc_low.simulate(SimulationRequest(store_id=1, discount_pct=5, duration_days=7))
    high = svc_high.simulate(SimulationRequest(store_id=1, discount_pct=30, duration_days=7))
    assert high.uplift_units > low.uplift_units


def test_simulate_zero_discount_zero_uplift() -> None:
    svc = SimulationService(forecast_service=_mock_forecast_service(5000, 7))
    out = svc.simulate(SimulationRequest(store_id=1, discount_pct=0, duration_days=7))
    # At 0% discount, promo == baseline: uplift = 0, margin_hit = 0, net = 0.
    assert out.uplift_units == 0.0
    assert abs(out.net_impact) < 0.01
    assert abs(out.margin_hit) < 0.01


def test_simulate_waterfall_has_four_steps() -> None:
    svc = SimulationService(forecast_service=_mock_forecast_service(5000, 7))
    out = svc.simulate(SimulationRequest(store_id=1, discount_pct=15, duration_days=7))
    assert len(out.waterfall) == 4
    assert [w.label for w in out.waterfall] == [
        "Baseline margin",
        "Promo uplift",
        "Margin hit",
        "Net promo margin",
    ]


def test_simulate_constants_returned() -> None:
    svc = SimulationService(forecast_service=_mock_forecast_service(5000, 7))
    out = svc.simulate(SimulationRequest(store_id=1, discount_pct=10, duration_days=7))
    assert out.elasticity_used == DEFAULT_ELASTICITY
    assert out.margin_factor_used == DEFAULT_MARGIN_FACTOR
