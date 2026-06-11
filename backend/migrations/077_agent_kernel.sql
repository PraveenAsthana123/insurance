-- Iter 103 · Agent Kernel · 4 engines + lifecycle state machine
CREATE TABLE IF NOT EXISTS agent_lifecycle_state (
    state_id          BIGSERIAL PRIMARY KEY,
    agent_id          VARCHAR(80) NOT NULL,
    state             VARCHAR(20) NOT NULL,  -- created · scheduled · running · shutdown · failed · retrying · retired
    prior_state       VARCHAR(20),
    reason            TEXT,
    actor_user        VARCHAR(80),
    actor_host        VARCHAR(80),
    correlation_id    VARCHAR(80),
    metadata          JSONB DEFAULT '{}'::jsonb,
    entered_at        TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_lifecycle_state CHECK (state IN
        ('created','scheduled','running','shutdown','failed','retrying','retired','suspended'))
);
CREATE INDEX IF NOT EXISTS idx_lifecycle_agent ON agent_lifecycle_state(agent_id, entered_at DESC);
CREATE INDEX IF NOT EXISTS idx_lifecycle_state ON agent_lifecycle_state(state, entered_at DESC);

CREATE TABLE IF NOT EXISTS agent_identity_credential (
    credential_id     VARCHAR(80) PRIMARY KEY,
    agent_id          VARCHAR(80) NOT NULL,
    public_key_sha    VARCHAR(64),
    scopes            TEXT[] DEFAULT ARRAY[]::TEXT[],
    issued_by         VARCHAR(80),
    issued_at         TIMESTAMPTZ DEFAULT NOW(),
    expires_at        TIMESTAMPTZ,
    revoked_at        TIMESTAMPTZ,
    revoked_reason    TEXT
);
CREATE INDEX IF NOT EXISTS idx_identity_agent ON agent_identity_credential(agent_id);

CREATE TABLE IF NOT EXISTS agent_memory_blob (
    memory_id         BIGSERIAL PRIMARY KEY,
    agent_id          VARCHAR(80) NOT NULL,
    memory_kind       VARCHAR(20) DEFAULT 'short_term',  -- short_term · long_term · episodic · semantic
    content_text      TEXT,
    embedding_hash    VARCHAR(64),
    ts_local          TIMESTAMPTZ DEFAULT NOW(),
    expires_at        TIMESTAMPTZ,
    correlation_id    VARCHAR(80)
);
CREATE INDEX IF NOT EXISTS idx_memory_agent ON agent_memory_blob(agent_id, ts_local DESC);

CREATE TABLE IF NOT EXISTS agent_trust_score (
    score_id          BIGSERIAL PRIMARY KEY,
    agent_id          VARCHAR(80) NOT NULL,
    trust_score       NUMERIC(3,2) NOT NULL,  -- 0.00 - 1.00
    successful_runs   INT DEFAULT 0,
    failed_runs       INT DEFAULT 0,
    human_overrides   INT DEFAULT 0,
    last_failure_at   TIMESTAMPTZ,
    computed_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trust_agent ON agent_trust_score(agent_id, computed_at DESC);
