-- 057_master_contacts_schedules.sql — operator-stacked asks 2026-06-08:
--   "create master data email, contact"
--   "UI Must have email, contact number upload, manual adding feature"
--   "schedule of campaign daily, weekly, monthly"
--
-- Two new tables + scale-bump on voice_ai_customers (we'll seed 100+ for the
-- E2E "100 customers" test).

-- ─────────────────────────────────────────────────────────────────────
-- master_contacts · richer than voice_ai_customers · origin-tracked
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS master_contacts (
    id              SERIAL PRIMARY KEY,
    contact_ref     TEXT NOT NULL UNIQUE,
    full_name       TEXT NOT NULL,
    email           TEXT,
    phone           TEXT,
    company         TEXT,
    title           TEXT,
    -- Lead-management fields
    segment         TEXT,                    -- gold · silver · standard
    source          TEXT,                    -- 'csv_upload' · 'manual' · 'webhook' · 'import:voice_ai_customers'
    tags            JSONB DEFAULT '[]'::jsonb,
    -- Compliance per §76 + GDPR
    consent_marketing BOOLEAN NOT NULL DEFAULT FALSE,
    consent_calls     BOOLEAN NOT NULL DEFAULT FALSE,
    consent_email     BOOLEAN NOT NULL DEFAULT FALSE,
    consent_captured_at TIMESTAMPTZ,
    consent_method  TEXT,                    -- 'form' · 'webhook' · 'verbal'
    -- Quality + dedup
    dedup_key       TEXT GENERATED ALWAYS AS (LOWER(COALESCE(email, '') || '|' || COALESCE(phone, ''))) STORED,
    quality_score   DOUBLE PRECISION,         -- per §82.7 · completeness + recency
    last_engaged_at TIMESTAMPTZ,
    -- Ownership
    tenant_id       TEXT NOT NULL DEFAULT 'default',
    created_by      TEXT NOT NULL DEFAULT 'system',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_master_contacts_tenant ON master_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_master_contacts_email  ON master_contacts(email);
CREATE INDEX IF NOT EXISTS idx_master_contacts_phone  ON master_contacts(phone);
CREATE INDEX IF NOT EXISTS idx_master_contacts_segment ON master_contacts(segment);
CREATE INDEX IF NOT EXISTS idx_master_contacts_dedup ON master_contacts(dedup_key);
CREATE INDEX IF NOT EXISTS idx_master_contacts_source ON master_contacts(source);

-- ─────────────────────────────────────────────────────────────────────
-- campaign_schedules · daily / weekly / monthly recurrence
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_schedules (
    id              SERIAL PRIMARY KEY,
    schedule_ref    TEXT NOT NULL UNIQUE,
    -- Which campaign this schedule fires
    campaign_id     INTEGER NOT NULL,        -- references marketing_campaigns(id) · NOT FK because operator may delete campaign
    -- Recurrence
    cadence         TEXT NOT NULL,           -- 'once' · 'daily' · 'weekly' · 'monthly'
    -- For daily: time_of_day_utc (HH:MM)
    -- For weekly: day_of_week (0-6, 0=Sun) + time_of_day_utc
    -- For monthly: day_of_month (1-28 to avoid Feb edge) + time_of_day_utc
    -- For once: scheduled_at (TIMESTAMPTZ)
    time_of_day_utc TEXT,
    day_of_week     INTEGER,
    day_of_month    INTEGER,
    scheduled_at    TIMESTAMPTZ,
    -- Lifecycle
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    next_run_at     TIMESTAMPTZ,
    last_run_at     TIMESTAMPTZ,
    last_run_status TEXT,                    -- 'ok' · 'failed' · 'skipped'
    run_count       INTEGER NOT NULL DEFAULT 0,
    -- Ownership
    tenant_id       TEXT NOT NULL DEFAULT 'default',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT campaign_schedules_cadence_chk
        CHECK (cadence IN ('once','daily','weekly','monthly'))
);

CREATE INDEX IF NOT EXISTS idx_campaign_schedules_tenant ON campaign_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaign_schedules_next ON campaign_schedules(next_run_at) WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_campaign_schedules_enabled ON campaign_schedules(enabled);

-- ─────────────────────────────────────────────────────────────────────
-- Bulk-import from voice_ai_customers as a starter (idempotent)
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO master_contacts
    (contact_ref, full_name, email, phone, segment, source,
     consent_marketing, consent_calls, consent_email, tenant_id)
SELECT
    'MC-IMPORT-' || c.id,
    c.full_name,
    c.email,
    c.phone,
    c.segment,
    'import:voice_ai_customers',
    c.consent_marketing,
    c.consent_recording,  -- closest fit
    c.consent_marketing,
    c.tenant_id
FROM voice_ai_customers c
WHERE NOT EXISTS (
    SELECT 1 FROM master_contacts m WHERE m.contact_ref = 'MC-IMPORT-' || c.id
);

-- ─────────────────────────────────────────────────────────────────────
-- Seed 100 synthetic customers in voice_ai_customers for the 100-cust E2E
-- Idempotent · only inserts if not already present
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO voice_ai_customers (customer_ref, full_name, phone, email, segment,
                                   consent_marketing, consent_recording)
SELECT
    'CUST-SYN-' || LPAD(i::text, 3, '0'),
    'Test Customer ' || i,
    '+1555' || LPAD(i::text, 7, '0'),
    'test' || i || '@example.com',
    CASE WHEN i % 10 = 0 THEN 'gold'
         WHEN i % 5  = 0 THEN 'silver'
         ELSE 'standard'
    END,
    (i % 3 != 0),  -- ~67% consent_marketing=true
    (i % 4 != 0)   -- ~75% consent_recording=true
FROM generate_series(1, 100) AS i
WHERE NOT EXISTS (
    SELECT 1 FROM voice_ai_customers c
    WHERE c.customer_ref = 'CUST-SYN-' || LPAD(i::text, 3, '0')
);

-- Also push the synthetic customers into master_contacts
INSERT INTO master_contacts
    (contact_ref, full_name, email, phone, segment, source,
     consent_marketing, consent_calls, consent_email, tenant_id)
SELECT
    'MC-SYN-' || LPAD(i::text, 3, '0'),
    'Test Customer ' || i,
    'test' || i || '@example.com',
    '+1555' || LPAD(i::text, 7, '0'),
    CASE WHEN i % 10 = 0 THEN 'gold'
         WHEN i % 5  = 0 THEN 'silver'
         ELSE 'standard'
    END,
    'synthetic',
    (i % 3 != 0),
    (i % 4 != 0),
    (i % 3 != 0),
    'default'
FROM generate_series(1, 100) AS i
WHERE NOT EXISTS (
    SELECT 1 FROM master_contacts m
    WHERE m.contact_ref = 'MC-SYN-' || LPAD(i::text, 3, '0')
);
