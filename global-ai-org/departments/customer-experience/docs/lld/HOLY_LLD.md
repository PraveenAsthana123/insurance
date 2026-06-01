# HOLY Beverage — Customer Experience Low-Level Design (LLD)

**Source:** operator brief 2026-05-21. **Status:** Draft, per-dept.

## 1. API contracts

| Endpoint | Method | Purpose | Auth |
|---|---|---|---|
| `/api/v1/customer-experience/list` | GET | List entities | RBAC |
| `/api/v1/customer-experience/<id>` | GET | Get entity by id | RBAC |
| `/api/v1/customer-experience/<id>` | PUT | Update entity | RBAC + ABAC |
| `/api/v1/customer-experience/forecast` | POST | Trigger forecast/recommendation | RBAC |
| `/api/v1/customer-experience/approve/<id>` | POST | Human approval step | RBAC + audit |

(See `docs/api/` per dept for full OpenAPI spec when authored.)

## 2. Data model (per-dept tables)

```sql
-- Department-scoped audit row (mandatory per §38)
CREATE TABLE customer_experience_audit (
  request_id        UUID PRIMARY KEY,
  timestamp         TIMESTAMPTZ NOT NULL,
  tenant_id         UUID NOT NULL,
  user_id           TEXT,
  model_name        TEXT,
  model_version     TEXT,
  prompt_version    TEXT,
  input_hash        TEXT,
  prediction        JSONB,
  confidence        NUMERIC(5,4),
  explanation       JSONB,
  guardrails        TEXT[],
  human_override    BOOLEAN,
  latency_ms        INTEGER,
  cost_tokens       INTEGER
);

CREATE INDEX idx_customer_experience_audit_ts ON customer_experience_audit(timestamp);
CREATE INDEX idx_customer_experience_audit_tenant ON customer_experience_audit(tenant_id, timestamp);
```

(Dept-specific tables omitted; see `business-layer/HOLY_SPEC.md` for canonical data types.)

## 3. Sequence: AI decision flow

```
User / Caller
    ↓ POST /api/v1/customer-experience/forecast
Backend API
    ↓ extract features
Feature store
    ↓ load
Model (Ollama / SageMaker / etc.)
    ↓ inference
Policy + guardrails
    ↓ enriched output
Audit row write (async)
    ↓
Response to caller (JSON)
```

## 4. Error handling

| Error | HTTP | Response |
|---|---|---|
| Validation failure | 400 | `{ "detail": "...", "error_code": "VALIDATION_ERROR" }` |
| Auth failure | 401 | `{ "detail": "...", "error_code": "AUTH_FAILED" }` |
| Authorization failure | 403 | `{ "detail": "...", "error_code": "FORBIDDEN" }` |
| Resource not found | 404 | `{ "detail": "...", "error_code": "NOT_FOUND" }` |
| Model unavailable | 503 | `{ "detail": "...", "error_code": "MODEL_UNAVAILABLE", "retry_after": 30 }` |
| Internal error | 500 | `{ "detail": "Internal server error", "error_code": "INTERNAL", "correlation_id": "..." }` |

## 5. Observability

- Logs: structured JSON with `correlation_id`, `tenant_id`, `user_id`, `model_version`
- Metrics (Prometheus): `customer-experience_request_count`, `customer-experience_request_latency_ms`, `customer-experience_model_confidence`
- Traces (OpenTelemetry): spans across API → feature → model → audit
- AI-specific: hallucination rate (where LLM in path), drift (compared to training distribution)

## 6. Compose with

- `docs/hld/HOLY_HLD.md` — high-level design
- `HOLY_TECH_STACK.md` — tools + infra
- `HOLY_NAV.json` — per-process audience filter + tabs
- Global §47.6 (security STRIDE), §48 (explainability), §38 (decision audit)
