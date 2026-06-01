from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class ProcessResponse(BaseModel):
    id: int
    department_id: int
    name: str
    description: Optional[str] = None
    inputs: Optional[str] = None
    outputs: Optional[str] = None
    pain_points: Optional[str] = None
    kpi: Optional[str] = None
    data_needed: Optional[str] = None

    model_config = {"from_attributes": True}


class ProcessSummary(BaseModel):
    id: int
    department_id: int
    name: str
    description: Optional[str] = None

    model_config = {"from_attributes": True}


class ProcessCreate(BaseModel):
    department_id: int
    name: str
    description: Optional[str] = None
    inputs: Optional[str] = None
    outputs: Optional[str] = None
    pain_points: Optional[str] = None
    kpi: Optional[str] = None
    data_needed: Optional[str] = None


class AIMappingResponse(BaseModel):
    id: int
    process_id: int
    ai_type: str
    use_case: Optional[str] = None
    example_output: Optional[str] = None

    model_config = {"from_attributes": True}


class DataFlowStepResponse(BaseModel):
    id: int
    process_id: int
    step_order: int
    step_name: str
    step_type: str
    input_data: Optional[str] = None
    output_data: Optional[str] = None
    description: Optional[str] = None

    model_config = {"from_attributes": True}
