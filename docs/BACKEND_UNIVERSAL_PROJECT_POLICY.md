# Backend Universal Project Policy

This policy is a reusable backend review, testing, and alignment standard for any project. Claude, Codex, and any coding agent must follow it before changing backend code, reviewing backend code, generating tests, or claiming a project is production ready.

## 1. Mandatory Operating Rule

Before implementing or reviewing backend work, the agent must establish current truth from the repository.

Required first reads:

- README or project overview
- dependency manifests
- application entrypoint
- route/API definitions
- schema/model definitions
- service/business logic files
- repository/database files
- test configuration
- environment/config files
- Docker/compose/deploy files
- existing architecture or agent instruction docs

Do not guess architecture, routes, env vars, database tables, auth rules, queues, or service ownership.

## 2. Universal Project Check Flow

Every backend project must be checked in this order:

1. Inventory: files, layers, entrypoints, dependencies, runtime services.
2. Architecture: route -> service -> domain/model -> repository -> database/infrastructure.
3. API contracts: method, path, input, process, output, error, auth, tracing.
4. Database model: tables, primary keys, foreign keys, indexes, migrations, seed data.
5. Service boundaries: one use case per method, no SQL in service, logs/traces present.
6. Security: auth, authorization, secrets, rate limits, input validation, unsafe output.
7. Observability: logs, correlation IDs, metrics, traces, audit events.
8. Testing: unit, service, API, integration, negative, security, regression.
9. Runtime: Docker, env vars, health checks, local run commands, debug commands.
10. Documentation: README, file inventory, API catalog, runbook, architecture docs.

## 3. Required Layer Model

Use this model to classify every file:

| Layer | Responsibility | Examples |
|---|---|---|
| User/Gateway | callers, load balancer, API gateway, frontend/API clients | browser, curl, gateway |
| Application/API | HTTP routes, controllers, request/response binding | FastAPI routers, Express controllers |
| Domain/Model | data contracts, domain rules, pure model helpers | Pydantic, Zod, dataclasses, DTOs |
| Service/Business | one business workflow per method | service classes/functions |
| Infrastructure | DB, queues, cache, filesystem, external services | repositories, adapters |
| Orchestration | workers, schedulers, pipelines, agent flows | Celery, Kafka consumers |
| Trust/Governance | auth, RBAC, audit, logging, policy, observability | middleware, audit logs |

## 4. File Inventory Standard

Every backend file inventory entry must answer:

```text
File:
Layer:
Business logic gist:
Input from:
Process:
Output to:
Main classes/functions:
Database/API/queue touched:
Logs/traces/audit:
Tests covering it:
Known gaps:
```

Every important source file should eventually contain a top-level docstring:

```python
"""
File: path/to/file.py
Layer: service/business
Purpose: why this file exists.
Input: caller/module/API/data received.
Process: business logic performed.
Output: return value/side effect/downstream module.
Flow: upstream -> this file -> downstream.
Debug: logs, trace IDs, errors, metrics to inspect.
"""
```

## 5. API Contract Standard

Every API must be documented in this shape:

```json
{
  "id": "stable_api_id",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/example",
  "purpose": "business purpose",
  "input": {
    "headers": {},
    "path_params": {},
    "query": {},
    "body_schema": {}
  },
  "process": [
    "validate request",
    "authorize caller",
    "call service method",
    "service calls repository/domain adapter",
    "return response schema"
  ],
  "output": {
    "success_status": 200,
    "response_schema": {},
    "error_statuses": [400, 401, 403, 404, 422, 500]
  },
  "security": {
    "authentication": "required|optional|none",
    "authorization": "role/scope/permission rule",
    "sensitive_data": "classification"
  },
  "observability": {
    "logs": true,
    "correlation_id": true,
    "audit_event": false,
    "metrics": []
  }
}
```

No API should be accepted without input, process, output, security, and observability notes.

## 6. Service Layer Policy

Service layer rules:

- one public method should represent one business use case
- method names should be verb-based and domain-specific
- services validate business preconditions
- services call repositories/adapters/domain helpers
- services log important state changes
- services emit audit events for sensitive actions
- services do not contain SQL
- services do not know HTTP details unless intentionally application services
- services raise domain errors, not raw infrastructure errors

Bad:

```python
class OrderService:
    def approve(self, order_id):
        conn = psycopg2.connect(...)
        cur.execute("UPDATE orders ...")
```

Good:

```python
class OrderService:
    def approve_order(self, order_id, actor):
        order = self.order_repo.get_by_id(order_id)
        OrderPolicy.assert_can_approve(order, actor)
        updated = self.order_repo.mark_approved(order_id, actor.id)
        self.audit.log_order_approved(order_id, actor.id)
        return updated
```

## 7. Domain/Model Policy

Domain/model layer rules:

- schemas/DTOs validate structure
- domain policies validate business rules
- pure helpers may be static/class methods
- model/domain helpers should not hide database access unless explicitly a repository/gateway
- database persistence belongs in repositories
- API schema names should show direction: `CreateRequest`, `UpdateRequest`, `Response`, `Summary`, `Event`

When a model or request object exists, document why:

```text
Why exists:
Who creates it:
Who consumes it:
Which API uses it:
Which service uses it:
What output it helps produce:
```

## 8. Repository/Database Policy

Repositories own database operations.

Required:

- parameterized queries or ORM-safe equivalent
- no business decisions beyond row mapping/existence
- no HTTP logic
- no frontend/UI assumptions
- transactions are explicit for multi-step writes
- primary keys on all tables
- foreign keys for required relationships
- secondary indexes for common joins/lookups
- migrations checked into repo
- rollback/recovery strategy for risky changes

Every table should document:

```text
Table:
Business purpose:
Primary key:
Foreign keys:
Important indexes:
Writers:
Readers:
Retention/audit/security notes:
```

## 9. Authentication And Authorization Policy

Every project must identify current and target auth posture.

Minimum production target:

- authenticated user identity
- JWT/session validation
- role/scope/permission enforcement on backend
- frontend permission gating for UX only
- audit log for sensitive actions and denials
- secrets never committed
- protected routes tested with positive and negative cases

Required checks:

- unauthenticated request behavior
- unauthorized role behavior
- expired/invalid token behavior
- privilege escalation attempts
- tenant/org boundary if multi-tenant

## 10. Observability Policy

Every backend must support debugging in terminal and production logs.

Required:

- structured logs
- correlation/request ID
- health endpoint
- startup logs
- error logs with stack/context
- service-level business logs
- audit logs for sensitive operations
- metrics for latency/error/rate where possible

Every important log should answer:

```text
who did it
what happened
which object ID
which service/function
success/failure
correlation ID
```

## 11. Event-Driven/Kafka Policy

Do not add Kafka/eventing unless async integration is real.

If added, every event must define:

- event name
- schema version
- producer
- consumer
- idempotency key
- ordering requirement
- retry policy
- dead-letter policy
- correlation ID
- security classification

Example:

```json
{
  "event": "model.created.v1",
  "producer": "MLService",
  "consumers": ["TrainingWorker"],
  "idempotency_key": "model_id",
  "dead_letter": "model.created.dlq"
}
```

## 12. gRPC/Microservice Policy

gRPC or microservices are allowed only when there is a real boundary:

- independent deployment
- independent scaling
- distinct team ownership
- streaming/low-latency internal communication
- fault isolation requirement

Required for each microservice:

- service contract
- auth strategy
- timeout policy
- retry policy
- health check
- observability
- versioning/backward compatibility
- integration tests

## 13. AI/Agent Governance Policy

For AI-powered systems, document:

- model/provider used
- prompt/version used
- input data source
- grounding/citations
- safety guardrails
- hallucination mitigation
- PII handling
- audit trail
- fallback behavior
- eval tests

Agent/council systems must document:

- task contract
- stage flow
- queue names
- model per stage
- output/audit format
- retry/failure handling
- human-review gate for sensitive actions

## 14. Testing Policy

Every backend project must have these test categories where applicable:

- unit tests
- service/business tests
- API contract tests
- repository/database tests
- integration tests
- negative tests
- auth/security tests
- migration tests
- worker/event tests
- AI eval tests marked opt-in when external models are required

Minimum acceptance command must be documented.

Example:

```bash
pytest tests -q
```

For this repo:

```bash
./scripts/project_doctor.sh
```

## 15. Review Checklist

A backend change is not ready unless:

- file inventory impact is understood
- API input/process/output is documented
- service contains business logic only
- repository contains persistence only
- auth/authorization behavior is known
- logs/traces exist for important operations
- tests cover success and failure paths
- run/debug docs are updated
- migrations are safe and indexed
- secrets/env vars are documented
- project doctor or equivalent passes

## 16. Claude/Codex Mandatory Behavior

Claude and Codex must:

- read this policy before backend changes or backend review
- map changed files to layers
- explain flow chain for changed APIs/services/models
- update docs when behavior changes
- run or state why they could not run validation
- never invent APIs, tables, env vars, or auth rules
- prefer repo truth over assumptions
- call out architectural violations directly

If a user asks to “check any project,” this policy is the default checklist.
If a user asks to “test any project,” this policy defines the test matrix.
If a user asks to “align any project,” this policy defines the target architecture.

## 17. Design Methodology Policy

For model-driven, output-evaluation-first, governance-AI-driven, test-driven, and domain-driven design, agents must follow `docs/DESIGN_METHODOLOGY_POLICY.md`.
