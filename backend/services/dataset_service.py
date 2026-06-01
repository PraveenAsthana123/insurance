from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import psycopg2

from core.exceptions import DataError, NotFoundError, ValidationError
from repositories.dataset_repo import DatasetRepository
from schemas.dataset import DatasetPreview, DatasetResponse, DatasetSummary

logger = logging.getLogger(__name__)

_ALLOWED_EXTENSIONS = {".csv"}
_MAX_UPLOAD_BYTES = 100 * 1024 * 1024  # 100 MB
_PREVIEW_ROWS = 50


class DatasetService:
    def __init__(self, dataset_repo: DatasetRepository) -> None:
        self._repo = dataset_repo

    def list_datasets(self, offset: int, limit: int) -> tuple[List[DatasetSummary], int]:
        rows = self._repo.list_all(offset=offset, limit=limit)
        total = self._repo.count()
        return [DatasetSummary(**r) for r in rows], total

    def get_dataset(self, dataset_id: int) -> DatasetResponse:
        row = self._repo.get_by_id(dataset_id)
        if row is None:
            raise NotFoundError(f"Dataset {dataset_id} not found")
        return DatasetResponse(**row)

    def create_dataset(
        self,
        name: str,
        kaggle_url: Optional[str] = None,
        description: Optional[str] = None,
        data_type: Optional[str] = None,
        department_ids: Optional[List[int]] = None,
    ) -> DatasetResponse:
        try:
            row = self._repo.create(
                name=name,
                kaggle_url=kaggle_url,
                description=description,
                data_type=data_type,
            )
        except psycopg2.IntegrityError as exc:
            raise DataError(f"Dataset with name '{name}' already exists") from exc

        dataset_id = row["id"]
        if department_ids:
            for dept_id in department_ids:
                try:
                    self._repo.link_department(dataset_id, dept_id)
                except psycopg2.Error:
                    logger.warning("Failed to link department %d to dataset %d", dept_id, dataset_id)

        return DatasetResponse(**row)

    def upload_csv(
        self,
        dataset_id: int,
        filename: str,
        file_content: bytes,
        upload_dir: str,
    ) -> DatasetResponse:
        import re

        # Validate dataset exists
        row = self._repo.get_by_id(dataset_id)
        if row is None:
            raise NotFoundError(f"Dataset {dataset_id} not found")

        # Validate filename — allow only alphanumeric, underscores, hyphens, dots
        safe_name = re.sub(r"[^\w.\-]", "_", filename)
        ext = Path(safe_name).suffix.lower()
        if ext not in _ALLOWED_EXTENSIONS:
            raise ValidationError(f"Only CSV files are allowed. Got: {ext}")

        if len(file_content) > _MAX_UPLOAD_BYTES:
            raise ValidationError(f"File too large. Max size: {_MAX_UPLOAD_BYTES // (1024*1024)} MB")

        # Guard against path traversal
        upload_path = Path(upload_dir).resolve()
        target = (upload_path / f"dataset_{dataset_id}{ext}").resolve()
        if not str(target).startswith(str(upload_path)):
            raise ValidationError("Invalid file path")

        upload_path.mkdir(parents=True, exist_ok=True)
        with open(target, "wb") as f:
            f.write(file_content)

        # Parse columns from CSV
        columns_info = self._parse_csv_columns(target)
        self._repo.update_columns_info(dataset_id, columns_info, str(target))

        updated = self._repo.get_by_id(dataset_id)
        return DatasetResponse(**updated)

    def preview_dataset(self, dataset_id: int) -> DatasetPreview:
        row = self._repo.get_by_id(dataset_id)
        if row is None:
            raise NotFoundError(f"Dataset {dataset_id} not found")
        if not row.get("file_path"):
            raise DataError("Dataset has no uploaded file")

        file_path = Path(row["file_path"])
        if not file_path.exists():
            raise DataError(f"Dataset file not found at path: {file_path}")

        return self._read_csv_preview(file_path)

    def _parse_csv_columns(self, file_path: Path) -> Dict[str, Any]:
        import csv

        with open(file_path, newline="", encoding="utf-8", errors="replace") as f:
            reader = csv.reader(f)
            headers = next(reader, [])
        return {"columns": headers, "count": len(headers)}

    def _read_csv_preview(self, file_path: Path) -> DatasetPreview:
        import csv

        columns: List[str] = []
        rows: List[List[Any]] = []
        total_rows = 0

        with open(file_path, newline="", encoding="utf-8", errors="replace") as f:
            reader = csv.reader(f)
            columns = next(reader, [])
            for i, row in enumerate(reader):
                total_rows += 1
                if i < _PREVIEW_ROWS:
                    rows.append(row)

        return DatasetPreview(
            columns=columns,
            rows=rows,
            total_rows=total_rows,
            preview_rows=len(rows),
        )
