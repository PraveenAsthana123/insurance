# Global Input Persistence Policy

This policy defines how the platform saves every meaningful user input to the database for auditability, replay, analytics, debugging, and AI governance.

## Purpose

Every user-provided input that can change state, trigger an AI/model/API operation, influence a decision, or become part of a business record must be persisted as an append-only input event before or during processing.

This includes:

- text prompts and AI chat messages
- Ask AI / RAG questions
- form submissions
- filter sets that drive reports, simulations, or exports
- simulation parameters
- model inference payload metadata
- approval/rejection comments
- feedback, ratings, and correction notes
- upload metadata and selected dataset identifiers
- admin, agent, BMAD, Paperclip/OpenClaw, and monitoring commands

Pure navigation clicks, hover state, local layout toggles, and unsent draft text do not need database persistence unless the feature owner marks them as audit-relevant.

## Non-Negotiable Rules

1. Persist input through the backend, not directly from the browser to the database.
2. Store append-only rows. Never overwrite a historical input row.
3. Record tenant, actor, role, route, component, input kind, correlation ID, and idempotency key where available.
4. Store raw input only when allowed by data classification. Otherwise store a redacted payload plus hashes.
5. Do not store secrets, access tokens, API keys, passwords, full payment data, or unnecessary PII.
6. Use parameterized SQL only.
7. Tie every downstream output, model call, simulation, report, or agent run back to `user_input_events.id` when possible.
8. Reads are tenant-scoped by default. Cross-tenant readback requires compliance/admin role and audit-of-audit.
9. User input capture must not break the primary workflow. If persistence fails, high-risk operations fail closed; low-risk telemetry can fail open only with an error log.
10. Retention and deletion must be policy-driven. Delete requests should redact payloads and keep minimal audit metadata unless legal policy requires full removal.

## Canonical Database Table

Use `user_input_events` from `backend/migrations/051_user_input_events.sql`.

Required columns:

| Column | Meaning |
|---|---|
| `id` | Stable UUID primary key for joining downstream activity |
| `tenant_id` | Tenant from middleware/header, never user-forged body metadata |
| `actor` | User/service identity if known |
| `role_code` | Active role, e.g. manager, analyst, compliance |
| `session_id` | Browser/session/run identifier when available |
| `request_id` | Request/correlation UUID for tracing |
| `idempotency_key` | Caller key for safe retries |
| `source_surface` | UI/API/agent surface, e.g. insurance-process-tab, bank-prompts |
| `route_path` | Browser route or API path |
| `component_id` | Component/form/tab/input owner |
| `department_id` | Department context if known |
| `process_id` | Process context if known |
| `input_kind` | prompt, chat, form, filter, simulation, feedback, approval, upload, command |
| `input_name` | Field or logical input name |
| `payload` | JSONB redacted payload or allowed raw payload |
| `payload_redacted` | Whether payload was redacted before persistence |
| `payload_hash` | SHA-256 of normalized raw payload when available |
| `pii_classification` | none, low, moderate, high, restricted |
| `retention_class` | transient, standard, audit, legal_hold |
| `purpose` | Why this input was collected |
| `downstream_ref` | Linked output/run/model/report id once known |
| `status` | received, validated, processed, rejected, failed, redacted |
| `error_code` | Validation/persistence/processing error code |
| `metadata` | Extra non-sensitive context |

## Frontend Capture Contract

Every feature that accepts user input must define an input event envelope before calling the business endpoint.

Frontend sends:

```json
{
  "source_surface": "insurance-process-detail",
  "route_path": "/insurance/1/b2c/product-strategy?tab=simulation",
  "component_id": "SimulationTab",
  "department_id": "1",
  "process_id": "product-strategy",
  "input_kind": "simulation",
  "input_name": "scenario-controls",
  "payload": {
    "monthly_cases": 524,
    "automation_pct": 72,
    "data_quality_pct": 81,
    "model_confidence_pct": 84,
    "risk_pressure_pct": 38
  },
  "purpose": "what-if scenario evaluation"
}
```

Frontend must not decide final redaction. It should avoid sending known secrets, but backend is responsible for validation, redaction, hashing, and tenant stamping.

## Backend Processing Contract

Routers remain thin:

```text
validate HTTP -> stamp tenant/actor/correlation -> persist input event -> call service -> link downstream output -> return response
```

Services own business meaning:

- validate whether the input is allowed for the current role and process
- classify input risk and purpose
- request persistence through a repository/service helper
- attach `input_event_id` to downstream outputs when possible

Repositories own SQL only:

- insert into `user_input_events`
- update only linkage/status fields when allowed by policy
- never perform business classification

## Redaction And Classification

Default classification is `moderate` for free text and `low` for structured numeric/filter inputs.

Restricted values must be removed or tokenized before storage:

- passwords, API keys, OAuth tokens, private keys
- full SSN/SIN, full credit card/PAN, bank account numbers
- full medical record content unless the feature is explicitly approved for regulated storage
- production customer PII not needed for the requested task

For restricted data:

- `payload` stores redacted values only
- `payload_redacted=true`
- `payload_hash` stores SHA-256 of normalized raw payload if hashing is allowed
- `metadata.redaction_reason` explains what was removed

## API Surface Pattern

Preferred endpoint for generic capture:

```text
POST /api/v1/input-events
GET  /api/v1/input-events/{id}
GET  /api/v1/input-events?tenant_id=&actor=&source_surface=&process_id=&since=&limit=
```

Feature-specific endpoints may also create input events internally. They must return or log `input_event_id` when useful for UI debugging and audit.

## Validation Requirements

Any implementation of this policy must include:

- API test: valid input event creates a row
- API test: tenant body spoofing cannot override middleware tenant
- API test: restricted fields are redacted
- API test: cross-tenant read is blocked for normal roles
- repository test: SQL uses parameterized insert
- frontend E2E or component test for at least one critical input surface

## Relationship To Existing Policies

This policy composes with:

- `docs/TENANT_ID_IDEMPOTENCY_CONTRACT.md` for tenant stamping and retry behavior
- `docs/BACKEND_GLOBAL_POLICY.md` for service/repository layering
- `docs/UI_GLOBAL_POLICY.md` for frontend API state and observability
- `docs/API_ENDPOINT_CATALOG.md` for endpoint documentation
- `docs/BACKEND_FILE_INVENTORY.md` for file ownership updates

## Rollout Order

1. Apply `backend/migrations/051_user_input_events.sql`.
2. Add backend schema, repository, service, and router for `/api/v1/input-events`.
3. Add a frontend `inputEventsApi` helper using shared `apiFetch`.
4. Wire capture into high-value surfaces first: Ask AI, chat, prompts, simulation, feedback, approvals, report exports.
5. Add cross-tenant and redaction tests.
6. Update API catalogs and backend inventories after endpoints are implemented.
