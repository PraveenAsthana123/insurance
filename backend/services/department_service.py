from __future__ import annotations

import logging
from typing import List

from core.exceptions import NotFoundError
from repositories.department_repo import DepartmentRepository
from repositories.process_repo import ProcessRepository
from schemas.department import DepartmentResponse, DepartmentSummary
from schemas.process import AIMappingResponse, ProcessSummary

logger = logging.getLogger(__name__)


class DepartmentService:
    def __init__(
        self,
        dept_repo: DepartmentRepository,
        process_repo: ProcessRepository,
    ) -> None:
        self._dept_repo = dept_repo
        self._process_repo = process_repo

    def list_departments(self, offset: int, limit: int) -> tuple[List[DepartmentSummary], int]:
        rows = self._dept_repo.list_all(offset=offset, limit=limit)
        total = self._dept_repo.count()
        return [DepartmentSummary(**r) for r in rows], total

    def get_department(self, dept_id: int) -> DepartmentResponse:
        row = self._dept_repo.get_by_id(dept_id)
        if row is None:
            raise NotFoundError(f"Department {dept_id} not found")
        return DepartmentResponse(**row)

    def get_department_by_route(self, route: str) -> DepartmentResponse:
        row = self._dept_repo.get_by_route(route)
        if row is None:
            raise NotFoundError(f"Department with route '{route}' not found")
        return DepartmentResponse(**row)

    def list_processes(self, dept_id: int, offset: int, limit: int) -> tuple[List[ProcessSummary], int]:
        # Ensure department exists
        if self._dept_repo.get_by_id(dept_id) is None:
            raise NotFoundError(f"Department {dept_id} not found")
        rows = self._process_repo.list_by_department(dept_id, offset=offset, limit=limit)
        total = self._process_repo.count_by_department(dept_id)
        return [ProcessSummary(**r) for r in rows], total

    def get_ai_stack(self, dept_id: int) -> List[AIMappingResponse]:
        if self._dept_repo.get_by_id(dept_id) is None:
            raise NotFoundError(f"Department {dept_id} not found")
        rows = self._dept_repo.get_ai_mappings(dept_id)
        return [AIMappingResponse(**r) for r in rows]

    def get_roi_metrics(self, dept_id: int) -> List[dict]:
        if self._dept_repo.get_by_id(dept_id) is None:
            raise NotFoundError(f"Department {dept_id} not found")
        return self._dept_repo.get_roi_metrics(dept_id)
