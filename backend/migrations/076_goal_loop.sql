-- Migration 076 · Iter 93 · goal-loop driven program.

CREATE TABLE IF NOT EXISTS goal_run (
    goal_id          VARCHAR(100) PRIMARY KEY,
    goal_text        TEXT NOT NULL,
    tenant_id        VARCHAR(100) DEFAULT 'default',
    actor_user       VARCHAR(100),
    status           VARCHAR(50) DEFAULT 'planning',
    max_iterations   INT DEFAULT 10,
    iteration        INT DEFAULT 0,
    plan_text        TEXT,
    final_output     TEXT,
    started_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at     TIMESTAMP,
    ts_utc           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_goal_status CHECK (status IN ('planning', 'executing', 'reflecting',
                                                  'completed', 'failed', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS goal_step (
    step_id          BIGSERIAL PRIMARY KEY,
    goal_id          VARCHAR(100) NOT NULL,
    iteration        INT,
    step_kind        VARCHAR(50),
    description      TEXT,
    input_text       TEXT,
    output_text      TEXT,
    status           VARCHAR(50),
    duration_ms      INT,
    ts_utc           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_goal_step_kind CHECK (step_kind IN ('plan', 'execute', 'reflect',
                                                        'replan', 'tool_call'))
);
CREATE INDEX IF NOT EXISTS idx_goal_step_goal ON goal_step(goal_id, iteration);
