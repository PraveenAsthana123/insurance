-- 017_tenants_and_departments.sql — Multi-tenant Foundation
--
-- Creates the base tables that every other tenanted table FK to:
--   - tenants            (the org / account)
--   - departments        (the 19 standard depts per §63 + project-specific extras)
--   - tenant_departments (per-tenant dept enablement + per-tenant config overrides)
--   - tenant_users       (user ↔ tenant membership; per-user role + status)
--   - tenant_user_dept_roles  (which dept role each user has, per §63 15-role scaffold)
--
-- Per §41.3 (multi-tenant isolation): every tenanted query must filter
-- by tenant_id at the SQL boundary. RLS (Row-Level Security) can be
-- added in a future migration; this migration creates the substrate.
--
-- Per §63 (global-ai-org structure): 19 standard departments are
-- seeded as canonical reference rows; tenants opt-in by inserting
-- into tenant_departments. Project-specific departments (e.g.,
-- 'bottling', 'plant_floor' for HOLY/bev's beverage focus) live
-- alongside the standard 19 via the `code` namespace.
--
-- Per §47.6 SOC2 CC6.2 (logical access): tenant_users + tenant_user_dept_roles
-- are the substrate for RBAC enforcement on every endpoint.

-- ============================================================================
-- tenants — the org / account / customer
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenants (
    id                 BIGSERIAL PRIMARY KEY,
    slug               VARCHAR(60) NOT NULL UNIQUE,            -- 'holy-bev', 'acme-corp'
    display_name       TEXT NOT NULL,                          -- 'HOLY Beverage Ltd.'
    legal_name         TEXT,                                   -- 'HOLY Beverage Incorporated'
    industry           VARCHAR(40) NOT NULL DEFAULT 'cpg_beverage',
    jurisdiction       VARCHAR(40) NOT NULL DEFAULT 'CA',      -- ISO-3166-1 alpha-2
    region             VARCHAR(40),                            -- e.g., 'CA-ON', 'CA-QC', for sub-jurisdictional rules
    status             VARCHAR(20) NOT NULL DEFAULT 'active',  -- active | suspended | archived
    -- §53.43 data sovereignty: where this tenant's data must reside
    data_residency     VARCHAR(40) NOT NULL DEFAULT 'CA-CENTRAL',
    -- §41.1 FinOps: per-tenant cost ceiling for AI operations
    monthly_budget_usd NUMERIC(12, 2),
    -- §41.3 multi-tenant: rate limit per tenant (requests/min)
    rate_limit_per_min INTEGER NOT NULL DEFAULT 1000,
    -- §66 per-dept artifact location pointer
    metadata           JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tenants_status            ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_industry          ON tenants(industry);
CREATE INDEX IF NOT EXISTS idx_tenants_jurisdiction      ON tenants(jurisdiction);

COMMENT ON TABLE tenants IS
  'Multi-tenant root per §41.3 + §47.6 SOC2 CC6.2. Every tenanted table FKs here.';
COMMENT ON COLUMN tenants.data_residency IS
  'Per §53.43 data sovereignty + §64.42 testing matrix (CA-CENTRAL for PIPEDA / Quebec Law 25 compliance).';

-- ============================================================================
-- departments — canonical reference + project-specific extras
-- ============================================================================
CREATE TABLE IF NOT EXISTS departments (
    id                 SERIAL PRIMARY KEY,
    code               VARCHAR(60) NOT NULL UNIQUE,            -- 'sales', 'supply_chain', 'plant_floor'
    display_name       TEXT NOT NULL,                          -- 'Sales', 'Supply Chain', 'Plant Floor'
    family             VARCHAR(40) NOT NULL DEFAULT 'standard',
    -- 'standard' (§63 19 canonical) | 'beverage_specific' | 'healthcare_specific' | 'finance_specific' | etc.
    description        TEXT,
    -- §66 per-dept artifact path (relative to global-ai-org/)
    artifact_path      VARCHAR(200),                           -- 'departments/sales/business-layer'
    -- Default sub-process catalog applies (e.g., for beverage: refs beverage_industry_processes.md)
    process_catalog_ref VARCHAR(200),
    -- Display sort order (for left-nav)
    sort_order         INTEGER NOT NULL DEFAULT 100,
    -- Whether this dept is canonical (always present) or optional (industry-specific)
    is_canonical       BOOLEAN NOT NULL DEFAULT TRUE,
    metadata           JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departments_family       ON departments(family);
CREATE INDEX IF NOT EXISTS idx_departments_is_canonical ON departments(is_canonical);

COMMENT ON TABLE departments IS
  'Canonical dept registry per §63 global-ai-org + project-specific extensions. Tenants opt-in via tenant_departments.';

-- ============================================================================
-- tenant_departments — per-tenant dept enablement + per-tenant config
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_departments (
    id                 BIGSERIAL PRIMARY KEY,
    tenant_id          BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    department_id      INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    enabled            BOOLEAN NOT NULL DEFAULT TRUE,
    -- Per-tenant dept overrides (e.g., display name customization, custom workflows)
    config             JSONB NOT NULL DEFAULT '{}'::JSONB,
    -- Per-tenant dept owner (links to tenant_users.id if assigned)
    owner_user_id      BIGINT,
    -- Per-tenant dept rollout date
    activated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deactivated_at     TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_departments_tenant     ON tenant_departments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_departments_dept       ON tenant_departments(department_id);
CREATE INDEX IF NOT EXISTS idx_tenant_departments_enabled    ON tenant_departments(tenant_id, enabled);

COMMENT ON TABLE tenant_departments IS
  'Per-tenant dept enablement + config. The join table that lets two tenants enable different subsets of departments.';

-- ============================================================================
-- tenant_users — user ↔ tenant membership
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_users (
    id                 BIGSERIAL PRIMARY KEY,
    tenant_id          BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email              VARCHAR(255) NOT NULL,
    display_name       TEXT,
    -- High-level role: 'tenant_admin' | 'tenant_member' | 'tenant_viewer'
    -- (Dept-level + role-level grain is in tenant_user_dept_roles.)
    role               VARCHAR(40) NOT NULL DEFAULT 'tenant_member',
    status             VARCHAR(20) NOT NULL DEFAULT 'active',  -- active | invited | suspended | archived
    -- §47.6 SOC2 CC6.1: MFA enforced flag
    mfa_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
    last_seen_at       TIMESTAMPTZ,
    metadata           JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at        TIMESTAMPTZ,
    UNIQUE (tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant   ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_email    ON tenant_users(email);
CREATE INDEX IF NOT EXISTS idx_tenant_users_status   ON tenant_users(tenant_id, status);

COMMENT ON TABLE tenant_users IS
  'User membership in a tenant. Per §47.6 SOC2 CC6.1 — MFA flag, status, audit timestamps.';

-- Add FK now that tenant_users exists (tenant_departments.owner_user_id references it)
ALTER TABLE tenant_departments
    DROP CONSTRAINT IF EXISTS fk_tenant_departments_owner;
ALTER TABLE tenant_departments
    ADD CONSTRAINT fk_tenant_departments_owner
    FOREIGN KEY (owner_user_id) REFERENCES tenant_users(id) ON DELETE SET NULL;

-- ============================================================================
-- tenant_user_dept_roles — per-user × per-dept role (the 15-role scaffold per §63)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_user_dept_roles (
    id                 BIGSERIAL PRIMARY KEY,
    tenant_user_id     BIGINT NOT NULL REFERENCES tenant_users(id) ON DELETE CASCADE,
    department_id      INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    -- The 15 canonical roles per §63: admin, manager, team-member, tester, security,
    -- devops, ai-reviewer, digital-transformation, system-architect, test-architect,
    -- database-architect, api-architect, data-owner, ai-strategy, information-security
    role_code          VARCHAR(60) NOT NULL,
    granted_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by_user_id BIGINT REFERENCES tenant_users(id) ON DELETE SET NULL,
    revoked_at         TIMESTAMPTZ,
    revoked_by_user_id BIGINT REFERENCES tenant_users(id) ON DELETE SET NULL,
    -- §38.3 audit envelope-adjacent: justification for grant
    justification      TEXT,
    metadata           JSONB NOT NULL DEFAULT '{}'::JSONB,
    UNIQUE (tenant_user_id, department_id, role_code)
);

CREATE INDEX IF NOT EXISTS idx_tudr_user        ON tenant_user_dept_roles(tenant_user_id);
CREATE INDEX IF NOT EXISTS idx_tudr_dept        ON tenant_user_dept_roles(department_id);
CREATE INDEX IF NOT EXISTS idx_tudr_role        ON tenant_user_dept_roles(role_code);
CREATE INDEX IF NOT EXISTS idx_tudr_active      ON tenant_user_dept_roles(tenant_user_id, department_id) WHERE revoked_at IS NULL;

COMMENT ON TABLE tenant_user_dept_roles IS
  'Per-user × per-dept role assignment per §63 15-role scaffold. Grant/revoke audit trail per §47.6 SOC2 CC6.2.';

-- ============================================================================
-- Seed: 19 canonical standard departments per §63 global-ai-org
-- ============================================================================
INSERT INTO departments (code, display_name, family, description, artifact_path, sort_order, is_canonical) VALUES
    ('marketing',              'Marketing',                     'standard', 'Brand, demand generation, market intelligence',           'departments/marketing/business-layer',              10,  TRUE),
    ('hr',                     'Human Resources',                'standard', 'Workforce, talent, training, culture',                    'departments/hr/business-layer',                     20,  TRUE),
    ('sales',                  'Sales',                          'standard', 'Customer + retailer account management + revenue',         'departments/sales/business-layer',                  30,  TRUE),
    ('finance',                'Finance',                        'standard', 'Accounting, FP&A, treasury, audit',                       'departments/finance/business-layer',                40,  TRUE),
    ('operations',             'Operations',                     'standard', 'Production, plant floor, manufacturing execution',         'departments/operations/business-layer',             50,  TRUE),
    ('legal',                  'Legal',                          'standard', 'Compliance, contracts, IP, regulatory affairs',           'departments/legal/business-layer',                  60,  TRUE),
    ('procurement',            'Procurement',                    'standard', 'Sourcing, supplier management, contracts',                'departments/procurement/business-layer',            70,  TRUE),
    ('customer_support',       'Customer Support',               'standard', 'Inbound support, complaints, case resolution',            'departments/customer-support/business-layer',       80,  TRUE),
    ('engineering',            'Engineering',                    'standard', 'Product engineering, R&D, formulation',                   'departments/engineering/business-layer',            90,  TRUE),
    ('security_operations',    'Security Operations',            'standard', 'SOC, IR, threat intel, vulnerability mgmt',               'departments/security-operations/business-layer',    100, TRUE),
    ('supply_chain',           'Supply Chain',                   'standard', 'Demand planning, S&OP, logistics, warehousing',           'departments/supply-chain/business-layer',           110, TRUE),
    ('customer_experience',    'Customer Experience',            'standard', 'CX, loyalty, journey, DTC',                               'departments/customer-experience/business-layer',    120, TRUE),
    ('it_operations',          'IT Operations',                  'standard', 'Infra, network, helpdesk, lifecycle',                     'departments/it-operations/business-layer',          130, TRUE),
    ('digital_marketing',      'Digital Marketing',              'standard', 'Web, app, SEO, paid, content',                            'departments/digital-marketing/business-layer',      140, TRUE),
    ('e_commerce',             'E-Commerce',                     'standard', 'DTC + marketplace + omnichannel',                         'departments/e-commerce/business-layer',             150, TRUE),
    ('manufacturing',          'Manufacturing',                  'standard', 'Plant ops, OEE, throughput (overlaps with operations)',   'departments/manufacturing/business-layer',          160, TRUE),
    ('retail_operations',      'Retail Operations',              'standard', 'Brick-and-mortar + distributor execution',                'departments/retail-operations/business-layer',      170, TRUE),
    ('product_rd',             'Product R&D',                    'standard', 'Innovation, recipe development, pilot, launch',           'departments/product-rd/business-layer',             180, TRUE),
    ('executive_leadership',   'Executive Leadership',           'standard', 'C-suite + board + strategy',                              'departments/executive-leadership/business-layer',   190, TRUE)
ON CONFLICT (code) DO UPDATE
    SET display_name        = EXCLUDED.display_name,
        family              = EXCLUDED.family,
        description         = EXCLUDED.description,
        artifact_path       = EXCLUDED.artifact_path,
        sort_order          = EXCLUDED.sort_order,
        is_canonical        = EXCLUDED.is_canonical,
        updated_at          = NOW();

-- ============================================================================
-- Seed: beverage-specific extras (HOLY/bev focus per beverage_industry_processes.md)
-- ============================================================================
INSERT INTO departments (code, display_name, family, description, artifact_path, process_catalog_ref, sort_order, is_canonical) VALUES
    ('plant_floor',     'Plant Floor (OT/MES)',          'beverage_specific', 'Bottling lines, batching, OEE — per beverage_industry_processes.md §4–6',    'departments/plant-floor/business-layer',     'docs/digital_transformation/beverage_industry_processes.md#4-batching--blending',    200, FALSE),
    ('quality_lab',     'Quality & Lab',                 'beverage_specific', 'Lab + vision-QA + sensory — per beverage_industry_processes.md §6',          'departments/quality-lab/business-layer',     'docs/digital_transformation/beverage_industry_processes.md#6-quality-assurance-lab--vision', 210, FALSE),
    ('trade_promo',     'Trade Promotion Management',    'beverage_specific', 'TPM per beverage_industry_processes.md §10',                                 'departments/trade-promo/business-layer',     'docs/digital_transformation/beverage_industry_processes.md#10-trade-promotion-management-tpm', 220, FALSE),
    ('recall_traceability', 'Recall & Traceability',     'beverage_specific', 'Forward/backward trace, recall ops — per beverage_industry_processes.md §14','departments/recall-traceability/business-layer','docs/digital_transformation/beverage_industry_processes.md#14-recall-traceability--compliance-ops', 230, FALSE),
    ('sustainability_esg', 'Sustainability & ESG',       'beverage_specific', 'Scope-3, EPR, water, packaging — per canada_cpg_2026.md §12',                'departments/sustainability-esg/business-layer','docs/digital_transformation/canada_cpg_2026.md#12-measurement--sustainability', 240, FALSE)
ON CONFLICT (code) DO UPDATE
    SET display_name        = EXCLUDED.display_name,
        family              = EXCLUDED.family,
        description         = EXCLUDED.description,
        artifact_path       = EXCLUDED.artifact_path,
        process_catalog_ref = EXCLUDED.process_catalog_ref,
        sort_order          = EXCLUDED.sort_order,
        is_canonical        = EXCLUDED.is_canonical,
        updated_at          = NOW();

-- ============================================================================
-- Seed: default 'holy_bev' tenant + enable all canonical depts for it
-- ============================================================================
INSERT INTO tenants (slug, display_name, legal_name, industry, jurisdiction, region, data_residency, monthly_budget_usd, rate_limit_per_min, metadata)
VALUES (
    'holy_bev',
    'HOLY Beverage',
    'HOLY Beverage Ltd.',
    'cpg_beverage',
    'CA',
    'CA-ON',
    'CA-CENTRAL',
    NULL,         -- no budget cap by default (operator can set later)
    5000,         -- 5000 req/min for default tenant
    '{"created_by": "migration_017", "purpose": "default HOLY/bev tenant for self-deployment"}'::jsonb
)
ON CONFLICT (slug) DO UPDATE
    SET display_name       = EXCLUDED.display_name,
        legal_name         = EXCLUDED.legal_name,
        industry           = EXCLUDED.industry,
        jurisdiction       = EXCLUDED.jurisdiction,
        region             = EXCLUDED.region,
        data_residency     = EXCLUDED.data_residency,
        rate_limit_per_min = EXCLUDED.rate_limit_per_min,
        updated_at         = NOW();

-- Enable all 19 canonical + 5 beverage-specific depts for the default tenant
INSERT INTO tenant_departments (tenant_id, department_id, enabled, config)
SELECT
    (SELECT id FROM tenants WHERE slug = 'holy_bev'),
    d.id,
    TRUE,
    '{"enabled_by": "migration_017"}'::jsonb
FROM departments d
WHERE d.is_canonical = TRUE OR d.family = 'beverage_specific'
ON CONFLICT (tenant_id, department_id) DO NOTHING;

-- ============================================================================
-- Verification queries (run after applying):
-- ============================================================================
-- SELECT count(*) FROM tenants;                                              -- expect ≥ 1
-- SELECT count(*) FROM departments WHERE family = 'standard';                -- expect 19
-- SELECT count(*) FROM departments WHERE family = 'beverage_specific';       -- expect 5
-- SELECT t.slug, count(td.id) AS enabled_depts
--   FROM tenants t LEFT JOIN tenant_departments td ON td.tenant_id = t.id AND td.enabled
--   GROUP BY t.slug;                                                          -- expect holy_bev = 24
--
-- Composes with:
--   - §41.3 multi-tenant isolation
--   - §47.6 SOC2 CC6.1 (access) + CC6.2 (logical access)
--   - §63 global-ai-org 19-dept scaffold
--   - §64 per-dept HOLY_* artefacts (artifact_path links here)
--   - §66 per-dept content + per-role dashboards
--   - §68 Observability Hub (X-Tenant-ID middleware reads from this)
--   - docs/digital_transformation/beverage_industry_processes.md (process catalog refs)
