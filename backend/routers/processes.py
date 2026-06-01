from __future__ import annotations

from fastapi import APIRouter, Depends

from core.dependencies import get_ml_service, get_process_service
from schemas.common import PaginatedResponse
from schemas.model import ModelSummary
from schemas.process import AIMappingResponse, DataFlowStepResponse, ProcessResponse
from services.ml_service import MLService
from services.process_service import ProcessService

router = APIRouter(prefix="/api/v1/processes", tags=["processes"])


@router.get("/{process_id}", response_model=ProcessResponse)
def get_process(
    process_id: int,
    service: ProcessService = Depends(get_process_service),
) -> ProcessResponse:
    return service.get_process(process_id)


@router.get("/{process_id}/data-flow", response_model=list[DataFlowStepResponse])
def get_process_data_flow(
    process_id: int,
    service: ProcessService = Depends(get_process_service),
) -> list[DataFlowStepResponse]:
    return service.get_data_flow(process_id)


@router.get("/{process_id}/models", response_model=list[dict])
def get_process_models(
    process_id: int,
    service: ProcessService = Depends(get_process_service),
) -> list[dict]:
    return service.get_models(process_id)


@router.get("/{process_id}/ai-mappings", response_model=list[AIMappingResponse])
def get_process_ai_mappings(
    process_id: int,
    service: ProcessService = Depends(get_process_service),
) -> list[AIMappingResponse]:
    return service.get_ai_mappings(process_id)


@router.get("/{process_id}/test-cases", response_model=list[dict])
def get_process_test_cases(
    process_id: int,
    service: ProcessService = Depends(get_process_service),
) -> list[dict]:
    """
    Returns suggested test case categories for this process.
    Derived from the process metadata (kpi, pain_points, data_needed).
    """
    proc = service.get_process(process_id)
    test_cases = [
        {
            "category": "Happy path",
            "description": f"Run {proc.name} with valid inputs; verify outputs match expected format",
            "inputs": proc.inputs,
            "expected_output": proc.outputs,
        },
        {
            "category": "Missing data",
            "description": "Run with incomplete input data; verify graceful handling and error messaging",
            "inputs": "Subset of required data fields",
            "expected_output": "Validation error with descriptive message",
        },
        {
            "category": "Edge case — empty dataset",
            "description": "Submit empty dataset; verify no crash and meaningful response",
            "inputs": "Empty CSV",
            "expected_output": "Error: dataset has no rows",
        },
        {
            "category": "KPI validation",
            "description": f"Verify output satisfies defined KPI thresholds: {proc.kpi}",
            "inputs": proc.data_needed,
            "expected_output": f"KPI targets met: {proc.kpi}",
        },
    ]
    return test_cases
