"""Pydantic schemas for the multi-channel marketing campaign system."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field

Channel = str  # email · banner · survey · form  (validated by router/router)


class CampaignCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    channel: Channel = Field(..., description="email · banner · survey · form")
    product_id: Optional[int] = None
    product_pitch: str = Field(..., min_length=1, max_length=500)
    service_description: Optional[str] = Field(None, max_length=2000)
    call_to_action: str = Field(..., min_length=1, max_length=500)
    target_segment: Optional[str] = None
    require_consent: bool = True
    config: dict[str, Any] = Field(default_factory=dict)
    max_attempts_per_customer: int = Field(1, ge=1, le=5)


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    product_pitch: Optional[str] = None
    service_description: Optional[str] = None
    call_to_action: Optional[str] = None
    target_segment: Optional[str] = None
    require_consent: Optional[bool] = None
    config: Optional[dict[str, Any]] = None
    status: Optional[str] = None


class Campaign(BaseModel):
    id: int
    campaign_ref: str
    name: str
    channel: str
    product_id: Optional[int] = None
    product_pitch: str
    service_description: Optional[str] = None
    call_to_action: str
    target_segment: Optional[str] = None
    require_consent: bool
    config: dict[str, Any]
    status: str
    max_attempts_per_customer: int
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class CampaignRun(BaseModel):
    id: int
    run_ref: str
    campaign_id: int
    customer_id: int
    rendered_payload: dict[str, Any]
    consent_ok: bool
    dlp_ok: bool
    fairness_cohort: Optional[str] = None
    status: str
    response_data: dict[str, Any] = Field(default_factory=dict)
    outcome_score: Optional[float] = None
    correlation_id: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime


class CampaignExecuteRequest(BaseModel):
    customer_ids: Optional[list[int]] = None
    dry_run: bool = False


class CampaignExecuteResponse(BaseModel):
    campaign_id: int
    channel: str
    runs_created: int
    runs_skipped_no_consent: int
    runs_skipped_segment_mismatch: int
    runs_skipped_dlp: int
    first_run_id: Optional[int] = None


class CampaignRunUpdate(BaseModel):
    status: Optional[str] = None
    response_data: Optional[dict[str, Any]] = None
    outcome_score: Optional[float] = Field(None, ge=0.0, le=1.0)


class CampaignMetrics(BaseModel):
    campaign_id: int
    channel: str
    total_runs: int
    by_status: dict[str, int]
    consent_gate_rate: float
    avg_outcome_score: float
    cohort_distribution: dict[str, int]


class ChannelHelp(BaseModel):
    """Operator-facing description of what each channel needs in `config`."""
    channel: str
    required_config_keys: list[str]
    optional_config_keys: list[str]
    example_config: dict[str, Any]
    notes: str
