-- Migration 071 · Iter 69 · §99 push to A+.

-- 1. Concurrency control · per-agent semaphore (§99.5)
CREATE TABLE IF NOT EXISTS concurrency_control (
    control_id       VARCHAR(100) PRIMARY KEY,
    target_type      VARCHAR(50),
    target_id        VARCHAR(200),
    max_concurrent   INT NOT NULL DEFAULT 10,
    current_count    INT NOT NULL DEFAULT 0,
    last_acquired_at TIMESTAMP,
    last_released_at TIMESTAMP,
    tenant_id        VARCHAR(100) DEFAULT 'default',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_concurrency_target CHECK (target_type IN ('agent', 'tool', 'workflow', 'tenant', 'global')),
    CONSTRAINT chk_concurrency_count CHECK (current_count >= 0 AND current_count <= max_concurrent)
);

INSERT INTO concurrency_control (control_id, target_type, target_id, max_concurrent)
VALUES
  ('cc-global',         'global', '*',                100),
  ('cc-fraud-scorer',   'agent',  'fraud_scorer',      20),
  ('cc-slack-mcp',      'tool',   'slack-mcp',         50),
  ('cc-stage-llm-gen',  'agent',  'stage_llm_gen',     10)
ON CONFLICT (control_id) DO NOTHING;

-- 2. Secrets vault · per §99.5 secrets manager
CREATE TABLE IF NOT EXISTS secrets_vault (
    secret_id        VARCHAR(100) PRIMARY KEY,
    secret_name      VARCHAR(200) NOT NULL,
    secret_type      VARCHAR(50),
    encrypted_value  TEXT,
    rotation_period_days INT DEFAULT 90,
    last_rotated_at  TIMESTAMP,
    next_rotation_at TIMESTAMP,
    owner_team       VARCHAR(100),
    access_role      VARCHAR(100),
    tenant_id        VARCHAR(100) DEFAULT 'default',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_secret_type CHECK (secret_type IN ('api_key', 'oauth_token', 'jwt_secret', 'db_password', 'webhook_url', 'encryption_key'))
);

INSERT INTO secrets_vault (secret_id, secret_name, secret_type, encrypted_value, owner_team, access_role)
VALUES
  ('sec-jwt-prod',         'JWT signing secret',     'jwt_secret',  '__ENCRYPTED__:placeholder', 'Platform', 'admin'),
  ('sec-ollama-token',     'Ollama bearer token',    'api_key',     '__ENCRYPTED__:placeholder', 'Platform', 'service'),
  ('sec-slack-webhook',    'Slack webhook URL',      'webhook_url', '__ENCRYPTED__:placeholder', 'Platform', 'service'),
  ('sec-encryption-key',   'Field encryption key',   'encryption_key', '__ENCRYPTED__:placeholder', 'Security', 'admin')
ON CONFLICT (secret_id) DO NOTHING;

-- 3. Golden test set · per §99.7 testing
CREATE TABLE IF NOT EXISTS golden_test_set (
    test_id          VARCHAR(100) PRIMARY KEY,
    test_set_name    VARCHAR(200) NOT NULL,
    target_agent_id  VARCHAR(100),
    target_eval_id   VARCHAR(100),
    input_text       TEXT NOT NULL,
    expected_output  TEXT,
    expected_status  VARCHAR(50),
    tags             TEXT[],
    locked           BOOLEAN DEFAULT true,
    tenant_id        VARCHAR(100) DEFAULT 'default',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed 10 golden cases · 5 agents × 2 cases each
INSERT INTO golden_test_set (test_id, test_set_name, target_agent_id, input_text, expected_output, expected_status, tags)
VALUES
  ('golden-fraud-1',  'fraud_basic',   'fraud_scorer',    'Score this claim · $500 routine repair', 'Low risk · auto-approve', 'Success', ARRAY['fraud','low-risk']),
  ('golden-fraud-2',  'fraud_basic',   'fraud_scorer',    'Score this claim · $50k payout · 3 deductibles', 'High risk · HITL', 'PendingApproval', ARRAY['fraud','high-risk']),
  ('golden-claim-1',  'claim_intake',  'claim_intake',    'New auto claim · accident details', 'Claim record created', 'Success', ARRAY['claim']),
  ('golden-claim-2',  'claim_intake',  'claim_intake',    'Incomplete · missing policy number', 'Validation error', 'Failed', ARRAY['claim','validation']),
  ('golden-incident-1','incident_triage','incident_triage','Payment API 503', 'Sev=High · page oncall', 'Success', ARRAY['incident','sev-high']),
  ('golden-incident-2','incident_triage','incident_triage','Dashboard rendering slow', 'Sev=Low · ticket created', 'Success', ARRAY['incident','sev-low']),
  ('golden-research-1','research',     'sys_research_agent','What is our SLA for fraud claims?', 'Faithful answer with citation', 'Success', ARRAY['rag','citation']),
  ('golden-research-2','research',     'sys_research_agent','Tell me about unrelated topic', 'I do not know · no citation', 'Success', ARRAY['rag','refusal']),
  ('golden-rca-1',    'rca_basic',    'rca_generator',   'Outage: payment API down 2h · root cause?', 'RCA with 5-whys', 'Success', ARRAY['rca']),
  ('golden-rca-2',    'rca_basic',    'rca_generator',   'No data provided', 'Validation error', 'Failed', ARRAY['rca','validation'])
ON CONFLICT (test_id) DO NOTHING;

-- 4. Synthetic data registry · per §99.7
CREATE TABLE IF NOT EXISTS synthetic_dataset (
    synth_id         VARCHAR(100) PRIMARY KEY,
    name             VARCHAR(200) NOT NULL,
    template         JSONB NOT NULL,
    generator_type   VARCHAR(50),
    target_volume    INT,
    pii_safe         BOOLEAN DEFAULT true,
    created_by       VARCHAR(100),
    tenant_id        VARCHAR(100) DEFAULT 'default',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_synth_generator CHECK (generator_type IN ('faker', 'sdv', 'ollama', 'rule_based'))
);

INSERT INTO synthetic_dataset (synth_id, name, template, generator_type, target_volume, created_by)
VALUES
  ('synth-fraud-train', 'Fraud training stream',
   '{"fields": [{"name": "claim_id", "type": "uuid"}, {"name": "amount", "type": "float", "min": 100, "max": 50000}, {"name": "category", "type": "choice", "values": ["auto","home","health"]}]}'::jsonb,
   'faker', 10000, 'system'),
  ('synth-customer',    'Synthetic customers',
   '{"fields": [{"name": "name", "type": "name"}, {"name": "email", "type": "email"}, {"name": "phone", "type": "phone"}]}'::jsonb,
   'faker', 5000, 'system'),
  ('synth-incidents',   'Sample incident text',
   '{"prompt": "Generate a plausible production incident report · severity P0..P3"}'::jsonb,
   'ollama', 1000, 'system')
ON CONFLICT (synth_id) DO NOTHING;
