"""/api/v1/content-ops/* — postings + contacts + schedules + monitoring."""
from __future__ import annotations

import logging
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Request

from . import services
from .schemas import (
    BulkUploadRequest,
    BulkUploadResponse,
    Contact,
    ContactCreate,
    Posting,
    PostingCreate,
    PostingMonitoringSnapshot,
    PostingRun,
    PostingUpdate,
    PublishRequest,
    PublishResponse,
    Schedule,
    ScheduleCreate,
    ScheduleUpdate,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/content-ops", tags=["content-ops"])


def _corr(r: Request) -> str:
    return getattr(r.state, "correlation_id", str(uuid.uuid4()))


def _tenant(r: Request) -> str:
    return getattr(r.state, "tenant_id", None) or "default"


# ── HEALTH (defined first to avoid path shadow) ────────────────────
@router.get("/health")
def health():
    return {"status": "ok", "module": "content-ops",
            "spec": "§64.13 + §38.3 + §76 + §82.7"}


# ── MONITORING ────────────────────────────────────────────────────
@router.get("/postings/monitoring", response_model=PostingMonitoringSnapshot)
def postings_monitoring(request: Request):
    return services.posting_monitoring(_tenant(request))


# ── POSTINGS CRUD + publish ───────────────────────────────────────
@router.get("/postings", response_model=list[Posting])
def list_postings(request: Request, channel: Optional[str] = None):
    return services.list_postings(_tenant(request), channel)


@router.post("/postings", response_model=Posting, status_code=201)
def create_posting(body: PostingCreate, request: Request):
    try:
        return services.create_posting(body, _tenant(request), _corr(request))
    except ValueError as e:
        raise HTTPException(400, {"detail": str(e), "error_code": "INVALID_CHANNEL"})


@router.get("/postings/{posting_id}", response_model=Posting)
def get_posting(posting_id: int, request: Request):
    p = services.get_posting(posting_id, _tenant(request))
    if not p:
        raise HTTPException(404, {"detail": "posting not found",
                                    "error_code": "POSTING_404"})
    return p


@router.patch("/postings/{posting_id}", response_model=Posting)
def patch_posting(posting_id: int, body: PostingUpdate, request: Request):
    p = services.update_posting(posting_id, body, _tenant(request))
    if not p:
        raise HTTPException(404, {"detail": "posting not found",
                                    "error_code": "POSTING_404"})
    return p


@router.post("/postings/{posting_id}/publish", response_model=PublishResponse)
def publish(posting_id: int, body: PublishRequest, request: Request):
    try:
        return services.publish_posting(
            posting_id, body, _tenant(request), _corr(request),
        )
    except ValueError as e:
        raise HTTPException(404, {"detail": str(e), "error_code": "POSTING_404"})


# ── CONTACTS CRUD + bulk upload ──────────────────────────────────
@router.get("/contacts", response_model=list[Contact])
def list_contacts(request: Request, segment: Optional[str] = None,
                    limit: int = 200):
    return services.list_contacts(_tenant(request), limit, segment)


@router.post("/contacts", response_model=Contact, status_code=201)
def create_contact(body: ContactCreate, request: Request):
    return services.create_contact(body, _tenant(request))


@router.post("/contacts/bulk-upload", response_model=BulkUploadResponse)
def bulk_upload_contacts(body: BulkUploadRequest, request: Request):
    return services.bulk_upload(body, _tenant(request))


# ── SCHEDULES ────────────────────────────────────────────────────
@router.get("/schedules", response_model=list[Schedule])
def list_schedules(request: Request):
    return services.list_schedules(_tenant(request))


@router.post("/schedules", response_model=Schedule, status_code=201)
def create_schedule(body: ScheduleCreate, request: Request):
    if body.cadence not in ("once", "daily", "weekly", "monthly"):
        raise HTTPException(400, {"detail": f"invalid cadence: {body.cadence}",
                                    "error_code": "INVALID_CADENCE"})
    return services.create_schedule(body, _tenant(request))


@router.patch("/schedules/{schedule_id}", response_model=Schedule)
def patch_schedule(schedule_id: int, body: ScheduleUpdate, request: Request):
    s = services.update_schedule(schedule_id, body, _tenant(request))
    if not s:
        raise HTTPException(404, {"detail": "schedule not found",
                                    "error_code": "SCH_404"})
    return s


@router.get("/schedules/due", response_model=list[Schedule])
def schedules_due(request: Request):
    return services.due_schedules(_tenant(request))
