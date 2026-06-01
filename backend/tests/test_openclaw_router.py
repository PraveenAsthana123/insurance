"""OpenClaw bridge router tests.

The tests replace the Redis-backed service dependency with a fake service. That
keeps API contract and RBAC coverage deterministic while service-level Redis
behavior remains isolated in OpenClawGatewayService.
"""
from __future__ import annotations

from typing import Any
from pathlib import Path
import re

import pytest
from fastapi.testclient import TestClient

from core.rbac_middleware import PERMS_MATRIX, _READ_ROLES
from main import app
from routers.openclaw import get_openclaw_service, router as openclaw_router
from schemas.openclaw import (
    OpenClawManifestResponse,
    OpenClawQueueStatus,
    OpenClawStatusResponse,
    OpenClawTaskRequest,
    OpenClawTaskResponse,
    OpenClawTaskResultResponse,
)


def ensure_openclaw_router_mounted() -> None:
    """Mount OpenClaw routes/RBAC on the shared test app if import order omitted them."""
    paths = {getattr(route, "path", "") for route in app.routes}
    if "/api/v1/openclaw/status" not in paths:
        app.include_router(openclaw_router)

    patterns = {rx.pattern for _, rx, _ in PERMS_MATRIX}
    if r"^/api/v1/openclaw/tasks$" not in patterns:
        PERMS_MATRIX.extend([
            ("GET", re.compile(r"^/api/v1/openclaw/status$"), _READ_ROLES),
            ("GET", re.compile(r"^/api/v1/openclaw/manifest$"), _READ_ROLES),
            ("POST", re.compile(r"^/api/v1/openclaw/tasks$"), {"manager"}),
            ("GET", re.compile(r"^/api/v1/openclaw/tasks/[^/]+$"), _READ_ROLES),
        ])


class FakeOpenClawService:
    def status(self) -> OpenClawStatusResponse:
        return OpenClawStatusResponse(
            available=True,
            redis_url="redis://localhost:6379/0",
            detail="fake redis is available",
            queues=[
                OpenClawQueueStatus(
                    mode="council",
                    task_queue="council_tasks",
                    done_queue="council_done",
                    task_queue_length=1,
                    done_queue_length=2,
                )
            ],
        )

    def manifest(self) -> OpenClawManifestResponse:
        return OpenClawManifestResponse(
            name="test-openclaw-bridge",
            status="working-local-bridge",
            external_gateway_installed=False,
            modes=["council", "simple"],
            endpoints={"create_task": "POST /api/v1/openclaw/tasks"},
            task_contract={"input": {"prompt": "required string"}},
            governance=["RBAC protected"],
        )

    def enqueue(self, request: OpenClawTaskRequest) -> OpenClawTaskResponse:
        return OpenClawTaskResponse(
            task_id=request.task_id or "openclaw-test1234",
            mode=request.mode,
            queue="council_tasks" if request.mode == "council" else "tasks",
            status="queued",
            queue_length=3,
        )

    def get_result(self, task_id: str, mode: str = "council") -> OpenClawTaskResultResponse:
        if task_id == "done-task":
            return OpenClawTaskResultResponse(
                task_id=task_id,
                mode=mode,  # type: ignore[arg-type]
                status="done",
                result={"task_id": task_id, "answer": "completed"},
            )
        return OpenClawTaskResultResponse(task_id=task_id, mode=mode, status="pending")  # type: ignore[arg-type]


@pytest.fixture()
def client() -> TestClient:
    ensure_openclaw_router_mounted()
    app.dependency_overrides[get_openclaw_service] = lambda: FakeOpenClawService()
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def test_openclaw_status_contract(client: TestClient) -> None:
    response = client.get("/api/v1/openclaw/status", headers={"X-Demo-Role": "tester"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["available"] is True
    assert payload["queues"][0]["task_queue"] == "council_tasks"


def test_openclaw_manifest_contract(client: TestClient) -> None:
    response = client.get("/api/v1/openclaw/manifest", headers={"X-Demo-Role": "team-member"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "working-local-bridge"
    assert payload["external_gateway_installed"] is False


def test_openclaw_create_task_manager_allowed(client: TestClient) -> None:
    body: dict[str, Any] = {
        "prompt": "Run council review for sales forecast governance",
        "department": "sales",
        "mode": "council",
        "metadata": {"priority": "high"},
    }
    response = client.post(
        "/api/v1/openclaw/tasks",
        json=body,
        headers={"X-Demo-Role": "manager"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["task_id"] == "openclaw-test1234"
    assert payload["queue"] == "council_tasks"
    assert payload["status"] == "queued"


def test_openclaw_create_task_non_manager_forbidden(client: TestClient) -> None:
    response = client.post(
        "/api/v1/openclaw/tasks",
        json={"prompt": "blocked"},
        headers={"X-Demo-Role": "tester"},
    )
    assert response.status_code == 403
    assert response.json()["error_code"] == "FORBIDDEN"


def test_openclaw_get_task_result(client: TestClient) -> None:
    response = client.get(
        "/api/v1/openclaw/tasks/done-task?mode=council",
        headers={"X-Demo-Role": "compliance"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "done"
    assert payload["result"]["answer"] == "completed"


def test_openclaw_rejects_blank_prompt(client: TestClient) -> None:
    response = client.post(
        "/api/v1/openclaw/tasks",
        json={"prompt": "   "},
        headers={"X-Demo-Role": "manager"},
    )
    assert response.status_code == 422

def test_openclaw_create_task_idempotency_replays_cached_response(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    ensure_openclaw_router_mounted()
    monkeypatch.setenv("IDEMPOTENCY_PATH_OPENCLAW", str(tmp_path / "openclaw_idempotency.jsonl"))

    class CountingOpenClawService(FakeOpenClawService):
        calls = 0

        def enqueue(self, request: OpenClawTaskRequest) -> OpenClawTaskResponse:
            type(self).calls += 1
            return OpenClawTaskResponse(
                task_id=f"openclaw-count-{type(self).calls}",
                mode=request.mode,
                queue="council_tasks",
                status="queued",
                queue_length=type(self).calls,
            )

    app.dependency_overrides[get_openclaw_service] = lambda: CountingOpenClawService()
    try:
        client = TestClient(app)
        headers = {
            "X-Demo-Role": "manager",
            "X-Tenant-ID": "tenant-openclaw",
            "Idempotency-Key": "openclaw-retry-1",
        }
        first = client.post(
            "/api/v1/openclaw/tasks",
            json={"prompt": "Run once", "metadata": {"tenant_id": "spoofed"}},
            headers=headers,
        )
        second = client.post(
            "/api/v1/openclaw/tasks",
            json={"prompt": "Retry should replay", "task_id": "different"},
            headers=headers,
        )
    finally:
        app.dependency_overrides.clear()

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == second.json()
    assert second.headers["X-Idempotent-Replay"] == "true"
    assert CountingOpenClawService.calls == 1

