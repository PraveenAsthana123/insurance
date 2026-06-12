from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from core.dependencies import get_job_service
from schemas.common import PaginatedResponse, SuccessResponse
from schemas.job import (
    JobCreate,
    JobResponse,
    JobResultResponse,
    JobSummary,
    ScheduleCreate,
    ScheduleResponse,
    ScheduleSummary,
)
from services.job_service import JobService

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])

# ── Schedule router (separate prefix) ────────────────────────────────────────
schedule_router = APIRouter(prefix="/api/v1/schedules", tags=["scheduling"])


@router.get("", response_model=PaginatedResponse[JobSummary])
def list_jobs(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    service: JobService = Depends(get_job_service),
) -> PaginatedResponse[JobSummary]:
    items, total = service.list_jobs(offset=offset, limit=limit)
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.post("", response_model=JobResponse, status_code=201)
def create_job(
    payload: JobCreate,
    service: JobService = Depends(get_job_service),
) -> JobResponse:
    return service.create_job(payload)


@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: int,
    service: JobService = Depends(get_job_service),
) -> JobResponse:
    return service.get_job(job_id)


@router.get("/{job_id}/results", response_model=JobResultResponse)
def get_job_results(
    job_id: int,
    service: JobService = Depends(get_job_service),
) -> JobResultResponse:
    return service.get_results(job_id)


# ── Scheduling endpoints ──────────────────────────────────────────────────────

@schedule_router.post("", response_model=ScheduleResponse, status_code=201, tags=["scheduling"])
def create_schedule(
    schedule: ScheduleCreate,
    service: JobService = Depends(get_job_service),
) -> ScheduleResponse:
    """Create a new job schedule."""
    return service.create_schedule(schedule)


@schedule_router.get("", response_model=PaginatedResponse[ScheduleSummary], tags=["scheduling"])
def list_schedules(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    service: JobService = Depends(get_job_service),
) -> PaginatedResponse[ScheduleSummary]:
    """List all schedules with pagination."""
    items, total = service.list_schedules(offset=offset, limit=limit)
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@schedule_router.get("/{schedule_id}", response_model=ScheduleResponse, tags=["scheduling"])
def get_schedule(
    schedule_id: int,
    service: JobService = Depends(get_job_service),
) -> ScheduleResponse:
    """Get details of a specific schedule."""
    return service.get_schedule(schedule_id)


@schedule_router.put("/{schedule_id}/pause", response_model=SuccessResponse, tags=["scheduling"])
def pause_schedule(
    schedule_id: int,
    service: JobService = Depends(get_job_service),
) -> SuccessResponse:
    """Pause a schedule so it no longer triggers automatically."""
    service.pause_schedule(schedule_id)
    return SuccessResponse(message=f"Schedule {schedule_id} paused successfully.")


@schedule_router.put("/{schedule_id}/resume", response_model=SuccessResponse, tags=["scheduling"])
def resume_schedule(
    schedule_id: int,
    service: JobService = Depends(get_job_service),
) -> SuccessResponse:
    """Resume a paused schedule."""
    service.resume_schedule(schedule_id)
    return SuccessResponse(message=f"Schedule {schedule_id} resumed successfully.")


@schedule_router.delete("/{schedule_id}", response_model=SuccessResponse, tags=["scheduling"])
def delete_schedule(
    schedule_id: int,
    service: JobService = Depends(get_job_service),
) -> SuccessResponse:
    """Permanently delete a schedule."""
    service.delete_schedule(schedule_id)
    return SuccessResponse(message=f"Schedule {schedule_id} deleted successfully.")


@schedule_router.post("/{schedule_id}/run-now", response_model=SuccessResponse, status_code=202, tags=["scheduling"])
def run_schedule_now(
    schedule_id: int,
    service: JobService = Depends(get_job_service),
) -> SuccessResponse:
    """Trigger an immediate execution of a scheduled job outside its normal cadence."""
    service.trigger_schedule_now(schedule_id)
    return SuccessResponse(message=f"Schedule {schedule_id} triggered for immediate execution.")
