-- Migration 070 · Iter 68 · §99 push to Grade A.
-- 6 new registry tables + retry_count column + 4 dedicated agents.

-- 1. MCP server registry · per §99.4 + §101.E
CREATE TABLE IF NOT EXISTS mcp_server_registry (
    mcp_id           VARCHAR(100) PRIMARY KEY,
    server_name      VARCHAR(200) NOT NULL,
    endpoint_url     TEXT,
    auth_type        VARCHAR(50),
    sla_uptime_pct   DECIMAL(5, 2) DEFAULT 99.0,
    version          VARCHAR(50),
    risk_level       VARCHAR(20) DEFAULT 'Medium',
    status           VARCHAR(50) DEFAULT 'active',
    owner_team       VARCHAR(100),
    timeout_seconds  INT DEFAULT 30,
    approved_by      VARCHAR(100),
    approved_at      TIMESTAMP,
    tenant_id        VARCHAR(100) DEFAULT 'default',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_mcp_status CHECK (status IN ('active', 'deprecated', 'sandboxed', 'retired'))
);
CREATE INDEX IF NOT EXISTS idx_mcp_status ON mcp_server_registry(status);

-- Seed slack-mcp + a few more
INSERT INTO mcp_server_registry (mcp_id, server_name, endpoint_url, auth_type, version, risk_level, owner_team, approved_by)
VALUES
  ('slack-mcp',       'Slack MCP',       'http://slack-mcp:8081',       'OAuth Bot Token', '1.0', 'Medium', 'Platform', 'system'),
  ('github-mcp',      'GitHub MCP',      'http://github-mcp:8082',      'PAT',             '1.0', 'Medium', 'Platform', 'system'),
  ('jira-mcp',        'Jira MCP',        'http://jira-mcp:8083',        'OAuth',           '1.0', 'Medium', 'Platform', 'system'),
  ('snowflake-mcp',   'Snowflake MCP',   'http://snowflake-mcp:8084',   'KEYPAIR',         '1.0', 'High',   'Platform', 'system')
ON CONFLICT (mcp_id) DO NOTHING;

-- 2. Evaluation registry · per §99.4
CREATE TABLE IF NOT EXISTS eval_registry (
    eval_id          VARCHAR(100) PRIMARY KEY,
    name             VARCHAR(200) NOT NULL,
    eval_type        VARCHAR(50),
    target_agent_id  VARCHAR(100),
    target_model_id  VARCHAR(100),
    metric_name      VARCHAR(100),
    baseline_score   DECIMAL(8, 4),
    pass_threshold   DECIMAL(8, 4),
    dataset_id       VARCHAR(100),
    last_run_score   DECIMAL(8, 4),
    last_run_at      TIMESTAMP,
    status           VARCHAR(50) DEFAULT 'active',
    owner_team       VARCHAR(100),
    tenant_id        VARCHAR(100) DEFAULT 'default',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_eval_type CHECK (eval_type IN ('functional', 'fairness', 'robustness', 'cost', 'safety', 'rag', 'load'))
);

-- Seed 5 evals (one per type)
INSERT INTO eval_registry (eval_id, name, eval_type, target_agent_id, metric_name, baseline_score, pass_threshold, owner_team)
VALUES
  ('eval-fraud-functional',  'Fraud Scorer Accuracy',    'functional', 'fraud_scorer',    'f1',           0.85, 0.80, 'Quality Engineering'),
  ('eval-claim-fairness',    'Claim Intake Fairness',    'fairness',   'claim_intake',    'disparate_impact', 0.92, 0.80, 'Quality Engineering'),
  ('eval-incident-robust',   'Incident Triage Robust',   'robustness', 'incident_triage', 'jailbreak_pass_rate', 0.95, 0.90, 'Security'),
  ('eval-rag-faithfulness',  'RAG Faithfulness',         'rag',        'sys_research_agent', 'faithfulness', 0.87, 0.85, 'Quality Engineering'),
  ('eval-platform-load',     'Platform Load p95',        'load',       NULL,              'p95_ms',       3000, 5000, 'Platform')
ON CONFLICT (eval_id) DO NOTHING;

-- 3. Dataset registry · per §99.4
CREATE TABLE IF NOT EXISTS dataset_registry (
    dataset_id       VARCHAR(100) PRIMARY KEY,
    name             VARCHAR(200) NOT NULL,
    source           VARCHAR(200),
    schema_version   VARCHAR(50),
    row_count        BIGINT,
    pii_classification VARCHAR(50),
    owner_team       VARCHAR(100),
    retention_days   INT DEFAULT 365,
    last_validated_at TIMESTAMP,
    status           VARCHAR(50) DEFAULT 'active',
    tenant_id        VARCHAR(100) DEFAULT 'default',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_dataset_pii CHECK (pii_classification IN ('public', 'internal', 'confidential', 'PII', 'PHI'))
);

INSERT INTO dataset_registry (dataset_id, name, source, schema_version, owner_team, pii_classification)
VALUES
  ('ds-knowledge-base',    'Knowledge Base',       'knowledge_base table', 'v1', 'Platform', 'internal'),
  ('ds-customer-records',  'Customer Records',     'customers table',      'v1', 'Claims',   'PII'),
  ('ds-policy-docs',       'Policy Documents',     'document_store',       'v1', 'Compliance', 'internal'),
  ('ds-eval-fraud',        'Fraud Eval Set',       'frontend uploads',     'v1', 'Quality Engineering', 'internal')
ON CONFLICT (dataset_id) DO NOTHING;

-- 4. Access registry · §99.4 (RBAC + ABAC summary)
CREATE TABLE IF NOT EXISTS access_registry (
    access_id        VARCHAR(100) PRIMARY KEY,
    principal_type   VARCHAR(50),
    principal_id     VARCHAR(200),
    resource_type    VARCHAR(50),
    resource_id      VARCHAR(200),
    permission       VARCHAR(50),
    attribute_filter JSONB,
    granted_by       VARCHAR(100),
    expires_at       TIMESTAMP,
    tenant_id        VARCHAR(100) DEFAULT 'default',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_principal_type CHECK (principal_type IN ('user', 'role', 'agent', 'service'))
);
CREATE INDEX IF NOT EXISTS idx_access_principal ON access_registry(principal_type, principal_id);

INSERT INTO access_registry (access_id, principal_type, principal_id, resource_type, resource_id, permission, granted_by)
VALUES
  ('acc-admin-all',     'role',  'admin',          'all',   '*',                'read+write',  'system'),
  ('acc-readonly-kb',   'role',  'readonly',       'table', 'knowledge_base',   'read',        'system'),
  ('acc-fraud-agent',   'agent', 'fraud_scorer',   'table', 'agent_invocation', 'write',       'system'),
  ('acc-claims-dept',   'role',  'claims_member',  'department', 'Claims',      'read+write',  'system')
ON CONFLICT (access_id) DO NOTHING;

-- 5. Dead Letter Queue · §99.5 control
CREATE TABLE IF NOT EXISTS dead_letter_queue (
    dlq_id           BIGSERIAL PRIMARY KEY,
    workflow_id      VARCHAR(100),
    original_invocation_id VARCHAR(100),
    agent_id         VARCHAR(100),
    payload          JSONB,
    failure_reason   TEXT,
    retry_count      INT DEFAULT 0,
    max_retries      INT DEFAULT 3,
    next_retry_at    TIMESTAMP,
    status           VARCHAR(50) DEFAULT 'pending',
    tenant_id        VARCHAR(100) DEFAULT 'default',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_dlq_status CHECK (status IN ('pending', 'retrying', 'reprocessed', 'abandoned'))
);
CREATE INDEX IF NOT EXISTS idx_dlq_status_ts ON dead_letter_queue(status, next_retry_at);

-- 6. Kill switch · §99.5 control
CREATE TABLE IF NOT EXISTS kill_switch (
    switch_id        VARCHAR(100) PRIMARY KEY,
    target_type      VARCHAR(50),
    target_id        VARCHAR(200),
    is_killed        BOOLEAN DEFAULT false,
    killed_by        VARCHAR(100),
    killed_at        TIMESTAMP,
    reason           TEXT,
    auto_unkilled    BOOLEAN DEFAULT false,
    tenant_id        VARCHAR(100) DEFAULT 'default',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_killsw_target CHECK (target_type IN ('agent', 'tool', 'workflow', 'mcp', 'tenant', 'feature'))
);
CREATE INDEX IF NOT EXISTS idx_killsw_target ON kill_switch(target_type, target_id, is_killed);

-- 7. ABAC policy · §99.6 security
CREATE TABLE IF NOT EXISTS abac_policy (
    policy_id        VARCHAR(100) PRIMARY KEY,
    policy_name      VARCHAR(200) NOT NULL,
    effect           VARCHAR(20),
    conditions       JSONB,
    resource_pattern VARCHAR(200),
    action_pattern   VARCHAR(200),
    priority         INT DEFAULT 100,
    status           VARCHAR(50) DEFAULT 'active',
    tenant_id        VARCHAR(100) DEFAULT 'default',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_abac_effect CHECK (effect IN ('Allow', 'Deny')),
    CONSTRAINT chk_abac_status CHECK (status IN ('active', 'draft', 'deprecated'))
);

INSERT INTO abac_policy (policy_id, policy_name, effect, conditions, resource_pattern, action_pattern, priority)
VALUES
  ('abac-pii-restrict', 'PII access restricted to Compliance role',
   'Deny', '{"resource.pii_classification": "PII", "user.role != Compliance": true}'::jsonb,
   'agent_invocation', 'read', 10),
  ('abac-tenant-isolation', 'Cross-tenant access blocked',
   'Deny', '{"resource.tenant_id != user.tenant_id": true}'::jsonb, '*', '*', 5),
  ('abac-business-hours', 'High-risk actions only during business hours',
   'Allow', '{"resource.risk_level": "High", "time.hour": "9..17"}'::jsonb,
   'agent_registry', 'write', 50)
ON CONFLICT (policy_id) DO NOTHING;

-- 8. retry_count column on agent_invocation · §99.1 + §99.8
ALTER TABLE agent_invocation
  ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMP;

-- 9. Register 4 dedicated agents per §99.3 brutal list
INSERT INTO agent_registry
  (agent_id, agent_name, agent_type, department_id, business_domain,
   purpose, owner_team, status, autonomy_level, risk_level,
   model_name, runtime_framework, max_steps, timeout_seconds, cost_limit, tenant_id)
VALUES
  ('sys_router_agent',     'Router Agent',     'Worker', 'Platform', 'Routing',
   'Selects agent/tool/model by intent · per §99.3', 'Platform', 'Active',
   'Automatic', 'Low', 'llama3.2:3b', 'router-runtime', 3, 10, 0.10, 'default'),
  ('sys_memory_agent',     'Memory Agent',     'Worker', 'Platform', 'Memory',
   'Stores/retrieves context · session + long-term · per §99.3',
   'Platform', 'Active', 'Automatic', 'Low', 'llama3.2:3b', 'memory-runtime', 3, 10, 0.10, 'default'),
  ('sys_cost_agent',       'Cost Agent',       'Worker', 'Platform', 'FinOps',
   'Controls token/API cost · budget enforce · per §99.3',
   'FinOps', 'Active', 'Automatic', 'Low', 'llama3.2:3b', 'cost-runtime', 3, 10, 0.10, 'default'),
  ('sys_compliance_agent', 'Compliance Agent', 'Worker', 'Platform', 'Compliance',
   'Audit · retention · policy enforcement · per §99.3',
   'Compliance', 'Active', 'Approval Required', 'High', 'llama3.2:3b', 'compliance-runtime', 5, 30, 0.50, 'default')
ON CONFLICT (agent_id) DO UPDATE SET status='Active', updated_at=CURRENT_TIMESTAMP;
