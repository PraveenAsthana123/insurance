-- Iter 37 · Agentic Core · 5 foundational tables per Port-style architecture.
-- Per operator spec · agent + skill + tool + mapping + invocation audit.
-- Future tables (version, dependency, router, state, health, evaluation,
-- cost, guardrail, security, scorecard, mcp_server_registry) follow.

-- ───────────────────────────────────────────────────────────────────
-- 1. agent_registry · master agent table

CREATE TABLE IF NOT EXISTS agent_registry (
    agent_id          VARCHAR(100) PRIMARY KEY,
    agent_name        VARCHAR(200) NOT NULL,
    agent_type        VARCHAR(50)     DEFAULT 'Worker',  -- Planner/Worker/Supervisor
    department_id     VARCHAR(100),
    business_domain   VARCHAR(100),
    purpose           TEXT,
    owner_team        VARCHAR(100),
    status            VARCHAR(50)     DEFAULT 'Draft',   -- Draft/Active/Disabled/Retired
    version           VARCHAR(50)     DEFAULT 'v1.0',
    autonomy_level    VARCHAR(50)     DEFAULT 'Approval Required',
    risk_level        VARCHAR(50)     DEFAULT 'Medium',
    model_name        VARCHAR(100),
    runtime_framework VARCHAR(100)    DEFAULT 'LangGraph',
    max_steps         INT             DEFAULT 10,
    timeout_seconds   INT             DEFAULT 60,
    cost_limit        DECIMAL(10, 2)  DEFAULT 5.00,
    tenant_id         VARCHAR(100)    DEFAULT 'default',
    created_by        VARCHAR(100),
    created_at        TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_agent_registry_status   ON agent_registry(status);
CREATE INDEX IF NOT EXISTS idx_agent_registry_tenant   ON agent_registry(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_registry_dept     ON agent_registry(department_id);

-- ───────────────────────────────────────────────────────────────────
-- 2. skill_registry · reusable agent capabilities

CREATE TABLE IF NOT EXISTS skill_registry (
    skill_id                  VARCHAR(100) PRIMARY KEY,
    skill_name                VARCHAR(200) NOT NULL,
    skill_category            VARCHAR(100),
    description               TEXT,
    input_schema              JSONB,
    output_schema             JSONB,
    risk_level                VARCHAR(50)     DEFAULT 'Low',
    execution_mode            VARCHAR(50)     DEFAULT 'Automatic',
    requires_tool             BOOLEAN         DEFAULT TRUE,
    requires_mcp              BOOLEAN         DEFAULT FALSE,
    requires_human_approval   BOOLEAN         DEFAULT FALSE,
    timeout_seconds           INT             DEFAULT 30,
    retry_count               INT             DEFAULT 2,
    status                    VARCHAR(50)     DEFAULT 'Draft',
    owner_team                VARCHAR(100),
    tenant_id                 VARCHAR(100)    DEFAULT 'default',
    created_at                TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_skill_registry_status   ON skill_registry(status);
CREATE INDEX IF NOT EXISTS idx_skill_registry_tenant   ON skill_registry(tenant_id);
CREATE INDEX IF NOT EXISTS idx_skill_registry_risk     ON skill_registry(risk_level);

-- ───────────────────────────────────────────────────────────────────
-- 3. tool_registry · APIs/MCP/cloud actions

CREATE TABLE IF NOT EXISTS tool_registry (
    tool_id           VARCHAR(100) PRIMARY KEY,
    tool_name         VARCHAR(200) NOT NULL,
    tool_type         VARCHAR(50)     DEFAULT 'Read',   -- Read/Write/Execute/Delete/MCP/AI
    system_name       VARCHAR(100),
    category          VARCHAR(100),
    endpoint_url      TEXT,
    auth_type         VARCHAR(100),
    permission_scope  VARCHAR(100)    DEFAULT 'read',
    risk_level        VARCHAR(50)     DEFAULT 'Low',
    timeout_seconds   INT             DEFAULT 15,
    retry_count       INT             DEFAULT 2,
    rate_limit_per_min INT            DEFAULT 60,
    requires_approval BOOLEAN         DEFAULT FALSE,
    status            VARCHAR(50)     DEFAULT 'Available',
    owner_team        VARCHAR(100),
    tenant_id         VARCHAR(100)    DEFAULT 'default',
    created_at        TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tool_registry_status    ON tool_registry(status);
CREATE INDEX IF NOT EXISTS idx_tool_registry_tenant    ON tool_registry(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tool_registry_risk      ON tool_registry(risk_level);

-- ───────────────────────────────────────────────────────────────────
-- 4. agent_skill_mapping · which skills each agent may use

CREATE TABLE IF NOT EXISTS agent_skill_mapping (
    mapping_id      SERIAL PRIMARY KEY,
    agent_id        VARCHAR(100) NOT NULL REFERENCES agent_registry(agent_id),
    skill_id        VARCHAR(100) NOT NULL REFERENCES skill_registry(skill_id),
    execution_mode  VARCHAR(50)  DEFAULT 'Automatic',   -- Automatic / Approval Required
    priority        INT          DEFAULT 100,
    status          VARCHAR(50)  DEFAULT 'Active',      -- Active / Disabled
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (agent_id, skill_id)
);
CREATE INDEX IF NOT EXISTS idx_agent_skill_map_agent   ON agent_skill_mapping(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_skill_map_skill   ON agent_skill_mapping(skill_id);

-- ───────────────────────────────────────────────────────────────────
-- 5. agent_invocation · execution + audit (Port-style _ai_invocation)

CREATE TABLE IF NOT EXISTS agent_invocation (
    invocation_id    VARCHAR(100) PRIMARY KEY,
    agent_id         VARCHAR(100) NOT NULL,
    correlation_id   VARCHAR(100),
    incident_id      VARCHAR(100),
    trigger_kind     VARCHAR(50),                       -- user / event / api / cron
    input_text       TEXT,
    plan_text        TEXT,
    skills_used      JSONB,
    tools_used       JSONB,
    actions_taken    JSONB,
    output_text      TEXT,
    status           VARCHAR(50)  DEFAULT 'Running',    -- Running/Success/Failed/Cancelled
    duration_ms      INT,
    cost_usd         DECIMAL(10, 4),
    tokens_in        INT,
    tokens_out       INT,
    error_text       TEXT,
    human_override   BOOLEAN      DEFAULT FALSE,
    tenant_id        VARCHAR(100) DEFAULT 'default',
    created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    completed_at     TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_agent_inv_agent   ON agent_invocation(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_inv_status  ON agent_invocation(status);
CREATE INDEX IF NOT EXISTS idx_agent_inv_corr    ON agent_invocation(correlation_id);
CREATE INDEX IF NOT EXISTS idx_agent_inv_tenant  ON agent_invocation(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_inv_created ON agent_invocation(created_at DESC);
