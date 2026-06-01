# Agentic Browser And Resilience Wiring Status

This document is the honest wiring status for browser automation, CUA, service mesh, and resilience components. It separates what is working, what is stubbed, and what is only a recommendation/reference.

## Status Legend

- ✅ Working: code is wired and used by a runnable path.
- 🟡 Stub only: interface exists, but execution is dry-run or unavailable by design.
- ❌ Not wired: mentioned or desired, but no installed package/import/runtime code exists.
- ❓ Unknown: no repo evidence and the tool name needs clarification.

## Component Matrix

| Component | Status | Where it lives | What works | Production gap |
|---|---|---|---|---|
| Stagehand (Browserbase) | 🟡 Stub only | `backend/ml/reference/agentic_stack.py::StagehandAdapter` with `available = False` | Class exists with `act()` and `extract()` interface. Returns DRY_RUN payloads. | Needs `BROWSERBASE_API_KEY`, Stagehand Python package, session lifecycle, auth/secret handling, audit logs, and browser target policy. |
| Browser Use (`browser-use`) | ❌ Not wired | Mentioned in `docs/testing/MASTER_TESTING_MATRIX.md` as recommended OSS tooling | No import, no install, no adapter class. | Would slot into agentic layer 7 beside Stagehand as a browser-agent adapter. |
| Open Operator (Browserbase OSS) | ❌ Not wired | Mentioned in `docs/testing/MASTER_TESTING_MATRIX.md` only | No import, no install, no adapter class. | Would require a dedicated adapter, permissions, runtime isolation, and browser session manager. |
| OpenClaw bridge | ✅ Working local bridge | `backend/routers/openclaw.py`, `backend/services/openclaw_gateway_service.py`, `backend/schemas/openclaw.py`, `backend/tests/test_openclaw_router.py` | API exposes status, manifest, task creation, and result polling. Tasks route to Redis `council_tasks`/`council_done` or `tasks`/`done`. RBAC protects task creation as manager-only. | External OpenClaw gateway/SDK is not bundled. Production still needs real external connector, secrets policy, tenant isolation, retry/circuit-breaker hardening, and worker result schema enforcement. |
| OpenClaude / Claude Computer Use | ❌ Not wired | No code references found | No Anthropic SDK, no computer-use tool spec, no screen-capture/action loop. | Would need Anthropic SDK, CUA policy, screenshot loop, action executor, audit trail, and human approval gates. |
| Playwright | 🟡 Stub in agentic stack; ✅ E2E test dependency | `frontend/package.json` has `@playwright/test`; `backend/ml/reference/agentic_stack.py::PlaywrightAdapter` has `available = False` | Frontend supports `npm run test:e2e`. Backend agentic adapter returns DRY_RUN commands for navigate/fill/click. | Agentic use needs `playwright-python`, browser install, session manager, sandboxing, and target allowlist. |
| Paperclip local adapter | ✅ Working local adapter | `backend/routers/paperclip.py`, `backend/services/paperclip_service.py`, `backend/schemas/paperclip.py`, `backend/tests/test_paperclip_router.py` | Stores text artifacts, redacts basic PII, hashes content, lists/gets/deletes clips, and builds context packs for agents. | External Paperclip framework/tool is not bundled. If a specific upstream Paperclip tool is selected, wrap it behind this local adapter boundary. |
| Piperclip | ✅ Covered by local Paperclip adapter | `backend/services/paperclip_service.py`, `docs/AGENT_COUNCIL_ARCHITECTURE.md` | The local adapter now implements the intended artifact/context-pack capability. | Naming remains internal. External Piperclip/Paperclip products are not installed unless explicitly selected later. |
| Istio service mesh | ❌ Not wired | Mentioned in `docs/testing/MASTER_TESTING_MATRIX.md` as recommended service mesh tooling | No Kubernetes manifests, no Istio configs. Project runs on Docker Compose. | Only applies if/when deployed to Kubernetes. Would need mTLS, ingress, traffic policy, telemetry, and mesh tests. |
| Circuit Breaker | ✅ Working in RAG lifecycle only | `backend/ml/reference/rag_lifecycle.py::CircuitBreaker` | Active around RAG lifecycle Ollama calls. Opens after 3 failures, resets after 30s, exposes `circuit_breaker_state` in manifest. | Not yet shared with `agentic_stack.py`, council agents, `full_lifecycle.py`, or API clients. Should be extracted to common resilience utility before reuse. |

## Confirmed Repo Evidence

### Stagehand Stub

`backend/ml/reference/agentic_stack.py` defines `StagehandAdapter` with:

- `available = False`
- `act(instruction, target)`
- `extract(schema, target)`
- DRY_RUN response payloads

### Playwright Stub And E2E

Frontend:

- `frontend/package.json` includes `@playwright/test`
- scripts include `test:e2e` and `test:e2e:ui`

Agentic backend:

- `backend/ml/reference/agentic_stack.py::PlaywrightAdapter`
- `available = False`
- `navigate()`, `fill()`, `click()` return DRY_RUN commands

### Circuit Breaker

`backend/ml/reference/rag_lifecycle.py` defines and uses:

- `CircuitBreaker(failure_threshold=3, reset_after_seconds=30)`
- `record_success()`
- `record_failure()`
- `breaker.open`
- manifest field `circuit_breaker_state`

## Recommended Next Wiring Order

1. Extract `CircuitBreaker` into a shared resilience module such as `backend/core/resilience.py`.
2. Reuse circuit breaker in `agentic_stack.py` and council/Ollama calls.
3. Harden the OpenClaw bridge with service-level circuit breaker, result TTL/indexing, and an external gateway adapter when an official runtime is selected.
4. Add a real Playwright Python adapter before Stagehand, because it is easier to run locally and test deterministically.
5. Add Browser Use or Stagehand only behind policy, secrets, sandbox, and audit gates.
6. Treat OpenClaude/Claude Computer Use as a separate CUA adapter with explicit human approval controls.
7. Ignore Istio until the project has Kubernetes deployment artifacts.
8. Harden the local Paperclip adapter with persistence policy, artifact TTL, content-size quotas, and object-storage backing if it becomes production-critical.

## Required Adapter Contract

Any real browser/CUA adapter must implement this contract:

```json
{
  "adapter_name": "playwright|stagehand|browser_use|openclaude",
  "available": true,
  "action": "navigate|click|fill|extract|screenshot",
  "target": "allowed target URL or application id",
  "input": {},
  "policy_decision": "allow|deny|require_human_approval",
  "result": {},
  "trace_id": "request trace id",
  "duration_ms": 0,
  "audit": {
    "user_id": "...",
    "role": "...",
    "task_id": "...",
    "screenshot_ref": "optional",
    "redactions": []
  }
}
```

## Non-Negotiable Production Controls

Real browser automation must not be enabled without:

- target allowlist
- role permission check
- secret isolation
- per-task trace ID
- audit log
- screenshot/log retention policy
- rate limit
- timeout
- circuit breaker
- human approval for destructive actions
- dry-run mode
- integration tests

## OpenClaw Bridge API

The local OpenClaw bridge is now wired through FastAPI and Redis. It does not install or claim an external OpenClaw gateway runtime. It gives external orchestrators a stable contract to submit tasks into the existing worker system.

Endpoints:

- `GET /api/v1/openclaw/status`: Redis availability and queue lengths.
- `GET /api/v1/openclaw/manifest`: bridge contract, governance notes, and task schema.
- `POST /api/v1/openclaw/tasks`: enqueue a task. Demo RBAC allows only `manager`.
- `GET /api/v1/openclaw/tasks/{task_id}?mode=council`: poll result queue for a task.

Queue mapping:

- `mode=council`: `council_tasks` -> `council_done`.
- `mode=simple`: `tasks` -> `done`.

## Paperclip Local Adapter API

The local Paperclip adapter is now wired through FastAPI and filesystem JSON storage. It does not install or claim an external Paperclip framework. It provides the artifact/context-pack capability previously described as Piperclip/Paperclip.

Endpoints:

- `GET /api/v1/paperclip/status`: adapter availability and artifact count.
- `POST /api/v1/paperclip/clips`: store an artifact. Demo RBAC allows only `manager`.
- `GET /api/v1/paperclip/clips`: list artifacts without full content.
- `GET /api/v1/paperclip/clips/{clip_id}`: fetch one artifact including content.
- `DELETE /api/v1/paperclip/clips/{clip_id}`: delete an artifact. Demo RBAC allows only `manager`.
- `POST /api/v1/paperclip/context-pack`: compose selected clips into a bounded context string for agents.


## Unified Agent Platform Setup API

The repo now exposes a single setup/status surface for requested tools:

- `GET /api/v1/agent-platform/status`
- `GET /api/v1/agent-platform/manifest`
- `POST /api/v1/agent-platform/governance/evaluate`
- `POST /api/v1/agent-platform/cua/execute`

Local working components: Harness Agent fleet/supervisor, OpenClaw bridge, Paperclip adapter, PoliysAI governance facade.

Policy-gated dry-run components: CUA, Stagehand, backend Playwright agentic execution. Real browser/computer-use execution remains disabled until package/env setup, target allowlist, human approval, session audit, sandboxing, timeout/circuit breaker, and tests are implemented.
