-- Iter 43 · Tier-1 #4 · OpenTelemetry-style trace events on agent invocations.

-- Add trace_id + parent_span_id to agent_invocation
ALTER TABLE agent_invocation
    ADD COLUMN IF NOT EXISTS trace_id       VARCHAR(64),
    ADD COLUMN IF NOT EXISTS parent_span_id VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_inv_trace_id ON agent_invocation(trace_id);

-- Per-step event log (the spans)
CREATE TABLE IF NOT EXISTS agent_trace_event (
    event_id         VARCHAR(100) PRIMARY KEY,
    invocation_id    VARCHAR(100) NOT NULL,
    trace_id         VARCHAR(64),
    span_id          VARCHAR(64),
    parent_span_id   VARCHAR(64),
    event_name       VARCHAR(200),               -- plan · skill.{name} · tool.{name} · review · verify · audit
    event_kind       VARCHAR(50),                -- internal/server/client/producer/consumer
    started_at       TIMESTAMP NOT NULL,
    completed_at     TIMESTAMP,
    duration_ms      DECIMAL(10, 2),
    status           VARCHAR(50),                -- ok/error/stub/hitl_pending
    attributes       JSONB,
    error_text       TEXT,
    tenant_id        VARCHAR(100) DEFAULT 'default',
    created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ev_invocation ON agent_trace_event(invocation_id);
CREATE INDEX IF NOT EXISTS idx_ev_trace      ON agent_trace_event(trace_id);
CREATE INDEX IF NOT EXISTS idx_ev_name       ON agent_trace_event(event_name);
CREATE INDEX IF NOT EXISTS idx_ev_started    ON agent_trace_event(started_at DESC);
