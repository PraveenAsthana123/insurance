"""supply_chain.py — Pydantic request/response models for Supply Chain deep-dive.

Mirrors the Sales schema style: extra='forbid' on request bodies, flat response
models that the frontend can render without type gymnastics.
"""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class SkuSummary(BaseModel):
    """Row from dim_sku surfaced to the UI for picker/overview tiles."""

    sku_id: str
    product_type: str | None = None
    price: float | None = None
    stock_levels: int | None = None
    lead_time_days: int | None = None
    defect_rate: float | None = None


class SupplierScored(BaseModel):
    """Supplier with a computed composite score (0-100) and sub-scores."""

    supplier_id: str
    supplier_name: str | None = None
    location: str | None = None
    manufacturing_lead_time_days: int | None = None
    score: float
    sub_scores: dict


class StockoutRiskRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sku_id: str


class StockoutRiskResponse(BaseModel):
    sku_id: str
    risk_score: float
    days_to_stockout: int
    risk_band: str
    reason: str


class ETARequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sku_id: str
    transportation_mode: str | None = None


class ETAResponse(BaseModel):
    sku_id: str
    transportation_mode: str
    eta_days: float
    confidence: float


class SimulationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    supplier_id: str
    delay_days: int = Field(ge=0, le=30)
    affected_sku_count: int = Field(ge=1, le=100)


class SimulationResponse(BaseModel):
    supplier_id: str
    delay_days: int
    affected_sku_count: int
    stockout_probability_change: float
    service_level_delta_pct: float
    revenue_at_risk: float
