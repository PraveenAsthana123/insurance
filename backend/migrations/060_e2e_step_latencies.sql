-- 060_e2e_step_latencies.sql — T3.4 · per-step latency histograms on E2E flow.
--
-- Per docs/PENDING_PLAN.md T3.4. Each weekly run of
-- audit_marketing_e2e_flow.py persists per-assertion timing here.
-- Endpoint /api/v1/marketing-kpis/e2e-latencies aggregates percentiles.

CREATE TABLE IF NOT EXISTS e2e_step_latencies (
    id              SERIAL PRIMARY KEY,
    audit_kind      TEXT NOT NULL,    -- 'marketing-e2e-flow' (extendable to others)
    run_ref         TEXT NOT NULL,    -- per-run identifier (rid)
    step_id         TEXT NOT NULL,    -- e.g. '1.S', '2.F'
    step_label      TEXT NOT NULL,    -- human-readable label
    latency_ms      DOUBLE PRECISION NOT NULL,
    passed          BOOLEAN NOT NULL,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tenant_id       TEXT NOT NULL DEFAULT 'default'
);

CREATE INDEX IF NOT EXISTS idx_e2e_lat_kind_step ON e2e_step_latencies(audit_kind, step_id);
CREATE INDEX IF NOT EXISTS idx_e2e_lat_recorded ON e2e_step_latencies(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_e2e_lat_tenant ON e2e_step_latencies(tenant_id);
