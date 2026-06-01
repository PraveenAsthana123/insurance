-- =============================================================================
-- 001_initial.sql — BEV Analytics Dashboard — Full Schema
-- Star schema + enterprise tables
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Dimensions & Reference Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS departments (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    icon        TEXT,
    description TEXT,
    color       TEXT,
    route       TEXT
);

CREATE TABLE IF NOT EXISTS processes (
    id              SERIAL PRIMARY KEY,
    department_id   INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    inputs          TEXT,
    outputs         TEXT,
    pain_points     TEXT,
    kpi             TEXT,
    data_needed     TEXT
);

CREATE INDEX IF NOT EXISTS idx_processes_department_id ON processes(department_id);
CREATE INDEX IF NOT EXISTS idx_processes_name         ON processes(name);

CREATE TABLE IF NOT EXISTS ai_mappings (
    id          SERIAL PRIMARY KEY,
    process_id  INTEGER NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
    ai_type     TEXT NOT NULL,
    use_case    TEXT,
    example_output TEXT
);

CREATE INDEX IF NOT EXISTS idx_ai_mappings_process_id ON ai_mappings(process_id);
CREATE INDEX IF NOT EXISTS idx_ai_mappings_ai_type    ON ai_mappings(ai_type);

CREATE TABLE IF NOT EXISTS datasets (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,
    kaggle_url      TEXT,
    description     TEXT,
    columns_info    JSONB,
    file_path       TEXT,
    data_type       TEXT
);

CREATE INDEX IF NOT EXISTS idx_datasets_name      ON datasets(name);
CREATE INDEX IF NOT EXISTS idx_datasets_file_path ON datasets(file_path);

-- Many-to-many: datasets ↔ departments
CREATE TABLE IF NOT EXISTS dataset_departments (
    dataset_id    INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    PRIMARY KEY (dataset_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_dataset_departments_dataset_id    ON dataset_departments(dataset_id);
CREATE INDEX IF NOT EXISTS idx_dataset_departments_department_id ON dataset_departments(department_id);

-- ---------------------------------------------------------------------------
-- Star Schema — Sales / Demand Forecasting
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS product_dim (
    product_id  TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    category    TEXT,
    brand       TEXT,
    price       NUMERIC(12, 2)
);

CREATE INDEX IF NOT EXISTS idx_product_dim_category ON product_dim(category);
CREATE INDEX IF NOT EXISTS idx_product_dim_brand    ON product_dim(brand);

CREATE TABLE IF NOT EXISTS store_dim (
    store_id    TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    location    TEXT,
    region      TEXT,
    store_type  TEXT
);

CREATE INDEX IF NOT EXISTS idx_store_dim_region     ON store_dim(region);
CREATE INDEX IF NOT EXISTS idx_store_dim_store_type ON store_dim(store_type);

CREATE TABLE IF NOT EXISTS external_features (
    id            SERIAL PRIMARY KEY,
    date          DATE NOT NULL,
    holiday_flag  BOOLEAN NOT NULL DEFAULT FALSE,
    event_type    TEXT,
    oil_price     NUMERIC(10, 4)
);

CREATE INDEX IF NOT EXISTS idx_external_features_date ON external_features(date);

CREATE TABLE IF NOT EXISTS sales_fact (
    id          BIGSERIAL PRIMARY KEY,
    date        DATE NOT NULL,
    store_id    TEXT NOT NULL REFERENCES store_dim(store_id),
    product_id  TEXT NOT NULL REFERENCES product_dim(product_id),
    sales_qty   NUMERIC(12, 2) NOT NULL DEFAULT 0,
    revenue     NUMERIC(14, 2) NOT NULL DEFAULT 0,
    promo_flag  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_sales_fact_date       ON sales_fact(date);
CREATE INDEX IF NOT EXISTS idx_sales_fact_store_id   ON sales_fact(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_fact_product_id ON sales_fact(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_fact_date_store ON sales_fact(date, store_id);

-- ---------------------------------------------------------------------------
-- Forecasting Output
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS forecast_output (
    id                 BIGSERIAL PRIMARY KEY,
    date               DATE NOT NULL,
    store_id           TEXT NOT NULL REFERENCES store_dim(store_id),
    product_id         TEXT NOT NULL REFERENCES product_dim(product_id),
    predicted_sales    NUMERIC(14, 2) NOT NULL,
    confidence_lower   NUMERIC(14, 2),
    confidence_upper   NUMERIC(14, 2),
    model_version      TEXT
);

CREATE INDEX IF NOT EXISTS idx_forecast_output_date       ON forecast_output(date);
CREATE INDEX IF NOT EXISTS idx_forecast_output_store_id   ON forecast_output(store_id);
CREATE INDEX IF NOT EXISTS idx_forecast_output_product_id ON forecast_output(product_id);

CREATE TABLE IF NOT EXISTS demand_correction (
    id                BIGSERIAL PRIMARY KEY,
    date              DATE NOT NULL,
    store_id          TEXT NOT NULL REFERENCES store_dim(store_id),
    product_id        TEXT NOT NULL REFERENCES product_dim(product_id),
    actual_sales      NUMERIC(14, 2),
    predicted_demand  NUMERIC(14, 2),
    corrected_demand  NUMERIC(14, 2),
    stockout_flag     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_demand_correction_date       ON demand_correction(date);
CREATE INDEX IF NOT EXISTS idx_demand_correction_store_id   ON demand_correction(store_id);
CREATE INDEX IF NOT EXISTS idx_demand_correction_product_id ON demand_correction(product_id);
CREATE INDEX IF NOT EXISTS idx_demand_correction_stockout   ON demand_correction(stockout_flag);

CREATE TABLE IF NOT EXISTS forecast_versions (
    id           SERIAL PRIMARY KEY,
    version_type TEXT NOT NULL,
    created_by   TEXT,
    approved_by  TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forecast_overrides (
    id              BIGSERIAL PRIMARY KEY,
    forecast_id     BIGINT NOT NULL REFERENCES forecast_output(id) ON DELETE CASCADE,
    original_value  NUMERIC(14, 2) NOT NULL,
    override_value  NUMERIC(14, 2) NOT NULL,
    reason          TEXT,
    planner_id      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forecast_overrides_forecast_id ON forecast_overrides(forecast_id);

-- ---------------------------------------------------------------------------
-- ML Model Registry
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ml_models (
    id              SERIAL PRIMARY KEY,
    department_id   INTEGER REFERENCES departments(id),
    process_id      INTEGER REFERENCES processes(id),
    dataset_id      INTEGER REFERENCES datasets(id),
    name            TEXT NOT NULL,
    algorithm       TEXT,
    status          TEXT NOT NULL DEFAULT 'pending',
    mlflow_run_id   TEXT,
    metrics         JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_models_department_id ON ml_models(department_id);
CREATE INDEX IF NOT EXISTS idx_ml_models_process_id    ON ml_models(process_id);
CREATE INDEX IF NOT EXISTS idx_ml_models_status        ON ml_models(status);
CREATE INDEX IF NOT EXISTS idx_ml_models_created_at    ON ml_models(created_at);

CREATE TABLE IF NOT EXISTS jobs (
    id              BIGSERIAL PRIMARY KEY,
    model_id        INTEGER REFERENCES ml_models(id),
    job_type        TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',
    celery_task_id  TEXT,
    result          JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_jobs_model_id    ON jobs(model_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status      ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at  ON jobs(created_at);

CREATE TABLE IF NOT EXISTS model_drift (
    id              SERIAL PRIMARY KEY,
    model_id        INTEGER NOT NULL REFERENCES ml_models(id) ON DELETE CASCADE,
    metric_name     TEXT NOT NULL,
    baseline_value  NUMERIC(18, 6),
    current_value   NUMERIC(18, 6),
    drift_score     NUMERIC(10, 6),
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_model_drift_model_id    ON model_drift(model_id);
CREATE INDEX IF NOT EXISTS idx_model_drift_metric_name ON model_drift(metric_name);
CREATE INDEX IF NOT EXISTS idx_model_drift_recorded_at ON model_drift(recorded_at);

-- ---------------------------------------------------------------------------
-- ROI & Business Impact
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS roi_metrics (
    id                  SERIAL PRIMARY KEY,
    department_id       INTEGER REFERENCES departments(id),
    benefit_area        TEXT NOT NULL,
    impact_range        TEXT,
    description         TEXT,
    measurement_method  TEXT
);

CREATE INDEX IF NOT EXISTS idx_roi_metrics_department_id ON roi_metrics(department_id);

-- ---------------------------------------------------------------------------
-- Pipeline & Model Metrics Audit
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pipeline_logs (
    id               BIGSERIAL PRIMARY KEY,
    run_id           TEXT NOT NULL,
    status           TEXT NOT NULL,
    error_message    TEXT,
    runtime_seconds  NUMERIC(10, 2),
    recorded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_logs_run_id     ON pipeline_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_logs_status     ON pipeline_logs(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_logs_recorded_at ON pipeline_logs(recorded_at);

CREATE TABLE IF NOT EXISTS model_metrics (
    id           SERIAL PRIMARY KEY,
    model_name   TEXT NOT NULL,
    mape         NUMERIC(10, 4),
    rmse         NUMERIC(18, 6),
    bias         NUMERIC(18, 6),
    version      TEXT,
    recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_model_metrics_model_name  ON model_metrics(model_name);
CREATE INDEX IF NOT EXISTS idx_model_metrics_recorded_at ON model_metrics(recorded_at);

-- ---------------------------------------------------------------------------
-- Process Data Flow (NEW) — Tracks input → process step → output per process
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS process_data_flow (
    id           SERIAL PRIMARY KEY,
    process_id   INTEGER NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
    step_order   INTEGER NOT NULL,
    step_name    TEXT NOT NULL,
    step_type    TEXT NOT NULL,           -- e.g. 'input', 'transform', 'output', 'model'
    input_data   TEXT,                    -- description or reference of input data
    output_data  TEXT,                    -- description or reference of output data
    description  TEXT
);

CREATE INDEX IF NOT EXISTS idx_process_data_flow_process_id  ON process_data_flow(process_id);
CREATE INDEX IF NOT EXISTS idx_process_data_flow_step_order  ON process_data_flow(process_id, step_order);

-- ---------------------------------------------------------------------------
-- Process Transactions (NEW) — Transactional history per process
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS process_transactions (
    id                BIGSERIAL PRIMARY KEY,
    process_id        INTEGER NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
    transaction_type  TEXT NOT NULL,       -- e.g. 'create', 'update', 'delete', 'approve'
    before_data       JSONB,
    after_data        JSONB,
    timestamp         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_process_transactions_process_id ON process_transactions(process_id);
CREATE INDEX IF NOT EXISTS idx_process_transactions_timestamp  ON process_transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_process_transactions_type       ON process_transactions(transaction_type);
