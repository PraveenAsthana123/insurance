"""Tests for the local Paperclip context/artifact adapter API."""
from __future__ import annotations

import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from core.rbac_middleware import PERMS_MATRIX, _READ_ROLES
from main import app
from routers.paperclip import get_paperclip_service, router as paperclip_router
from services.paperclip_service import PaperclipService


def ensure_paperclip_router_mounted() -> None:
    paths = {getattr(route, "path", "") for route in app.routes}
    if "/api/v1/paperclip/status" not in paths:
        app.include_router(paperclip_router)
    patterns = {rx.pattern for _, rx, _ in PERMS_MATRIX}
    if r"^/api/v1/paperclip/clips$" not in patterns:
        PERMS_MATRIX.extend([
            ("GET", re.compile(r"^/api/v1/paperclip/status$"), _READ_ROLES),
            ("GET", re.compile(r"^/api/v1/paperclip/clips$"), _READ_ROLES),
            ("GET", re.compile(r"^/api/v1/paperclip/clips/[^/]+$"), _READ_ROLES),
            ("POST", re.compile(r"^/api/v1/paperclip/clips$"), {"manager"}),
            ("POST", re.compile(r"^/api/v1/paperclip/context-pack$"), _READ_ROLES),
            ("DELETE", re.compile(r"^/api/v1/paperclip/clips/[^/]+$"), {"manager"}),
        ])


@pytest.fixture()
def client(tmp_path: Path) -> TestClient:
    ensure_paperclip_router_mounted()
    app.dependency_overrides[get_paperclip_service] = lambda: PaperclipService(tmp_path)
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def test_paperclip_status(client: TestClient) -> None:
    response = client.get("/api/v1/paperclip/status", headers={"X-Demo-Role": "tester"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["available"] is True
    assert payload["external_framework_installed"] is False
    assert payload["artifact_count"] == 0


def test_create_get_list_and_context_pack_redacts_pii(client: TestClient) -> None:
    create = client.post(
        "/api/v1/paperclip/clips",
        json={
            "title": "Sales trace",
            "content": "Customer email ada@example.com called from 555-123-4567 about shipment delay.",
            "content_type": "trace",
            "source": "pytest",
            "metadata": {"department": "sales"},
        },
        headers={"X-Demo-Role": "manager"},
    )
    assert create.status_code == 201
    created = create.json()
    assert created["id"].startswith("clip-")
    assert created["redacted"] is True
    assert "sha256" in created

    list_response = client.get("/api/v1/paperclip/clips", headers={"X-Demo-Role": "team-member"})
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    detail_response = client.get(f"/api/v1/paperclip/clips/{created['id']}", headers={"X-Demo-Role": "compliance"})
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert "[REDACTED_EMAIL]" in detail["content"]
    assert "[REDACTED_PHONE]" in detail["content"]

    pack_response = client.post(
        "/api/v1/paperclip/context-pack",
        json={"clip_ids": [created["id"]], "include_metadata": True},
        headers={"X-Demo-Role": "tester"},
    )
    assert pack_response.status_code == 200
    pack = pack_response.json()
    assert created["id"] in pack["clip_ids"]
    assert "Sales trace" in pack["context"]
    assert "[REDACTED_EMAIL]" in pack["context"]


def test_non_manager_cannot_create_or_delete(client: TestClient) -> None:
    blocked = client.post(
        "/api/v1/paperclip/clips",
        json={"title": "Blocked", "content": "should fail"},
        headers={"X-Demo-Role": "tester"},
    )
    assert blocked.status_code == 403

    created = client.post(
        "/api/v1/paperclip/clips",
        json={"title": "Delete me", "content": "temporary"},
        headers={"X-Demo-Role": "manager"},
    ).json()
    denied = client.delete(f"/api/v1/paperclip/clips/{created['id']}", headers={"X-Demo-Role": "tester"})
    assert denied.status_code == 403


def test_manager_can_delete(client: TestClient) -> None:
    created = client.post(
        "/api/v1/paperclip/clips",
        json={"title": "Delete me", "content": "temporary"},
        headers={"X-Demo-Role": "manager"},
    ).json()
    response = client.delete(f"/api/v1/paperclip/clips/{created['id']}", headers={"X-Demo-Role": "manager"})
    assert response.status_code == 200
    assert response.json()["message"] == "deleted"

    missing = client.get(f"/api/v1/paperclip/clips/{created['id']}", headers={"X-Demo-Role": "manager"})
    assert missing.status_code == 404

def test_create_clip_idempotency_replays_cached_response(
    client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("IDEMPOTENCY_PATH_PAPERCLIP", str(tmp_path / "paperclip_idempotency.jsonl"))
    headers = {
        "X-Demo-Role": "manager",
        "X-Tenant-ID": "tenant-paperclip",
        "Idempotency-Key": "paperclip-retry-1",
    }

    first = client.post(
        "/api/v1/paperclip/clips",
        json={
            "title": "Retry artifact",
            "content": "store this only once",
            "metadata": {"tenant_id": "spoofed", "trace": "first"},
        },
        headers=headers,
    )
    second = client.post(
        "/api/v1/paperclip/clips",
        json={"title": "Different retry body", "content": "would create duplicate without cache"},
        headers=headers,
    )

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json() == second.json()
    assert second.headers["X-Idempotent-Replay"] == "true"
    assert first.json()["metadata"]["tenant_id"] == "tenant-paperclip"

    listed = client.get(
        "/api/v1/paperclip/clips",
        headers={"X-Demo-Role": "manager", "X-Tenant-ID": "tenant-paperclip"},
    )
    assert listed.status_code == 200
    assert len(listed.json()) == 1


def test_create_clip_idempotency_is_tenant_isolated(
    client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("IDEMPOTENCY_PATH_PAPERCLIP", str(tmp_path / "paperclip_idempotency.jsonl"))

    first = client.post(
        "/api/v1/paperclip/clips",
        json={"title": "Tenant A", "content": "same key"},
        headers={"X-Demo-Role": "manager", "X-Tenant-ID": "tenant-a", "Idempotency-Key": "shared-key"},
    )
    second = client.post(
        "/api/v1/paperclip/clips",
        json={"title": "Tenant B", "content": "same key"},
        headers={"X-Demo-Role": "manager", "X-Tenant-ID": "tenant-b", "Idempotency-Key": "shared-key"},
    )

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] != second.json()["id"]
    assert "X-Idempotent-Replay" not in second.headers

