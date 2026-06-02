# Agent Council And Hybrid Architecture

This document defines the production direction for the INSUR agent system: simple worker agents, council-of-agents, hybrid human/API/worker orchestration, and future framework adapters such as OpenClaw, Piperclip, or Harness-style execution runners.

## 1. Current Implementation

Current files:

- `agents/agent.py`: simple Redis task worker. Pulls from `tasks`, calls Ollama, pushes to `done`.
- `agents/seeder.py`: seeds simple one-shot tasks into Redis.
- `agents/council_agent.py`: three-stage council worker. Pulls from `council_tasks`, runs author/reviewer/chair, pushes full audit trail to `council_done`.
- `agents/council_seeder.py`: seeds harder tasks for the council flow.
- `backend/routers/insur.py`: exposes UI/API endpoints for council ask/result and related INSUR artifacts.
- `backend/services/typed_council.py`: opt-in Pydantic AI typed council adapter for synchronous author/reviewer/chair runs.
- `backend/routers/agent_platform.py`: exposes `POST /api/v1/agent-platform/typed-council/run` for the typed council pilot.
- `docker-compose.yml`: defines `agents` and `council_agents` scalable worker services.

## 2. Architecture Style

The agent system must follow hybrid hexagonal architecture.

Core domain:

- task definition
- agent execution policy
- council stage policy
- result/audit contract
- scoring/evaluation policy

Ports:

- task queue port
- LLM inference port
- persistence/audit port
- telemetry/logging port
- governance/policy port
- human review port

Adapters:

- Redis queue adapter
- Ollama model adapter
- FastAPI API adapter
- Docker Compose runtime adapter
- future Kafka event adapter
- future gRPC adapter
- future OpenClaw/Piperclip/Harness adapter

Rule: business logic should depend on ports/contracts, not directly on Redis/Ollama. Current code is POC and can be refactored toward this boundary.

## 3. Flow Chain

Simple worker flow:

```text
User/API/seeder
  -> Redis list: tasks
  -> agents/agent.py BRPOP
  -> Ollama /api/generate
  -> Redis list: done
  -> UI/API/debug viewer
```

Council flow:

```text
User/UI POST /api/v1/insur/council/ask
  -> backend/routers/insur.py
  -> Redis list: council_tasks
  -> agents/council_agent.py BRPOP
  -> Stage 1 AUTHOR model
  -> Stage 2 REVIEWER model
  -> Stage 3 CHAIR model
  -> Redis list: council_done
  -> UI GET /api/v1/insur/council/result/{task_id}
```

Typed council pilot flow:

```text
User/API POST /api/v1/agent-platform/typed-council/run
  -> RBAC + TenantIdMiddleware
  -> AgentPlatformIntegrationService.run_typed_council
  -> services.typed_council.run_typed_council
  -> Stage 1 AUTHOR Pydantic output
  -> Stage 2 REVIEWER Pydantic output
  -> Stage 3 CHAIR Pydantic output
  -> typed_council_runs.jsonl audit rows
  -> synchronous typed response
```

This pilot is default-off via `INSUR_TYPED_COUNCIL_ENABLED`; the Redis/OpenClaw council flow remains the default async council path.

## 4. Council Contract

Input task shape:

```json
{
  "id": "council-0001",
  "department": "sales",
  "prompt": "Design a tiered pricing model...",
  "seeded_at": 1760000000.0,
  "source": "insur-nav-ui"
}
```

Output result shape:

```json
{
  "task_id": "council-0001",
  "agent_id": "container-hostname",
  "prompt": "Design a tiered pricing model...",
  "department": "sales",
  "ok": true,
  "final": "Final answer from chair.",
  "author": {"ok": true, "model": "gemma3:4b", "response": "...", "ms": 1200, "tokens": 80},
  "reviewer": {"ok": true, "model": "gemma3:4b", "response": "...", "ms": 900, "tokens": 60},
  "chair": {"ok": true, "model": "gemma3:1b", "response": "...", "ms": 700, "tokens": 40},
  "elapsed_ms": 3000,
  "completed_at": 1760000003.0
}
```

## 5. Agent Layer Responsibilities

### User Layer

Responsible for starting work through UI, API, CLI, or seeders.

Examples:

- Insur Nav UI council button
- `council_seeder.py`
- future workflow runner
- future load balancer / gateway

### Gateway/API Layer

Responsible for request validation and exposing task state.

Current implementation:

- `POST /api/v1/insur/council/ask`
- `GET /api/v1/insur/council/result/{task_id}`

Production target:

- JWT authorization
- tenant/org boundary
- task quota/rate limiting
- request correlation ID
- task audit event

### Orchestration Layer

Responsible for task routing and stage execution.

Current implementation:

- Redis list queue
- blocking pop worker loop
- author/reviewer/chair sequence

Production target:

- typed task contracts
- retry policy
- dead-letter queue
- idempotency key
- queue visibility/lease timeout
- structured event stream

### Model/AI Layer

Responsible for model calls and prompt templates.

Current implementation:

- direct Ollama HTTP calls
- model names from environment variables

Production target:

- model router
- model capability registry
- prompt versioning
- token/cost tracking
- groundedness/safety checks
- fallback model policy

### Trust/Governance Layer

Responsible for policy enforcement, audit, security, and eval.

Required:

- task authorization
- prompt/input classification
- PII redaction where needed
- output safety checks
- audit trail for every stage
- metrics for success/failure/latency
- human review mode for sensitive outputs

## 6. OpenClaw, Piperclip, Harness Extension Points

These names are treated as internal adapter placeholders until mapped to a real external library or service.

### OpenClaw Adapter

Purpose: open coordination adapter for external agent frameworks.

Current implementation:

- `backend/routers/openclaw.py`: FastAPI bridge endpoints.
- `backend/services/openclaw_gateway_service.py`: Redis queue adapter and polling logic.
- `backend/schemas/openclaw.py`: request, response, status, and manifest contract.
- `backend/tests/test_openclaw_router.py`: route and RBAC contract tests.

Working flow:

```text
External orchestrator
  -> POST /api/v1/openclaw/tasks
  -> OpenClawGatewayService
  -> Redis council_tasks or tasks
  -> council/simple workers
  -> Redis council_done or done
  -> GET /api/v1/openclaw/tasks/{task_id}
```

Responsibilities:

- translate OpenClaw-style task payload to INSUR worker task format
- enforce demo RBAC so task creation is manager-only
- preserve source, metadata, timestamps, and task id for traceability
- map worker results back to a stable polling response
- prevent external framework from bypassing governance

Remaining production gaps:

- official external OpenClaw gateway/SDK adapter is not bundled
- result indexing/TTL should replace list scanning for high volume
- shared circuit breaker and retry policy should wrap Redis/worker handoff
- worker outputs need stricter schema validation before external release

### Paperclip / Piperclip Adapter

Purpose: pipeline clip/attachment adapter for artifacts and context packs.

Current implementation:

- `backend/routers/paperclip.py`: FastAPI endpoints for status, clip storage, clip retrieval, deletion, and context-pack composition.
- `backend/services/paperclip_service.py`: local JSON artifact store, basic PII redaction, SHA-256 hashing, bounded context-pack builder.
- `backend/schemas/paperclip.py`: request/response contracts.
- `backend/tests/test_paperclip_router.py`: route, RBAC, redaction, and context-pack tests.

Working flow:

```text
Codex / Claude / operator / API
  -> POST /api/v1/paperclip/clips
  -> PaperclipService redacts + hashes + stores artifact
  -> POST /api/v1/paperclip/context-pack
  -> context string passed into OpenClaw/council/simple agent task
```

Responsibilities:

- attach documents, screenshots, API traces, DB snapshots, run logs, or prompts to a task
- hash and label attached context
- enforce max context size
- redact basic email/phone PII before storage by default
- provide a context-pack API for downstream agent tasks

Remaining production gaps:

- external Paperclip/Piperclip framework is not installed
- filesystem JSON storage should move to object storage or database for production
- redaction is basic and should be replaced with a full DLP/PII scanner
- artifact TTL, retention policy, tenant isolation, and size quotas need enforcement

### Harness Adapter

Purpose: repeatable execution harness for agent workflows.

Responsibilities:

- run a workflow by name
- seed task inputs
- start/scale workers
- collect results
- run assertions/evals
- emit a report

## 7. Harness Commands

Local Docker harness:

```bash
docker compose up -d redis ollama
python agents/council_seeder.py 5
docker compose up -d --scale council_agents=2 council_agents
```

Simple 100-agent demo:

```bash
docker compose up -d redis ollama
python agents/seeder.py 100
docker compose up -d --scale agents=100 agents
```

Inspect Redis queues:

```bash
docker compose exec redis redis-cli LLEN council_tasks
docker compose exec redis redis-cli LLEN council_done
docker compose exec redis redis-cli LRANGE council_done 0 2
```

API harness:

```bash
curl -X POST http://localhost:8000/api/v1/insur/council/ask \
  -H 'Content-Type: application/json' \
  -d '{"department":"sales","prompt":"Create a distributor pricing plan"}'

curl http://localhost:8000/api/v1/insur/council/result/<task_id>
```

## 8. Observability Requirements

Every agent result must include:

- task ID
- agent ID
- department
- model name per stage
- stage latency
- total latency
- success/failure status
- error message when failed
- completion timestamp

Production logs should be JSON and include:

- correlation ID
- queue name
- task ID
- stage name
- model name
- retry count
- elapsed time

## 9. Failure Policy

Failure states:

- Redis unavailable
- Ollama unavailable
- model missing
- stage timeout
- malformed task JSON
- unsafe prompt
- unsafe output
- result serialization failure

Required behavior:

- log failure with task ID
- preserve failed result in an audit/dead-letter location
- never drop task silently
- avoid infinite hot retry loops
- expose failed status to UI/API

## 10. Production Refactor Target

Target modules:

```text
agents/domain/task_contracts.py
agents/domain/council_policy.py
agents/ports/queue_port.py
agents/ports/model_port.py
agents/ports/audit_port.py
agents/adapters/redis_queue.py
agents/adapters/ollama_model.py
agents/adapters/openclaw_adapter.py
agents/adapters/piperclip_context.py
agents/harness/runner.py
agents/harness/report.py
```

This keeps framework adapters outside the core council policy.

## 11. Tool Selection Matrix

External agent/orchestration/media tools must be evaluated with `docs/AGENT_TOOL_SELECTION_MATRIX.md` before integration.

## 12. Honest Wiring Status

Current browser/CUA/resilience wiring status is tracked in `docs/AGENTIC_BROWSER_WIRING_STATUS.md`. Do not claim a component is wired unless this file and code agree.
