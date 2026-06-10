-- Iter 39 · Enterprise Governance layer · 8 tables per operator spec 65-72.

-- ───────────────────────────────────────────────────────────────────
-- 65. business_value_stream

CREATE TABLE IF NOT EXISTS business_value_stream (
    value_stream_id          VARCHAR(100) PRIMARY KEY,
    value_stream_name        VARCHAR(300) NOT NULL,
    value_stream_category    VARCHAR(100),
    customer_type            VARCHAR(100),
    business_owner           VARCHAR(200),
    executive_owner          VARCHAR(200),
    value_stream_description TEXT,
    annual_revenue           DECIMAL(15, 2),
    annual_cost              DECIMAL(15, 2),
    annual_business_value    DECIMAL(15, 2),
    customer_count           BIGINT,
    process_count            INT,
    capability_count         INT,
    automation_rate          DECIMAL(5, 2),
    ai_maturity_score        DECIMAL(5, 2),
    status                   VARCHAR(50)  DEFAULT 'Active',
    tenant_id                VARCHAR(100) DEFAULT 'default',
    created_at               TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_vs_status ON business_value_stream(status);
CREATE INDEX IF NOT EXISTS idx_vs_tenant ON business_value_stream(tenant_id);

-- ───────────────────────────────────────────────────────────────────
-- 66. department

CREATE TABLE IF NOT EXISTS department (
    department_id            VARCHAR(100) PRIMARY KEY,
    department_name          VARCHAR(300) NOT NULL,
    business_unit            VARCHAR(300),
    executive_owner          VARCHAR(200),
    department_head          VARCHAR(200),
    annual_budget            DECIMAL(15, 2),
    employee_count           INT,
    department_description   TEXT,
    primary_value_stream     VARCHAR(100),    -- FK to business_value_stream (soft)
    strategic_objectives     TEXT,
    maturity_level           VARCHAR(50)  DEFAULT 'L2',     -- L1..L5
    status                   VARCHAR(50)  DEFAULT 'Active',
    tenant_id                VARCHAR(100) DEFAULT 'default',
    created_at               TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_dept_bu      ON department(business_unit);
CREATE INDEX IF NOT EXISTS idx_dept_status  ON department(status);

-- ───────────────────────────────────────────────────────────────────
-- 67. team

CREATE TABLE IF NOT EXISTS team (
    team_id                  VARCHAR(100) PRIMARY KEY,
    department_id            VARCHAR(100),
    team_name                VARCHAR(300) NOT NULL,
    team_type                VARCHAR(100),
    manager_name             VARCHAR(200),
    technical_lead           VARCHAR(200),
    team_size                INT,
    primary_responsibility   TEXT,
    support_level            VARCHAR(50)  DEFAULT 'L2',  -- L1..L4
    on_call_enabled          BOOLEAN      DEFAULT FALSE,
    budget                   DECIMAL(15, 2),
    maturity_level           VARCHAR(50)  DEFAULT 'L2',
    status                   VARCHAR(50)  DEFAULT 'Active',
    tenant_id                VARCHAR(100) DEFAULT 'default',
    created_at               TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_team_dept    ON team(department_id);
CREATE INDEX IF NOT EXISTS idx_team_status  ON team(status);

-- ───────────────────────────────────────────────────────────────────
-- 68. role

CREATE TABLE IF NOT EXISTS role (
    role_id                  VARCHAR(100) PRIMARY KEY,
    team_id                  VARCHAR(100),
    role_name                VARCHAR(300) NOT NULL,
    role_category            VARCHAR(100),
    role_description         TEXT,
    seniority_level          VARCHAR(50),               -- Junior/Senior/Lead/Director
    primary_responsibilities TEXT,
    required_skills          TEXT,
    required_certifications  TEXT,
    approval_authority       BOOLEAN      DEFAULT FALSE,
    production_access        BOOLEAN      DEFAULT FALSE,
    on_call_eligible         BOOLEAN      DEFAULT FALSE,
    status                   VARCHAR(50)  DEFAULT 'Active',
    tenant_id                VARCHAR(100) DEFAULT 'default',
    created_at               TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_role_team     ON role(team_id);
CREATE INDEX IF NOT EXISTS idx_role_category ON role(role_category);

-- ───────────────────────────────────────────────────────────────────
-- 69. responsibility_matrix (RACI)

CREATE TABLE IF NOT EXISTS responsibility_matrix (
    raci_id                    VARCHAR(100) PRIMARY KEY,
    object_type                VARCHAR(100) NOT NULL,        -- capability/process/agent/skill/mcp/release/incident
    object_id                  VARCHAR(100) NOT NULL,
    role_id                    VARCHAR(100),
    responsibility_type        VARCHAR(10)  NOT NULL,        -- R/A/C/I
    responsibility_description TEXT,
    escalation_level           INT          DEFAULT 1,
    approval_required          BOOLEAN      DEFAULT FALSE,
    effective_date             DATE,
    expiry_date                DATE,
    status                     VARCHAR(50)  DEFAULT 'Active',
    tenant_id                  VARCHAR(100) DEFAULT 'default',
    created_at                 TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_raci_object  ON responsibility_matrix(object_type, object_id);
CREATE INDEX IF NOT EXISTS idx_raci_role    ON responsibility_matrix(role_id);
CREATE INDEX IF NOT EXISTS idx_raci_type    ON responsibility_matrix(responsibility_type);

-- ───────────────────────────────────────────────────────────────────
-- 70. stakeholder

CREATE TABLE IF NOT EXISTS stakeholder (
    stakeholder_id              VARCHAR(100) PRIMARY KEY,
    stakeholder_name            VARCHAR(300) NOT NULL,
    stakeholder_type            VARCHAR(100),               -- Exec Sponsor/Business Owner/...
    department_id               VARCHAR(100),
    role_id                     VARCHAR(100),
    influence_level             VARCHAR(50),                -- High/Medium/Low
    interest_level              VARCHAR(50),
    decision_authority          BOOLEAN      DEFAULT FALSE,
    funding_authority           BOOLEAN      DEFAULT FALSE,
    approval_authority          BOOLEAN      DEFAULT FALSE,
    communication_preference    VARCHAR(100),
    stakeholder_risk_score      DECIMAL(5, 2),
    stakeholder_notes           TEXT,
    status                      VARCHAR(50)  DEFAULT 'Active',
    tenant_id                   VARCHAR(100) DEFAULT 'default',
    created_at                  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sh_dept      ON stakeholder(department_id);
CREATE INDEX IF NOT EXISTS idx_sh_influence ON stakeholder(influence_level);
CREATE INDEX IF NOT EXISTS idx_sh_type      ON stakeholder(stakeholder_type);

-- ───────────────────────────────────────────────────────────────────
-- 71. ai_policy

CREATE TABLE IF NOT EXISTS ai_policy (
    policy_id                VARCHAR(100) PRIMARY KEY,
    policy_name              VARCHAR(300) NOT NULL,
    policy_category          VARCHAR(100),                  -- Responsible/Security/Agent/Prompt/...
    policy_description       TEXT,
    policy_owner             VARCHAR(200),
    executive_owner          VARCHAR(200),
    compliance_requirement   TEXT,
    enforcement_level        VARCHAR(50)  DEFAULT 'Mandatory', -- Mandatory/Recommended/Advisory
    approval_required        BOOLEAN      DEFAULT FALSE,
    exception_allowed        BOOLEAN      DEFAULT TRUE,
    review_frequency         VARCHAR(50)  DEFAULT 'Quarterly',
    effective_date           DATE,
    expiry_date              DATE,
    version                  VARCHAR(50)  DEFAULT 'v1.0',
    status                   VARCHAR(50)  DEFAULT 'Active',
    tenant_id                VARCHAR(100) DEFAULT 'default',
    created_at               TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pol_category    ON ai_policy(policy_category);
CREATE INDEX IF NOT EXISTS idx_pol_enforcement ON ai_policy(enforcement_level);
CREATE INDEX IF NOT EXISTS idx_pol_status      ON ai_policy(status);

-- ───────────────────────────────────────────────────────────────────
-- 72. ai_standard

CREATE TABLE IF NOT EXISTS ai_standard (
    standard_id                  VARCHAR(100) PRIMARY KEY,
    policy_id                    VARCHAR(100),                  -- FK soft to ai_policy
    standard_name                VARCHAR(300) NOT NULL,
    standard_category            VARCHAR(100),                  -- Agent/Prompt/RAG/MCP/Security/...
    standard_description         TEXT,
    implementation_requirements  TEXT,
    validation_method            TEXT,
    enforcement_level            VARCHAR(50)  DEFAULT 'Mandatory',
    owner                        VARCHAR(200),
    review_frequency             VARCHAR(50)  DEFAULT 'Quarterly',
    version                      VARCHAR(50)  DEFAULT 'v1.0',
    status                       VARCHAR(50)  DEFAULT 'Active',
    tenant_id                    VARCHAR(100) DEFAULT 'default',
    created_at                   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_std_policy   ON ai_standard(policy_id);
CREATE INDEX IF NOT EXISTS idx_std_category ON ai_standard(standard_category);
CREATE INDEX IF NOT EXISTS idx_std_status   ON ai_standard(status);
