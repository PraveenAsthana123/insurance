"""eta_service — rule-based ETA prediction per transportation mode.

With only 100 shipments across 4 modes (Road/Rail/Air/Sea), any ML model would
overfit. We compute observed mean + stdev of `dim_sku.shipping_time` for the
requested mode and return `(mean, confidence = 1 - sd/mean)`. Stats cached per
mode on the service instance to avoid repeat round-trips in hot request loops.
"""
from __future__ import annotations

from statistics import mean, pstdev

from core.structured_logger import emit_event
from repositories.supply_chain_repo import SupplyChainRepo
from schemas.supply_chain import ETARequest, ETAResponse


class ETAService:
    def __init__(self, repo: SupplyChainRepo | None = None):
        self._repo = repo or SupplyChainRepo()
        self._cache: dict[str, tuple[float, float]] = {}

    def _stats(self, mode: str) -> tuple[float, float]:
        if mode in self._cache:
            return self._cache[mode]
        with self._repo._conn() as c, c.cursor() as cur:
            cur.execute(
                "SELECT s.shipping_time FROM fact_shipment f "
                "JOIN dim_sku s ON f.sku_id = s.sku_id "
                "WHERE f.transportation_mode = %s",
                (mode,),
            )
            times = [r["shipping_time"] for r in cur.fetchall() if r["shipping_time"] is not None]

        if not times:
            self._cache[mode] = (5.0, 2.0)
            return self._cache[mode]

        m = float(mean(times))
        sd = float(pstdev(times)) if len(times) > 1 else 1.0
        self._cache[mode] = (m, sd)
        return m, sd

    def predict(self, req: ETARequest) -> ETAResponse:
        sku = self._repo.get_sku(req.sku_id)
        if not sku:
            raise ValueError(f"unknown sku: {req.sku_id}")

        mode = req.transportation_mode or "Road"
        m, sd = self._stats(mode)
        confidence = max(0.1, 1.0 - (sd / m if m else 1.0))

        emit_event(
            "supply_chain.eta",
            sku_id=req.sku_id,
            mode=mode,
            eta_days=m,
            confidence=confidence,
        )

        return ETAResponse(
            sku_id=req.sku_id,
            transportation_mode=mode,
            eta_days=float(m),
            confidence=float(confidence),
        )
