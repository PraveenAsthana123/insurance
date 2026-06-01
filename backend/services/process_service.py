from __future__ import annotations

import logging
from typing import List

from core.exceptions import NotFoundError
from repositories.process_repo import ProcessRepository
from schemas.process import AIMappingResponse, DataFlowStepResponse, ProcessResponse

logger = logging.getLogger(__name__)


class ProcessService:
    def __init__(self, process_repo: ProcessRepository) -> None:
        self._repo = process_repo

    def get_process(self, process_id: int) -> ProcessResponse:
        row = self._repo.get_by_id(process_id)
        if row is None:
            raise NotFoundError(f"Process {process_id} not found")
        return ProcessResponse(**row)

    def get_data_flow(self, process_id: int) -> List[DataFlowStepResponse]:
        if self._repo.get_by_id(process_id) is None:
            raise NotFoundError(f"Process {process_id} not found")
        rows = self._repo.get_data_flow(process_id)
        return [DataFlowStepResponse(**r) for r in rows]

    def get_models(self, process_id: int) -> List[dict]:
        if self._repo.get_by_id(process_id) is None:
            raise NotFoundError(f"Process {process_id} not found")
        return self._repo.get_models(process_id)

    def get_ai_mappings(self, process_id: int) -> List[AIMappingResponse]:
        if self._repo.get_by_id(process_id) is None:
            raise NotFoundError(f"Process {process_id} not found")
        rows = self._repo.get_ai_mappings(process_id)
        return [AIMappingResponse(**r) for r in rows]
