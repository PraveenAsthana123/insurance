-- Iter 104 · Top-3 missing engines + Top-3 missing registries · §122

-- ENGINE 6 · COST/BUDGET
CREATE TABLE IF NOT EXISTS kernel_cost_ledger (
    ledger_id        BIGSERIAL PRIMARY KEY,
    agent_id         VARCHAR(80),
    tenant_id        VARCHAR(80) DEFAULT 'default',
    model_name       VARCHAR(80),
    tokens_in        INT DEFAULT 0,
    tokens_out       INT DEFAULT 0,
    cost_usd         NUMERIC(10,5) DEFAULT 0,
    request_kind     VARCHAR(40),
    correlation_id   VARCHAR(80),
    ts_local         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cost_tenant_ts ON kernel_cost_ledger(tenant_id, ts_local DESC);
CREATE INDEX IF NOT EXISTS idx_cost_agent_ts ON kernel_cost_ledger(agent_id, ts_local DESC);

CREATE TABLE IF NOT EXISTS kernel_budget_cap (
    cap_id           BIGSERIAL PRIMARY KEY,
    tenant_id        VARCHAR(80) NOT NULL,
    agent_id         VARCHAR(80),  -- nullable = tenant-level cap
    period           VARCHAR(20) DEFAULT 'daily',  -- daily · weekly · monthly
    cap_usd          NUMERIC(10,2) NOT NULL,
    soft_warn_at     NUMERIC(3,2) DEFAULT 0.80,
    hard_stop_at     NUMERIC(3,2) DEFAULT 1.00,
    active           BOOLEAN DEFAULT TRUE,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cap_tenant ON kernel_budget_cap(tenant_id, agent_id, active);

-- ENGINE 7 · HITL APPROVAL
CREATE TABLE IF NOT EXISTS kernel_approval_queue (
    approval_id      VARCHAR(80) PRIMARY KEY,
    agent_id         VARCHAR(80) NOT NULL,
    action_kind      VARCHAR(60) NOT NULL,
    risk_band        VARCHAR(10) DEFAULT 'Medium',  -- Low · Medium · High · Critical
    request_payload  JSONB DEFAULT '{}',
    requested_by     VARCHAR(80),
    requested_at     TIMESTAMPTZ DEFAULT NOW(),
    sla_due_at       TIMESTAMPTZ,
    status           VARCHAR(20) DEFAULT 'pending',  -- pending · approved · denied · escalated · expired
    decided_by       VARCHAR(80),
    decided_at       TIMESTAMPTZ,
    decision_reason  TEXT,
    correlation_id   VARCHAR(80)
);
CREATE INDEX IF NOT EXISTS idx_hitl_status ON kernel_approval_queue(status, sla_due_at);
CREATE INDEX IF NOT EXISTS idx_hitl_agent ON kernel_approval_queue(agent_id, requested_at DESC);

-- ENGINE 8 · EVAL
CREATE TABLE IF NOT EXISTS kernel_eval_set (
    eval_set_id      VARCHAR(80) PRIMARY KEY,
    name             VARCHAR(200) NOT NULL,
    description      TEXT,
    domain           VARCHAR(80),
    n_cases          INT DEFAULT 0,
    schema_version   INT DEFAULT 1,
    owner_team       VARCHAR(80) DEFAULT 'Platform',
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kernel_eval_case (
    case_id          BIGSERIAL PRIMARY KEY,
    eval_set_id      VARCHAR(80) REFERENCES kernel_eval_set(eval_set_id),
    input_text       TEXT NOT NULL,
    expected_output  TEXT,
    rubric           JSONB DEFAULT '{}',
    tags             TEXT[] DEFAULT ARRAY[]::TEXT[]
);
CREATE INDEX IF NOT EXISTS idx_eval_case_set ON kernel_eval_case(eval_set_id);

CREATE TABLE IF NOT EXISTS kernel_eval_run (
    run_id           VARCHAR(80) PRIMARY KEY,
    eval_set_id      VARCHAR(80) REFERENCES kernel_eval_set(eval_set_id),
    model_name       VARCHAR(80),
    prompt_version   INT,
    started_at       TIMESTAMPTZ DEFAULT NOW(),
    completed_at     TIMESTAMPTZ,
    n_pass           INT DEFAULT 0,
    n_fail           INT DEFAULT 0,
    pass_rate        NUMERIC(4,3),
    p95_latency_ms   INT,
    total_cost_usd   NUMERIC(10,4),
    correlation_id   VARCHAR(80)
);
CREATE INDEX IF NOT EXISTS idx_eval_run_set ON kernel_eval_run(eval_set_id, started_at DESC);

-- REGISTRY A · PROMPT REGISTRY
CREATE TABLE IF NOT EXISTS kernel_prompt_registry (
    prompt_id        VARCHAR(80) NOT NULL,
    version          INT NOT NULL,
    template_text    TEXT NOT NULL,
    owner_team       VARCHAR(80) DEFAULT 'Platform',
    schema_required  JSONB DEFAULT '{}',
    safety_evaled    BOOLEAN DEFAULT FALSE,
    eval_set_id      VARCHAR(80),
    status           VARCHAR(20) DEFAULT 'draft',  -- draft · active · deprecated
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    created_by       VARCHAR(80),
    PRIMARY KEY (prompt_id, version)
);
CREATE INDEX IF NOT EXISTS idx_prompt_status ON kernel_prompt_registry(status, prompt_id);

-- REGISTRY B · MODEL REGISTRY
CREATE TABLE IF NOT EXISTS kernel_model_registry (
    model_id         VARCHAR(80) PRIMARY KEY,
    provider         VARCHAR(40),
    family           VARCHAR(40),
    version          VARCHAR(40),
    context_tokens   INT,
    cost_per_1k_in   NUMERIC(8,5),
    cost_per_1k_out  NUMERIC(8,5),
    safety_evaled    BOOLEAN DEFAULT FALSE,
    eval_set_id      VARCHAR(80),
    eval_pass_rate   NUMERIC(4,3),
    approved_by      VARCHAR(80),
    approved_at      TIMESTAMPTZ,
    status           VARCHAR(20) DEFAULT 'staging',  -- staging · active · deprecated · banned
    capabilities     TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_model_status ON kernel_model_registry(status);

-- REGISTRY C · TOOL REGISTRY
CREATE TABLE IF NOT EXISTS kernel_tool_registry (
    tool_id          VARCHAR(80) PRIMARY KEY,
    tool_kind        VARCHAR(40),  -- mcp · python · http · sql · script
    description      TEXT,
    input_schema     JSONB DEFAULT '{}',
    output_schema    JSONB DEFAULT '{}',
    required_scopes  TEXT[] DEFAULT ARRAY[]::TEXT[],
    sandbox_level    VARCHAR(20) DEFAULT 'isolated',  -- isolated · trusted · privileged
    rate_limit_rpm   INT DEFAULT 60,
    risk_band        VARCHAR(10) DEFAULT 'Low',
    owner_team       VARCHAR(80) DEFAULT 'Platform',
    status           VARCHAR(20) DEFAULT 'active',
    created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tool_status ON kernel_tool_registry(status);
