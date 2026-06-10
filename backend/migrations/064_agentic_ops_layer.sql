-- Iter 38 · Agentic Ops layer · 7 tables (feedback · incident · dependency · team · sla · capacity · queue).
-- Per operator spec sections 23-29.

-- ───────────────────────────────────────────────────────────────────
-- 23. agent_feedback · human feedback + correction loop

CREATE TABLE IF NOT EXISTS agent_feedback (
    feedback_id       VARCHAR(100) PRIMARY KEY,
    invocation_id     VARCHAR(100),
    agent_id          VARCHAR(100),
    user_id           VARCHAR(100),
    feedback_type     VARCHAR(100),                     -- rating/correction/escalation/safety
    rating            INT,                              -- 1..5
    sentiment         VARCHAR(50),
    feedback_text     TEXT,
    correction_text   TEXT,
    category          VARCHAR(100),                     -- accuracy/hallucination/safety/cost/...
    severity          VARCHAR(50)  DEFAULT 'Low',
    action_required   BOOLEAN      DEFAULT FALSE,
    reviewed_by       VARCHAR(100),
    review_status     VARCHAR(50)  DEFAULT 'Pending',
    tenant_id         VARCHAR(100) DEFAULT 'default',
    created_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_fb_agent     ON agent_feedback(agent_id);
CREATE INDEX IF NOT EXISTS idx_fb_severity  ON agent_feedback(severity);
CREATE INDEX IF NOT EXISTS idx_fb_tenant    ON agent_feedback(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fb_invocation ON agent_feedback(invocation_id);

-- ───────────────────────────────────────────────────────────────────
-- 24. agent_incident · production AI incident tracking

CREATE TABLE IF NOT EXISTS agent_incident (
    incident_id       VARCHAR(100) PRIMARY KEY,
    invocation_id     VARCHAR(100),
    agent_id          VARCHAR(100),
    incident_type     VARCHAR(100),                     -- hallucination/tool_failure/prompt_injection/cost/...
    severity          VARCHAR(20)  DEFAULT 'P3',        -- P1..P5
    category          VARCHAR(100),
    title             VARCHAR(500),
    description       TEXT,
    root_cause        TEXT,
    business_impact   TEXT,
    affected_users    INT          DEFAULT 0,
    affected_systems  JSONB,
    detected_by       VARCHAR(100),
    owner_team        VARCHAR(100),
    status            VARCHAR(50)  DEFAULT 'Open',      -- Open/Assigned/Investigating/Resolved/Closed
    corrective_action TEXT,
    preventive_action TEXT,
    resolution_notes  TEXT,
    tenant_id         VARCHAR(100) DEFAULT 'default',
    opened_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    resolved_at       TIMESTAMP,
    created_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_inc_agent    ON agent_incident(agent_id);
CREATE INDEX IF NOT EXISTS idx_inc_status   ON agent_incident(status);
CREATE INDEX IF NOT EXISTS idx_inc_severity ON agent_incident(severity);
CREATE INDEX IF NOT EXISTS idx_inc_tenant   ON agent_incident(tenant_id);

-- ───────────────────────────────────────────────────────────────────
-- 25. agent_dependency · what agent depends on (tools, MCPs, models, infra)

CREATE TABLE IF NOT EXISTS agent_dependency (
    dependency_id        VARCHAR(100) PRIMARY KEY,
    agent_id             VARCHAR(100) NOT NULL,
    dependency_type      VARCHAR(50),                   -- agent/tool/mcp/model/embedding/db/cache/queue/storage
    dependency_name      VARCHAR(200),
    dependency_category  VARCHAR(100),
    criticality          VARCHAR(50)  DEFAULT 'High',   -- Critical/High/Medium/Low
    fallback_dependency  VARCHAR(200),
    owner_team           VARCHAR(100),
    sla_id               VARCHAR(100),
    status               VARCHAR(50)  DEFAULT 'Healthy', -- Healthy/Degraded/Failed/Testing/Retired
    health_score         DECIMAL(5, 2),
    last_check           TIMESTAMP,
    tenant_id            VARCHAR(100) DEFAULT 'default',
    created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_dep_agent       ON agent_dependency(agent_id);
CREATE INDEX IF NOT EXISTS idx_dep_criticality ON agent_dependency(criticality);
CREATE INDEX IF NOT EXISTS idx_dep_status      ON agent_dependency(status);

-- ───────────────────────────────────────────────────────────────────
-- 26. agent_team · ownership + support + RACI

CREATE TABLE IF NOT EXISTS agent_team (
    team_id            VARCHAR(100) PRIMARY KEY,
    agent_id           VARCHAR(100) NOT NULL,
    business_owner     VARCHAR(200),
    technical_owner    VARCHAR(200),
    support_team       VARCHAR(200),
    platform_team      VARCHAR(200),
    security_owner     VARCHAR(200),
    compliance_owner   VARCHAR(200),
    incident_manager   VARCHAR(200),
    release_manager    VARCHAR(200),
    escalation_group   VARCHAR(200),
    support_model      VARCHAR(50)  DEFAULT 'Business Hours', -- Business Hours/16x5/24x7/Follow The Sun
    support_hours      VARCHAR(100),
    status             VARCHAR(50)  DEFAULT 'Active',
    tenant_id          VARCHAR(100) DEFAULT 'default',
    created_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_agent ON agent_team(agent_id);

-- ───────────────────────────────────────────────────────────────────
-- 27. agent_sla · service level commitments

CREATE TABLE IF NOT EXISTS agent_sla (
    sla_id                    VARCHAR(100) PRIMARY KEY,
    agent_id                  VARCHAR(100) NOT NULL,
    sla_name                  VARCHAR(200),
    sla_tier                  VARCHAR(50)  DEFAULT 'Tier2',  -- Tier1/Tier2/Tier3
    availability_target       DECIMAL(5, 2) DEFAULT 99.90,
    latency_target_ms         INT          DEFAULT 5000,
    accuracy_target           DECIMAL(5, 2) DEFAULT 95.00,
    success_rate_target       DECIMAL(5, 2) DEFAULT 98.00,
    mttr_target_minutes       INT          DEFAULT 120,
    mtta_target_minutes       INT          DEFAULT 15,
    max_cost_per_run          DECIMAL(10, 4) DEFAULT 0.10,
    max_incidents_per_month   INT          DEFAULT 5,
    support_model             VARCHAR(100),
    escalation_policy         VARCHAR(100),
    status                    VARCHAR(50)  DEFAULT 'Active',
    owner_team                VARCHAR(100),
    tenant_id                 VARCHAR(100) DEFAULT 'default',
    created_at                TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sla_agent ON agent_sla(agent_id);
CREATE INDEX IF NOT EXISTS idx_sla_tier  ON agent_sla(sla_tier);

-- ───────────────────────────────────────────────────────────────────
-- 28. agent_capacity · concurrency + autoscale + resources

CREATE TABLE IF NOT EXISTS agent_capacity (
    capacity_id              VARCHAR(100) PRIMARY KEY,
    agent_id                 VARCHAR(100) NOT NULL,
    max_concurrent_requests  INT          DEFAULT 50,
    max_queue_depth          INT          DEFAULT 500,
    max_tokens_per_request   INT          DEFAULT 8192,
    max_memory_mb            INT          DEFAULT 4096,
    max_cpu_cores            INT          DEFAULT 4,
    max_gpu_memory_mb        INT          DEFAULT 0,
    autoscale_min_instances  INT          DEFAULT 1,
    autoscale_max_instances  INT          DEFAULT 10,
    autoscale_trigger        VARCHAR(100) DEFAULT 'cpu_70',
    target_latency_ms        INT          DEFAULT 5000,
    target_throughput_rps    INT          DEFAULT 50,
    current_utilization      DECIMAL(5, 2) DEFAULT 0.00,
    status                   VARCHAR(50)  DEFAULT 'Healthy',
    last_capacity_test       TIMESTAMP,
    tenant_id                VARCHAR(100) DEFAULT 'default',
    created_at               TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cap_agent ON agent_capacity(agent_id);

-- ───────────────────────────────────────────────────────────────────
-- 29. agent_queue · work queue + scheduling

CREATE TABLE IF NOT EXISTS agent_queue (
    queue_id          VARCHAR(100) PRIMARY KEY,
    job_id            VARCHAR(100),
    flow_id           VARCHAR(100),
    agent_id          VARCHAR(100),
    job_type          VARCHAR(100),
    priority          INT          DEFAULT 3,           -- 1=critical .. 5=background
    payload           JSONB,
    queue_status      VARCHAR(50)  DEFAULT 'Pending',   -- Pending/Running/Completed/Failed/Retrying/Delayed/Stuck/Cancelled/DLQ
    retry_count       INT          DEFAULT 0,
    max_retries       INT          DEFAULT 3,
    scheduled_at      TIMESTAMP,
    started_at        TIMESTAMP,
    completed_at      TIMESTAMP,
    locked_by         VARCHAR(100),
    lock_expires_at   TIMESTAMP,
    error_message     TEXT,
    tenant_id         VARCHAR(100) DEFAULT 'default',
    created_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_q_status   ON agent_queue(queue_status);
CREATE INDEX IF NOT EXISTS idx_q_priority ON agent_queue(priority);
CREATE INDEX IF NOT EXISTS idx_q_agent    ON agent_queue(agent_id);
CREATE INDEX IF NOT EXISTS idx_q_tenant   ON agent_queue(tenant_id);
