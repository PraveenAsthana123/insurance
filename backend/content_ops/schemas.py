"""Pydantic schemas for content ops (postings · master contacts · schedules)."""
from __future__ import annotations

from datetime import datetime, time
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field


# ─── Content postings ───────────────────────────────────────────────
class PostingCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    channel: str = Field(..., description="'job' or 'blog'")
    title: str = Field(..., min_length=1, max_length=300)
    summary: str = Field(..., min_length=1, max_length=1000)
    body_markdown: str = Field(..., min_length=1)
    config: dict[str, Any] = Field(default_factory=dict)
    platforms: list[str] = Field(default_factory=list,
                                    description="linkedin · website · twitter")
    scheduled_for: Optional[datetime] = None
    created_by: str = "manager"


class PostingUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    summary: Optional[str] = None
    body_markdown: Optional[str] = None
    config: Optional[dict[str, Any]] = None
    platforms: Optional[list[str]] = None
    scheduled_for: Optional[datetime] = None
    status: Optional[str] = None
    last_edited_by: Optional[str] = None


class Posting(BaseModel):
    id: int
    posting_ref: str
    name: str
    channel: str
    title: str
    summary: str
    body_markdown: str
    config: dict[str, Any]
    platforms: list[str]
    operation_log: list[dict[str, Any]]
    status: str
    scheduled_for: Optional[datetime] = None
    operator_edit_count: int
    time_to_publish_seconds: Optional[float] = None
    quality_score: Optional[float] = None
    created_by: str
    last_edited_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None


class PostingRun(BaseModel):
    id: int
    run_ref: str
    posting_id: int
    platform: str
    rendered_payload: dict[str, Any]
    status: str
    external_url: Optional[str] = None
    external_id: Optional[str] = None
    response_data: dict[str, Any] = Field(default_factory=dict)
    error_message: Optional[str] = None
    engagement_score: Optional[float] = None
    attempted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class PublishRequest(BaseModel):
    """Manager kicks off a publish · all listed platforms get attempted."""
    platforms: Optional[list[str]] = None  # if None: use posting.platforms


class PublishResponse(BaseModel):
    posting_id: int
    runs_created: int
    runs: list[PostingRun]


# ─── Master contacts ──────────────────────────────────────────────
class ContactCreate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=200)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=40)
    company: Optional[str] = None
    title: Optional[str] = None
    segment: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    consent_marketing: bool = False
    consent_calls: bool = False
    consent_email: bool = False
    source: str = "manual"
    created_by: str = "manager"


class Contact(BaseModel):
    id: int
    contact_ref: str
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    segment: Optional[str] = None
    source: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    consent_marketing: bool
    consent_calls: bool
    consent_email: bool
    quality_score: Optional[float] = None
    created_at: datetime


class BulkUploadRequest(BaseModel):
    """CSV-style bulk upload · operator pastes rows OR uploads file (parsed
    client-side or in services)."""
    rows: list[ContactCreate] = Field(..., min_length=1, max_length=10000)
    skip_duplicates: bool = True


class BulkUploadResponse(BaseModel):
    inserted: int
    skipped_duplicates: int
    invalid_rows: int
    errors: list[str] = Field(default_factory=list)


# ─── Campaign schedules ────────────────────────────────────────────
class ScheduleCreate(BaseModel):
    campaign_id: int
    cadence: str = Field(..., description="once · daily · weekly · monthly")
    time_of_day_utc: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$",
                                              description="HH:MM · for daily/weekly/monthly")
    day_of_week: Optional[int] = Field(None, ge=0, le=6,
                                          description="0=Sun · for weekly")
    day_of_month: Optional[int] = Field(None, ge=1, le=28,
                                            description="1-28 · for monthly")
    scheduled_at: Optional[datetime] = Field(None, description="for cadence=once")


class Schedule(BaseModel):
    id: int
    schedule_ref: str
    campaign_id: int
    cadence: str
    time_of_day_utc: Optional[str] = None
    day_of_week: Optional[int] = None
    day_of_month: Optional[int] = None
    scheduled_at: Optional[datetime] = None
    enabled: bool
    next_run_at: Optional[datetime] = None
    last_run_at: Optional[datetime] = None
    last_run_status: Optional[str] = None
    run_count: int
    created_at: datetime


class ScheduleUpdate(BaseModel):
    enabled: Optional[bool] = None
    cadence: Optional[str] = None
    time_of_day_utc: Optional[str] = None
    day_of_week: Optional[int] = None
    day_of_month: Optional[int] = None
    scheduled_at: Optional[datetime] = None


# ─── Monitoring + quality ────────────────────────────────────────
class PostingMonitoringSnapshot(BaseModel):
    total_postings: int
    by_status: dict[str, int]
    by_channel: dict[str, int]
    by_platform_attempted: dict[str, int]
    by_platform_published: dict[str, int]
    avg_time_to_publish_seconds: float
    avg_quality_score: float
    operator_edits_per_posting: float
