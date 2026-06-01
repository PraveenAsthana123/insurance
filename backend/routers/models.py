from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, Query

from core.dependencies import get_ml_service
from schemas.common import PaginatedResponse
from schemas.model import ModelCreate, ModelResponse, ModelSummary, PredictRequest, PredictResponse
from services.ml_service import MLService

router = APIRouter(prefix="/api/v1/models", tags=["models"])


@router.get("", response_model=PaginatedResponse[ModelSummary])
def list_models(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    service: MLService = Depends(get_ml_service),
) -> PaginatedResponse[ModelSummary]:
    items, total = service.list_models(offset=offset, limit=limit)
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.post("", response_model=ModelResponse, status_code=201)
def create_model(
    payload: ModelCreate,
    service: MLService = Depends(get_ml_service),
) -> ModelResponse:
    return service.create_model(payload)


@router.get("/{model_id}", response_model=ModelResponse)
def get_model(
    model_id: int,
    service: MLService = Depends(get_ml_service),
) -> ModelResponse:
    return service.get_model(model_id)


@router.post("/{model_id}/predict", response_model=PredictResponse)
def predict(
    model_id: int,
    payload: PredictRequest,
    service: MLService = Depends(get_ml_service),
) -> PredictResponse:
    return service.predict(model_id, payload.input_data)


@router.get("/{model_id}/metrics", response_model=Dict[str, Any])
def get_model_metrics(
    model_id: int,
    service: MLService = Depends(get_ml_service),
) -> Dict[str, Any]:
    return service.get_metrics(model_id)
