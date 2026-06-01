# ADR-010: Decision audit schema — single Postgres table, 7-year retention

- **Status**: Accepted
- **Date**: 2026-06-01
- **Tags**: ai, audit, governance, compliance

## Context

Per global §38.3 + EU AI Act Art. 12 (high-risk AI logging) + state DOI rate
filing requirements: every regulated AI decision must persist a structured
audit row that supports:
- Right-to-explanation (Art. 86)
- Reproducibility (same inputs + versions → same decision)
- Forensic reconstruction
- Compliance reporting (per state, per quarter)

## Decision

**Single Postgres table `decision_audit`, partitioned by month, 7-year retention.
JSONB for nested explanation/citation fields.**

## Schema

```sql
CREATE TABLE decision_audit (
  request_id           UUID NOT NULL,
  timestamp            TIMESTAMPTZ NOT NULL DEFAULT now(),
  tenant_id            TEXT NOT NULL,
  user_id              TEXT,
  dept                 TEXT NOT NULL,        -- claims | underwriting | ...
  model_name           TEXT NOT NULL,
  model_version        TEXT NOT NULL,
  prompt_version       TEXT,
  input_hash           TEXT NOT NULL,        -- SHA-256 of input record
  input_features       JSONB NOT NULL,
  prediction           JSONB NOT NULL,
  confidence           NUMERIC(5,4),
  explanation          JSONB,                -- SHAP / counterfactual / citations
  rules_applied        TEXT[],
  guardrails_triggered TEXT[],
  human_override       BOOLEAN DEFAULT false,
  override_user_id     TEXT,
  override_reason      TEXT,
  fairness_flag        TEXT,                 -- pass / review / fail
  latency_ms           INTEGER,
  cost_tokens          INTEGER,
  feedback             JSONB,                -- async customer / agent feedback
  category             TEXT,                 -- PHI_ACCESS / PII_ACCESS / null
  PRIMARY KEY (request_id, timestamp)
) PARTITION BY RANGE (timestamp);

CREATE INDEX idx_audit_tenant_ts ON decision_audit (tenant_id, timestamp DESC);
CREATE INDEX idx_audit_dept_ts ON decision_audit (dept, timestamp DESC);
CREATE INDEX idx_audit_model ON decision_audit (model_name, model_version);
```

## Rationale

- Single table simplifies queries (cross-dept compliance reports)
- Partitioning by month enables fast 7-year retention drop (per §41.1)
- JSONB explanation allows schema evolution without ALTER TABLE
- request_id as part of PK enables audit row joins via OTel trace
- SHA-256 input_hash detects reproducibility (same hash + version → expect same prediction)

## Consequences

### Positive
- Single source of truth for "what did the AI decide"
- 7-year retention via pg_partman drop of old partitions
- Fast tenant-scoped queries via composite index

### Negative
- Large table: at 100K decisions/day = 36M rows/year
- JSONB queries slower than typed columns (mitigated by extracted views)
- Backfill on schema changes is non-trivial

## Alternatives considered

- **Per-dept tables**: Easier dept-specific queries but cross-dept compliance harder
- **Append-only log file (S3)**: Cheaper but query support weak; defer for archive tier
- **Specialized audit DB (e.g. AuditLogPipeline)**: Premature; Postgres handles current scale

## Retention

- Months 0-3: hot (active partition + replica)
- Months 4-12: warm (compressed table on slower storage)
- Years 2-7: cold (S3 Object Lock, restored on demand for compliance request)
- After 7 years: deleted (consider exceptions per state DOI rules)

## References

- Global §38.3 audit row schema
- Global §41 cost/finops (storage tier management)
- EU AI Act Art. 12 (≥ 6 months minimum, we choose 7 years)
- ADR-005 PostgreSQL (parent decision)
- `backend/migrations/` (schema evolution lives here)
