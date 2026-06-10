"""Pagination helper · Iter 26 · C3 closure.

Standardized cursor + offset/limit response shape per §6.1 spec.
"""
from __future__ import annotations

from typing import Any, Generic, Sequence, TypeVar

from fastapi import Query
from pydantic import BaseModel

T = TypeVar("T")


class PaginationParams(BaseModel):
    """Common pagination query params · use as `params: PaginationParams = Depends()`."""
    offset: int = 0
    limit: int = 50


def get_pagination(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
) -> PaginationParams:
    return PaginationParams(offset=offset, limit=limit)


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard envelope · per §6.1."""
    items: list[T]
    total: int
    offset: int
    limit: int
    has_next: bool
    has_prev: bool


def paginate(items: Sequence[T], total: int, offset: int, limit: int) -> dict[str, Any]:
    """Build the standard pagination envelope.

    Args:
        items: the page slice already sliced by caller
        total: total count (caller computes via COUNT or len(all))
        offset: offset used
        limit: limit used
    """
    return {
        "items": list(items),
        "total": total,
        "offset": offset,
        "limit": limit,
        "has_next": offset + limit < total,
        "has_prev": offset > 0,
    }
