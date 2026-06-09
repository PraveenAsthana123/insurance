-- 056_content_postings.sql — job + blog posting automation with full tracking.
--
-- Per operator 2026-06-08:
--   "job posting, blog posting, to linkedin ...automation ...create UI ..where
--    manager put the job ...info which must get posted, similar way blog posting"
--   + "create database design, dbview ..integrate ..all the operation must
--    track, monitoring, score, quality"
--
-- Design choices:
--   - Discriminated single table by channel (job/blog) + JSONB config
--   - operation_log JSONB array captures EVERY state transition + actor + ts
--   - Per-platform delivery tracked as runs (one row per platform)
--   - Quality metrics: time-to-publish · operator edits · platform success rate
--   - §38.3 audit pattern · §82.7 drift on quality score

-- ─────────────────────────────────────────────────────────────────────
-- content_postings · the manager-filled form (job OR blog)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_postings (
    id              SERIAL PRIMARY KEY,
    posting_ref     TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    channel         TEXT NOT NULL,    -- 'job' OR 'blog'
    title           TEXT NOT NULL,
    summary         TEXT NOT NULL,
    body_markdown   TEXT NOT NULL,
    -- Manager-filled form data (channel-specific in JSONB)
    -- job:  {location, employment_type, salary_range, seniority, requirements[], benefits[], apply_url}
    -- blog: {tags[], category, hero_image_url, canonical_url, seo_meta_description}
    config          JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Distribution targets · array of platforms
    -- e.g., ['linkedin', 'website', 'twitter']
    platforms       JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Tracking · every state transition logged
    operation_log   JSONB NOT NULL DEFAULT '[]'::jsonb,
        -- list of {timestamp, actor, action, from_status, to_status, notes}
    -- Lifecycle
    status          TEXT NOT NULL DEFAULT 'draft',
        -- draft · review · scheduled · publishing · published · failed · archived
    scheduled_for   TIMESTAMPTZ,
    -- Quality metrics
    operator_edit_count INTEGER NOT NULL DEFAULT 0,
    time_to_publish_seconds DOUBLE PRECISION,
    quality_score   DOUBLE PRECISION,   -- 0..1 · computed per §82.7
    -- Ownership
    created_by      TEXT NOT NULL DEFAULT 'system',
    last_edited_by  TEXT,
    tenant_id       TEXT NOT NULL DEFAULT 'default',
    correlation_id  TEXT,
    -- Timestamps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at    TIMESTAMPTZ,
    archived_at     TIMESTAMPTZ,
    CONSTRAINT content_postings_channel_chk
        CHECK (channel IN ('job', 'blog'))
);

CREATE INDEX IF NOT EXISTS idx_content_postings_tenant ON content_postings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_content_postings_channel ON content_postings(channel);
CREATE INDEX IF NOT EXISTS idx_content_postings_status ON content_postings(status);
CREATE INDEX IF NOT EXISTS idx_content_postings_scheduled ON content_postings(scheduled_for);

-- ─────────────────────────────────────────────────────────────────────
-- content_posting_runs · per-platform delivery attempt
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_posting_runs (
    id              SERIAL PRIMARY KEY,
    run_ref         TEXT NOT NULL UNIQUE,
    posting_id      INTEGER NOT NULL REFERENCES content_postings(id) ON DELETE CASCADE,
    platform        TEXT NOT NULL,   -- 'linkedin' · 'website' · 'twitter' · ...
    -- Rendered payload (platform-specific · ready for adapter to send)
    rendered_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Outcome
    status          TEXT NOT NULL DEFAULT 'pending',
        -- pending · sent · delivered · indexed · failed · skipped
    external_url    TEXT,             -- platform URL of the published artifact
    external_id     TEXT,             -- platform identifier
    response_data   JSONB DEFAULT '{}'::jsonb,
    error_message   TEXT,
    -- Quality
    engagement_score DOUBLE PRECISION,  -- proxy from impressions/clicks if reported
    -- Audit
    correlation_id  TEXT,
    tenant_id       TEXT NOT NULL DEFAULT 'default',
    attempted_at    TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_posting_runs_posting ON content_posting_runs(posting_id);
CREATE INDEX IF NOT EXISTS idx_content_posting_runs_platform ON content_posting_runs(platform);
CREATE INDEX IF NOT EXISTS idx_content_posting_runs_status ON content_posting_runs(status);

-- ─────────────────────────────────────────────────────────────────────
-- Seeds · 1 of each (job + blog)
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO content_postings (
    posting_ref, name, channel, title, summary, body_markdown,
    config, platforms, created_by, status
)
SELECT
    'CP-JOB-001',
    'Senior Insurance Data Analyst · Remote',
    'job',
    'Senior Insurance Data Analyst · Remote',
    'Join Insur Analytics · build claim risk + fraud detection models with §90 mandatory rigor.',
    E'## About Insur Analytics\n\nWe are building the next-generation insurance ' ||
    E'analytics platform...\n\n## Role\n\nYou will work on:\n- Claims risk ' ||
    E'modeling\n- Fraud detection (per §64.23)\n- Recommender systems (per §64.22)\n\n' ||
    E'## Requirements\n\n- 5+ years in insurance or fintech data\n- Python · SQL · ' ||
    E'ML lifecycle ownership\n- Familiarity with §90 use-case rigor preferred',
    jsonb_build_object(
        'location', 'Remote · US',
        'employment_type', 'Full-time',
        'salary_range', '$140k – $180k',
        'seniority', 'Senior',
        'requirements', jsonb_build_array(
            '5+ years insurance/fintech data',
            'Python · SQL · ML lifecycle',
            'Experience with claims data'
        ),
        'benefits', jsonb_build_array('Health · Dental · 401k 6%', 'Remote-first', 'Equity'),
        'apply_url', 'https://insur.example.com/careers/senior-analyst'
    ),
    jsonb_build_array('linkedin', 'website'),
    'jane.recruiter@insur.example.com',
    'draft'
WHERE NOT EXISTS (SELECT 1 FROM content_postings WHERE posting_ref = 'CP-JOB-001');

INSERT INTO content_postings (
    posting_ref, name, channel, title, summary, body_markdown,
    config, platforms, created_by, status
)
SELECT
    'CP-BLOG-001',
    'Why we audit our recommender flavors weekly',
    'blog',
    'Why we audit our recommender flavors weekly',
    'How an §64.22 audit ($21 cells · cron Mon 09:00) keeps our 3-flavor compliance honest.',
    E'## TL;DR\n\nWe run a §64.22 cron audit every Monday at 09:00. It checks each ' ||
    E'of our 21 canonical departments has all 3 mandatory recommender flavors ' ||
    E'(item-based · content-based · hybrid). 21/21 green.\n\n## Why\n\n...',
    jsonb_build_object(
        'tags', jsonb_build_array('audit', 'recommender', 'governance'),
        'category', 'engineering',
        'hero_image_url', '/static/blog/recommender-audit-hero.png',
        'canonical_url', 'https://insur.example.com/blog/recommender-audit',
        'seo_meta_description', 'How we keep §64.22 compliance honest with weekly audits.'
    ),
    jsonb_build_array('linkedin', 'website', 'twitter'),
    'devrel@insur.example.com',
    'draft'
WHERE NOT EXISTS (SELECT 1 FROM content_postings WHERE posting_ref = 'CP-BLOG-001');
