"""customer.py — Pydantic schemas for the Customer Analytics pilot API.

Schemas backing /api/v1/customer/* endpoints used only by the Customer
Manager hub (depth-pilot). No other department imports from here.
"""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class ChurnDriver(BaseModel):
    feature: str
    importance: float
    value: float | int | None = None
    explanation: str


class ChurnPredictionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    customer_id: str = Field(min_length=1, max_length=32)


class ChurnPredictionResponse(BaseModel):
    customer_id: str
    probability: float = Field(ge=0.0, le=1.0)
    segment: str
    top_drivers: list[ChurnDriver]
    tenure_months: int
    monthly_charges: float
    contract_type: str | None = None
    service_count: int
    model_version: str


class AtRiskCustomer(BaseModel):
    customer_id: str
    probability: float = Field(ge=0.0, le=1.0)
    tenure_months: int
    monthly_charges: float
    contract_type: str | None = None
    service_count: int
    segment: str


class ChurnTopNResponse(BaseModel):
    model_version: str
    n: int
    customers: list[AtRiskCustomer]
    auc: float
    precision_at_10: float


class ChurnMetricsResponse(BaseModel):
    model_version: str
    auc: float
    precision_at_10: float
    n_train: int
    n_test: int
    fit_time_ms: int
    trained_at: str
