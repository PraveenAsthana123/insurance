from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class JobCreate(BaseModel):
    job_type: str
    model_id: Optional[int] = None


# ── Schedule Schemas ─────────────────────────────────────────────────────────

class ScheduleCreate(BaseModel):
    name: str
    job_type: str
    schedule_type: str
    cron_expression: Optional[str] = None
    data_path: Optional[str] = None
    model_id: Optional[int] = None
    process_id: Optional[int] = None
    department_id: Optional[int] = None
    priority: str = "medium"
    notify_email: bool = False
    notify_slack: bool = False
    notify_webhook: bool = False


class ScheduleResponse(BaseModel):
    id: int
    name: str
    job_type: str
    schedule_type: str
    cron_expression: Optional[str] = None
    data_path: Optional[str] = None
    model_id: Optional[int] = None
    process_id: Optional[int] = None
    department_id: Optional[int] = None
    priority: str
    notify_email: bool
    notify_slack: bool
    notify_webhook: bool
    status: str
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    success_count: int
    failure_count: int
    avg_duration_seconds: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ScheduleSummary(BaseModel):
    id: int
    name: str
    job_type: str
    schedule_type: str
    cron_expression: Optional[str] = None
    priority: str
    status: str
    next_run_at: Optional[datetime] = None
    success_count: int
    failure_count: int

    model_config = {"from_attributes": True}


class JobResponse(BaseModel):
    id: int
    model_id: Optional[int] = None
    job_type: str
    status: str
    celery_task_id: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class JobSummary(BaseModel):
    id: int
    job_type: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class JobResultResponse(BaseModel):
    job_id: int
    status: str
    result: Optional[Dict[str, Any]] = None
    completed_at: Optional[datetime] = None
