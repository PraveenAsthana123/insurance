-- Migration 072 · Iter 70 · §101 final 2 partials.

-- 1. naming_policy · enforce namespace per §101.A.1
CREATE TABLE IF NOT EXISTS naming_policy (
    policy_id        VARCHAR(100) PRIMARY KEY,
    pattern_name     VARCHAR(100),
    pattern_regex    TEXT NOT NULL,
    applies_to       VARCHAR(50),
    example_good     TEXT,
    example_bad      TEXT,
    status           VARCHAR(50) DEFAULT 'active',
    tenant_id        VARCHAR(100) DEFAULT 'default',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO naming_policy (policy_id, pattern_name, pattern_regex, applies_to, example_good, example_bad)
VALUES
  ('naming-namespace', 'tenant.project.env.service',
   '^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$',
   'service-namespace',
   'acme.claims.prod.rag-service',
   'AcmeProject_DEV_thing'),
  ('naming-agent', 'snake_case agent_id',
   '^[a-z][a-z0-9_]*$',
   'agent_id',
   'fraud_scorer',
   'FraudScorer-1'),
  ('naming-tenant', 'lowercase-hyphenated tenant',
   '^[a-z][a-z0-9-]*$',
   'tenant_id',
   'acme-corp',
   'AcmeCorp_2024')
ON CONFLICT (policy_id) DO NOTHING;


-- 2. release_environment · Dev → QA → UAT → Prod per §101.A.15
CREATE TABLE IF NOT EXISTS release_environment (
    env_id           VARCHAR(50) PRIMARY KEY,
    env_name         VARCHAR(100),
    env_order        INT NOT NULL,
    requires_approval BOOLEAN DEFAULT false,
    approver_role    VARCHAR(100),
    promotion_target VARCHAR(50),
    tenant_id        VARCHAR(100) DEFAULT 'default',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO release_environment (env_id, env_name, env_order, requires_approval, approver_role, promotion_target)
VALUES
  ('dev',  'Development', 1, false, NULL,            'qa'),
  ('qa',   'QA',          2, true,  'qa-lead',       'uat'),
  ('uat',  'UAT',         3, true,  'product-owner', 'prod'),
  ('prod', 'Production',  4, true,  'release-manager', NULL)
ON CONFLICT (env_id) DO NOTHING;


-- 3. release_promotion · each release moving env → env per §101.A.15
CREATE TABLE IF NOT EXISTS release_promotion (
    promotion_id     VARCHAR(100) PRIMARY KEY,
    artifact_name    VARCHAR(200),
    artifact_version VARCHAR(50),
    from_env         VARCHAR(50),
    to_env           VARCHAR(50),
    status           VARCHAR(50) DEFAULT 'pending',
    requested_by     VARCHAR(100),
    approved_by      VARCHAR(100),
    approved_at      TIMESTAMP,
    rolled_back_at   TIMESTAMP,
    notes            TEXT,
    tenant_id        VARCHAR(100) DEFAULT 'default',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_promotion_status CHECK (status IN ('pending', 'approved', 'deployed', 'rolled_back', 'rejected'))
);
CREATE INDEX IF NOT EXISTS idx_promotion_status ON release_promotion(status, created_at DESC);
