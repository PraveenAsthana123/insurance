"""Pydantic schemas for the voice AI end-to-end flow."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class Product(BaseModel):
    id: int
    sku: str
    name: str
    category: str
    description: Optional[str] = None
    price_cents: int
    coverage_months: Optional[int] = None
    features: list[str] = Field(default_factory=list)
    target_segment: Optional[str] = None
    enabled: bool = True


class ProductCreate(BaseModel):
    sku: str = Field(..., min_length=1, max_length=64)
    name: str = Field(..., min_length=1, max_length=200)
    category: str = Field(..., min_length=1, max_length=64)
    description: Optional[str] = None
    price_cents: int = Field(..., ge=0)
    coverage_months: Optional[int] = Field(None, ge=0)
    features: list[str] = Field(default_factory=list)
    target_segment: Optional[str] = None


class Customer(BaseModel):
    id: int
    customer_ref: str
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    segment: Optional[str] = None
    consent_recording: bool = False
    consent_marketing: bool = False


class Order(BaseModel):
    id: int
    order_ref: str
    customer_id: int
    product_id: int
    quantity: int
    total_cents: int
    status: str
    notification_sent_at: Optional[datetime] = None
    notification_channel: Optional[str] = None
    session_id: Optional[str] = None
    created_at: datetime


class WelcomeTemplate(BaseModel):
    id: int
    name: str
    text: str
    language: str = "en"
    segment: Optional[str] = None
    enabled: bool = True
    is_default: bool = False


class WelcomeTemplateUpdate(BaseModel):
    name: Optional[str] = None
    text: Optional[str] = None
    language: Optional[str] = None
    segment: Optional[str] = None
    enabled: Optional[bool] = None
    is_default: Optional[bool] = None


class TranscriptTurn(BaseModel):
    role: str = Field(..., description="user OR assistant")
    text: str
    timestamp: float


class Session(BaseModel):
    session_id: str
    customer_id: Optional[int] = None
    stage: str
    transcript: list[dict[str, Any]] = Field(default_factory=list)
    requirements: dict[str, Any] = Field(default_factory=dict)
    recommended_product_id: Optional[int] = None
    started_at: datetime
    completed_at: Optional[datetime] = None


class SessionStartRequest(BaseModel):
    customer_ref: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class TurnRequest(BaseModel):
    session_id: str
    user_text: str = Field(..., min_length=1, max_length=2000)


class TurnResponse(BaseModel):
    session_id: str
    stage: str
    assistant_text: str
    requirements: dict[str, Any] = Field(default_factory=dict)
    recommended_product: Optional[Product] = None
    order: Optional[Order] = None
    next_action: str = Field(default="continue", description="continue | confirm | complete")


class MonitoringSnapshot(BaseModel):
    """Live monitoring + scoring per §82.7 + §75."""
    total_sessions_24h: int
    active_sessions: int
    completed_sessions_24h: int
    orders_created_24h: int
    conversion_rate_pct: float
    avg_turns_per_session: float
    welcome_template_distribution: dict[str, int]
    stage_distribution: dict[str, int]
    customer_satisfaction_proxy: float = Field(
        ..., description="proxy = completed/(completed+abandoned), 0..1"
    )
