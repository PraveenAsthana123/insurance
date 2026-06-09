"""Pydantic schemas for outbound voice AI campaigns."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class CampaignCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    product_id: Optional[int] = None
    product_pitch: str = Field(..., min_length=1, max_length=500)
    service_description: Optional[str] = Field(None, max_length=2000)
    call_to_action: str = Field(..., min_length=1, max_length=500)
    target_segment: Optional[str] = Field(None, description="gold · silver · standard · None=all")
    require_consent: bool = True
    script_template: str = Field(
        ...,
        min_length=10,
        description="Template with vars {name} {phone} {product_name} {price} {call_to_action}",
    )
    voice_lang: str = "en-US"
    max_attempts_per_customer: int = Field(1, ge=1, le=5)


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    product_pitch: Optional[str] = None
    service_description: Optional[str] = None
    call_to_action: Optional[str] = None
    target_segment: Optional[str] = None
    require_consent: Optional[bool] = None
    script_template: Optional[str] = None
    status: Optional[str] = None


class Campaign(BaseModel):
    id: int
    campaign_ref: str
    name: str
    product_id: Optional[int] = None
    product_pitch: str
    service_description: Optional[str] = None
    call_to_action: str
    target_segment: Optional[str] = None
    require_consent: bool
    script_template: str
    status: str
    voice_lang: str
    max_attempts_per_customer: int
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class CampaignRun(BaseModel):
    id: int
    run_ref: str
    campaign_id: int
    customer_id: int
    rendered_script: str
    consent_ok: bool
    dlp_ok: bool
    fairness_cohort: Optional[str] = None
    status: str
    response_text: Optional[str] = None
    outcome_score: Optional[float] = None
    correlation_id: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime


class CampaignExecuteRequest(BaseModel):
    customer_ids: Optional[list[int]] = Field(
        default=None,
        description="If None: select all matching customers in target_segment. If given: only those.",
    )
    dry_run: bool = Field(
        default=False,
        description="If True: produce runs in 'pending' state without marking spoken. Use UI to play sequentially.",
    )


class CampaignExecuteResponse(BaseModel):
    campaign_id: int
    runs_created: int
    runs_skipped_no_consent: int
    runs_skipped_segment_mismatch: int
    runs_skipped_dlp: int
    first_run_id: Optional[int] = None


class CampaignRunUpdate(BaseModel):
    """Frontend marks a run done after browser TTS completes (or STT capture)."""
    status: Optional[str] = None
    response_text: Optional[str] = None
    outcome_score: Optional[float] = Field(None, ge=0.0, le=1.0)


class CampaignMetrics(BaseModel):
    """Aggregate metrics per campaign · per §75 + §82.7."""
    campaign_id: int
    total_runs: int
    pending: int
    spoken: int
    accepted: int
    declined: int
    skipped: int
    failed: int
    consent_gate_rate: float  # consent_ok=true / total
    avg_outcome_score: float
    cohort_distribution: dict[str, int]  # for §76 fairness audit
