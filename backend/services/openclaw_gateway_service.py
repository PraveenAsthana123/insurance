"""OpenClaw bridge service.

This service makes OpenClaw usable in this project without pretending that an
external OpenClaw gateway SDK is installed. It exposes an OpenClaw-compatible
API contract and routes work into the existing Redis-backed worker queues:

- council mode: council_tasks -> council_done
- simple mode: tasks -> done

The router owns HTTP concerns. This service owns task serialization, Redis IO,
queue selection, polling, and operational logging.
"""
from __future__ import annotations

import json
import logging
import time
import uuid
from typing import Any
from urllib.parse import urlsplit, urlunsplit

import redis

from core.config import Settings, get_settings
from schemas.openclaw import (
    OpenClawManifestResponse,
    OpenClawMode,
    OpenClawQueueStatus,
    OpenClawStatusResponse,
    OpenClawTaskRequest,
    OpenClawTaskResponse,
    OpenClawTaskResultResponse,
)

logger = logging.getLogger(__name__)

_QUEUE_MAP: dict[OpenClawMode, tuple[str, str]] = {
    "council": ("council_tasks", "council_done"),
    "simple": ("tasks", "done"),
}
RESULT_SCAN_LIMIT = 500


class OpenClawGatewayService:
    """Service-layer adapter between OpenClaw-style calls and Redis workers.

    Input:
        OpenClawTaskRequest from the API layer, plus an optional mode for result
        polling.

    Process:
        Selects the correct queue, serializes a governed task envelope, writes it
        to Redis, and scans completion queues for results. It never executes an
        agent directly.

    Output:
        Pydantic response models that the router returns as JSON.
    """

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._redis: redis.Redis | None = None

    @property
    def redis_url(self) -> str:
        return self.settings.redis_url

    def status(self) -> OpenClawStatusResponse:
        """Return Redis availability and queue length details for every mode."""
        client = self._client()
        queues: list[OpenClawQueueStatus] = []
        try:
            client.ping()
            for mode, (task_queue, done_queue) in _QUEUE_MAP.items():
                queues.append(
                    OpenClawQueueStatus(
                        mode=mode,
                        task_queue=task_queue,
                        done_queue=done_queue,
                        task_queue_length=int(client.llen(task_queue)),
                        done_queue_length=int(client.llen(done_queue)),
                    )
                )
            return OpenClawStatusResponse(
                available=True,
                redis_url=_redact_url(self.redis_url),
                queues=queues,
                detail="OpenClaw bridge is connected to Redis queues.",
            )
        except Exception as exc:  # pragma: no cover - exercised by integration env failures
            logger.exception("openclaw.status.failed")
            return OpenClawStatusResponse(
                available=False,
                redis_url=_redact_url(self.redis_url),
                queues=queues,
                detail=f"Redis unavailable: {exc}",
            )

    def enqueue(self, request: OpenClawTaskRequest) -> OpenClawTaskResponse:
        """Serialize a task request and push it to the selected Redis queue."""
        task_queue, _ = self._queues(request.mode)
        task_id = request.task_id or f"openclaw-{uuid.uuid4().hex[:8]}"
        task = {
            "id": task_id,
            "task_id": task_id,
            "department": request.department,
            "prompt": request.prompt,
            "seeded_at": time.time(),
            "source": request.source,
            "mode": request.mode,
            "metadata": request.metadata,
            "bridge": "openclaw",
        }
        client = self._client()
        client.lpush(task_queue, json.dumps(task, sort_keys=True))
        queue_length = int(client.llen(task_queue))
        logger.info(
            "openclaw.task.queued task_id=%s mode=%s queue=%s queue_length=%s",
            task_id,
            request.mode,
            task_queue,
            queue_length,
        )
        return OpenClawTaskResponse(
            task_id=task_id,
            mode=request.mode,
            queue=task_queue,
            status="queued",
            queue_length=queue_length,
        )

    def get_result(self, task_id: str, mode: OpenClawMode = "council") -> OpenClawTaskResultResponse:
        """Scan the completion queue for a matching task result."""
        _, done_queue = self._queues(mode)
        client = self._client()
        for raw in client.lrange(done_queue, 0, RESULT_SCAN_LIMIT - 1):
            try:
                item = json.loads(raw)
            except (TypeError, json.JSONDecodeError):
                logger.warning("openclaw.result.invalid_json queue=%s", done_queue)
                continue
            if _result_matches(item, task_id):
                logger.info("openclaw.task.done task_id=%s mode=%s queue=%s", task_id, mode, done_queue)
                return OpenClawTaskResultResponse(
                    task_id=task_id,
                    mode=mode,
                    status="done",
                    result=item,
                )
        return OpenClawTaskResultResponse(task_id=task_id, mode=mode, status="pending")

    def manifest(self) -> OpenClawManifestResponse:
        """Return the OpenClaw bridge contract for tools and operators."""
        return OpenClawManifestResponse(
            name="holy-insurerage-openclaw-bridge",
            status="working-local-bridge",
            external_gateway_installed=False,
            modes=list(_QUEUE_MAP.keys()),
            endpoints={
                "status": "GET /api/v1/openclaw/status",
                "manifest": "GET /api/v1/openclaw/manifest",
                "create_task": "POST /api/v1/openclaw/tasks",
                "get_task": "GET /api/v1/openclaw/tasks/{task_id}?mode=council",
            },
            task_contract={
                "input": {
                    "prompt": "required string",
                    "department": "optional string",
                    "mode": "council | simple",
                    "task_id": "optional external id",
                    "source": "optional audit source",
                    "metadata": "optional object",
                },
                "process": "Normalize request -> Redis queue -> worker/council processing -> completion queue polling.",
                "output": {
                    "queued": ["task_id", "mode", "queue", "status", "queue_length"],
                    "result": ["task_id", "mode", "status", "result"],
                },
            },
            governance=[
                "RBAC protects task creation as manager-only in demo mode.",
                "Prompt, department, source, metadata, and timestamps are stored for traceability.",
                "External OpenClaw gateway/SDK is not bundled; this is the project-local compatibility bridge.",
                "Workers remain responsible for model safety, audit output, and result schema validation.",
            ],
        )

    def _client(self) -> redis.Redis:
        if self._redis is None:
            self._redis = redis.from_url(
                self.redis_url,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=5,
            )
        return self._redis

    @staticmethod
    def _queues(mode: OpenClawMode) -> tuple[str, str]:
        return _QUEUE_MAP[mode]


def _result_matches(item: dict[str, Any], task_id: str) -> bool:
    return item.get("task_id") == task_id or item.get("id") == task_id


def _redact_url(url: str) -> str:
    parsed = urlsplit(url)
    if parsed.password is None:
        return url
    username = parsed.username or ""
    host = parsed.hostname or ""
    port = f":{parsed.port}" if parsed.port else ""
    netloc = f"{username}:***@{host}{port}" if username else f"***@{host}{port}"
    return urlunsplit((parsed.scheme, netloc, parsed.path, parsed.query, parsed.fragment))
