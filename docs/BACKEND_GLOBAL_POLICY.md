# Backend Global Policy

This policy applies to every Python backend file, API route, service, repository, worker, schema, model, and ML/AI component in this repository.

## 1. Layered Architecture

Use these layers consistently:

1. User layer: browser, API client, external caller, load balancer, gateway.
2. Application/API layer: FastAPI routers, request validation, response serialization.
3. Service/business layer: one business use case per method; logs and traces decisions.
4. Domain/model layer: Pydantic contracts, domain objects, ML feature/model objects, domain lookup helpers.
5. Infrastructure layer: repositories, database connections, Redis, Celery, file system, MLflow, Ollama, Kafka/gRPC adapters.
6. Orchestration/framework layer: workers, schedulers, pipelines, async jobs, event consumers/producers.
7. Trust/observability/governance layer: auth, RBAC, JWT, audit, structured logs, correlation IDs, policy enforcement, evals.

## 2. Dependency Direction

Allowed dependency direction:

- router -> service -> repository/infrastructure
- router -> schema
- service -> schema/domain helpers/repository
- repository -> database only
- worker -> service
- tests -> any target under test

Forbidden:

- repository importing router
- repository owning business rules
- router opening database cursors directly
- service embedding SQL strings
- frontend deciding authorization truth
- infrastructure layer calling UI/application layer

## 3. API Route Rules

Every route must document:

- input: path/query/body/header
- process: service method and business rule summary
- output: response schema/status/error behavior
- security: authentication and authorization rule
- observability: log event/correlation ID expectation

Route functions should be thin:

```text
validate HTTP -> authorize -> call service -> return schema
```

Routes must not contain database SQL, ML training loops, or long business workflows.

## 4. Service Layer Rules

A service method should do one business thing.

Required service behavior:

- validate business preconditions
- call repository/domain helpers by ID when needed
- log important state transitions
- emit trace/audit events for high-value operations
- raise domain exceptions, not raw database exceptions
- return schemas or domain objects, not database cursors

Services may coordinate repositories, but must not contain SQL.

Bad pattern:

```python
class SomeService:
    def run(self):
        conn = psycopg2.connect(...)
        cur.execute('SELECT ...')
```

Good pattern:

```python
class SomeService:
    def run(self, model_id: int):
        model = self.model_repo.get_by_id(model_id)
        return self.domain_policy.evaluate(model)
```

## 5. Repository And Database Rules

Repositories own SQL only.

Required repository behavior:

- parameterized queries only
- no business decisions beyond row existence/shape
- return plain dictionaries or typed persistence objects
- commit/rollback through shared base helper
- no API response schemas unless intentionally mapped at service boundary

Database design rules:

- every table has a primary key
- foreign keys are explicit where relationships are required
- add secondary indexes for lookup/filter/join paths
- migrations are numbered and repeatable in order
- schema changes require docs and tests

## 6. Model/Schema Layer Rules

Pydantic schema files define API contracts.

Every schema class should document:

- who sends it
- who consumes it
- validation purpose
- output owner

Domain/model helpers may expose static lookup functions when they represent pure domain behavior, for example:

```python
ModelPolicy.get_required_status(model_id)
RolePermission.from_role(role_id)
```

Do not hide database access in static model methods unless the type is explicitly a repository/domain gateway. Prefer repositories for persistence.

## 7. Flow Documentation Rule

Each Python file must eventually have a file-level docstring with this shape:

```python
"""
File: backend/path/example.py
Layer: service/business
Purpose: one-sentence business purpose.
Input: who calls this file and what data arrives.
Process: what this file does.
Output: who receives the result.
Flow: caller -> this file -> next dependency.
Debug: logs/traces/errors to inspect.
"""
```

Each public class/function should include docstrings for non-obvious behavior.

## 8. Observability Rules

Every important backend operation must be debuggable.

Required:

- correlation ID middleware
- structured logs for business state changes
- service logs for create/update/delete/simulate/predict/explain operations
- error logs with request ID or correlation ID
- audit events for permissioned or high-risk actions

Log format should answer:

- what happened
- who/which role initiated it
- which object ID was affected
- which service/function handled it
- whether it succeeded or failed

## 9. Authentication And Authorization

Current state:

- demo RBAC uses `X-Demo-Role`
- middleware enforces a permission matrix for selected endpoints

Production target:

- JWT access token
- refresh/session strategy
- roles and permissions from backend source of truth
- route-level permission matrix
- audit log for denied and sensitive actions
- frontend only hides/disables actions; backend is final authority

JWT claims should include:

- subject/user ID
- tenant/org ID if multi-tenant
- roles/scopes
- expiry
- issuer/audience

## 10. Event-Driven/Kafka Policy

Kafka or any event bus should be introduced only when async integration is real.

Event design requirements:

- event name
- producer service
- consumer service
- schema version
- idempotency key
- retry/dead-letter behavior
- trace/correlation ID
- security classification

Example event names:

- `model.created.v1`
- `forecast.generated.v1`
- `simulation.completed.v1`
- `rag.explanation.requested.v1`

## 11. gRPC Policy

gRPC is allowed for internal service-to-service calls where REST overhead or streaming is a real problem.

Every gRPC service must define:

- `.proto` file
- service owner
- auth strategy
- timeout/retry policy
- backward compatibility rules
- generated client location

Do not add gRPC for browser-facing APIs.

## 12. Testing Policy

Required test types:

- unit tests for pure business logic
- service tests for business workflows
- repository tests for SQL behavior
- API tests for input/output/security
- negative tests for invalid input and denied permissions
- integration tests for DB-backed flows
- security tests for auth/RBAC and injection risks
- eval tests for AI/RAG quality, marked opt-in when external models are needed

Default test command excludes opt-in eval:

```bash
PYTHONPATH=backend python -m pytest backend/tests -q -m "not eval"
```

## 13. API Testing JSON Format

Use this format for API test cases:

```json
{
  "id": "api_models_create_success",
  "type": "api_test_case",
  "method": "POST",
  "path": "/api/v1/models",
  "security": {
    "role": "manager",
    "auth": "demo_role_header_now_jwt_later"
  },
  "input": {
    "headers": {"X-Demo-Role": "manager"},
    "path_params": {},
    "query": {},
    "body": {"name": "Demand Forecast", "algorithm": "prophet"}
  },
  "process": [
    "FastAPI validates ModelCreate",
    "router calls MLService.create_model",
    "service calls ModelRepository.create",
    "repository inserts ml_models row"
  ],
  "expected_output": {
    "status": 201,
    "body_shape": {"id": "int", "name": "str", "status": "pending"}
  }
}
```

## 14. Required Architecture Docs

Maintain these docs for production-grade work:

- BRD: business requirements
- FRD: functional requirements
- HLD: high-level design
- LLD: low-level design
- C4 model diagrams
- API contract catalog
- database schema docs
- integration mapping docs
- test strategy and report
- security design docs
- observability/runbook docs

## 15. AI Governance Policy

AI/RAG/model features must document:

- source data
- model used
- prompt or inference method
- grounding/citation behavior
- hallucination mitigation
- bias/safety limitation
- eval method
- fallback behavior when model is unavailable
- audit/logging expectations

## 16. Design Methodology Policy

Backend feature design must follow `docs/DESIGN_METHODOLOGY_POLICY.md`.
