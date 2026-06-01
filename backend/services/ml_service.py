from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from core.exceptions import ModelError, NotFoundError
from repositories.model_repo import ModelRepository
from schemas.model import ModelCreate, ModelResponse, ModelSummary, PredictResponse

logger = logging.getLogger(__name__)

_VALID_STATUSES = {"pending", "training", "ready", "failed", "archived"}


class MLService:
    def __init__(self, model_repo: ModelRepository) -> None:
        self._repo = model_repo

    def list_models(self, offset: int, limit: int) -> tuple[List[ModelSummary], int]:
        rows = self._repo.list_all(offset=offset, limit=limit)
        total = self._repo.count()
        return [ModelSummary(**r) for r in rows], total

    def get_model(self, model_id: int) -> ModelResponse:
        row = self._repo.get_by_id(model_id)
        if row is None:
            raise NotFoundError(f"Model {model_id} not found")
        return ModelResponse(**row)

    def create_model(self, payload: ModelCreate) -> ModelResponse:
        row = self._repo.create(
            name=payload.name,
            department_id=payload.department_id,
            process_id=payload.process_id,
            dataset_id=payload.dataset_id,
            algorithm=payload.algorithm,
        )
        logger.info("Created model id=%d name=%s", row["id"], row["name"])
        return ModelResponse(**row)

    def update_model_status(
        self,
        model_id: int,
        status: str,
        mlflow_run_id: Optional[str] = None,
        metrics: Optional[Dict[str, Any]] = None,
    ) -> None:
        if status not in _VALID_STATUSES:
            raise ModelError(f"Invalid status '{status}'. Must be one of: {_VALID_STATUSES}")
        if self._repo.get_by_id(model_id) is None:
            raise NotFoundError(f"Model {model_id} not found")
        self._repo.update_status(model_id, status, mlflow_run_id=mlflow_run_id, metrics=metrics)

    def predict(self, model_id: int, input_data: Dict[str, Any]) -> PredictResponse:
        row = self._repo.get_by_id(model_id)
        if row is None:
            raise NotFoundError(f"Model {model_id} not found")
        if row["status"] != "ready":
            raise ModelError(
                f"Model {model_id} is not ready for inference. Current status: {row['status']}"
            )
        # Placeholder inference — in production this would load the MLflow artifact
        prediction = self._run_inference(row, input_data)
        return PredictResponse(
            model_id=model_id,
            prediction=prediction,
            confidence=None,
            metadata={"algorithm": row.get("algorithm"), "mlflow_run_id": row.get("mlflow_run_id")},
        )

    def get_metrics(self, model_id: int) -> Dict[str, Any]:
        row = self._repo.get_by_id(model_id)
        if row is None:
            raise NotFoundError(f"Model {model_id} not found")
        return row.get("metrics") or {}

    def list_by_department(self, dept_id: int, offset: int, limit: int) -> tuple[List[ModelSummary], int]:
        rows = self._repo.list_by_department(dept_id, offset=offset, limit=limit)
        return [ModelSummary(**r) for r in rows], len(rows)

    def _run_inference(self, model_row: dict, input_data: Dict[str, Any]) -> Any:
        """
        Placeholder inference. Replace with actual MLflow model loading in production.
        Raises ModelError if inference fails.
        """
        try:
            # Stub: return a dict summarizing input size
            return {
                "status": "predicted",
                "input_keys": list(input_data.keys()),
                "model_name": model_row["name"],
            }
        except Exception as exc:
            raise ModelError(f"Inference failed for model {model_row['id']}: {exc}") from exc
