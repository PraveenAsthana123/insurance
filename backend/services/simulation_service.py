"""simulation_service.py — price × promo simulation using beta forecast as baseline.

Elasticity + margin-factor are constants for Phase delta. Real per-store learning
is deferred; see docs/superpowers/specs/2026-04-19-sales-revenue-deep-dive-design.md §9.
"""
from __future__ import annotations

import logging

from core.structured_logger import emit_event
from schemas.sales import SimulationRequest, SimulationResponse, WaterfallStep
from services.forecast_service import ForecastService

logger = logging.getLogger(__name__)

# Industry benchmarks — see /docs/data/elasticity-methodology.md (Phase 1 simplification).
DEFAULT_ELASTICITY = -2.0         # 1% discount → 2% volume uplift (BEV grocery typical)
DEFAULT_MARGIN_FACTOR = 0.30       # 30% gross margin baseline
# (Simplification: Rossmann "Sales" column is daily revenue, not units. We compute
# the revenue waterfall directly.)


class SimulationService:
    def __init__(self, forecast_service: ForecastService | None = None) -> None:
        self._forecast = forecast_service or ForecastService()

    def simulate(self, req: SimulationRequest) -> SimulationResponse:
        # Get baseline forecast for the duration window. ForecastService enforces
        # horizon_days >= 7 via Prophet's stability, so bump when duration < 7.
        fc = self._forecast.forecast(store_id=req.store_id, horizon_days=max(7, req.duration_days))

        # Sum forecast revenue over the requested duration.
        baseline_revenue = float(sum(p.value for p in fc.forecast[: req.duration_days]))

        # Apply elasticity: volume multiplier = 1 + (|elasticity| × discount_fraction)
        # With elasticity=-2.0 and discount=0.15 (15%): 1 + (-2.0 × -0.15) = 1.30 → 30% lift.
        # (Elasticity is negative because discount is a price reduction.)
        discount_fraction = req.discount_pct / 100.0
        volume_multiplier = 1.0 + (DEFAULT_ELASTICITY * -discount_fraction)
        uplift_units = baseline_revenue * (volume_multiplier - 1.0)

        # Promo revenue = new volume × discounted price
        promo_revenue = baseline_revenue * volume_multiplier * (1.0 - discount_fraction)

        # Margin computation. Margin per unit shrinks by the discount fraction.
        #   baseline margin = baseline_rev × margin_factor
        #   promo margin    = promo_rev × (margin_factor − discount_fraction)
        # If the discount eats more than the margin, promo_margin can go negative — that
        # is a real, useful signal.
        baseline_margin = baseline_revenue * DEFAULT_MARGIN_FACTOR
        promo_margin = promo_revenue * (DEFAULT_MARGIN_FACTOR - discount_fraction)
        margin_hit = baseline_margin - promo_margin    # positive = lost margin vs baseline
        net_impact = promo_margin - baseline_margin    # positive = net gain; usually negative

        # Waterfall: Baseline margin → +uplift margin → −(uplift margin + margin_hit) → Net.
        # The 3rd step's delta is constructed so cumulative lands exactly on promo_margin.
        waterfall = [
            WaterfallStep(
                label="Baseline margin",
                delta=baseline_margin,
                cumulative=baseline_margin,
            ),
            WaterfallStep(
                label="Promo uplift",
                delta=uplift_units * DEFAULT_MARGIN_FACTOR,
                cumulative=baseline_margin + uplift_units * DEFAULT_MARGIN_FACTOR,
            ),
            WaterfallStep(
                label="Margin hit",
                delta=-margin_hit - uplift_units * DEFAULT_MARGIN_FACTOR,
                cumulative=promo_margin,
            ),
            WaterfallStep(
                label="Net promo margin",
                delta=0.0,
                cumulative=promo_margin,
            ),
        ]

        logger.info(
            "simulate store=%s discount=%.1f%% dur=%d baseline=$%.0f net=$%.0f",
            req.store_id, req.discount_pct, req.duration_days,
            baseline_revenue, net_impact,
        )

        emit_event(
            "sales.simulate",
            store_id=req.store_id,
            discount_pct=req.discount_pct,
            duration_days=req.duration_days,
            baseline_revenue=baseline_revenue,
            promo_revenue=promo_revenue,
            net_impact=net_impact,
            elasticity=DEFAULT_ELASTICITY,
            margin_factor=DEFAULT_MARGIN_FACTOR,
        )

        return SimulationResponse(
            store_id=req.store_id,
            discount_pct=req.discount_pct,
            duration_days=req.duration_days,
            baseline_revenue=baseline_revenue,
            promo_revenue=promo_revenue,
            uplift_units=uplift_units,
            margin_hit=margin_hit,
            net_impact=net_impact,
            waterfall=waterfall,
            elasticity_used=DEFAULT_ELASTICITY,
            margin_factor_used=DEFAULT_MARGIN_FACTOR,
        )
