from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel


class ModelCreate(BaseModel):
    name: str
    department_id: Optional[int] = None
    process_id: Optional[int] = None
    dataset_id: Optional[int] = None
    algorithm: Optional[str] = None


class ModelResponse(BaseModel):
    id: int
    department_id: Optional[int] = None
    process_id: Optional[int] = None
    dataset_id: Optional[int] = None
    name: str
    algorithm: Optional[str] = None
    status: str
    mlflow_run_id: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ModelSummary(BaseModel):
    id: int
    name: str
    algorithm: Optional[str] = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PredictRequest(BaseModel):
    input_data: Dict[str, Any]


class PredictResponse(BaseModel):
    model_id: int
    prediction: Any
    confidence: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None
