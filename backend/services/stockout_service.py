"""stockout_service — heuristic stockout-risk assessment for a single SKU.

Dataset is tiny (100 SKUs) so we skip ML training in favor of a transparent
`cover_ratio = days_to_stockout / lead_time` heuristic. Risk band thresholds
are deliberately human-readable so the AI Explain layer can cite them.
"""
from __future__ import annotations

from core.structured_logger import emit_event
from repositories.supply_chain_repo import SupplyChainRepo
from schemas.supply_chain import StockoutRiskRequest, StockoutRiskResponse


class StockoutService:
    def __init__(self, repo: SupplyChainRepo | None = None):
        self._repo = repo or SupplyChainRepo()

    def assess(self, req: StockoutRiskRequest) -> StockoutRiskResponse:
        sku = self._repo.get_sku(req.sku_id)
        if not sku:
            raise ValueError(f"unknown sku: {req.sku_id}")

        stock = int(sku.get("stock_levels") or 0)
        lead = int(sku.get("lead_time_days") or 14)
        ships = self._repo.get_shipments_for_sku(req.sku_id)
        daily_demand = (
            sum(int(s.get("number_of_products_sold") or 0) for s in ships) / 30.0
        )
        if daily_demand <= 0:
            daily_demand = 1.0

        days_to_stockout = int(stock / daily_demand) if daily_demand else 999
        ratio = days_to_stockout / lead if lead > 0 else 1.0
        risk_score = max(0.0, min(1.0, 1.0 - ratio))

        if risk_score > 0.7:
            band = "high"
            reason = f"only {days_to_stockout}d of cover vs {lead}d lead time"
        elif risk_score > 0.35:
            band = "medium"
            reason = f"{days_to_stockout}d cover — tight vs {lead}d lead time"
        else:
            band = "low"
            reason = f"{days_to_stockout}d cover comfortably exceeds {lead}d lead time"

        emit_event(
            "supply_chain.stockout_risk",
            sku_id=req.sku_id,
            risk_score=risk_score,
            days_to_stockout=days_to_stockout,
            band=band,
        )

        return StockoutRiskResponse(
            sku_id=req.sku_id,
            risk_score=float(risk_score),
            days_to_stockout=days_to_stockout,
            risk_band=band,
            reason=reason,
        )
