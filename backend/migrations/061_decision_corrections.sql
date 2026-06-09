-- 061_decision_corrections.sql — T7.10 · RLHF correction DB.
--
-- Per docs/PENDING_PLAN.md T7.10 + Tier 7 governance gate #5 (AI
-- Correction Layer). Captures every human-override of an agent
-- decision · feeds future RLHF fine-tuning datasets (gate #6).

CREATE TABLE IF NOT EXISTS decision_corrections (
    id              SERIAL PRIMARY KEY,
    correction_ref  TEXT NOT NULL UNIQUE,
    -- Source of the AI decision being overridden
    run_ref         TEXT NOT NULL,          -- autonomous_agent_runs.run_ref
    decision_iter   INTEGER NOT NULL,       -- iteration number in decisions[]
    decision_action TEXT NOT NULL,          -- action (e.g. 'measure', 'rai_halt')
    -- The actual override
    ai_decision     JSONB NOT NULL,         -- original AI decision payload
    human_decision  JSONB NOT NULL,         -- operator's corrected version
    reason          TEXT NOT NULL,          -- why the override was needed
    reviewer        TEXT NOT NULL,          -- operator handle
    -- Audit + governance
    correlation_id  TEXT,
    tenant_id       TEXT NOT NULL DEFAULT 'default',
    -- Trainability flags · gate #5 → gate #6 RLHF
    use_for_training BOOLEAN NOT NULL DEFAULT TRUE,
    severity        TEXT NOT NULL DEFAULT 'minor',  -- minor · major · critical
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corrections_run_ref ON decision_corrections(run_ref);
CREATE INDEX IF NOT EXISTS idx_corrections_tenant  ON decision_corrections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_corrections_action  ON decision_corrections(decision_action);
CREATE INDEX IF NOT EXISTS idx_corrections_severity ON decision_corrections(severity);
CREATE INDEX IF NOT EXISTS idx_corrections_created ON decision_corrections(created_at DESC);
