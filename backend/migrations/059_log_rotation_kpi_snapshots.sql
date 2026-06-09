-- 059_log_rotation_kpi_snapshots.sql — T3.3 (archive) + T5.8 (snapshots).
-- Per docs/PENDING_PLAN.md.
--
-- T3.3 · §38.3 retention compliance: archive operation_log entries
-- older than 90 days from content_postings + autonomous_agent_runs.
-- T5.8 · per-hour KPI snapshot for trend analysis.

-- ─────────────────────────────────────────────────────────────────────
-- T3.3 · archive table for rotated operation_log entries
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS operation_log_archive (
    id              SERIAL PRIMARY KEY,
    source_table    TEXT NOT NULL,    -- 'content_postings' OR 'autonomous_agent_runs'
    source_id       INTEGER NOT NULL,
    source_ref      TEXT,             -- posting_ref OR run_ref for human readability
    archived_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Original entries preserved as JSONB array
    entries         JSONB NOT NULL,
    entry_count     INTEGER NOT NULL,
    oldest_entry_at TIMESTAMPTZ,
    newest_entry_at TIMESTAMPTZ,
    tenant_id       TEXT NOT NULL DEFAULT 'default'
);

CREATE INDEX IF NOT EXISTS idx_op_log_archive_source ON operation_log_archive(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_op_log_archive_tenant ON operation_log_archive(tenant_id);
CREATE INDEX IF NOT EXISTS idx_op_log_archive_archived_at ON operation_log_archive(archived_at);

-- ─────────────────────────────────────────────────────────────────────
-- T5.8 · KPI snapshot table for trend analysis
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kpi_snapshots (
    id              SERIAL PRIMARY KEY,
    snapshot_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- {kpi_id: value} for all wired KPIs at this snapshot moment
    values          JSONB NOT NULL,
    kpi_count       INTEGER NOT NULL,
    tenant_id       TEXT NOT NULL DEFAULT 'default'
);

CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_at ON kpi_snapshots(snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_tenant ON kpi_snapshots(tenant_id);
