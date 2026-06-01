"""test_supply_chain_services — unit tests for 4 Supply Chain services.

Services that run direct SQL (ETAService._stats, SupplierScoreService._avg_defect_rate,
SupplyChainSimulationService._supplier_revenue) are tested by subclassing and
overriding those helpers, so we never have to mock the psycopg cursor chain.
Repo-level reads (get_sku, list_suppliers, get_shipments_for_sku) are mocked
with MagicMock.
"""
from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from schemas.supply_chain import (
    ETARequest,
    SimulationRequest,
    StockoutRiskRequest,
)
from services.eta_service import ETAService
from services.stockout_service import StockoutService
from services.supplier_score_service import SupplierScoreService
from services.supply_chain_simulation_service import SupplyChainSimulationService


# ─────────────────────── StockoutService ────────────────────────

def _mock_repo(sku: dict | None, shipments: list[dict] | None = None) -> MagicMock:
    repo = MagicMock()
    repo.get_sku.return_value = sku
    repo.get_shipments_for_sku.return_value = shipments or []
    return repo


def test_stockout_high_risk_when_cover_short() -> None:
    # 10 units of stock, 14-day lead time, 30 units sold in 30 days → 10d cover vs 14d lead
    repo = _mock_repo(
        {"stock_levels": 10, "lead_time_days": 14},
        [{"number_of_products_sold": 30}],
    )
    out = StockoutService(repo=repo).assess(StockoutRiskRequest(sku_id="SKU_X"))
    assert out.sku_id == "SKU_X"
    assert out.days_to_stockout == 10
    assert 0.0 <= out.risk_score <= 1.0
    assert out.risk_band in {"high", "medium", "low"}


def test_stockout_unknown_sku_raises() -> None:
    repo = _mock_repo(None)
    with pytest.raises(ValueError, match="unknown sku"):
        StockoutService(repo=repo).assess(StockoutRiskRequest(sku_id="NOPE"))


# ─────────────────────────── ETAService ─────────────────────────

def test_eta_predict_uses_cached_stats() -> None:
    # Pre-populate the mode cache so _stats() never touches the DB.
    repo = _mock_repo({"sku_id": "SKU0"})
    svc = ETAService(repo=repo)
    svc._cache["Road"] = (4.0, 1.0)  # mean=4, sd=1
    out = svc.predict(ETARequest(sku_id="SKU0", transportation_mode="Road"))
    assert out.sku_id == "SKU0"
    assert out.transportation_mode == "Road"
    assert out.eta_days == 4.0
    # confidence = 1 - (1/4) = 0.75
    assert abs(out.confidence - 0.75) < 1e-6


def test_eta_predict_unknown_sku_raises() -> None:
    repo = _mock_repo(None)
    svc = ETAService(repo=repo)
    svc._cache["Road"] = (5.0, 1.0)
    with pytest.raises(ValueError, match="unknown sku"):
        svc.predict(ETARequest(sku_id="NOPE", transportation_mode="Road"))


# ─────────────────────── SupplierScoreService ───────────────────

class _NoDBSupplierScoreService(SupplierScoreService):
    """Override DB-hitting _avg_defect_rate so tests never touch Postgres."""

    def __init__(self, repo, defect_by_supplier: dict[str, float]):
        super().__init__(repo=repo)
        self._defect_map = defect_by_supplier

    def _avg_defect_rate(self, supplier_id: str) -> float:
        return float(self._defect_map.get(supplier_id, 0.0))


def test_supplier_score_ranks_descending() -> None:
    repo = MagicMock()
    repo.list_suppliers.return_value = [
        {
            "supplier_id": "S1",
            "supplier_name": "S1",
            "location": "Delhi",
            "manufacturing_lead_time_days": 10,
            "inspection_results": "Pass",
        },
        {
            "supplier_id": "S2",
            "supplier_name": "S2",
            "location": "Mumbai",
            "manufacturing_lead_time_days": 40,
            "inspection_results": "Fail",
        },
    ]
    svc = _NoDBSupplierScoreService(repo, {"S1": 0.5, "S2": 4.0})
    out = svc.scored()
    assert [s.supplier_id for s in out] == ["S1", "S2"]
    assert out[0].score > out[1].score
    assert set(out[0].sub_scores.keys()) == {"defect", "lead_time", "inspection"}


def test_supplier_score_inspection_mapping() -> None:
    repo = MagicMock()
    repo.list_suppliers.return_value = [
        {
            "supplier_id": "P",
            "supplier_name": "Pass co",
            "location": "X",
            "manufacturing_lead_time_days": 30,
            "inspection_results": "Pass",
        },
        {
            "supplier_id": "F",
            "supplier_name": "Fail co",
            "location": "X",
            "manufacturing_lead_time_days": 30,
            "inspection_results": "Fail",
        },
    ]
    svc = _NoDBSupplierScoreService(repo, {"P": 0.0, "F": 0.0})
    ranked = svc.scored()
    pass_entry = next(s for s in ranked if s.supplier_id == "P")
    fail_entry = next(s for s in ranked if s.supplier_id == "F")
    assert pass_entry.sub_scores["inspection"] == 100
    assert fail_entry.sub_scores["inspection"] == 0
    assert pass_entry.score > fail_entry.score


# ───────────────── SupplyChainSimulationService ─────────────────

class _FixedRevenueSim(SupplyChainSimulationService):
    """Override _supplier_revenue so sim tests don't hit Postgres."""

    def __init__(self, revenue: float):
        super().__init__(repo=MagicMock())
        self._revenue = revenue

    def _supplier_revenue(self, supplier_id: str) -> float:
        return float(self._revenue)


def test_simulation_zero_delay_has_no_impact() -> None:
    svc = _FixedRevenueSim(revenue=100_000.0)
    out = svc.run(SimulationRequest(supplier_id="S1", delay_days=0, affected_sku_count=20))
    assert out.service_level_delta_pct == 0.0
    assert out.revenue_at_risk == 0.0
    assert out.stockout_probability_change == 0.0


def test_simulation_linear_scaling_with_delay() -> None:
    svc = _FixedRevenueSim(revenue=100_000.0)
    low = svc.run(SimulationRequest(supplier_id="S1", delay_days=3, affected_sku_count=20))
    high = svc.run(SimulationRequest(supplier_id="S1", delay_days=10, affected_sku_count=20))
    assert abs(low.service_level_delta_pct) < abs(high.service_level_delta_pct)
    assert low.revenue_at_risk < high.revenue_at_risk
    assert low.stockout_probability_change < high.stockout_probability_change
    # Service level delta is always non-positive
    assert high.service_level_delta_pct <= 0
