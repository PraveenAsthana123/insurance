-- 054_marketing_campaigns.sql — unified multi-channel marketing campaigns.
-- Per operator 2026-06-08: "campaign: email campaign ..end to end process;
-- voice campaign: end to end process; banner campaign - product and service;
-- survey campaign; form collection campaign"
--
-- Voice campaign is already covered by migration 053 (voice_ai_campaigns)
-- · this migration adds the 4 NEW channels (email · banner · survey · form)
-- as a single discriminated table with channel-specific JSONB config.

-- ─────────────────────────────────────────────────────────────────────
-- marketing_campaigns · multi-channel · discriminated by channel
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id                  SERIAL PRIMARY KEY,
    campaign_ref        TEXT NOT NULL UNIQUE,
    name                TEXT NOT NULL,
    channel             TEXT NOT NULL,   -- email · banner · survey · form
    -- Product/service info (operator-filled · common across channels)
    product_id          INTEGER REFERENCES voice_ai_products(id),
    product_pitch       TEXT NOT NULL,
    service_description TEXT,
    call_to_action      TEXT NOT NULL,
    -- Targeting (same as voice)
    target_segment      TEXT,
    require_consent     BOOLEAN NOT NULL DEFAULT TRUE,
    -- Channel-specific config as JSONB
    -- email:   {subject, body_template, from_email, reply_to}
    -- banner:  {image_url, banner_size, alt_text, landing_url, brand_voice_guardrail}
    -- survey:  {questions:[{id,text,type:radio|text|nps,options?[]}], reward?}
    -- form:    {fields:[{id,label,type:text|email|tel|select,required,options?[]}], success_message}
    config              JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Operational
    status              TEXT NOT NULL DEFAULT 'draft',  -- draft · scheduled · running · paused · complete
    max_attempts_per_customer INTEGER NOT NULL DEFAULT 1,
    tenant_id           TEXT NOT NULL DEFAULT 'default',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    CONSTRAINT marketing_campaigns_channel_chk
        CHECK (channel IN ('email','banner','survey','form'))
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_tenant ON marketing_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_channel ON marketing_campaigns(channel);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);

-- ─────────────────────────────────────────────────────────────────────
-- marketing_campaign_runs · per-customer outcome
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketing_campaign_runs (
    id                  SERIAL PRIMARY KEY,
    run_ref             TEXT NOT NULL UNIQUE,
    campaign_id         INTEGER NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    customer_id         INTEGER NOT NULL REFERENCES voice_ai_customers(id) ON DELETE CASCADE,
    -- Channel-specific rendered content (subject+body / banner-overrides / survey-link / form-link)
    rendered_payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Top 1% gates (mirror voice_ai_campaign_runs)
    consent_ok          BOOLEAN NOT NULL,
    dlp_ok              BOOLEAN NOT NULL DEFAULT TRUE,
    fairness_cohort     TEXT,
    -- Outcome
    status              TEXT NOT NULL DEFAULT 'pending',
        -- pending · sent · delivered · opened · clicked · responded · converted · skipped · failed · bounced
    response_data       JSONB DEFAULT '{}'::jsonb,
    outcome_score       DOUBLE PRECISION,
    -- Audit + timing per §38.3
    correlation_id      TEXT,
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    tenant_id           TEXT NOT NULL DEFAULT 'default',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_runs_campaign ON marketing_campaign_runs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_runs_customer ON marketing_campaign_runs(customer_id);
CREATE INDEX IF NOT EXISTS idx_marketing_runs_status ON marketing_campaign_runs(status);
CREATE INDEX IF NOT EXISTS idx_marketing_runs_tenant ON marketing_campaign_runs(tenant_id);

-- ─────────────────────────────────────────────────────────────────────
-- Seed: 1 sample campaign per channel · idempotent
-- ─────────────────────────────────────────────────────────────────────

-- Email · Gold renewal nudge
INSERT INTO marketing_campaigns (
    campaign_ref, name, channel, product_id, product_pitch, call_to_action,
    target_segment, config, status
)
SELECT
    'MKT-EMAIL-001',
    'Gold Renewal · Auto Premium',
    'email',
    (SELECT id FROM voice_ai_products WHERE sku = 'AUTO-PREMIUM' LIMIT 1),
    'Gold-tier renewal · 15% loyalty discount on your auto premium',
    'Reply YES to lock in the discount before March 31.',
    'gold',
    jsonb_build_object(
        'subject', 'Your loyalty discount is ready · {name}',
        'body_template',
          'Hi {name},' || E'\n\n' ||
          'Thanks for being a gold-tier customer for 8+ years. ' ||
          'We''re holding a 15% loyalty discount on the {product_name} ($' ||
          '{price}) for you through end of month.' || E'\n\n' ||
          '{call_to_action}' || E'\n\n' ||
          'Sarah · Insur Analytics',
        'from_email', 'sarah@insur.example.com',
        'reply_to', 'sarah@insur.example.com'
    ),
    'draft'
WHERE NOT EXISTS (SELECT 1 FROM marketing_campaigns WHERE campaign_ref = 'MKT-EMAIL-001');

-- Banner · Home coverage cross-sell
INSERT INTO marketing_campaigns (
    campaign_ref, name, channel, product_id, product_pitch, call_to_action,
    target_segment, config, status
)
SELECT
    'MKT-BANNER-001',
    'Cross-sell · Home Full Coverage',
    'banner',
    (SELECT id FROM voice_ai_products WHERE sku = 'HOME-FULL' LIMIT 1),
    'Bundle home with auto · save 18%',
    'See your bundled quote',
    NULL,  -- all segments
    jsonb_build_object(
        'image_url', '/static/banners/home-bundle.png',
        'banner_size', '728x90',
        'alt_text', 'Bundle home + auto · save 18%',
        'landing_url', '/quote/home-bundle',
        'brand_voice_guardrail', 'helpful · benefit-led · no fear tactics'
    ),
    'draft'
WHERE NOT EXISTS (SELECT 1 FROM marketing_campaigns WHERE campaign_ref = 'MKT-BANNER-001');

-- Survey · post-claim NPS
INSERT INTO marketing_campaigns (
    campaign_ref, name, channel, product_id, product_pitch, call_to_action,
    target_segment, config, status
)
SELECT
    'MKT-SURVEY-001',
    'Post-Claim NPS · Standard tier',
    'survey',
    NULL,
    'Help us improve · 2-minute post-claim survey',
    'Share feedback',
    'standard',
    jsonb_build_object(
        'questions', jsonb_build_array(
            jsonb_build_object('id', 'nps', 'text',
                'On a scale of 0-10, how likely are you to recommend Insur to a friend?',
                'type', 'nps'),
            jsonb_build_object('id', 'reason', 'text',
                'What is the primary reason for your score?',
                'type', 'text'),
            jsonb_build_object('id', 'channel_pref', 'text',
                'Preferred way to be contacted next?',
                'type', 'radio',
                'options', jsonb_build_array('voice', 'email', 'sms', 'portal'))
        ),
        'reward', '$5 coffee gift card after completion'
    ),
    'draft'
WHERE NOT EXISTS (SELECT 1 FROM marketing_campaigns WHERE campaign_ref = 'MKT-SURVEY-001');

-- Form · life insurance lead capture
INSERT INTO marketing_campaigns (
    campaign_ref, name, channel, product_id, product_pitch, call_to_action,
    target_segment, config, status
)
SELECT
    'MKT-FORM-001',
    'Life Insurance Lead Capture',
    'form',
    (SELECT id FROM voice_ai_products WHERE sku = 'LIFE-TERM-20' LIMIT 1),
    'Get a personalized 20-year term life quote in 2 minutes',
    'Submit for an instant quote',
    NULL,
    jsonb_build_object(
        'fields', jsonb_build_array(
            jsonb_build_object('id', 'full_name', 'label', 'Full name',
                'type', 'text', 'required', true),
            jsonb_build_object('id', 'email', 'label', 'Email',
                'type', 'email', 'required', true),
            jsonb_build_object('id', 'phone', 'label', 'Phone',
                'type', 'tel', 'required', true),
            jsonb_build_object('id', 'dob', 'label', 'Date of birth',
                'type', 'date', 'required', true),
            jsonb_build_object('id', 'coverage', 'label', 'Coverage amount',
                'type', 'select', 'required', true,
                'options', jsonb_build_array('$250k', '$500k', '$1M', '$2M')),
            jsonb_build_object('id', 'smoker', 'label', 'Smoker?',
                'type', 'select', 'required', true,
                'options', jsonb_build_array('No', 'Yes'))
        ),
        'success_message', 'Thanks · an agent will call you within 24 hours.'
    ),
    'draft'
WHERE NOT EXISTS (SELECT 1 FROM marketing_campaigns WHERE campaign_ref = 'MKT-FORM-001');
