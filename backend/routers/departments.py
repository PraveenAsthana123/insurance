from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from core.dependencies import get_department_service
from schemas.common import PaginatedResponse
from schemas.department import DepartmentResponse, DepartmentSummary
from schemas.process import AIMappingResponse, ProcessSummary
from services.department_service import DepartmentService

router = APIRouter(prefix="/api/v1/departments", tags=["departments"])


@router.get("", response_model=PaginatedResponse[DepartmentSummary])
def list_departments(
    offset: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(50, ge=1, le=200, description="Pagination limit"),
    service: DepartmentService = Depends(get_department_service),
) -> PaginatedResponse[DepartmentSummary]:
    items, total = service.list_departments(offset=offset, limit=limit)
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.get("/{dept_id}", response_model=DepartmentResponse)
def get_department(
    dept_id: int,
    service: DepartmentService = Depends(get_department_service),
) -> DepartmentResponse:
    return service.get_department(dept_id)


@router.get("/{dept_id}/processes", response_model=PaginatedResponse[ProcessSummary])
def list_department_processes(
    dept_id: int,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    service: DepartmentService = Depends(get_department_service),
) -> PaginatedResponse[ProcessSummary]:
    items, total = service.list_processes(dept_id, offset=offset, limit=limit)
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.get("/{dept_id}/ai-stack", response_model=list[AIMappingResponse])
def get_department_ai_stack(
    dept_id: int,
    service: DepartmentService = Depends(get_department_service),
) -> list[AIMappingResponse]:
    return service.get_ai_stack(dept_id)


@router.get("/{dept_id}/roi", response_model=list[dict])
def get_department_roi(
    dept_id: int,
    service: DepartmentService = Depends(get_department_service),
) -> list[dict]:
    return service.get_roi_metrics(dept_id)
