-- 055_autonomous_agent.sql — autonomous AI agent decision audit trail.
-- Per operator 2026-06-08: "advance testing ..autonomous AI for campaign ..end to end process"
--
-- Each agent run captures: objective → strategy → campaigns_created → outcomes
-- → next decision. Full per §38.3 + §76 (RAI accountability).

CREATE TABLE IF NOT EXISTS autonomous_agent_runs (
    id              SERIAL PRIMARY KEY,
    run_ref         TEXT NOT NULL UNIQUE,
    objective       TEXT NOT NULL,          -- "improve gold conversion +10%"
    strategy        JSONB NOT NULL,          -- {channel, segment, template, max_iterations}
    -- Decisions made by the agent · per-iteration audit
    decisions       JSONB DEFAULT '[]'::jsonb,
        -- list of {iteration, action, campaign_id?, metric_observed, reasoning}
    -- Final outcome
    iterations_run  INTEGER NOT NULL DEFAULT 0,
    campaigns_created INTEGER NOT NULL DEFAULT 0,
    final_conversion_rate DOUBLE PRECISION,
    final_consent_rate DOUBLE PRECISION,
    final_outcome_score DOUBLE PRECISION,
    -- RAI gates per §76
    fairness_di     DOUBLE PRECISION,        -- disparate impact (cohort)
    rai_pass        BOOLEAN,                  -- ≥ 0.8 DI required
    -- Status
    status          TEXT NOT NULL DEFAULT 'running',  -- running · complete · halted
    halt_reason     TEXT,                              -- e.g. "RAI gate failed" · "objective met"
    correlation_id  TEXT,
    tenant_id       TEXT NOT NULL DEFAULT 'default',
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_autonomous_agent_runs_tenant ON autonomous_agent_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_autonomous_agent_runs_status ON autonomous_agent_runs(status);
