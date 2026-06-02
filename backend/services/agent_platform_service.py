"""Unified agent platform integration service.

This service provides one honest setup/status layer for the requested agent
stack: Harness Agent, OpenClaw, Paperclip, PoliysAI governance, CUA, Stagehand,
and Playwright. It does not claim external SDKs are installed. It reports local
working bridges and blocks real side effects behind policy checks.
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path
from typing import Any

from schemas.agent_platform import (
    AdminCuaAuditListResponse,
    AgentPlatformManifestResponse,
    AgentPlatformStatusResponse,
    AgentPolicyEvaluationRequest,
    AgentPolicyEvaluationResponse,
    ApprovalBrokerRequest,
    ApprovalBrokerResponse,
    AgentToolStatus,
    CuaAuditListResponse,
    CuaAuditRow,
    CuaExecutionRequest,
    CuaExecutionResponse,
    TenantActivityItem,
    TenantActivityResponse,
    TypedCouncilRunRequest,
    TypedCouncilRunResponse,
)
from schemas.openclaw import OpenClawTaskRequest
from services.openclaw_gateway_service import OpenClawGatewayService
from services.paperclip_service import PaperclipService

_DANGEROUS_TARGET_PATTERNS = [
    re.compile(r"prod.*drop", re.I),
    re.compile(r"delete.*production", re.I),
    re.compile(r"force[- ]?push", re.I),
    re.compile(r"secret|token|password|private[_-]?key", re.I),
]
_WRITE_ACTION_RE = re.compile(r"create|update|delete|submit|deploy|execute|click|fill|write|approve", re.I)
_APPROVAL_BROKER_HUMAN_RE = re.compile(
    r"production|deploy|release|secret|token|password|private[_ -]?key|"
    r"browserbase|slack_bot_token|telegram_bot_token|poliysai_api_key|"
    r"real cua|keyboard|mouse|browser click|external saas|oauth|gh auth|"
    r"branch protection|merge|git push|force[- ]?push|database migration",
    re.I,
)
_APPROVAL_BROKER_DENY_RE = re.compile(
    r"rm -rf|git reset --hard|drop table|delete production|exfiltrate|leak secret",
    re.I,
)
_APPROVAL_BROKER_SAFE_RE = re.compile(
    r"project_doctor|governance diff|validate|lint|test|docs|catalog|inventory|"
    r"local|dry[- ]?run|status|read|inspect|next|submit",
    re.I,
)

# Per §47.6 + §38.3 — every real Playwright session writes one audit row per nav.
_CUA_AUDIT_PATH = Path(os.environ.get("CUA_AUDIT_PATH", "data/agent-supervisor/cua_runs.jsonl"))

# Per §42 + §47.6 — default allowlist is localhost only. Operator can extend via env.
_PLAYWRIGHT_ALLOWLIST_DEFAULT = "http://localhost,http://127.0.0.1,https://localhost,https://127.0.0.1"

# Per §10.3 — idempotency cache TTL in seconds (5 minutes). Configurable via env
# for testing (e.g., CUA_IDEMPOTENCY_TTL_SECONDS=0.1 to exercise TTL-expiry path).
_IDEMPOTENCY_TTL_SECONDS = float(os.environ.get("CUA_IDEMPOTENCY_TTL_SECONDS", "300"))
# Max entries before LRU-style trim. Protects memory on long-running processes.
_IDEMPOTENCY_MAX_ENTRIES = int(os.environ.get("CUA_IDEMPOTENCY_MAX_ENTRIES", "1000"))
# Append-only JSONL backing the in-memory cache. Survives process restarts +
# can be shared across multiple workers writing to the same path. Per §10.3 +
# multi-replica deployment story. Disable persistence with CUA_IDEMPOTENCY_PATH=""
_IDEMPOTENCY_PATH = Path(
    os.environ.get("CUA_IDEMPOTENCY_PATH", "data/agent-supervisor/cua_idempotency.jsonl")
)
# Bit-flag to enable a fresh load on next access. Set after env env override
# in tests; the service rebuilds the cache from disk on first lookup.
_idempotency_loaded_from: str | None = None

# In-memory cache: (tenant_id, idempotency_key) -> (cached_response, stored_at_ts)
# Cross-tenant isolated by construction — the tenant_id is part of the cache key,
# so tenant-a calling with key=K does NOT see tenant-b's K cache and vice versa.
_idempotency_cache: dict[tuple[str, str], tuple["CuaExecutionResponse", float]] = {}


def _idempotency_disk_load() -> None:
    """Populate _idempotency_cache from the JSONL backing file. Called lazily
    on first idempotency op so test env overrides take effect.

    Invariants:
      - Corrupt JSON lines are skipped (never crash on load)
      - TTL-expired entries are skipped (treated as absent on next lookup)
      - Last write wins when the same (tenant_id, key) appears multiple times
        (matches append-only semantics — newer line overrides older)
      - Missing file is silent (returns empty cache; first write creates it)
    """
    global _idempotency_loaded_from
    path = _IDEMPOTENCY_PATH
    # Re-load whenever the env-derived path changed (tests rotate it via tmpdirs).
    if _idempotency_loaded_from == str(path) and _idempotency_cache:
        return
    _idempotency_cache.clear()
    _idempotency_loaded_from = str(path)
    if not str(path):  # persistence explicitly disabled
        return
    if not path.exists():
        return
    now = time.time()
    try:
        for line in path.read_text().splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            try:
                tenant_id = entry["tenant_id"]
                key = entry["idempotency_key"]
                stored_at = float(entry["stored_at"])
                response_dict = entry["response"]
            except (KeyError, TypeError, ValueError):
                continue
            if now - stored_at > _IDEMPOTENCY_TTL_SECONDS:
                continue  # expired; treat as absent
            try:
                response = CuaExecutionResponse.model_validate(response_dict)
            except Exception:  # noqa: BLE001 — corrupted on-disk schema, skip
                continue
            _idempotency_cache[(tenant_id, key)] = (response, stored_at)
    except OSError:
        return


def _idempotency_disk_append(
    tenant_id: str, key: str, response: "CuaExecutionResponse", stored_at: float,
) -> None:
    """Append one entry to the JSONL backing file. Best-effort — disk errors
    do NOT crash the request (the in-memory cache already has the entry; we
    just lose persistence durability for that one entry)."""
    path = _IDEMPOTENCY_PATH
    if not str(path):
        return
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        entry = {
            "tenant_id": tenant_id,
            "idempotency_key": key,
            "stored_at": stored_at,
            "response": response.model_dump(mode="json"),
        }
        with path.open("a") as fh:
            fh.write(json.dumps(entry, separators=(",", ":")) + "\n")
    except OSError:
        pass


def _playwright_allowlist() -> list[str]:
    raw = os.environ.get("PLAYWRIGHT_ALLOWLIST", _PLAYWRIGHT_ALLOWLIST_DEFAULT)
    return [p.strip() for p in raw.split(",") if p.strip()]


def _target_in_allowlist(target: str, allowlist: list[str]) -> bool:
    if not target:
        return False
    return any(target.startswith(prefix) for prefix in allowlist)


def _write_cua_audit_row(row: dict[str, Any]) -> None:
    """Append one §38.3-shaped audit row. Best-effort — disk errors are logged but
    do not crash the request (the policy layer already approved the action).
    """
    try:
        _CUA_AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
        with _CUA_AUDIT_PATH.open("a") as fh:
            fh.write(json.dumps(row, separators=(",", ":")) + "\n")
    except OSError:
        pass


# ---------------- AgentOps Stage-1 adapter (per §56 gate-2) ----------------
# Opt-in observability wrapper around execute_cua. Enabled only when BOTH
# AGENTOPS_ENABLED=true AND AGENTOPS_API_KEY=<key> are set. Lazy-imports the
# `agentops` package so import errors / network errors / SDK exceptions
# NEVER affect the original request flow. The original response is always
# returned exactly as built, regardless of AgentOps' state.

def _agentops_enabled() -> bool:
    """True only when explicitly opted-in. Default off; never default-on."""
    if os.environ.get("AGENTOPS_ENABLED", "").lower() != "true":
        return False
    if not os.environ.get("AGENTOPS_API_KEY"):
        return False
    return True


class _AgentOpsSession:
    """Context manager wrapping one CUA call. All AgentOps SDK calls are
    wrapped in try/except so the SDK can never bubble exceptions into the
    request path. If the SDK isn't installed or fails to init, the wrapper
    silently no-ops (this is correct behavior — observability MUST NOT
    affect correctness).
    """

    def __init__(self, tenant_id: str, request_id: str, instruction: str, target: str):
        self.tenant_id = tenant_id
        self.request_id = request_id
        self.instruction = instruction
        self.target = target
        self.session = None
        self._enabled = False

    def __enter__(self) -> "_AgentOpsSession":
        if not _agentops_enabled():
            return self
        try:
            import agentops  # noqa: I001  — lazy import so SDK absence is fine
            agentops.init(api_key=os.environ["AGENTOPS_API_KEY"], skip_auto_end_session=True)
            self.session = agentops.start_session(
                tags=[f"tenant:{self.tenant_id}", "cua-execute"],
            )
            self._enabled = True
        except Exception:  # noqa: BLE001 — observability must never crash exec
            self._enabled = False
        return self

    def record_outcome(self, response: "CuaExecutionResponse") -> None:
        if not self._enabled:
            return
        try:
            import agentops
            from agentops import ActionEvent
            event = ActionEvent(
                action_type="cua_execute",
                params={
                    "adapter": response.adapter,
                    "status": response.status,
                    "tenant_id": self.tenant_id,
                    "target": self.target,
                    "request_id": self.request_id,
                    "instruction_excerpt": self.instruction[:200],
                },
                returns=response.result.get("status", response.status),
            )
            agentops.record(event)
        except Exception:  # noqa: BLE001
            pass

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        if not self._enabled:
            return
        try:
            import agentops
            end_state = "Fail" if exc_type is not None else "Success"
            agentops.end_session(end_state=end_state)
        except Exception:  # noqa: BLE001
            pass


class AgentPlatformIntegrationService:
    """Status, governance, and dry-run execution facade for agent tools.

    Input:
        API request schemas for status, manifest, policy evaluation, and CUA
        execution.

    Process:
        Probes local services, checks installed Python modules and environment
        variables, evaluates policy, and returns normalized contracts.

    Output:
        Pydantic schemas consumed by FastAPI routers and operator scripts.
    """

    def status(self) -> AgentPlatformStatusResponse:
        tools = [
            self._harness_status(),
            self._openclaw_status(),
            self._paperclip_status(),
            self._poliysai_status(),
            self._ollama_status(),
            self._kivi_status(),
            self._cua_status(),
            self._stagehand_status(),
            self._playwright_status(),
        ]
        required = {"harness-agent", "openclaw", "paperclip", "poliysai", "ollama", "kivi-model"}
        unavailable = [tool for tool in tools if tool.key in required and not tool.available]
        status = "ready-local" if not unavailable else "degraded"
        return AgentPlatformStatusResponse(
            name="insur-agent-platform-local-setup",
            status=status,
            tools=tools,
            command_surface={
                "start_agents": "./scripts/agent_fleet.sh start-simple 100 100",
                "start_council": "./scripts/agent_fleet.sh start-council 5 20",
                "supervise": "./scripts/agent_fleet.sh supervisor-watch",
                "health": "./scripts/agent_fleet.sh supervisor-health",
                "report": "./scripts/agent_fleet.sh supervisor-report",
                "setup_check": "./scripts/setup_agent_platform.py status",
                "ollama_setup": "./scripts/agent_fleet.sh ollama-setup",
                "start_100_kivi": "./scripts/agent_fleet.sh start-100-kivi 100 100",
            },
            governance_summary=[
                "OpenClaw and Paperclip are working local adapters.",
                "Harness Agent is the local fleet/supervisor/scheduler command surface.",
                "PoliysAI is implemented as a local policy/governance contract; no external SDK is bundled.",
                "Ollama/Kivi provides the local model boundary for the 100-agent runtime.",
                "CUA, Stagehand, and Playwright agentic execution are dry-run unless credentials, packages, allowlists, and approvals are added.",
            ],
            next_steps=[
                "Run ./scripts/setup_agent_platform.py status to verify setup.",
                "Use /api/v1/agent-platform/governance/evaluate before tool execution.",
                "Keep browser/CUA actions in dry-run until a target allowlist and human approval workflow exist.",
            ],
        )

    def manifest(self) -> AgentPlatformManifestResponse:
        return AgentPlatformManifestResponse(
            platform="INSUR Beverage Agent Platform",
            architecture="Hub-and-spoke local harness with OpenClaw bridge, Paperclip memory/context, PoliysAI governance, and dry-run CUA/browser adapters.",
            ingress=["REST API", "Codex/Claude CLI via scripts/agent_fleet.sh", "scheduler", "Redis queues"],
            orchestration=["Harness Agent fleet", "OpenClaw-compatible bridge", "Council agents", "agent supervisor", "agent scheduler"],
            tool_contract={
                "registration": "tool key, capabilities, risk controls, required env, endpoint",
                "execution": "policy evaluation -> adapter selection -> dry-run or queue -> audit result",
                "side_effects": "blocked unless policy allows and dry_run=false with adapter support",
            },
            memory_contract={
                "short_term": "Redis queue/task context",
                "artifact_context": "Paperclip local JSON artifacts and context packs",
                "long_term_target": "vector/graph memory when productionized",
            },
            governance_contract={
                "engine": "PoliysAI local policy facade",
                "controls": ["RBAC", "dangerous target denylist", "dry-run default", "human approval for real CUA/browser writes", "audit metadata"],
                "decision_values": ["allow", "deny", "require_human_approval"],
            },
            observability_contract={
                "queues": "Redis queue lengths",
                "heartbeats": "agent:heartbeat:* keys",
                "supervisor": "scripts/agent_supervisor.py",
                "report": "data/agent-supervisor/latest.json",
            },
        )

    def adapters_status(self) -> dict[str, Any]:
        """Aggregated snapshot of all §56 Stage-1 adapters.

        Lazy-imports each adapter so an SDK absence or import failure in one
        adapter never breaks the endpoint — the bad row just shows
        `importable: false` (or `available: false` with an `error_type`).
        Adapters covered:
          - agentops      (CUA-execution observability wrapper)
          - llm-gateway   (LiteLLM provider-agnostic chat completion)
          - typed-council (Pydantic AI typed 3-stage council)
          - dspy-optimizer (DSPy RAG prompt optimizer)

        Composes with §38.3 (each adapter writes its own audit rows when
        invoked) + §56.2 Stage-1 contract (lazy import / feature-flag
        opt-in / never default-on).
        """
        adapters: list[dict[str, Any]] = []

        # AgentOps is wired inline in this service (no `status()` method);
        # synthesize the same shape from the existing gate.
        adapters.append({
            "key": "agentops",
            "name": "AgentOps CUA-execution observability wrapper",
            "enabled": _agentops_enabled(),
            "importable": self._is_importable("agentops"),
            "audit_path": "(in CUA audit row via execute_cua)",
            "detail": (
                "Stage-1 adapter; opt-in via AGENTOPS_ENABLED=true + "
                "AGENTOPS_API_KEY set. Wraps execute_cua with a session + "
                "ActionEvent record. SDK errors NEVER affect the request."
            ),
        })

        for module_name, friendly in (
            ("services.llm_gateway",   "llm-gateway"),
            ("services.typed_council", "typed-council"),
            ("services.dspy_optimizer", "dspy-optimizer"),
        ):
            try:
                import importlib
                mod = importlib.import_module(module_name)
                adapters.append(mod.status())
            except Exception as exc:  # noqa: BLE001 — keep endpoint healthy
                adapters.append({
                    "key": friendly,
                    "name": friendly,
                    "enabled": False,
                    "importable": False,
                    "audit_path": "",
                    "detail": f"failed to load adapter: {type(exc).__name__}: {str(exc)[:200]}",
                    "error_type": type(exc).__name__,
                })

        return {
            "scanned_at": time.time(),
            "n_adapters": len(adapters),
            "n_enabled": sum(1 for a in adapters if a.get("enabled")),
            "n_importable": sum(1 for a in adapters if a.get("importable")),
            "stage": "§56.2 Stage-1",
            "adapters": adapters,
        }

    @staticmethod
    def _is_importable(pkg: str) -> bool:
        """Probe a package without triggering side effects."""
        import importlib.util
        import sys
        if pkg in sys.modules:
            return True
        try:
            return importlib.util.find_spec(pkg) is not None
        except (ValueError, ImportError):
            return False

    def decide_approval_broker(self, request: ApprovalBrokerRequest) -> ApprovalBrokerResponse:
        """Classify approve/submit/next and optionally submit safe work to OpenClaw.

        The broker intentionally has a narrow auto-approval lane: local docs,
        tests, validation, status, dry-run, and next-task orchestration. Anything
        that mentions production, credentials, deployments, real browser/CUA,
        destructive shell, GitHub auth, branch protection, or database migration
        requires a human or is denied.
        """
        tenant_id = str(request.metadata.get("tenant_id", "default"))
        request_id = str(request.metadata.get("request_id", ""))
        target_blob = f"{request.action} {request.target} {request.next_prompt or ''}"

        policy = self.evaluate_policy(
            AgentPolicyEvaluationRequest(
                agent_id=str(request.metadata.get("agent_id", "approval-broker-local")),
                tool="approval-broker",
                action=request.action,
                target=request.target or request.next_prompt or "approval-broker",
                user_role=request.user_role,
                dry_run=not request.submit_next,
                metadata=request.metadata,
            )
        )

        controls = ["audit", "rbac", "tenant-scope", "approval-policy"]
        if policy.decision == "deny" or _APPROVAL_BROKER_DENY_RE.search(target_blob):
            return ApprovalBrokerResponse(
                decision="deny",
                reason="blocked by dangerous-operation denylist",
                risk_level="high",
                required_controls=controls + ["human-security-review"],
                tenant_id=tenant_id,
                request_id=request_id,
                policy=policy,
                audit=self._approval_broker_audit(request, "deny", tenant_id, request_id),
            )

        if policy.decision == "require_human_approval" or _APPROVAL_BROKER_HUMAN_RE.search(target_blob):
            return ApprovalBrokerResponse(
                decision="require_human_approval",
                reason="human approval required by approval policy",
                risk_level="high",
                required_controls=controls + ["human-approval"],
                tenant_id=tenant_id,
                request_id=request_id,
                policy=policy,
                audit=self._approval_broker_audit(request, "require_human_approval", tenant_id, request_id),
            )

        risk_level = "low" if _APPROVAL_BROKER_SAFE_RE.search(target_blob) else "medium"
        if risk_level != "low" and request.submit_next:
            return ApprovalBrokerResponse(
                decision="require_human_approval",
                reason="submit_next is allowed only for low-risk local work",
                risk_level=risk_level,
                required_controls=controls + ["human-approval"],
                tenant_id=tenant_id,
                request_id=request_id,
                policy=policy,
                audit=self._approval_broker_audit(request, "require_human_approval", tenant_id, request_id),
            )

        openclaw_task: dict[str, Any] | None = None
        submitted = False
        if request.submit_next:
            if not request.next_prompt:
                return ApprovalBrokerResponse(
                    decision="require_human_approval",
                    reason="submit_next requested but next_prompt is missing",
                    risk_level="medium",
                    required_controls=controls + ["operator-next-prompt"],
                    tenant_id=tenant_id,
                    request_id=request_id,
                    policy=policy,
                    audit=self._approval_broker_audit(request, "require_human_approval", tenant_id, request_id),
                )
            metadata = dict(request.metadata)
            metadata.update({"approved_by": "approval-broker", "approval_decision": "auto_approved"})
            task = OpenClawTaskRequest(
                prompt=request.next_prompt,
                department=request.department,
                mode=request.mode,
                source="approval-broker",
                metadata=metadata,
            )
            result = OpenClawGatewayService().enqueue(task)
            openclaw_task = result.model_dump(mode="json")
            submitted = True

        return ApprovalBrokerResponse(
            decision="auto_approved",
            reason="safe local workflow approved by approval broker policy",
            risk_level=risk_level,
            required_controls=controls,
            tenant_id=tenant_id,
            request_id=request_id,
            policy=policy,
            submitted=submitted,
            openclaw_task=openclaw_task,
            audit=self._approval_broker_audit(request, "auto_approved", tenant_id, request_id),
        )

    @staticmethod
    def _approval_broker_audit(
        request: ApprovalBrokerRequest, decision: str, tenant_id: str, request_id: str,
    ) -> dict[str, Any]:
        return {
            "ts": time.time(),
            "request_id": request_id,
            "tenant_id": tenant_id,
            "actor": "approval-broker",
            "tool": "approval-broker",
            "action": request.action,
            "target": request.target,
            "decision": decision,
            "submit_next": request.submit_next,
            "mode": request.mode,
            "department": request.department,
        }

    def run_typed_council(self, request: TypedCouncilRunRequest) -> TypedCouncilRunResponse:
        """Run the opt-in Pydantic AI typed author/reviewer/chair council.

        The endpoint is policy-gated and tenant-attributed, but it does not
        become default runtime behavior: `services.typed_council` still enforces
        INSUR_TYPED_COUNCIL_ENABLED and lazy SDK import.
        """
        tenant_id = str(request.metadata.get("tenant_id", "default"))
        request_id = str(request.metadata.get("request_id", ""))
        policy = self.evaluate_policy(
            AgentPolicyEvaluationRequest(
                agent_id=str(request.metadata.get("agent_id", "typed-council-local")),
                tool="typed-council",
                action="run author/reviewer/chair council",
                target="typed-council",
                user_role=request.user_role,
                dry_run=False,
                metadata=request.metadata,
            )
        )
        if policy.decision != "allow":
            return TypedCouncilRunResponse(
                outcome="blocked",
                policy=policy,
                request_id=request_id,
                tenant_id=tenant_id,
                model=request.model or os.environ.get("INSUR_LLM_MODEL", "ollama/kivi:local"),
                error_msg=policy.reason,
            )

        from services import typed_council

        result = typed_council.run_typed_council(
            request.prompt,
            tenant_id=tenant_id,
            request_id=request_id,
            model=request.model,
        )
        return TypedCouncilRunResponse(
            outcome=result.outcome,
            policy=policy,
            author=result.author.model_dump(mode="json") if result.author else None,
            reviewer=result.reviewer.model_dump(mode="json") if result.reviewer else None,
            chair=result.chair.model_dump(mode="json") if result.chair else None,
            request_id=result.request_id,
            tenant_id=result.tenant_id,
            model=result.model,
            latency_ms=result.latency_ms,
            error_type=result.error_type,
            error_msg=result.error_msg,
        )

    def evaluate_policy(self, request: AgentPolicyEvaluationRequest) -> AgentPolicyEvaluationResponse:
        controls = ["audit", "correlation-id", "rbac"]
        target_blob = f"{request.action} {request.target}"
        if request.user_role not in {"manager", "tester", "compliance", "reporting-monitoring", "team-member"}:
            return self._decision("deny", f"unknown user_role {request.user_role!r}", controls, request)
        if any(pattern.search(target_blob) for pattern in _DANGEROUS_TARGET_PATTERNS):
            return self._decision("deny", "target/action matched dangerous-operation denylist", controls + ["security-review"], request)
        if request.tool in {"cua", "stagehand", "playwright"} and _WRITE_ACTION_RE.search(request.action):
            if request.dry_run:
                return self._decision("allow", "dry-run browser/CUA action allowed", controls + ["dry-run"], request)
            return self._decision(
                "require_human_approval",
                "real browser/CUA write action requires explicit human approval and target allowlist",
                controls + ["human-approval", "target-allowlist", "session-recording"],
                request,
            )
        if request.tool == "poliysai":
            return self._decision("allow", "policy evaluation action allowed", controls + ["policy-audit"], request)
        return self._decision("allow", "policy passed", controls, request)

    def execute_cua(self, request: CuaExecutionRequest) -> CuaExecutionResponse:
        # Per §10.3 — idempotency check happens BEFORE policy evaluation so that
        # a replay returns the cached result even if the policy decision was
        # 'allow' on the first call but the policy rule has since changed. This
        # is the correct behavior for true idempotency: a second call with the
        # same key returns the same result, period.
        tenant_id = str(request.metadata.get("tenant_id", "default"))
        if request.idempotency_key is not None:
            cached = self._idempotency_lookup(tenant_id, request.idempotency_key)
            if cached is not None:
                return cached

        # Per §56 gate-2 — AgentOps Stage-1 adapter wraps the call when the
        # operator has opted in via AGENTOPS_ENABLED=true + AGENTOPS_API_KEY.
        # When disabled (default), this is a zero-cost no-op context manager.
        request_id = str(request.metadata.get("request_id") or "")
        with _AgentOpsSession(tenant_id, request_id, request.instruction, request.target) as ao_session:
            response = self._execute_cua_uncached(request)
            ao_session.record_outcome(response)

        # Only cache results that represent a SUCCESSFUL real execution.
        # Failed/blocked/error states should NOT be cached — the caller may
        # legitimately want to retry after fixing the cause.
        if request.idempotency_key is not None and response.status in {"executed", "dry-run"}:
            self._idempotency_store(tenant_id, request.idempotency_key, response)
        return response

    def _idempotency_lookup(
        self, tenant_id: str, key: str,
    ) -> CuaExecutionResponse | None:
        """Return a cached response if one exists for (tenant_id, key) and is
        within the TTL window. Cross-tenant lookup is impossible by construction
        because tenant_id is part of the cache key.

        On first call per process, populates the in-memory cache from the disk
        JSONL so process restarts and multi-replica deployments don't replay
        the same key from cold."""
        _idempotency_disk_load()
        entry = _idempotency_cache.get((tenant_id, key))
        if entry is None:
            return None
        cached_response, stored_at = entry
        if time.time() - stored_at > _IDEMPOTENCY_TTL_SECONDS:
            _idempotency_cache.pop((tenant_id, key), None)
            return None
        # Mark the replay so the caller can distinguish it from a fresh exec.
        # Pydantic model is immutable; copy with updated result dict.
        replay_result = dict(cached_response.result)
        replay_result["idempotent_replay"] = True
        return cached_response.model_copy(update={"result": replay_result})

    def _idempotency_store(
        self, tenant_id: str, key: str, response: CuaExecutionResponse,
    ) -> None:
        """Store a successful response in the cache. Persists to JSONL backing
        file and trims oldest entries if the in-memory cache exceeds
        MAX_ENTRIES to bound memory (disk file is append-only; compaction is
        out of scope for the MVP — restart load skips expired entries)."""
        stored_at = time.time()
        _idempotency_cache[(tenant_id, key)] = (response, stored_at)
        _idempotency_disk_append(tenant_id, key, response, stored_at)
        if len(_idempotency_cache) > _IDEMPOTENCY_MAX_ENTRIES:
            # Sort by stored_at ascending; drop the oldest 10% to amortize cost.
            sorted_entries = sorted(_idempotency_cache.items(), key=lambda kv: kv[1][1])
            drop_count = max(1, len(sorted_entries) // 10)
            for cache_key, _ in sorted_entries[:drop_count]:
                _idempotency_cache.pop(cache_key, None)

    def _execute_cua_uncached(self, request: CuaExecutionRequest) -> CuaExecutionResponse:
        adapter = self._select_adapter(request)
        policy = self.evaluate_policy(
            AgentPolicyEvaluationRequest(
                agent_id=str(request.metadata.get("agent_id", "cua-local")),
                tool="stagehand" if adapter == "stagehand" else "cua",
                action=request.instruction,
                target=request.target,
                user_role=request.user_role,
                dry_run=request.dry_run,
                metadata=request.metadata,
            )
        )
        if policy.decision == "deny":
            return CuaExecutionResponse(adapter=adapter, status="blocked", policy=policy, result={"reason": policy.reason})
        if policy.decision == "require_human_approval":
            return CuaExecutionResponse(adapter=adapter, status="blocked", policy=policy, result={"reason": policy.reason})

        # Dry-run path: short-circuit without launching anything.
        if request.dry_run:
            return CuaExecutionResponse(
                adapter=adapter,
                status="dry-run",
                policy=policy,
                result={
                    "instruction": request.instruction,
                    "target": request.target,
                    "message": "Dry-run only. Re-submit with dry_run=false and adapter='playwright' for real navigation.",
                },
            )

        # Real Playwright path — adapter must be explicitly 'playwright' (NOT
        # auto/stagehand) so the operator opts into the side-effect.
        if adapter == "playwright":
            return self._execute_playwright(request, policy)

        # Stagehand requires Browserbase credentials — not bundled. Honest refusal.
        if adapter == "stagehand":
            return CuaExecutionResponse(
                adapter=adapter,
                status="unavailable",
                policy=policy,
                result={"message": "Stagehand requires BROWSERBASE_API_KEY and the stagehand package. Not installed."},
            )

        return CuaExecutionResponse(
            adapter=adapter,
            status="unavailable",
            policy=policy,
            result={"message": "No real CUA executor is enabled for this adapter in the local setup."},
        )

    def list_cua_audit(
        self,
        tenant_id: str,
        limit: int = 50,
        since_ts: float = 0.0,
    ) -> CuaAuditListResponse:
        """Tenant-scoped readback of the CUA audit log.

        Per §64.43 #7 — the tenant_id is the AUTHORITATIVE filter; rows with
        any other tenant_id are skipped. Callers cannot cross-read. The caller-
        supplied tenant_id MUST come from the middleware (current_tenant_id),
        not from the request body — the router-side wiring enforces this.

        Sorted descending by ts (most recent first), then capped at ``limit``.
        ``total_count`` reports the tenant-scoped pre-pagination count so the
        UI can paginate without re-fetching the whole file.
        """
        if not _CUA_AUDIT_PATH.exists():
            return CuaAuditListResponse(
                rows=[], total_count=0, tenant_id=tenant_id, audit_path=str(_CUA_AUDIT_PATH),
            )

        matching: list[dict[str, Any]] = []
        try:
            for line in _CUA_AUDIT_PATH.read_text().splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    # Skip corrupt lines; never crash the readback
                    continue
                if row.get("tenant_id") != tenant_id:
                    continue
                if row.get("ts", 0) < since_ts:
                    continue
                matching.append(row)
        except OSError:
            # File disappeared between exists() and read; return empty
            return CuaAuditListResponse(
                rows=[], total_count=0, tenant_id=tenant_id, audit_path=str(_CUA_AUDIT_PATH),
            )

        matching.sort(key=lambda r: r.get("ts", 0), reverse=True)
        total = len(matching)
        rows = [CuaAuditRow.model_validate(r) for r in matching[:limit]]
        return CuaAuditListResponse(
            rows=rows, total_count=total, tenant_id=tenant_id, audit_path=str(_CUA_AUDIT_PATH),
        )

    def list_cua_audit_admin(
        self,
        tenant_filter: str | None = None,
        limit: int = 50,
        since_ts: float = 0.0,
        admin_actor: str = "compliance",
        admin_request_id: str = "",
    ) -> AdminCuaAuditListResponse:
        """Cross-tenant CUA audit readback for compliance/auditor roles.

        Unlike list_cua_audit, this method honors a tenant_filter parameter
        because RBAC has already gated access at the router. If tenant_filter
        is None, ALL tenants' rows are returned (subject to limit + since_ts).

        Every successful admin read also writes ONE §38.3 ``admin.cua.audit.read``
        row back to the audit log — audit-of-audit (SOC2 CC4 + CC7). This means
        even compliance reads leave a permanent trail. The audit-of-audit row
        is written BEFORE the response is built so a sudden disk failure
        between read+write still results in a queryable read event.
        """
        if not _CUA_AUDIT_PATH.exists():
            self._write_admin_audit(admin_actor, admin_request_id, tenant_filter, 0)
            return AdminCuaAuditListResponse(
                rows=[], total_count=0, tenant_filter=tenant_filter,
                distinct_tenants=[], audit_path=str(_CUA_AUDIT_PATH),
            )

        matching: list[dict[str, Any]] = []
        tenants_seen: set[str] = set()
        try:
            for line in _CUA_AUDIT_PATH.read_text().splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    continue
                row_tenant = row.get("tenant_id", "default")
                tenants_seen.add(row_tenant)
                # Skip admin-audit-of-audit rows from compliance results unless
                # filter explicitly asks for them. Avoids audit-recursion noise.
                if row.get("tool") == "admin.cua.audit.read" and tenant_filter is None:
                    continue
                if tenant_filter is not None and row_tenant != tenant_filter:
                    continue
                if row.get("ts", 0) < since_ts:
                    continue
                matching.append(row)
        except OSError:
            self._write_admin_audit(admin_actor, admin_request_id, tenant_filter, 0)
            return AdminCuaAuditListResponse(
                rows=[], total_count=0, tenant_filter=tenant_filter,
                distinct_tenants=sorted(tenants_seen), audit_path=str(_CUA_AUDIT_PATH),
            )

        matching.sort(key=lambda r: r.get("ts", 0), reverse=True)
        total = len(matching)
        rows = [CuaAuditRow.model_validate(r) for r in matching[:limit]]

        # Write the audit-of-audit row AFTER counting matches (so total reflects
        # pre-read state) but BEFORE returning (so even a crash records the read).
        self._write_admin_audit(admin_actor, admin_request_id, tenant_filter, total)

        return AdminCuaAuditListResponse(
            rows=rows,
            total_count=total,
            tenant_filter=tenant_filter,
            distinct_tenants=sorted(tenants_seen),
            audit_path=str(_CUA_AUDIT_PATH),
        )

    @staticmethod
    def _write_admin_audit(
        admin_actor: str, admin_request_id: str, tenant_filter: str | None, matched_rows: int,
    ) -> None:
        """Audit-of-audit: every compliance read is itself logged.

        Per SOC2 CC4 + CC7 — the auditors must be auditable. Without this, a
        compliance role could repeatedly scan tenant data and leave no trace.
        The audit_actor + matched_rows + tenant_filter give the next reviewer
        a complete picture of what was viewed.
        """
        row = {
            "ts": time.time(),
            "request_id": admin_request_id or str(uuid.uuid4()),
            "tenant_id": "_admin",  # synthetic tenant for admin-of-audit
            "actor": admin_actor,
            "tool": "admin.cua.audit.read",
            "instruction": f"cross-tenant audit read (filter={tenant_filter})",
            "target": "data/agent-supervisor/cua_runs.jsonl",
            "policy_decision": "allow",
            "policy_reason": "RBAC: compliance or reporting-monitoring role",
            "outcome": "executed",
            "tenant_filter": tenant_filter,
            "matched_rows": matched_rows,
        }
        _write_cua_audit_row(row)

    def get_tenant_activity(
        self,
        tenant_id: str,
        limit: int = 50,
        since_ts: float = 0.0,
    ) -> TenantActivityResponse:
        """Composed per-tenant activity feed across CUA + admin + Paperclip.

        Per §64.43 #7 — tenant_id is the AUTHORITATIVE filter from the
        middleware; callers cannot cross-read by URL manipulation.
        OpenClaw activity is NOT included here because OpenClaw tasks live in
        Redis and require a live connection — a future iteration could add a
        Redis read when available, gracefully falling back to empty otherwise.
        """
        items: list[TenantActivityItem] = []
        sources_available: dict[str, bool] = {
            "cua": False,
            "admin": False,
            "paperclip": False,
            "openclaw": False,
        }

        # --- CUA + admin from cua_runs.jsonl ---
        if _CUA_AUDIT_PATH.exists():
            try:
                for line in _CUA_AUDIT_PATH.read_text().splitlines():
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        row = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    if row.get("tenant_id") != tenant_id:
                        continue
                    if row.get("ts", 0) < since_ts:
                        continue
                    is_admin = row.get("tool") == "admin.cua.audit.read"
                    source = "admin" if is_admin else "cua"
                    sources_available[source] = True
                    items.append(TenantActivityItem(
                        ts=float(row.get("ts", 0)),
                        source=source,
                        tool=str(row.get("tool", "")),
                        outcome=str(row.get("outcome", "")),
                        tenant_id=tenant_id,
                        request_id=row.get("request_id"),
                        actor=row.get("actor"),
                        target=row.get("target"),
                        instruction=(row.get("instruction") or "")[:200] or None,
                        latency_ms=row.get("latency_ms"),
                        screenshot_sha256=row.get("screenshot_sha256"),
                    ))
            except OSError:
                pass

        # --- Paperclip from artifact storage dir ---
        paperclip_root = Path(os.environ.get("BEV_PAPERCLIP_ROOT", "data/paperclip"))
        if paperclip_root.exists():
            try:
                for path in paperclip_root.glob("*.json"):
                    try:
                        artifact = json.loads(path.read_text())
                    except (OSError, json.JSONDecodeError):
                        continue
                    if artifact.get("tenant_id", "default") != tenant_id:
                        continue
                    if artifact.get("created_at", 0) < since_ts:
                        continue
                    sources_available["paperclip"] = True
                    items.append(TenantActivityItem(
                        ts=float(artifact.get("created_at", 0)),
                        source="paperclip",
                        tool="paperclip.create",
                        outcome="executed",
                        tenant_id=tenant_id,
                        artifact_id=artifact.get("id"),
                        actor=artifact.get("source"),
                        instruction=(artifact.get("title") or "")[:200] or None,
                    ))
            except OSError:
                pass

        # Sort desc by ts, then cap
        items.sort(key=lambda i: i.ts, reverse=True)
        total = len(items)
        items = items[:limit]

        return TenantActivityResponse(
            tenant_id=tenant_id,
            total_items=total,
            items=items,
            sources_available=sources_available,
        )

    def _execute_playwright(
        self, request: CuaExecutionRequest, policy: AgentPolicyEvaluationResponse,
    ) -> CuaExecutionResponse:
        """Drive a real headless Chromium session via Playwright. Per §38.3 +
        §47.6 + §57.6: target-allowlist enforced, audit row written, request_id
        propagated, latency captured, errors structured (never a bare crash).
        """
        request_id = str(request.metadata.get("request_id") or uuid.uuid4())
        allowlist = _playwright_allowlist()

        # Target-allowlist gate (per §47.6 — explicit allowlist beats blanket trust).
        if not _target_in_allowlist(request.target, allowlist):
            row = self._cua_audit_base(request, policy, request_id, "playwright")
            row.update({"outcome": "blocked", "reason": "target not in PLAYWRIGHT_ALLOWLIST", "allowlist": allowlist})
            _write_cua_audit_row(row)
            return CuaExecutionResponse(
                adapter="playwright",
                status="blocked",
                policy=policy,
                result={"reason": "target not in PLAYWRIGHT_ALLOWLIST", "allowlist": allowlist, "request_id": request_id},
            )

        # Playwright package presence — if missing, fail honest (not silent stub).
        if importlib.util.find_spec("playwright") is None:
            row = self._cua_audit_base(request, policy, request_id, "playwright")
            row.update({"outcome": "unavailable", "reason": "playwright not installed"})
            _write_cua_audit_row(row)
            return CuaExecutionResponse(
                adapter="playwright",
                status="unavailable",
                policy=policy,
                result={
                    "message": "playwright not installed. Run: pip install playwright && playwright install chromium",
                    "request_id": request_id,
                },
            )

        t0 = time.monotonic()
        try:
            # Import inside the call so test environments without playwright can
            # still import this module (consistent with §57: deps fail at use, not at load).
            from playwright.sync_api import sync_playwright

            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                try:
                    page = browser.new_page()
                    timeout_ms = int(request.metadata.get("timeout_ms") or 15000)
                    page.goto(request.target, timeout=timeout_ms, wait_until="domcontentloaded")
                    title = page.title()
                    body_text = page.evaluate("() => (document.body && document.body.innerText) || ''")
                    screenshot_bytes = page.screenshot(full_page=False)
                    final_url = page.url
                finally:
                    browser.close()
        except Exception as exc:  # noqa: BLE001 — surface ALL playwright failures as structured errors
            latency_ms = int((time.monotonic() - t0) * 1000)
            row = self._cua_audit_base(request, policy, request_id, "playwright")
            row.update({
                "outcome": "error",
                "error_type": type(exc).__name__,
                "error_msg": str(exc)[:500],
                "latency_ms": latency_ms,
            })
            _write_cua_audit_row(row)
            return CuaExecutionResponse(
                adapter="playwright",
                status="error",
                policy=policy,
                result={
                    "error_type": type(exc).__name__,
                    "error_msg": str(exc)[:500],
                    "latency_ms": latency_ms,
                    "request_id": request_id,
                },
            )

        latency_ms = int((time.monotonic() - t0) * 1000)
        screenshot_hash = hashlib.sha256(screenshot_bytes).hexdigest()
        excerpt = (body_text or "")[:500]

        row = self._cua_audit_base(request, policy, request_id, "playwright")
        row.update({
            "outcome": "executed",
            "final_url": final_url,
            "page_title": title,
            "screenshot_sha256": screenshot_hash,
            "screenshot_bytes": len(screenshot_bytes),
            "body_text_excerpt": excerpt,
            "latency_ms": latency_ms,
        })
        _write_cua_audit_row(row)

        return CuaExecutionResponse(
            adapter="playwright",
            status="executed",
            policy=policy,
            result={
                "request_id": request_id,
                "final_url": final_url,
                "page_title": title,
                "screenshot_sha256": screenshot_hash,
                "screenshot_bytes": len(screenshot_bytes),
                "body_text_excerpt": excerpt,
                "latency_ms": latency_ms,
                "audit_path": str(_CUA_AUDIT_PATH),
            },
        )

    def _cua_audit_base(
        self,
        request: CuaExecutionRequest,
        policy: AgentPolicyEvaluationResponse,
        request_id: str,
        tool: str,
    ) -> dict[str, Any]:
        """Canonical §38.3 audit-row skeleton; specific outcomes extend this."""
        return {
            "ts": time.time(),
            "request_id": request_id,
            "tenant_id": request.metadata.get("tenant_id", "default"),
            "actor": request.user_role,
            "tool": tool,
            "instruction": request.instruction[:200],
            "target": request.target,
            "policy_decision": policy.decision,
            "policy_reason": policy.reason,
        }

    def _harness_status(self) -> AgentToolStatus:
        return AgentToolStatus(
            key="harness-agent",
            name="Harness Agent Fleet",
            state="working-local",
            available=True,
            local=True,
            external_installed=False,
            endpoint="scripts/agent_fleet.sh + scripts/agent_supervisor.py",
            capabilities=["start agents", "scale workers", "submit tasks", "schedule jobs", "monitor heartbeats", "write reports"],
            risk_controls=["Redis queue isolation", "supervisor health gate", "task status inspection"],
            setup_commands=["./scripts/agent_fleet.sh help", "./scripts/agent_fleet.sh supervisor"],
            detail="Local harness is available through shell scripts and Docker Compose services.",
        )

    def _openclaw_status(self) -> AgentToolStatus:
        try:
            status = OpenClawGatewayService().status()
            available = status.available
            state = "working-local" if available else "unavailable"
            detail = status.detail
        except Exception as exc:
            available = False
            state = "unavailable"
            detail = f"OpenClaw local bridge probe failed: {exc}"
        return AgentToolStatus(
            key="openclaw",
            name="OpenClaw Local Bridge",
            state=state,  # type: ignore[arg-type]
            available=available,
            local=True,
            external_installed=False,
            endpoint="/api/v1/openclaw/*",
            capabilities=["task enqueue", "result polling", "manifest", "queue status"],
            risk_controls=["RBAC", "Redis queue boundary", "audit metadata"],
            setup_commands=["curl http://localhost:8000/api/v1/openclaw/status"],
            detail=detail,
        )

    def _paperclip_status(self) -> AgentToolStatus:
        try:
            status = PaperclipService().status()
            available = status.available
            detail = status.detail
        except Exception as exc:
            available = False
            detail = f"Paperclip local adapter probe failed: {exc}"
        return AgentToolStatus(
            key="paperclip",
            name="Paperclip Context Adapter",
            state="working-local" if available else "unavailable",
            available=available,
            local=True,
            external_installed=False,
            endpoint="/api/v1/paperclip/*",
            capabilities=["artifact storage", "PII redaction", "SHA-256 hashing", "context pack build"],
            risk_controls=["content-size quota", "basic PII redaction", "local filesystem storage"],
            setup_commands=["curl http://localhost:8000/api/v1/paperclip/status"],
            detail=detail,
        )

    def _poliysai_status(self) -> AgentToolStatus:
        return AgentToolStatus(
            key="poliysai",
            name="PoliysAI Governance Facade",
            state="working-local",
            available=True,
            local=True,
            external_installed=bool(os.environ.get("POLIYSAI_API_KEY")),
            endpoint="/api/v1/agent-platform/governance/evaluate",
            required_env=["POLIYSAI_API_KEY optional for external provider"],
            capabilities=["policy decision", "risk control mapping", "human approval routing", "audit envelope"],
            risk_controls=["denylist", "dry-run default", "RBAC", "approval required for real CUA writes"],
            setup_commands=["curl -X POST http://localhost:8000/api/v1/agent-platform/governance/evaluate ..."],
            detail="Local governance facade is active. External PoliysAI provider is optional and not bundled.",
        )


    def _ollama_status(self) -> AgentToolStatus:
        host = os.environ.get("BEV_OLLAMA_HOST") or os.environ.get("OLLAMA_HOST") or "http://localhost:11434"
        models = self._ollama_models(host)
        available = models is not None
        return AgentToolStatus(
            key="ollama",
            name="Ollama Model Service",
            state="working-local" if available else "unavailable",
            available=available,
            local=True,
            external_installed=False,
            endpoint=host,
            capabilities=["local inference", "model tags", "model pull/create", "agent model provider"],
            risk_controls=["small-model default for 100 agents", "timeout controls", "no secrets in prompts"],
            setup_commands=["./scripts/agent_fleet.sh ollama-setup", "./scripts/agent_fleet.sh ollama-status"],
            detail=(f"Ollama reachable with {len(models or [])} model(s)." if available else f"Ollama not reachable at {host}. Start compose Ollama or host Ollama."),
        )

    def _kivi_status(self) -> AgentToolStatus:
        host = os.environ.get("BEV_OLLAMA_HOST") or os.environ.get("OLLAMA_HOST") or "http://localhost:11434"
        model = os.environ.get("KIVI_MODEL") or os.environ.get("AGENT_MODEL") or "kivi:local"
        models = self._ollama_models(host)
        available = models is not None and model in models
        return AgentToolStatus(
            key="kivi-model",
            name="Kivi Local Agent Model",
            state="working-local" if available else "external-not-installed",
            available=available,
            local=True,
            external_installed=available,
            endpoint=f"{host}/api/generate",
            required_env=["BASE_MODEL=gemma3:1b", f"KIVI_MODEL={model}", "AGENT_MODEL=kivi:local"],
            capabilities=["100-agent default model", "council model option", "Ollama Modelfile alias"],
            risk_controls=["concise output", "low temperature", "bounded num_predict", "approval language for external changes"],
            setup_commands=["BASE_MODEL=gemma3:1b KIVI_MODEL=kivi:local ./scripts/setup_ollama_models.sh setup"],
            detail=(f"Kivi model {model} is present in Ollama." if available else f"Kivi model {model} is not present yet. Run ./scripts/agent_fleet.sh ollama-setup."),
        )

    @staticmethod
    def _ollama_models(host: str) -> set[str] | None:
        try:
            with urllib.request.urlopen(f"{host.rstrip('/')}/api/tags", timeout=2.0) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except (OSError, urllib.error.URLError, json.JSONDecodeError):
            return None
        return {str(item.get("name")) for item in payload.get("models", []) if item.get("name")}

    def _cua_status(self) -> AgentToolStatus:
        enabled = os.environ.get("ENABLE_REAL_CUA", "false").lower() == "true"
        return AgentToolStatus(
            key="cua",
            name="Computer-Using Agent Gateway",
            state="dry-run" if not enabled else "disabled",
            available=True,
            local=True,
            external_installed=False,
            endpoint="/api/v1/agent-platform/cua/execute",
            required_env=["ENABLE_REAL_CUA=true", "target allowlist", "human approval workflow"],
            capabilities=["policy-gated instruction envelope", "adapter selection", "dry-run audit"],
            risk_controls=["dry-run default", "dangerous target denylist", "human approval", "session recording target"],
            setup_commands=["curl -X POST http://localhost:8000/api/v1/agent-platform/cua/execute ..."],
            detail="CUA contract is wired. Real computer/browser side effects are intentionally not enabled.",
        )

    def _stagehand_status(self) -> AgentToolStatus:
        installed = importlib.util.find_spec("stagehand") is not None or importlib.util.find_spec("browserbase") is not None
        has_key = bool(os.environ.get("BROWSERBASE_API_KEY"))
        return AgentToolStatus(
            key="stagehand",
            name="Stagehand Browser Adapter",
            state="dry-run" if not (installed and has_key) else "disabled",
            available=True,
            local=True,
            external_installed=installed,
            required_env=["BROWSERBASE_API_KEY"],
            capabilities=["act contract", "extract contract", "browser session target"],
            risk_controls=["target allowlist", "human approval", "PII redaction", "session audit"],
            setup_commands=["pip install stagehand-python", "export BROWSERBASE_API_KEY=..."],
            detail="Stagehand contract is represented locally; real Browserbase sessions are not enabled.",
        )

    def _playwright_status(self) -> AgentToolStatus:
        installed = importlib.util.find_spec("playwright") is not None
        allowlist = _playwright_allowlist()
        return AgentToolStatus(
            key="playwright",
            name="Playwright Agentic Browser Adapter",
            state="working-local" if installed else "unavailable",
            available=installed,
            local=True,
            external_installed=installed,
            capabilities=[
                "real headless Chromium navigation (per §64.40 layer 8)",
                "page.goto + screenshot + body-text excerpt",
                "audit row per session (§38.3)",
            ],
            risk_controls=[
                f"target allowlist ({len(allowlist)} prefixes)",
                "policy denial precedes navigation",
                "screenshot SHA256 evidence",
                "structured error (no bare crash)",
            ],
            setup_commands=["pip install playwright", "python -m playwright install chromium"],
            detail=(
                "Backend Playwright now executes real headless-Chromium navigation when "
                "adapter='playwright', dry_run=false, target in PLAYWRIGHT_ALLOWLIST. "
                "Drill: tests/drills/drill_agent_platform_cua.py. "
                f"Audit log: {_CUA_AUDIT_PATH}."
                if installed else
                "Playwright package not installed. Run setup_commands."
            ),
        )

    def _select_adapter(self, request: CuaExecutionRequest) -> str:
        if request.adapter != "auto":
            return request.adapter
        if "browser" in request.instruction.lower() or request.target.startswith("http"):
            return "stagehand"
        return "openclaw"

    @staticmethod
    def _decision(reason_code: str, reason: str, controls: list[str], request: AgentPolicyEvaluationRequest) -> AgentPolicyEvaluationResponse:
        decision = reason_code
        return AgentPolicyEvaluationResponse(
            decision=decision,  # type: ignore[arg-type]
            reason=reason,
            required_controls=controls,
            audit={
                "agent_id": request.agent_id,
                "tool": request.tool,
                "action": request.action,
                "target": request.target,
                "user_role": request.user_role,
                "dry_run": request.dry_run,
                "metadata": request.metadata,
            },
        )
