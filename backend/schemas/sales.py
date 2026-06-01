"""sales.py — Pydantic schemas for the Sales deep-dive API."""
from __future__ import annotations

from datetime import date as date_cls
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class StoreSummary(BaseModel):
    """Short store record for list views."""
    store_id: int
    store_type: Literal["a", "b", "c", "d"]
    assortment: Literal["a", "b", "c"]
    competition_distance: float | None = None


class ForecastRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    store_id: int = Field(ge=1)
    horizon_days: int = Field(default=56, ge=7, le=180)


class ForecastPoint(BaseModel):
    date: date_cls
    value: float
    lower: float | None = None
    upper: float | None = None


class ForecastComponents(BaseModel):
    trend: list[ForecastPoint]
    weekly: list[ForecastPoint]
    yearly: list[ForecastPoint]


class ForecastResponse(BaseModel):
    store_id: int
    horizon_days: int
    actual: list[ForecastPoint]        # historical — last 56 days
    forecast: list[ForecastPoint]      # predicted — next horizon_days
    components: ForecastComponents
    mape: float = Field(description="Backtest MAPE on held-out tail, 0.0–1.0")
    fit_time_ms: int
    predict_time_ms: int


class SimulationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    store_id: int = Field(ge=1)
    discount_pct: float = Field(ge=0, le=50, description="0–50%")
    duration_days: int = Field(ge=1, le=30)


class WaterfallStep(BaseModel):
    label: str
    delta: float                 # positive or negative dollars vs previous step
    cumulative: float            # running total after this step


class SimulationResponse(BaseModel):
    store_id: int
    discount_pct: float
    duration_days: int
    baseline_revenue: float
    promo_revenue: float
    uplift_units: float
    margin_hit: float
    net_impact: float
    waterfall: list[WaterfallStep]   # 4 steps: Baseline, Promo uplift, Margin hit, Net
    elasticity_used: float
    margin_factor_used: float
