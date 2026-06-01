from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class DatasetCreate(BaseModel):
    name: str
    kaggle_url: Optional[str] = None
    description: Optional[str] = None
    data_type: Optional[str] = None
    department_ids: Optional[List[int]] = None


class DatasetResponse(BaseModel):
    id: int
    name: str
    kaggle_url: Optional[str] = None
    description: Optional[str] = None
    columns_info: Optional[Dict[str, Any]] = None
    file_path: Optional[str] = None
    data_type: Optional[str] = None

    model_config = {"from_attributes": True}


class DatasetSummary(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    data_type: Optional[str] = None
    file_path: Optional[str] = None

    model_config = {"from_attributes": True}


class DatasetPreview(BaseModel):
    columns: List[str]
    rows: List[List[Any]]
    total_rows: int
    preview_rows: int
