-- Iter 111 · §129 actual file ingestion + processing

CREATE TABLE IF NOT EXISTS video_ingest_job (
    job_id          VARCHAR(40) PRIMARY KEY,
    source_kind     VARCHAR(20) NOT NULL,    -- upload · youtube · gdrive · url
    source_url      TEXT,
    filename        VARCHAR(500),
    file_path       TEXT,
    file_size_bytes BIGINT,
    mime_type       VARCHAR(80),
    department      VARCHAR(40) DEFAULT 'claims',
    submitted_by    VARCHAR(80),
    submitted_at    TIMESTAMPTZ DEFAULT NOW(),
    status          VARCHAR(20) DEFAULT 'queued',  -- queued · processing · completed · failed
    progress_pct    INT DEFAULT 0,
    error_message   TEXT,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,

    -- Results
    transcript_text TEXT,
    ocr_text        TEXT,
    duration_sec    NUMERIC(10,2),
    n_frames        INT,
    n_segments      INT,
    language        VARCHAR(20),
    summary         TEXT,
    metadata        JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_vij_status ON video_ingest_job(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_vij_dept ON video_ingest_job(department, submitted_at DESC);
