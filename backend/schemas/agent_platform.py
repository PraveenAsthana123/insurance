"""Unified agent platform integration schemas.

These models describe the local setup surface for Harness Agent, OpenClaw,
Paperclip, PoliysAI governance, CUA, and Stagehand/Playwright browser
adapters. The API is intentionally explicit about working-local vs dry-run vs
external-not-installed status.
"""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

ToolKey = Literal["harness-agent", "openclaw", "paperclip", "poliysai", "cua", "stagehand", "playwright", "ollama", "kivi-model", "typed-council", "approval-broker"]
ToolState = Literal["working-local", "dry-run", "external-not-installed", "disabled", "unavailable"]
PolicyDecision = Literal["allow", "deny", "require_human_approval"]


class AgentToolStatus(BaseModel):
    """Runtime/setup status for one agent-platform tool."""

    key: ToolKey
    name: str
    state: ToolState
    available: bool
    local: bool = True
    external_installed: bool = False
    endpoint: str | None = None
    required_env: list[str] = Field(default_factory=list)
    capabilities: list[str] = Field(default_factory=list)
    risk_controls: list[str] = Field(default_factory=list)
    setup_commands: list[str] = Field(default_factory=list)
    detail: str


class AgentPlatformStatusResponse(BaseModel):
    """Aggregated setup/status response for all requested agent tooling."""

    name: str
    status: Literal["ready-local", "degraded", "unavailable"]
    tools: list[AgentToolStatus]
    command_surface: dict[str, str]
    governance_summary: list[str]
    next_steps: list[str]


class AgentPlatformManifestResponse(BaseModel):
    """Machine-readable integration manifest for orchestrators and operators."""

    platform: str
    architecture: str
    ingress: list[str]
    orchestration: list[str]
    tool_contract: dict[str, Any]
    memory_contract: dict[str, Any]
    governance_contract: dict[str, Any]
    observability_contract: dict[str, Any]


class AgentPolicyEvaluationRequest(BaseModel):
    """Input for evaluating whether an agent/tool action is allowed."""

    agent_id: str = Field(default="agent-local", min_length=1)
    tool: ToolKey
    action: str = Field(..., min_length=1)
    target: str = Field(default="")
    user_role: str = Field(default="manager")
    dry_run: bool = True
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("action", "target")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()


class AgentPolicyEvaluationResponse(BaseModel):
    """Policy decision for one agent/tool action."""

    decision: PolicyDecision
    reason: str
    required_controls: list[str]
    audit: dict[str, Any]


class ApprovalBrokerRequest(BaseModel):
    """Approve/submit/next broker request.

    The broker is for local low-risk workflow automation. It classifies risk,
    auto-approves safe local work, and can submit the next task to OpenClaw.
    High-risk actions return `require_human_approval` or `deny` and are not
    submitted.
    """

    action: str = Field(..., min_length=1, max_length=500)
    target: str = Field(default="", max_length=1000)
    user_role: str = "manager"
    submit_next: bool = False
    next_prompt: str | None = Field(default=None, max_length=10_000)
    department: str = Field(default="", max_length=120)
    mode: Literal["council", "simple"] = "council"
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("action", "target", "department")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("next_prompt")
    @classmethod
    def strip_next_prompt(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class ApprovalBrokerResponse(BaseModel):
    """Approval broker decision plus optional OpenClaw submission result."""

    decision: Literal["auto_approved", "require_human_approval", "deny"]
    reason: str
    risk_level: Literal["low", "medium", "high"]
    required_controls: list[str]
    tenant_id: str
    request_id: str
    policy: AgentPolicyEvaluationResponse
    submitted: bool = False
    openclaw_task: dict[str, Any] | None = None
    audit: dict[str, Any] = Field(default_factory=dict)


class TypedCouncilRunRequest(BaseModel):
    """Input for the Pydantic AI typed 3-stage council.

    The endpoint remains default-off unless `INSUR_TYPED_COUNCIL_ENABLED=true`.
    The middleware-set tenant is injected by the router; body metadata cannot
    spoof tenant attribution.
    """

    prompt: str = Field(..., min_length=1, max_length=10_000)
    user_role: str = "manager"
    model: str | None = Field(default=None, max_length=200)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("prompt")
    @classmethod
    def strip_prompt(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("prompt must not be blank")
        return stripped


class TypedCouncilRunResponse(BaseModel):
    """Normalized typed council result for author/reviewer/chair runs."""

    outcome: Literal["executed", "disabled", "unavailable", "schema_error", "error", "blocked"]
    policy: AgentPolicyEvaluationResponse
    author: dict[str, Any] | None = None
    reviewer: dict[str, Any] | None = None
    chair: dict[str, Any] | None = None
    request_id: str
    tenant_id: str
    model: str
    latency_ms: int = 0
    error_type: str | None = None
    error_msg: str | None = None


class CuaExecutionRequest(BaseModel):
    """Policy-gated CUA/browser execution request.

    The local implementation defaults to dry-run. Real browser/computer use must
    be explicitly enabled with credentials, package installation, target
    allowlists, and approval controls.

    Idempotency (§10.3): when ``idempotency_key`` is set (also accepted as the
    ``Idempotency-Key`` header), the service caches the first executed response
    per ``(tenant_id, idempotency_key)`` and replays it on subsequent calls
    within the TTL window. Replays carry ``result["idempotent_replay"]=true``
    so callers can distinguish them from fresh executions.
    """

    instruction: str = Field(..., min_length=1)
    target: str = Field(default="")
    adapter: Literal["auto", "stagehand", "playwright", "openclaw", "paperclip"] = "auto"
    dry_run: bool = True
    user_role: str = "manager"
    metadata: dict[str, Any] = Field(default_factory=dict)
    idempotency_key: str | None = Field(
        default=None,
        max_length=128,
        description=(
            "Optional caller-supplied key for idempotent retries. Cached per "
            "(tenant_id, idempotency_key) for ~5 minutes. Cross-tenant keys are "
            "isolated. Also accepted as the Idempotency-Key request header."
        ),
    )

    @field_validator("instruction", "target")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("idempotency_key")
    @classmethod
    def strip_idempotency_key(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class CuaExecutionResponse(BaseModel):
    """Normalized response for a governed CUA/browser action."""

    adapter: str
    status: Literal["dry-run", "blocked", "queued", "completed", "executed", "unavailable", "error"]
    policy: AgentPolicyEvaluationResponse
    result: dict[str, Any]


class CuaAuditRow(BaseModel):
    """One §38.3 audit row read back from data/agent-supervisor/cua_runs.jsonl.

    All fields except the canonical core (ts/request_id/tenant_id/actor/tool/
    target/outcome/policy_decision) are optional because each outcome class
    (blocked/error/executed/unavailable) populates a different subset.
    """

    ts: float
    request_id: str
    tenant_id: str
    actor: str
    tool: str
    target: str
    instruction: str
    outcome: str
    policy_decision: str
    policy_reason: str | None = None
    # Outcome-specific (executed):
    final_url: str | None = None
    page_title: str | None = None
    screenshot_sha256: str | None = None
    screenshot_bytes: int | None = None
    body_text_excerpt: str | None = None
    latency_ms: int | None = None
    # Outcome-specific (blocked):
    reason: str | None = None
    allowlist: list[str] | None = None
    # Outcome-specific (error):
    error_type: str | None = None
    error_msg: str | None = None


class CuaAuditListResponse(BaseModel):
    """Tenant-scoped readback of the CUA audit log.

    Per §64.43 #7 — only rows where row.tenant_id matches the middleware-set
    tenant_id are returned. Callers cannot pass a different tenant_id to
    cross-read another tenant's history.
    """

    rows: list[CuaAuditRow]
    total_count: int
    tenant_id: str
    audit_path: str


class TenantActivityItem(BaseModel):
    """One row in the unified tenant-activity feed.

    Composes audit rows from multiple agent-platform surfaces (CUA / admin /
    Paperclip / OpenClaw) into a single response shape. Empty optional fields
    indicate the originating surface doesn't populate that column.
    """

    ts: float
    source: str  # "cua" | "admin" | "paperclip" | "openclaw"
    tool: str
    outcome: str
    tenant_id: str
    request_id: str | None = None
    actor: str | None = None
    target: str | None = None
    instruction: str | None = None
    artifact_id: str | None = None
    # Outcome-specific (CUA executed)
    latency_ms: int | None = None
    screenshot_sha256: str | None = None


class TenantActivityResponse(BaseModel):
    """Unified per-tenant activity feed across CUA + admin + Paperclip + OpenClaw.

    Tenant-scoped from the middleware-set `X-Tenant-ID` header (no
    `?tenant_id=` query parameter — preventing cross-tenant reads by URL
    manipulation, same as `/api/v1/agent-platform/cua/audit`).
    """

    tenant_id: str
    total_items: int           # pre-pagination count (tenant-scoped)
    items: list[TenantActivityItem]
    sources_available: dict[str, bool]  # which sources contributed any row


class AdminCuaAuditListResponse(BaseModel):
    """Compliance/auditor cross-tenant readback of the CUA audit log.

    Used by /api/v1/admin/cua/audit. Unlike CuaAuditListResponse, this is NOT
    bound to the caller's tenant — auditors with the compliance or reporting-
    monitoring role can see all tenants, OR filter to one tenant via the
    ``?tenant_id=X`` query parameter (here, the query param IS authoritative
    because access is already gated by RBAC role).

    Every admin read writes its own §38.3 ``admin.cua.audit.read`` audit row
    (audit-of-audit) so cross-tenant viewing is itself observable. This is a
    SOC2 CC4 + CC7 requirement: auditing the auditors.
    """

    rows: list[CuaAuditRow]
    total_count: int
    tenant_filter: str | None  # None when scanning all tenants; echoes ?tenant_id=
    distinct_tenants: list[str]  # sorted list of tenant_ids present in audit log
    audit_path: str
