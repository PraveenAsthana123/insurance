"""supply_chain_simulation_service — what-if delay impact per supplier.

Inputs: supplier_id, delay_days (0-30), affected_sku_count (1-100).
Outputs: service_level delta (%), stockout probability delta, revenue at risk.

Model is a linear penalty (deliberately simple and explainable):
    service_level_delta = -min(100, delay_days * 2 * (affected_skus / 20))
    stockout_prob_change = min(1, delay_days * 0.02 * (affected_skus / 20))
    revenue_at_risk = supplier_total_revenue * (|service_level_delta| / 100)

Baseline supplier revenue comes from SUM(fact_shipment.revenue_generated)
filtered to the supplier. If the supplier has no shipments, revenue_at_risk
is 0 (and the other metrics still compute).
"""
from __future__ import annotations

from core.structured_logger import emit_event
from repositories.supply_chain_repo import SupplyChainRepo
from schemas.supply_chain import SimulationRequest, SimulationResponse


class SupplyChainSimulationService:
    def __init__(self, repo: SupplyChainRepo | None = None):
        self._repo = repo or SupplyChainRepo()

    def run(self, req: SimulationRequest) -> SimulationResponse:
        supplier_rev = self._supplier_revenue(req.supplier_id)

        # Linear penalty: each day of delay cuts service level 2% per 20-SKU block.
        service_level_delta = -min(
            100.0, req.delay_days * 2.0 * (req.affected_sku_count / 20.0)
        )
        revenue_at_risk = supplier_rev * (abs(service_level_delta) / 100.0)
        stockout_prob_change = min(
            1.0, req.delay_days * 0.02 * (req.affected_sku_count / 20.0)
        )

        emit_event(
            "supply_chain.simulate",
            supplier_id=req.supplier_id,
            delay_days=req.delay_days,
            affected_skus=req.affected_sku_count,
            revenue_at_risk=revenue_at_risk,
            service_level_delta=service_level_delta,
        )

        return SimulationResponse(
            supplier_id=req.supplier_id,
            delay_days=req.delay_days,
            affected_sku_count=req.affected_sku_count,
            stockout_probability_change=float(stockout_prob_change),
            service_level_delta_pct=float(service_level_delta),
            revenue_at_risk=float(revenue_at_risk),
        )

    def _supplier_revenue(self, supplier_id: str) -> float:
        with self._repo._conn() as c, c.cursor() as cur:
            cur.execute(
                "SELECT SUM(revenue_generated) AS r FROM fact_shipment WHERE supplier_id = %s",
                (supplier_id,),
            )
            row = cur.fetchone()
        return float(row["r"] or 0.0) if row else 0.0
