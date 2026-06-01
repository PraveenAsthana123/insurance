"""Schemas for §68.11 multi-model comparison."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, field_validator


class ModelCompareRequest(BaseModel):
    """Input: a list of model_ids to compare on a named eval_set."""

    models: list[str] = Field(..., min_length=1, max_length=8)
    eval_set: str | None = Field(default=None, max_length=120)
    tenant_id: str | None = Field(default=None, max_length=120)
    metrics: list[str] | None = Field(default=None, max_length=20)

    @field_validator("models")
    @classmethod
    def _strip_models(cls, value: list[str]) -> list[str]:
        return [m.strip() for m in value if m and m.strip()]


class ModelCompareResponse(BaseModel):
    """Normalized comparison result."""

    status: str    # "executed" | "validation_error"
    comparison_id: str | None = None
    policy: str | None = None
    ts: float | None = None
    requested_by: str | None = None
    request_id: str | None = None
    tenant_id: str | None = None
    eval_set: str | None = None
    metrics_requested: list[str] | None = None
    n_models: int | None = None
    models: list[str] | None = None
    scorecard: list[dict[str, Any]] | None = None
    winners: dict[str, str | None] | None = None
    persisted_path: str | None = None
    errors: list[str] | None = None
