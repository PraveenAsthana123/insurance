-- Iter 107 · §125 operator request tracking
CREATE TABLE IF NOT EXISTS operator_request_log (
    request_id       VARCHAR(80) PRIMARY KEY,
    request_text     TEXT NOT NULL,
    intent_class     VARCHAR(40),     -- install · build · ask · status · policy
    tools_mentioned  TEXT[] DEFAULT ARRAY[]::TEXT[],
    policies_invoked TEXT[] DEFAULT ARRAY[]::TEXT[],
    status           VARCHAR(20) DEFAULT 'open',   -- open · in_progress · done · skipped
    iter             INT,
    commit_sha       VARCHAR(12),
    actor_user       VARCHAR(80),
    requested_at     TIMESTAMPTZ DEFAULT NOW(),
    completed_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_op_req_status ON operator_request_log(status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_op_req_iter ON operator_request_log(iter DESC);
