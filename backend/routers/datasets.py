from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Query, UploadFile, File

from core.config import get_settings
from core.dependencies import get_dataset_service
from schemas.common import PaginatedResponse
from schemas.dataset import DatasetCreate, DatasetPreview, DatasetResponse, DatasetSummary
from services.dataset_service import DatasetService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/datasets", tags=["datasets"])


@router.get("", response_model=PaginatedResponse[DatasetSummary])
def list_datasets(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    service: DatasetService = Depends(get_dataset_service),
) -> PaginatedResponse[DatasetSummary]:
    items, total = service.list_datasets(offset=offset, limit=limit)
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.get("/{dataset_id}", response_model=DatasetResponse)
def get_dataset(
    dataset_id: int,
    service: DatasetService = Depends(get_dataset_service),
) -> DatasetResponse:
    return service.get_dataset(dataset_id)


@router.post("", response_model=DatasetResponse, status_code=201)
def create_dataset(
    payload: DatasetCreate,
    service: DatasetService = Depends(get_dataset_service),
) -> DatasetResponse:
    return service.create_dataset(
        name=payload.name,
        kaggle_url=payload.kaggle_url,
        description=payload.description,
        data_type=payload.data_type,
        department_ids=payload.department_ids,
    )


@router.post("/{dataset_id}/upload", response_model=DatasetResponse)
async def upload_dataset(
    dataset_id: int,
    file: UploadFile = File(...),
    service: DatasetService = Depends(get_dataset_service),
) -> DatasetResponse:
    settings = get_settings()
    content = await file.read()
    filename = file.filename or "upload.csv"
    upload_dir = f"{settings.data_dir}/uploads"
    return service.upload_csv(
        dataset_id=dataset_id,
        filename=filename,
        file_content=content,
        upload_dir=upload_dir,
    )


@router.get("/{dataset_id}/preview", response_model=DatasetPreview)
def preview_dataset(
    dataset_id: int,
    service: DatasetService = Depends(get_dataset_service),
) -> DatasetPreview:
    return service.preview_dataset(dataset_id)
