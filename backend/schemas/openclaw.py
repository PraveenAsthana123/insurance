"""OpenClaw bridge schemas.

These models define the repo-local OpenClaw-compatible contract. The bridge accepts
external orchestration requests, normalizes them into the existing Redis-backed
agent queues, and returns a stable polling shape for callers.
"""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

OpenClawMode = Literal["council", "simple"]


class OpenClawTaskRequest(BaseModel):
    """Input payload for creating an OpenClaw bridge task.

    Input:
        prompt: Work request to send to the selected worker queue.
        department: Optional business department or domain label.
        mode: Queue family. "council" routes to council_agents; "simple" routes
            to the legacy simple worker queue.
        task_id: Optional caller-provided id for idempotent external orchestration.
        source: Origin label used in audit/debug traces.
        metadata: Extra structured context that is forwarded to the worker.

    Process:
        The service validates prompt content, assigns an id when needed, and
        serializes the task onto the Redis queue selected by mode.

    Output:
        OpenClawTaskResponse with the generated task id and queue status.
    """

    prompt: str = Field(..., min_length=1, description="Task prompt for the agent workflow")
    department: str = Field(default="", description="Business department/domain context")
    mode: OpenClawMode = Field(default="council", description="OpenClaw execution bridge mode")
    task_id: str | None = Field(default=None, description="Optional caller-supplied id")
    source: str = Field(default="openclaw-bridge", description="Audit source label")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Additional task context")
    idempotency_key: str | None = Field(
        default=None, max_length=128,
        description=(
            "Optional caller-supplied key for idempotent retries. Cached per "
            "(tenant_id, idempotency_key) for ~5 minutes per §10.3. "
            "Also accepted as the Idempotency-Key request header."
        ),
    )

    @field_validator("prompt")
    @classmethod
    def strip_prompt(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("prompt must not be blank")
        return stripped

    @field_validator("task_id")
    @classmethod
    def strip_task_id(cls, value: str | None) -> str | None:
        if value is None:
            return value
        stripped = value.strip()
        return stripped or None


class OpenClawTaskResponse(BaseModel):
    """Response returned after a task is accepted by the OpenClaw bridge."""

    task_id: str
    mode: OpenClawMode
    queue: str
    status: Literal["queued"]
    queue_length: int


class OpenClawTaskResultResponse(BaseModel):
    """Polling response for OpenClaw task completion."""

    task_id: str
    mode: OpenClawMode
    status: Literal["pending", "done"]
    result: dict[str, Any] | None = None


class OpenClawQueueStatus(BaseModel):
    """Redis queue length snapshot for one OpenClaw bridge mode."""

    mode: OpenClawMode
    task_queue: str
    done_queue: str
    task_queue_length: int
    done_queue_length: int


class OpenClawStatusResponse(BaseModel):
    """Runtime health response for the OpenClaw bridge."""

    available: bool
    redis_url: str
    queues: list[OpenClawQueueStatus]
    detail: str


class OpenClawManifestResponse(BaseModel):
    """Machine-readable contract for external OpenClaw-style orchestrators."""

    name: str
    status: str
    external_gateway_installed: bool
    modes: list[OpenClawMode]
    endpoints: dict[str, str]
    task_contract: dict[str, Any]
    governance: list[str]
