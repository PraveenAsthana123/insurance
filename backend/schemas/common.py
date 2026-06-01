from __future__ import annotations

from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    offset: int
    limit: int


class ErrorResponse(BaseModel):
    detail: str
    error_code: str
    correlation_id: Optional[str] = None


class SuccessResponse(BaseModel):
    message: str
    data: Optional[dict] = None
