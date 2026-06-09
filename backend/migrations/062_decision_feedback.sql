-- 062_decision_feedback.sql — Explicit + implicit feedback capture · gate #4.
--
-- Per Tier 7 governance gate #4 (Human Feedback · explicit + implicit).
-- Composes with T7.10 corrections (gate #5) · they're complementary:
--   corrections     = "this decision was WRONG · here's the right one"
--   feedback        = "this decision was good/bad" or "accepted/modified/rejected/ignored"

CREATE TABLE IF NOT EXISTS decision_feedback (
    id              SERIAL PRIMARY KEY,
    feedback_ref    TEXT NOT NULL UNIQUE,
    -- Source decision
    run_ref         TEXT NOT NULL,
    decision_iter   INTEGER NOT NULL,
    decision_action TEXT NOT NULL,
    -- Feedback type
    feedback_kind   TEXT NOT NULL,    -- 'explicit' or 'implicit'
    feedback_value  TEXT NOT NULL,    -- explicit: good/bad/correct/incorrect
                                       -- implicit: accepted/modified/rejected/ignored
    note            TEXT,
    reviewer        TEXT NOT NULL,
    -- Audit + governance
    correlation_id  TEXT,
    tenant_id       TEXT NOT NULL DEFAULT 'default',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Constraints
    CONSTRAINT decision_feedback_kind_chk
        CHECK (feedback_kind IN ('explicit', 'implicit')),
    CONSTRAINT decision_feedback_value_chk CHECK (
        (feedback_kind = 'explicit' AND feedback_value IN ('good', 'bad', 'correct', 'incorrect'))
        OR
        (feedback_kind = 'implicit' AND feedback_value IN ('accepted', 'modified', 'rejected', 'ignored'))
    )
);

CREATE INDEX IF NOT EXISTS idx_feedback_run_ref ON decision_feedback(run_ref);
CREATE INDEX IF NOT EXISTS idx_feedback_kind   ON decision_feedback(feedback_kind);
CREATE INDEX IF NOT EXISTS idx_feedback_value  ON decision_feedback(feedback_value);
CREATE INDEX IF NOT EXISTS idx_feedback_tenant ON decision_feedback(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON decision_feedback(created_at DESC);
