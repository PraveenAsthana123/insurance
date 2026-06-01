"""Local Paperclip artifact/context adapter service.

This service makes Paperclip operational as a project-local context pack system.
It stores small text artifacts as JSON files, applies basic PII redaction, hashes
stored content, and composes selected artifacts into an agent-ready context pack.

It does not install an external Paperclip framework. If a specific upstream tool
is selected later, it should be wrapped behind this service boundary.
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import time
import uuid
from pathlib import Path
from typing import Any

# Per global §1 — services must NOT raise HTTPException directly.
# We raise domain exceptions (NotFoundError / ValidationError / AppError) and
# let backend/core/error_handlers.py map them to HTTP responses.
from core.exceptions import AppError, NotFoundError, ValidationError

from schemas.paperclip import (
    PaperclipArtifactDetail,
    PaperclipArtifactResponse,
    PaperclipContextPackRequest,
    PaperclipContextPackResponse,
    PaperclipCreateRequest,
    PaperclipStatusResponse,
)

logger = logging.getLogger(__name__)

_EMAIL_RE = re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")
_PHONE_RE = re.compile(r"\b\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b")
MAX_CONTENT_CHARS = 200_000


class PaperclipService:
    """Service layer for local Paperclip artifact storage and context packs.

    Input:
        Pydantic request models from the API layer.

    Process:
        Redacts text when requested, hashes stored content, writes/reads JSON
        artifact files, and composes artifacts into bounded context strings.

    Output:
        Pydantic response models returned by the router.
    """

    def __init__(self, storage_root: Path | str | None = None) -> None:
        default_root = Path(os.environ.get("BEV_PAPERCLIP_ROOT", "data/paperclip"))
        self.storage_root = Path(storage_root) if storage_root is not None else default_root
        self.storage_root.mkdir(parents=True, exist_ok=True)

    def status(self) -> PaperclipStatusResponse:
        return PaperclipStatusResponse(
            available=True,
            external_framework_installed=False,
            storage_root=str(self.storage_root),
            artifact_count=len(list(self.storage_root.glob("*.json"))),
            max_content_chars=MAX_CONTENT_CHARS,
            detail="Local Paperclip artifact/context adapter is available. External Paperclip framework is not bundled.",
        )

    def create(
        self, request: PaperclipCreateRequest, tenant_id: str = "default",
    ) -> PaperclipArtifactResponse:
        content = request.content[:MAX_CONTENT_CHARS]
        redacted = False
        if request.redact_pii:
            content, redacted = _redact(content)
        clip_id = f"clip-{uuid.uuid4().hex[:12]}"
        created_at = time.time()
        sha = hashlib.sha256(content.encode("utf-8")).hexdigest()
        # Per §64.43 #7 — tenant_id is stored on the artifact so subsequent
        # list/get/delete can enforce tenant ownership. Body-supplied
        # metadata.tenant_id is intentionally NOT used as a source of truth
        # (router-side wiring overrides it with the middleware value).
        artifact = {
            "id": clip_id,
            "tenant_id": tenant_id,
            "title": request.title,
            "content": content,
            "content_type": request.content_type,
            "source": request.source,
            "metadata": request.metadata,
            "sha256": sha,
            "size_bytes": len(content.encode("utf-8")),
            "preview": _preview(content),
            "created_at": created_at,
            "redacted": redacted,
        }
        _write_json(self._path_for(clip_id), artifact)
        logger.info(
            "paperclip.artifact.created id=%s tenant=%s source=%s size_bytes=%s",
            clip_id, tenant_id, request.source, artifact["size_bytes"],
        )
        return PaperclipArtifactResponse(**{k: v for k, v in artifact.items() if k != "content"})

    def list(self, tenant_id: str = "default") -> list[PaperclipArtifactResponse]:
        """List artifacts belonging to the given tenant.

        Backward-compat: pre-federation artifacts without a ``tenant_id`` field
        are treated as belonging to ``"default"`` so existing data remains
        visible to operators using the default tenant. Cross-tenant reads are
        silently filtered out (per §47.6 — no enumeration leak).
        """
        artifacts = []
        for path in sorted(self.storage_root.glob("*.json"), reverse=True):
            data = _read_json(path)
            if not data:
                continue
            if data.get("tenant_id", "default") != tenant_id:
                continue
            artifacts.append(PaperclipArtifactResponse(**{k: v for k, v in data.items() if k != "content"}))
        return artifacts

    def get(self, clip_id: str, tenant_id: str = "default") -> PaperclipArtifactDetail:
        data = self._load(clip_id)
        # Per §47.6 — return 404 (not 403) on cross-tenant read so attackers
        # cannot enumerate which clip_ids exist in other tenants.
        if data.get("tenant_id", "default") != tenant_id:
            raise NotFoundError(f"Paperclip artifact not found: {clip_id}")
        return PaperclipArtifactDetail(**data)

    def delete(self, clip_id: str, tenant_id: str = "default") -> dict[str, str]:
        path = self._path_for(clip_id)
        if not path.exists():
            raise NotFoundError(f"Paperclip artifact not found: {clip_id}")
        data = _read_json(path)
        if data is None or data.get("tenant_id", "default") != tenant_id:
            # 404 not 403 — anti-enumeration; cross-tenant DELETE looks identical
            # to a missing-id DELETE so probing tells the attacker nothing.
            raise NotFoundError(f"Paperclip artifact not found: {clip_id}")
        path.unlink()
        logger.info("paperclip.artifact.deleted id=%s tenant=%s", clip_id, tenant_id)
        return {"message": "deleted", "id": clip_id}

    def build_context_pack(
        self,
        request: PaperclipContextPackRequest,
        tenant_id: str = "default",
    ) -> PaperclipContextPackResponse:
        """Compose a context pack from the caller's own artifacts only.

        Per §64.43 #7 — clip_ids that belong to other tenants are reported as
        missing (same shape as truly missing ids). This prevents both
        cross-tenant content leak AND existence-enumeration via the
        ``missing_ids`` response field.
        """
        parts: list[str] = []
        missing: list[str] = []
        total = 0
        truncated = False
        for clip_id in request.clip_ids:
            try:
                artifact = self._load(clip_id)
            except (NotFoundError, ValidationError):
                missing.append(clip_id)
                continue
            # Cross-tenant clip → looks identical to missing
            if artifact.get("tenant_id", "default") != tenant_id:
                missing.append(clip_id)
                continue
            header = f"# {artifact['title']}\nsource: {artifact['source']}\nid: {artifact['id']}"
            if request.include_metadata and artifact.get("metadata"):
                header += "\nmetadata: " + json.dumps(artifact["metadata"], sort_keys=True)
            block = header + "\n\n" + artifact["content"]
            next_total = total + len(block) + (len(request.separator) if parts else 0)
            if next_total > request.max_chars:
                remaining = request.max_chars - total - (len(request.separator) if parts else 0)
                if remaining > 0:
                    parts.append(block[:remaining])
                    total = request.max_chars
                truncated = True
                break
            parts.append(block)
            total = next_total
        context = request.separator.join(parts)
        return PaperclipContextPackResponse(
            clip_ids=[clip_id for clip_id in request.clip_ids if clip_id not in missing],
            missing_ids=missing,
            total_chars=len(context),
            truncated=truncated,
            context=context,
        )

    def _path_for(self, clip_id: str) -> Path:
        if not re.fullmatch(r"clip-[a-f0-9]{12}", clip_id):
            raise ValidationError("invalid Paperclip artifact id")
        return self.storage_root / f"{clip_id}.json"

    def _load(self, clip_id: str) -> dict[str, Any]:
        path = self._path_for(clip_id)
        if not path.exists():
            raise NotFoundError(f"Paperclip artifact not found: {clip_id}")
        data = _read_json(path)
        if data is None:
            raise AppError(f"Paperclip artifact unreadable: {clip_id}", error_code="STORAGE_ERROR")
        return data


def _redact(content: str) -> tuple[str, bool]:
    redacted = _EMAIL_RE.sub("[REDACTED_EMAIL]", content)
    redacted = _PHONE_RE.sub("[REDACTED_PHONE]", redacted)
    return redacted, redacted != content


def _preview(content: str) -> str:
    compact = " ".join(content.split())
    return compact[:240]


def _read_json(path: Path) -> dict[str, Any] | None:
    try:
        return json.loads(path.read_text())
    except Exception:
        logger.exception("paperclip.artifact.read_failed path=%s", path)
        return None


def _write_json(path: Path, data: dict[str, Any]) -> None:
    path.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n")
