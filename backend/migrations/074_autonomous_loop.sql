-- Migration 074 · Iter 77 · Phase 8 autonomous loop · 8 self-* capabilities composed.

CREATE TABLE IF NOT EXISTS autonomous_loop_run (
    loop_id          VARCHAR(100) PRIMARY KEY,
    blueprint_id     VARCHAR(100),
    project_name     VARCHAR(200),
    tenant_id        VARCHAR(100) DEFAULT 'default',
    triggered_by     VARCHAR(100),
    status           VARCHAR(50) DEFAULT 'running',
    n_steps_passed   INT DEFAULT 0,
    n_steps_total    INT DEFAULT 8,
    project_id       VARCHAR(100),
    approval_id      VARCHAR(100),
    cost_usd         DECIMAL(10, 6) DEFAULT 0,
    started_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at     TIMESTAMP,
    summary          TEXT,
    CONSTRAINT chk_loop_status CHECK (status IN ('running','completed','failed','rolled_back'))
);
CREATE INDEX IF NOT EXISTS idx_loop_status ON autonomous_loop_run(status, started_at DESC);

CREATE TABLE IF NOT EXISTS autonomous_loop_step (
    step_id          BIGSERIAL PRIMARY KEY,
    loop_id          VARCHAR(100) NOT NULL,
    step_number      INT NOT NULL,
    capability       VARCHAR(50) NOT NULL,
    label            VARCHAR(200),
    status           VARCHAR(20),
    duration_ms      INT,
    output           JSONB,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_loop_step_status CHECK (status IN ('passed','failed','skipped','retried'))
);
CREATE INDEX IF NOT EXISTS idx_loop_step_loop ON autonomous_loop_step(loop_id, step_number);
