"""Tests for the unified agent platform setup/status API."""
from __future__ import annotations

import re

import pytest
from fastapi.testclient import TestClient

from core.rbac_middleware import PERMS_MATRIX, _READ_ROLES
from main import app
from routers.agent_platform import get_agent_platform_service, router as agent_platform_router
from services.agent_platform_service import AgentPlatformIntegrationService


def ensure_agent_platform_router_mounted() -> None:
    paths = {getattr(route, "path", "") for route in app.routes}
    if "/api/v1/agent-platform/status" not in paths:
        app.include_router(agent_platform_router)
    patterns = {rx.pattern for _, rx, _ in PERMS_MATRIX}
    if r"^/api/v1/agent-platform/status$" not in patterns:
        PERMS_MATRIX.extend([
            ("GET", re.compile(r"^/api/v1/agent-platform/status$"), _READ_ROLES),
            ("GET", re.compile(r"^/api/v1/agent-platform/manifest$"), _READ_ROLES),
            ("POST", re.compile(r"^/api/v1/agent-platform/governance/evaluate$"), _READ_ROLES),
            ("POST", re.compile(r"^/api/v1/agent-platform/cua/execute$"), {"manager", "tester"}),
            ("POST", re.compile(r"^/api/v1/agent-platform/approval-broker/decide$"), {"manager", "tester"}),
            ("POST", re.compile(r"^/api/v1/agent-platform/typed-council/run$"), {"manager", "tester"}),
        ])


@pytest.fixture()
def client() -> TestClient:
    ensure_agent_platform_router_mounted()
    return TestClient(app)


def test_agent_platform_status_lists_requested_tools(client: TestClient) -> None:
    response = client.get("/api/v1/agent-platform/status", headers={"X-Demo-Role": "tester"})
    assert response.status_code == 200
    payload = response.json()
    keys = {tool["key"] for tool in payload["tools"]}
    assert {"harness-agent", "openclaw", "paperclip", "poliysai", "cua", "stagehand", "playwright"}.issubset(keys)
    assert "supervise" in payload["command_surface"]


def test_agent_platform_manifest_contract(client: TestClient) -> None:
    response = client.get("/api/v1/agent-platform/manifest", headers={"X-Demo-Role": "compliance"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["platform"] == "HOLY Beverage Agent Platform"
    assert "governance_contract" in payload
    assert "observability_contract" in payload


def test_poliysai_governance_denies_secret_target(client: TestClient) -> None:
    response = client.post(
        "/api/v1/agent-platform/governance/evaluate",
        headers={"X-Demo-Role": "tester"},
        json={
            "agent_id": "sec-agent",
            "tool": "poliysai",
            "action": "read secret token",
            "target": "production/private_key",
            "user_role": "tester",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["decision"] == "deny"
    assert "dangerous-operation" in payload["reason"]


def test_cua_dry_run_allowed_for_manager(client: TestClient) -> None:
    response = client.post(
        "/api/v1/agent-platform/cua/execute",
        headers={"X-Demo-Role": "manager"},
        json={
            "instruction": "click the refresh button in browser",
            "target": "http://localhost:3000",
            "adapter": "stagehand",
            "dry_run": True,
            "user_role": "manager",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "dry-run"
    assert payload["policy"]["decision"] == "allow"
    assert payload["adapter"] == "stagehand"


def test_cua_real_write_requires_manager_or_tester_rbac(client: TestClient) -> None:
    response = client.post(
        "/api/v1/agent-platform/cua/execute",
        headers={"X-Demo-Role": "team-member"},
        json={"instruction": "click submit", "target": "http://localhost:3000", "dry_run": False},
    )
    assert response.status_code == 403

def test_typed_council_run_default_disabled_is_tenant_scoped(
    client: TestClient, monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("HOLY_TYPED_COUNCIL_ENABLED", raising=False)
    response = client.post(
        "/api/v1/agent-platform/typed-council/run",
        headers={"X-Demo-Role": "manager", "X-Tenant-ID": "tenant-council"},
        json={
            "prompt": "Should we deploy the typed council pilot?",
            "metadata": {"tenant_id": "spoofed", "agent_id": "pytest-council"},
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["outcome"] == "disabled"
    assert payload["tenant_id"] == "tenant-council"
    assert payload["policy"]["decision"] == "allow"
    assert payload["policy"]["audit"]["metadata"]["tenant_id"] == "tenant-council"
    assert payload["author"] is None
    assert payload["reviewer"] is None
    assert payload["chair"] is None


def test_typed_council_run_rbac_blocks_team_member(client: TestClient) -> None:
    response = client.post(
        "/api/v1/agent-platform/typed-council/run",
        headers={"X-Demo-Role": "team-member", "X-Tenant-ID": "tenant-council"},
        json={"prompt": "Should this be blocked?"},
    )
    assert response.status_code == 403

def test_approval_broker_auto_approves_safe_local_work(client: TestClient) -> None:
    response = client.post(
        "/api/v1/agent-platform/approval-broker/decide",
        headers={"X-Demo-Role": "manager", "X-Tenant-ID": "tenant-approval"},
        json={
            "action": "approve next local docs validation",
            "target": "project_doctor dry-run",
            "metadata": {"tenant_id": "spoofed"},
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["decision"] == "auto_approved"
    assert payload["risk_level"] == "low"
    assert payload["tenant_id"] == "tenant-approval"
    assert payload["policy"]["decision"] == "allow"
    assert payload["submitted"] is False


def test_approval_broker_requires_human_for_production_secret(client: TestClient) -> None:
    response = client.post(
        "/api/v1/agent-platform/approval-broker/decide",
        headers={"X-Demo-Role": "manager", "X-Tenant-ID": "tenant-approval"},
        json={
            "action": "approve production deploy with secret token",
            "target": "production/private_key",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["decision"] in {"require_human_approval", "deny"}
    assert payload["risk_level"] == "high"
    assert payload["submitted"] is False


def test_approval_broker_submit_next_uses_openclaw_when_safe(client: TestClient) -> None:
    class FakeApprovalBrokerService(AgentPlatformIntegrationService):
        def decide_approval_broker(self, request):  # type: ignore[no-untyped-def]
            response = super().decide_approval_broker(request)
            if response.submitted and response.openclaw_task:
                response.openclaw_task["task_id"] = "approval-test-task"
            return response

    # Patch OpenClaw enqueue inside the service module to avoid Redis dependency.
    import services.agent_platform_service as svc_mod

    class FakeOpenClawGatewayService:
        def enqueue(self, request):  # type: ignore[no-untyped-def]
            from schemas.openclaw import OpenClawTaskResponse
            return OpenClawTaskResponse(
                task_id="approval-test-task",
                mode=request.mode,
                queue="council_tasks",
                status="queued",
                queue_length=1,
            )

    original_openclaw = svc_mod.OpenClawGatewayService
    svc_mod.OpenClawGatewayService = FakeOpenClawGatewayService
    try:
        app.dependency_overrides[get_agent_platform_service] = lambda: FakeApprovalBrokerService()
        response = client.post(
            "/api/v1/agent-platform/approval-broker/decide",
            headers={"X-Demo-Role": "manager", "X-Tenant-ID": "tenant-approval"},
            json={
                "action": "approve next local validation",
                "target": "project_doctor",
                "submit_next": True,
                "next_prompt": "Run local project_doctor and summarize failures",
                "department": "engineering",
            },
        )
    finally:
        svc_mod.OpenClawGatewayService = original_openclaw
        app.dependency_overrides.clear()

    assert response.status_code == 200
    payload = response.json()
    assert payload["decision"] == "auto_approved"
    assert payload["submitted"] is True
    assert payload["openclaw_task"]["task_id"] == "approval-test-task"


def test_approval_broker_rbac_blocks_team_member(client: TestClient) -> None:
    response = client.post(
        "/api/v1/agent-platform/approval-broker/decide",
        headers={"X-Demo-Role": "team-member", "X-Tenant-ID": "tenant-approval"},
        json={"action": "approve next local validation"},
    )
    assert response.status_code == 403

