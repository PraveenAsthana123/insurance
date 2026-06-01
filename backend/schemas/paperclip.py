"""Paperclip local context/artifact adapter schemas.

The project uses Paperclip as a local artifact/context-pack adapter. It is not an
external Paperclip framework integration. These schemas describe how callers add
small text artifacts, inspect them, and compose context packs for agent tasks.
"""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

PaperclipContentType = Literal["text", "markdown", "json", "log", "trace"]


class PaperclipCreateRequest(BaseModel):
    """Input model for creating a local Paperclip artifact.

    Input:
        title: Human-readable artifact title.
        content: Text content to store after optional redaction.
        content_type: Lightweight classification used by downstream agents.
        source: Origin system or workflow name.
        metadata: Extra structured labels such as task id, department, trace id.
        redact_pii: Whether basic email/phone redaction should be applied.

    Process:
        The service validates size, redacts simple PII, hashes the stored content,
        and writes a JSON artifact under the local Paperclip store.

    Output:
        PaperclipArtifactResponse with id, hash, preview, and metadata.
    """

    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1, max_length=200_000)
    content_type: PaperclipContentType = "text"
    source: str = Field(default="paperclip-api", max_length=120)
    metadata: dict[str, Any] = Field(default_factory=dict)
    redact_pii: bool = True
    idempotency_key: str | None = Field(
        default=None, max_length=128,
        description=(
            "Optional caller-supplied key for idempotent retries. Cached per "
            "(tenant_id, idempotency_key) for ~5 minutes per §10.3. "
            "Also accepted as the Idempotency-Key request header."
        ),
    )

    @field_validator("title", "content", "source")
    @classmethod
    def strip_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("field must not be blank")
        return stripped


class PaperclipArtifactResponse(BaseModel):
    """Response model for a stored Paperclip artifact."""

    id: str
    title: str
    content_type: PaperclipContentType
    source: str
    metadata: dict[str, Any]
    sha256: str
    size_bytes: int
    preview: str
    created_at: float
    redacted: bool


class PaperclipArtifactDetail(PaperclipArtifactResponse):
    """Detailed artifact response that includes stored content."""

    content: str


class PaperclipContextPackRequest(BaseModel):
    """Input model for composing several artifacts into one context pack."""

    clip_ids: list[str] = Field(..., min_length=1, max_length=50)
    max_chars: int = Field(default=20_000, ge=100, le=100_000)
    include_metadata: bool = True
    separator: str = Field(default="\n\n---\n\n", max_length=40)


class PaperclipContextPackResponse(BaseModel):
    """Composed context pack returned to agents or orchestration layers."""

    clip_ids: list[str]
    missing_ids: list[str]
    total_chars: int
    truncated: bool
    context: str


class PaperclipStatusResponse(BaseModel):
    """Runtime status for the local Paperclip adapter."""

    available: bool
    external_framework_installed: bool
    storage_root: str
    artifact_count: int
    max_content_chars: int
    detail: str
