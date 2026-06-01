from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class DepartmentResponse(BaseModel):
    id: int
    name: str
    icon: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    route: Optional[str] = None

    model_config = {"from_attributes": True}


class DepartmentSummary(BaseModel):
    id: int
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None
    route: Optional[str] = None

    model_config = {"from_attributes": True}


class DepartmentCreate(BaseModel):
    name: str
    icon: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    route: Optional[str] = None
