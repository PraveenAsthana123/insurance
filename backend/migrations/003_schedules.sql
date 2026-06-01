-- =============================================================================
-- 003_schedules.sql — Job Scheduling Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS schedules (
    id                   SERIAL PRIMARY KEY,
    name                 VARCHAR(200) NOT NULL,
    job_type             VARCHAR(50)  NOT NULL,
    schedule_type        VARCHAR(50)  NOT NULL,
    cron_expression      VARCHAR(100),
    data_path            VARCHAR(500),
    model_id             INTEGER REFERENCES ml_models(id) ON DELETE SET NULL,
    process_id           INTEGER REFERENCES processes(id) ON DELETE SET NULL,
    department_id        INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    priority             VARCHAR(20)  NOT NULL DEFAULT 'medium',
    notify_email         BOOLEAN      NOT NULL DEFAULT FALSE,
    notify_slack         BOOLEAN      NOT NULL DEFAULT FALSE,
    notify_webhook       BOOLEAN      NOT NULL DEFAULT FALSE,
    status               VARCHAR(20)  NOT NULL DEFAULT 'active',
    last_run_at          TIMESTAMP,
    next_run_at          TIMESTAMP,
    success_count        INTEGER      NOT NULL DEFAULT 0,
    failure_count        INTEGER      NOT NULL DEFAULT 0,
    avg_duration_seconds NUMERIC(8,2),
    created_at           TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedules_status        ON schedules(status);
CREATE INDEX IF NOT EXISTS idx_schedules_process       ON schedules(process_id);
CREATE INDEX IF NOT EXISTS idx_schedules_department    ON schedules(department_id);
CREATE INDEX IF NOT EXISTS idx_schedules_next_run_at   ON schedules(next_run_at);
CREATE INDEX IF NOT EXISTS idx_schedules_job_type      ON schedules(job_type);
