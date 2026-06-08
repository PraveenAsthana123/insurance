-- 052_voice_ai_end_to_end.sql — Voice AI end-to-end demo schema.
-- Per operator 2026-06-08: "voice AI ..all the scenario ...end to end process,
-- contact center, welcome message, service sales, presales, take sample
-- produce and create complete UI to adding list of product and sales,
-- customizing welcome message, requirement taking, customer sales/order
-- creation and notification, UI with customer identification, knowledge AI"

-- ─────────────────────────────────────────────────────────────────────
-- voice_ai_products · catalog managed via UI
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voice_ai_products (
    id            SERIAL PRIMARY KEY,
    sku           TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    category      TEXT NOT NULL,
    description   TEXT,
    price_cents   INTEGER NOT NULL DEFAULT 0,
    coverage_months INTEGER,
    features      JSONB DEFAULT '[]'::jsonb,
    target_segment TEXT,
    enabled       BOOLEAN NOT NULL DEFAULT TRUE,
    tenant_id     TEXT NOT NULL DEFAULT 'default',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_ai_products_tenant ON voice_ai_products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_voice_ai_products_category ON voice_ai_products(category);
CREATE INDEX IF NOT EXISTS idx_voice_ai_products_enabled ON voice_ai_products(enabled);

-- ─────────────────────────────────────────────────────────────────────
-- voice_ai_customers · lightweight customer identification
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voice_ai_customers (
    id            SERIAL PRIMARY KEY,
    customer_ref  TEXT NOT NULL UNIQUE,            -- external id or generated
    full_name     TEXT NOT NULL,
    phone         TEXT,
    email         TEXT,
    segment       TEXT,                            -- gold · silver · standard
    consent_recording BOOLEAN NOT NULL DEFAULT FALSE,
    consent_marketing BOOLEAN NOT NULL DEFAULT FALSE,
    tenant_id     TEXT NOT NULL DEFAULT 'default',
    last_seen_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_ai_customers_phone ON voice_ai_customers(phone);
CREATE INDEX IF NOT EXISTS idx_voice_ai_customers_email ON voice_ai_customers(email);
CREATE INDEX IF NOT EXISTS idx_voice_ai_customers_tenant ON voice_ai_customers(tenant_id);

-- ─────────────────────────────────────────────────────────────────────
-- voice_ai_orders · sales orders created via voice flow
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voice_ai_orders (
    id            SERIAL PRIMARY KEY,
    order_ref     TEXT NOT NULL UNIQUE,
    customer_id   INTEGER NOT NULL REFERENCES voice_ai_customers(id) ON DELETE CASCADE,
    product_id    INTEGER NOT NULL REFERENCES voice_ai_products(id),
    quantity      INTEGER NOT NULL DEFAULT 1,
    total_cents   INTEGER NOT NULL DEFAULT 0,
    status        TEXT NOT NULL DEFAULT 'pending',  -- pending · confirmed · cancelled
    notification_sent_at TIMESTAMPTZ,
    notification_channel TEXT,                       -- email · sms · voice
    session_id    TEXT,                              -- links back to voice_ai_sessions
    tenant_id     TEXT NOT NULL DEFAULT 'default',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_ai_orders_customer ON voice_ai_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_voice_ai_orders_status ON voice_ai_orders(status);
CREATE INDEX IF NOT EXISTS idx_voice_ai_orders_session ON voice_ai_orders(session_id);

-- ─────────────────────────────────────────────────────────────────────
-- voice_ai_sessions · conversation log
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voice_ai_sessions (
    id            SERIAL PRIMARY KEY,
    session_id    TEXT NOT NULL UNIQUE,
    customer_id   INTEGER REFERENCES voice_ai_customers(id),
    stage         TEXT NOT NULL DEFAULT 'welcome', -- welcome · identify · presales · requirement · recommend · order · notify · complete
    transcript    JSONB DEFAULT '[]'::jsonb,        -- list of {role: user|assistant, text, ts}
    requirements  JSONB DEFAULT '{}'::jsonb,
    recommended_product_id INTEGER REFERENCES voice_ai_products(id),
    welcome_template_id INTEGER,
    tenant_id     TEXT NOT NULL DEFAULT 'default',
    started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at  TIMESTAMPTZ,
    correlation_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_voice_ai_sessions_customer ON voice_ai_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_voice_ai_sessions_stage ON voice_ai_sessions(stage);
CREATE INDEX IF NOT EXISTS idx_voice_ai_sessions_tenant ON voice_ai_sessions(tenant_id);

-- ─────────────────────────────────────────────────────────────────────
-- voice_ai_welcome_templates · customizable greetings per dept/segment
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voice_ai_welcome_templates (
    id            SERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    text          TEXT NOT NULL,
    language      TEXT NOT NULL DEFAULT 'en',
    segment       TEXT,                  -- gold · silver · standard · null=all
    enabled       BOOLEAN NOT NULL DEFAULT TRUE,
    is_default    BOOLEAN NOT NULL DEFAULT FALSE,
    tenant_id     TEXT NOT NULL DEFAULT 'default',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_ai_welcome_templates_tenant ON voice_ai_welcome_templates(tenant_id);

-- Seed defaults · idempotent insert
INSERT INTO voice_ai_welcome_templates (name, text, language, segment, is_default, enabled)
VALUES
    ('Default · Standard', 'Hi, this is Aria from Insur Analytics. How can I help today?', 'en', NULL, TRUE, TRUE),
    ('Gold Tier Greeting', 'Welcome back · we appreciate your loyalty. How can Aria help you today?', 'en', 'gold', FALSE, TRUE),
    ('Sales Pre-Sales', 'Thanks for calling Insur · let me help you find the right coverage. May I ask a few quick questions?', 'en', NULL, FALSE, TRUE)
ON CONFLICT DO NOTHING;

-- Seed sample products (10 insurance-vertical SKUs)
INSERT INTO voice_ai_products (sku, name, category, description, price_cents, coverage_months, features, target_segment, enabled)
VALUES
    ('AUTO-BASIC',    'Auto Basic Coverage',     'auto',     'Minimum-required liability auto policy',                       4900,  6, '["liability","roadside"]'::jsonb, 'standard', TRUE),
    ('AUTO-FULL',     'Auto Full Coverage',      'auto',     'Full coverage with collision + comprehensive + rental',       11900, 12, '["collision","comprehensive","rental","roadside","glass"]'::jsonb, 'standard', TRUE),
    ('AUTO-PREMIUM',  'Auto Premium Coverage',   'auto',     'Premium with high limits + accident forgiveness',             19900, 12, '["high-limits","accident-forgiveness","rental","glass","roadside"]'::jsonb, 'gold', TRUE),
    ('HOME-BASIC',    'Home Basic Coverage',     'home',     'Dwelling protection up to $200k',                              7900, 12, '["dwelling","contents"]'::jsonb, 'standard', TRUE),
    ('HOME-FULL',     'Home Full Coverage',      'home',     'Dwelling + contents + liability + flood rider',               14900, 12, '["dwelling","contents","liability","flood"]'::jsonb, 'standard', TRUE),
    ('LIFE-TERM-20',  'Life · 20-year Term',     'life',     '$500k death benefit · 20-year term · level premium',          4900, 240, '["term-20","level-premium"]'::jsonb, 'standard', TRUE),
    ('LIFE-WHOLE',    'Whole Life Policy',       'life',     'Whole life with cash value accumulation',                    14900, 9999, '["cash-value","tax-deferred"]'::jsonb, 'gold', TRUE),
    ('HEALTH-BRONZE', 'Health Bronze Plan',      'health',   'Catastrophic + preventive coverage',                          9900, 12, '["catastrophic","preventive"]'::jsonb, 'standard', TRUE),
    ('HEALTH-GOLD',   'Health Gold Plan',        'health',   'Comprehensive with low copay + dental',                      24900, 12, '["comprehensive","low-copay","dental"]'::jsonb, 'gold', TRUE),
    ('UMBRELLA-1M',   'Umbrella $1M Excess',     'umbrella', '$1M excess liability over auto + home',                       5900, 12, '["excess-liability","auto-home-trigger"]'::jsonb, 'gold', TRUE)
ON CONFLICT (sku) DO NOTHING;

-- Seed sample customers (3 personas for demo)
INSERT INTO voice_ai_customers (customer_ref, full_name, phone, email, segment, consent_recording, consent_marketing)
VALUES
    ('CUST-001', 'Sarah Chen',    '+15551234567', 'sarah.chen@example.com',  'gold',     TRUE,  TRUE),
    ('CUST-002', 'Marcus Diaz',   '+15559876543', 'marcus.diaz@example.com', 'silver',   TRUE,  FALSE),
    ('CUST-003', 'Priya Patel',   '+15555556789', 'priya.patel@example.com', 'standard', TRUE,  TRUE)
ON CONFLICT (customer_ref) DO NOTHING;
