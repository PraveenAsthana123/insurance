-- 053_voice_ai_campaigns.sql — outbound voice AI campaigns.
-- Per operator 2026-06-08: "where user need to provide information about
-- the product and service on form and then AI tool will refer that to
-- speak to customer ...also have customer contact information database"

-- Reuses existing voice_ai_customers + voice_ai_products tables from
-- migration 052. Adds 2 new tables for campaign mgmt.

-- ─────────────────────────────────────────────────────────────────────
-- voice_ai_campaigns · the form/spec operator fills
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voice_ai_campaigns (
    id                  SERIAL PRIMARY KEY,
    campaign_ref        TEXT NOT NULL UNIQUE,
    name                TEXT NOT NULL,
    -- Product / service info filled by operator on the form
    product_id          INTEGER REFERENCES voice_ai_products(id),
    product_pitch       TEXT NOT NULL,                   -- 1-line value prop
    service_description TEXT,                            -- longer detail
    call_to_action      TEXT NOT NULL,                   -- "say YES to schedule a callback"
    -- Targeting
    target_segment      TEXT,                            -- gold · silver · standard · null=all
    require_consent     BOOLEAN NOT NULL DEFAULT TRUE,   -- per §76 + GDPR
    -- Script template · supports {name}, {phone}, {product_name}, {price}
    script_template     TEXT NOT NULL,
    -- Operational
    status              TEXT NOT NULL DEFAULT 'draft',   -- draft · scheduled · running · paused · complete
    voice_lang          TEXT NOT NULL DEFAULT 'en-US',
    max_attempts_per_customer INTEGER NOT NULL DEFAULT 1,
    tenant_id           TEXT NOT NULL DEFAULT 'default',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_voice_ai_campaigns_tenant ON voice_ai_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_voice_ai_campaigns_status ON voice_ai_campaigns(status);

-- ─────────────────────────────────────────────────────────────────────
-- voice_ai_campaign_runs · per-customer outreach attempt
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voice_ai_campaign_runs (
    id                  SERIAL PRIMARY KEY,
    run_ref             TEXT NOT NULL UNIQUE,
    campaign_id         INTEGER NOT NULL REFERENCES voice_ai_campaigns(id) ON DELETE CASCADE,
    customer_id         INTEGER NOT NULL REFERENCES voice_ai_customers(id) ON DELETE CASCADE,
    -- Rendered script (after template substitution)
    rendered_script     TEXT NOT NULL,
    -- Top 1% gates · per §76 + §82.21
    consent_ok          BOOLEAN NOT NULL,                -- result of consent check
    dlp_ok              BOOLEAN NOT NULL DEFAULT TRUE,   -- result of DLP scan
    fairness_cohort     TEXT,                            -- captured cohort for §76 audit
    -- Outcome
    status              TEXT NOT NULL DEFAULT 'pending', -- pending · spoken · accepted · declined · skipped · failed
    response_text       TEXT,                            -- captured customer reply (if STT used)
    outcome_score       DOUBLE PRECISION,                -- 0..1 sentiment / acceptance proxy
    -- Audit + timing per §38.3
    correlation_id      TEXT,
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    tenant_id           TEXT NOT NULL DEFAULT 'default',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_ai_campaign_runs_campaign ON voice_ai_campaign_runs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_voice_ai_campaign_runs_customer ON voice_ai_campaign_runs(customer_id);
CREATE INDEX IF NOT EXISTS idx_voice_ai_campaign_runs_status ON voice_ai_campaign_runs(status);
CREATE INDEX IF NOT EXISTS idx_voice_ai_campaign_runs_tenant ON voice_ai_campaign_runs(tenant_id);

-- Seed sample campaign (idempotent)
INSERT INTO voice_ai_campaigns (
    campaign_ref, name, product_id, product_pitch, service_description,
    call_to_action, target_segment, script_template, status
)
SELECT
    'CAMP-AUTO-RENEW-001',
    'Auto Premium Upgrade · Gold Tier',
    (SELECT id FROM voice_ai_products WHERE sku = 'AUTO-PREMIUM' LIMIT 1),
    'You qualify for our premium auto coverage at a 15% loyalty discount',
    'Premium auto policy with high coverage limits, accident forgiveness, rental car coverage, and 24/7 roadside assistance.',
    'Press 1 or say YES to schedule a callback with your dedicated agent',
    'gold',
    'Hello {name}, this is Aria from Insur Analytics. Because you''ve been a valued gold-tier customer with us, you qualify for our {product_name} at ${price}, which includes high coverage limits and accident forgiveness. {call_to_action}.',
    'draft'
WHERE NOT EXISTS (SELECT 1 FROM voice_ai_campaigns WHERE campaign_ref = 'CAMP-AUTO-RENEW-001');
