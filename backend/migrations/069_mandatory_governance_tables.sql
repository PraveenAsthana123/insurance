-- Migration 069 · Iter 67 · §101.E mandatory governance tables.
-- Per global §99 + §101 · close 10/12 mandatory tables gap.

-- workflow_run · main workflow lifecycle (per §101.B 12 states)
CREATE TABLE IF NOT EXISTS workflow_run (
    workflow_id      VARCHAR(100) PRIMARY KEY,
    user_id          VARCHAR(100),
    tenant_id        VARCHAR(100) DEFAULT 'default',
    department       VARCHAR(100),
    status           VARCHAR(50) NOT NULL DEFAULT 'CREATED',
    current_step     VARCHAR(200),
    current_agent    VARCHAR(100),
    progress_pct     INT DEFAULT 0,
    owner            VARCHAR(100),
    blocker          TEXT,
    risk_level       VARCHAR(20),
    next_action      TEXT,
    eta_target       TIMESTAMP,
    last_updated_by  VARCHAR(100),
    correlation_id   VARCHAR(100),
    trace_id         VARCHAR(64),
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_workflow_status CHECK (status IN (
        'CREATED','LOGGED','PLANNED','IN_PROGRESS','WAITING_APPROVAL',
        'BLOCKED','RETRYING','FAILED','RECOVERING','COMPLETED',
        'CANCELLED','ROLLED_BACK'
    )),
    CONSTRAINT chk_workflow_progress CHECK (progress_pct BETWEEN 0 AND 100)
);
CREATE INDEX IF NOT EXISTS idx_workflow_run_status ON workflow_run(status);
CREATE INDEX IF NOT EXISTS idx_workflow_run_tenant ON workflow_run(tenant_id, status);

-- workflow_step · per-step execution log
CREATE TABLE IF NOT EXISTS workflow_step (
    step_id          BIGSERIAL PRIMARY KEY,
    workflow_id      VARCHAR(100) REFERENCES workflow_run(workflow_id) ON DELETE CASCADE,
    step_no          INT,
    agent_id         VARCHAR(100),
    status           VARCHAR(50),
    started_at       TIMESTAMP,
    completed_at     TIMESTAMP,
    duration_ms      DECIMAL(12, 2),
    output           JSONB,
    error_text       TEXT,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_workflow_step_wf ON workflow_step(workflow_id, step_no);

-- prompt_log · every user prompt
CREATE TABLE IF NOT EXISTS prompt_log (
    prompt_id        VARCHAR(100) PRIMARY KEY,
    user_id          VARCHAR(100),
    tenant_id        VARCHAR(100) DEFAULT 'default',
    department       VARCHAR(100),
    prompt_text      TEXT NOT NULL,
    prompt_version   VARCHAR(50),
    workflow_id      VARCHAR(100),
    invocation_id    VARCHAR(100),
    sentiment        VARCHAR(20),
    pii_detected     BOOLEAN DEFAULT false,
    review_status    VARCHAR(50) DEFAULT 'pending',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_prompt_log_user ON prompt_log(user_id, created_at DESC);

-- model_registry · model versions per global §101.A.9
CREATE TABLE IF NOT EXISTS model_registry (
    model_id         VARCHAR(100) PRIMARY KEY,
    provider         VARCHAR(50),
    model_name       VARCHAR(100),
    version          VARCHAR(50),
    context_length   INT,
    cost_per_1k_in   DECIMAL(10, 6),
    cost_per_1k_out  DECIMAL(10, 6),
    fallback_model   VARCHAR(100),
    status           VARCHAR(50) DEFAULT 'active',
    deprecated_at    TIMESTAMP,
    benchmarked_at   TIMESTAMP,
    tenant_id        VARCHAR(100) DEFAULT 'default',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_model_status CHECK (status IN ('active', 'deprecated', 'retired'))
);

-- notification_log · audit per §101.D 13 events
CREATE TABLE IF NOT EXISTS notification_log (
    notification_id  BIGSERIAL PRIMARY KEY,
    workflow_id      VARCHAR(100),
    event_type       VARCHAR(100),
    notify_target    VARCHAR(200),
    channel          VARCHAR(50),
    payload          JSONB,
    delivered        BOOLEAN DEFAULT false,
    delivered_at     TIMESTAMP,
    failure_reason   TEXT,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notif_event_ts ON notification_log(event_type, created_at DESC);

-- error_log · all backend errors
CREATE TABLE IF NOT EXISTS error_log (
    error_id         BIGSERIAL PRIMARY KEY,
    workflow_id      VARCHAR(100),
    component        VARCHAR(100),
    severity         VARCHAR(20),
    error_type       VARCHAR(100),
    error_text       TEXT,
    stack_trace      TEXT,
    correlation_id   VARCHAR(100),
    trace_id         VARCHAR(64),
    user_id          VARCHAR(100),
    tenant_id        VARCHAR(100) DEFAULT 'default',
    resolved         BOOLEAN DEFAULT false,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_error_severity CHECK (severity IN ('Low', 'Medium', 'High', 'Critical'))
);
CREATE INDEX IF NOT EXISTS idx_error_severity_ts ON error_log(severity, created_at DESC);

-- checkpoint_store · resume after crash per §101.A.14
CREATE TABLE IF NOT EXISTS checkpoint_store (
    checkpoint_id    BIGSERIAL PRIMARY KEY,
    workflow_id      VARCHAR(100) NOT NULL,
    step_no          INT,
    state            JSONB NOT NULL,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tenant_id        VARCHAR(100) DEFAULT 'default'
);
CREATE INDEX IF NOT EXISTS idx_checkpoint_wf_step ON checkpoint_store(workflow_id, step_no DESC);

-- audit_log · catch-all immutable log
CREATE TABLE IF NOT EXISTS audit_log (
    audit_id         BIGSERIAL PRIMARY KEY,
    actor            VARCHAR(100),
    action           VARCHAR(100),
    resource         VARCHAR(200),
    payload          JSONB,
    tenant_id        VARCHAR(100) DEFAULT 'default',
    correlation_id   VARCHAR(100),
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_ts ON audit_log(actor, created_at DESC);

-- status_history · every workflow_run.status change
CREATE TABLE IF NOT EXISTS status_history (
    history_id       BIGSERIAL PRIMARY KEY,
    workflow_id      VARCHAR(100),
    from_status      VARCHAR(50),
    to_status        VARCHAR(50),
    changed_by       VARCHAR(100),
    reason           TEXT,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_history_to_status CHECK (to_status IN (
        'CREATED','LOGGED','PLANNED','IN_PROGRESS','WAITING_APPROVAL',
        'BLOCKED','RETRYING','FAILED','RECOVERING','COMPLETED',
        'CANCELLED','ROLLED_BACK'
    ))
);
CREATE INDEX IF NOT EXISTS idx_status_history_wf ON status_history(workflow_id, created_at DESC);

-- approval_request · §101.D plus existing approval_workflow integration
CREATE TABLE IF NOT EXISTS approval_request (
    approval_id      VARCHAR(100) PRIMARY KEY,
    workflow_id      VARCHAR(100),
    requested_by     VARCHAR(100),
    approver_role    VARCHAR(100),
    risk_level       VARCHAR(20),
    reason           TEXT,
    status           VARCHAR(50) DEFAULT 'requested',
    decided_by       VARCHAR(100),
    decided_at       TIMESTAMP,
    payload          JSONB,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_approval_status CHECK (status IN (
        'requested', 'approved', 'rejected', 'expired', 'cancelled'
    ))
);
CREATE INDEX IF NOT EXISTS idx_approval_status ON approval_request(status, created_at DESC);

-- Seed a few representative model registry rows
INSERT INTO model_registry (model_id, provider, model_name, version, context_length, cost_per_1k_in, cost_per_1k_out, fallback_model, status)
VALUES
  ('llama3.2-3b', 'ollama', 'llama3.2', '3b', 8192, 0, 0, NULL, 'active'),
  ('gpt-4o-mini', 'openai', 'gpt-4o-mini', '2024-07', 128000, 0.00015, 0.0006, 'llama3.2-3b', 'active'),
  ('claude-3-5-haiku', 'anthropic', 'claude-3-5-haiku', '2024-10', 200000, 0.0008, 0.004, 'gpt-4o-mini', 'active')
ON CONFLICT (model_id) DO NOTHING;
