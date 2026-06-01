# Design Methodology Policy

This policy defines how backend, AI, API, data, and agent features must be designed before implementation. It combines model-driven design, output-evaluation-first design, governance-AI-driven design, test-driven design, and domain-driven design.

## 1. Required Design Order

Use this order for new features and major changes:

1. Domain-driven design: define the business domain, terms, actors, invariants, and bounded context.
2. Model-driven design: define data models, API models, state machines, and relationships.
3. Output-evaluation-first design: define what good output looks like before building generation/inference logic.
4. Governance-AI-driven design: define safety, policy, audit, access, and accountability requirements.
5. Test-driven design: write or define tests for the expected behavior, failure modes, and security boundaries.
6. Implementation: route -> service -> domain/model -> repository/adapter.
7. Observability: logs, traces, metrics, audit events, eval reports.
8. Documentation: update README, API catalog, file inventory, runbook, and requirement history.

Do not start with code when the domain, model, output, governance, and tests are unknown.

## 2. Domain-Driven Design

Domain-driven design answers: what business problem does this solve, and what language does the business use?

Required artifacts:

- bounded context name
- business capability
- actors/users
- entities
- value objects
- aggregates
- domain services
- invariants/business rules
- domain events
- upstream/downstream systems

Template:

```text
Bounded context:
Business capability:
Actors:
Entities:
Value objects:
Aggregate root:
Business invariants:
Domain events:
External systems:
Primary API use cases:
```

Example:

```text
Bounded context: Model Registry
Business capability: Track ML model lifecycle and readiness
Entities: Model, Job, DriftMetric
Aggregate root: Model
Invariant: prediction is allowed only when model.status == ready
Domain event: model.created.v1, model.status_changed.v1
```

Implementation rule:

- Domain rules belong in service/domain policy, not in routes or repositories.

## 3. Model-Driven Design

Model-driven design answers: what are the stable data contracts and state transitions?

Required model types:

- API request model
- API response model
- database model/table
- domain model or policy object
- event model if async/event-driven
- frontend view model if UI consumes it

Required model documentation:

```text
Model name:
Why it exists:
Created by:
Consumed by:
Fields:
Validation rules:
State transitions:
Database mapping:
API mapping:
Security classification:
```

State machine example:

```text
pending -> training -> ready
pending -> failed
ready -> archived
failed -> pending
```

Implementation rule:

- Use explicit schemas for input and output.
- Avoid accepting arbitrary dictionaries unless the domain requires flexible metadata.
- If flexible metadata is required, document allowed keys and validation boundary.

## 4. Output-Evaluation-First Design

Output-evaluation-first design answers: how will we know the output is correct, useful, safe, and complete?

Required before building AI, RAG, simulation, forecast, or report generation:

- expected output schema
- quality rubric
- acceptance examples
- rejection examples
- evaluation method
- minimum passing score
- human review requirement if sensitive
- fallback behavior if evaluation fails

Evaluation template:

```json
{
  "feature": "ai_explain",
  "output_schema": {},
  "rubric": [
    {"criterion": "grounded", "weight": 0.35, "pass": "claims cite retrieved context"},
    {"criterion": "relevant", "weight": 0.25, "pass": "answers the user question"},
    {"criterion": "safe", "weight": 0.20, "pass": "no unsupported sensitive claims"},
    {"criterion": "actionable", "weight": 0.20, "pass": "gives next business action"}
  ],
  "minimum_score": 0.80,
  "fallback": "return cited context summary or graceful unavailable state"
}
```

Implementation rule:

- AI outputs should be evaluated before they are trusted by user-facing workflows.
- If an output cannot be evaluated automatically, define human review or mark it advisory.

## 5. Governance-AI-Driven Design

Governance-AI-driven design answers: what policies, risks, and accountability controls must wrap the feature?

Required governance checks:

- data classification
- PII/secrets handling
- user authorization
- model/provider approval
- prompt/version tracking
- output auditability
- bias/safety risk
- hallucination risk
- human-in-the-loop requirement
- retention policy
- incident response path

Governance template:

```text
Feature:
Data classification:
Authorized roles:
Model/provider:
Prompt/version:
Audit event:
PII handling:
Safety risks:
Fallback behavior:
Human approval required: yes/no
Retention:
```

Implementation rule:

- Governance is not an afterthought. If governance requirements are unknown, feature status is experimental.
- Sensitive AI decisions must be logged and explainable.

## 6. Test-Driven Design

Test-driven design answers: what proof shows this works and does not break boundaries?

Required tests:

- unit tests for pure domain rules
- schema validation tests
- service tests for business workflow
- repository tests for database behavior
- API contract tests
- negative tests
- auth/RBAC tests
- integration tests
- eval tests for AI/model outputs
- regression tests for previously fixed bugs

Test-case JSON template:

```json
{
  "id": "model_predict_not_ready_rejected",
  "type": "service_test",
  "given": {
    "model": {"id": 1, "status": "pending"},
    "input_data": {"feature": 1}
  },
  "when": "MLService.predict(1, input_data)",
  "then": {
    "raises": "ModelError",
    "message_contains": "not ready"
  }
}
```

Implementation rule:

- Tests should be written or at least specified before implementation for new business logic.
- Every API needs success and failure tests.
- Every security boundary needs positive and negative tests.

## 7. Combined Feature Design Template

Use this template before implementation:

```text
Feature name:
Requirement source:
Bounded context:
Business goal:
Actors/roles:
Domain entities:
Input models:
Output models:
State transitions:
API endpoints:
Service methods:
Repository/database changes:
Events/queues:
Output evaluation rubric:
Governance controls:
Auth/authorization:
Observability/logs/traces:
Test plan:
Run/debug steps:
Docs to update:
```

## 8. Design Review Gate

A design is not ready unless all answers are known:

- What domain does this belong to?
- What model/schema represents input?
- What model/schema represents output?
- Which service owns the business rule?
- Which repository owns persistence?
- What output quality rubric applies?
- What governance/audit controls apply?
- What tests prove success and failure?
- What logs/traces make it debuggable?
- What docs must be updated?

## 9. Agent Enforcement

Claude, Codex, and any automation agent must follow this policy when asked to design, align, review, or implement backend/AI/API features.

Required agent response structure for design work:

```text
Domain:
Models:
Output evaluation:
Governance:
Tests:
Implementation plan:
Docs to update:
Validation command:
```

If any section is unknown, the agent must state the gap and either inspect the repo or create the missing artifact before coding.
